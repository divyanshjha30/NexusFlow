# NexusFlow — AI Design

## Overview

NexusFlow's AI layer uses a multi-provider strategy: local LLM via Ollama (private, free, always-on),
AWS Bedrock for summarisation, GCP Vertex AI for classification, AWS Comprehend for entity extraction,
and Spring AI as the unifying framework for RAG and chat.

---

## Spring AI configuration

```yaml
# application-ai.yml
# Ollama runs in Docker on dj-pc; Spring Boot runs on the Mac.
spring:
  ai:
    ollama:
      base-url: http://dj-pc:11434
      chat:
        model: llama3.2 # 3B param model, good balance of speed vs quality
        options:
          temperature: 0.1 # low temp for factual extraction
          num-ctx: 8192 # context window
      embedding:
        model: nomic-embed-text # 768-dim embeddings, fast
    vectorstore:
      cockroachdb: # CockroachDB pgvector extension
        table-name: document_embeddings
        dimensions: 768
        distance-type: cosine
```

---

## Document text extraction

Uses Apache Tika (auto-detects format):

```text
Input                     Tika output          AI can process
──────────────────────────────────────────────────────────────
PDF (text)        →       plain text           ✓ directly
PDF (scanned)     →       ""                   → send to Rekognition/Cloud Run OCR
DOCX/XLSX/PPTX    →       plain text           ✓ directly
Image (JPG/PNG)   →       ""                   → Rekognition text detection
Audio (MP3/WAV)   →       ""                   → Transcribe (async)
Email (EML)       →       headers + body       ✓ directly
HTML              →       stripped text        ✓ directly
```

---

## AI pipeline steps

### Step 1 — Document classification (GCP Vertex AI)

Sends 500-char excerpt to Vertex AI text classification endpoint.

**Input:**

```text
Invoice from Acme Corp
Date: January 15, 2024
Amount Due: $1,250.00
...
```

**Output:**

```json
{
  "documentType": "INVOICE",
  "confidence": 0.9823,
  "alternatives": [
    { "type": "RECEIPT", "confidence": 0.013 },
    { "type": "REPORT", "confidence": 0.004 }
  ]
}
```

Fallback: if Vertex AI unreachable, use Ollama with a classify prompt.

---

### Step 2 — Summarisation (AWS Bedrock → Claude Haiku)

Sends up to 8,000 chars of extracted text, gets a 3-sentence summary.

**Prompt:**

```text
Summarise the following document in exactly 3 sentences.
Be factual and concise. Include key amounts, dates, and parties involved.

Document:
{extractedText}
```

**Output:**

```text
Invoice from Acme Corp for web development services totalling $1,250.00,
dated January 15, 2024. The invoice covers 25 hours at $50/hour for the
period December 2023. Payment is due within 30 days.
```

Fallback: Ollama with same prompt.

---

### Step 3 — Entity extraction (AWS Comprehend)

Sends full extracted text to Comprehend's `DetectEntities` API.

**Entity types extracted:**

- `ORGANIZATION` → companies, institutions
- `PERSON` → names
- `DATE` → dates and date ranges
- `QUANTITY` → amounts, numbers
- `LOCATION` → addresses, cities
- `COMMERCIAL_ITEM` → product names

**Output:**

```json
{
  "organizations": ["Acme Corp"],
  "persons": [],
  "dates": ["January 15, 2024", "December 2023"],
  "amounts": ["$1,250.00", "25 hours", "$50/hour"],
  "locations": [],
  "products": ["web development services"]
}
```

---

### Step 4 — Embedding generation (Ollama nomic-embed-text)

Splits document into chunks (512 tokens, 50 overlap), embeds each chunk.

```text
Chunk 1: "Invoice from Acme Corp. Date: January 15, 2024..."
Chunk 2: "Services rendered: web development. 25 hours at $50/hour..."
Chunk 3: "Payment due within 30 days. Bank details: ..."

→ nomic-embed-text → [768-dim float vector] × 3 chunks
```

Stored in CockroachDB with pgvector.

---

### Step 5 — Index document

Two indexes updated:

1. **Full-text search** (CockroachDB) — `tsvector` column on `extracted_text`
2. **Vector search** (CockroachDB pgvector) — each chunk vector stored in `document_embeddings`
3. **DynamoDB hot cache** — summary + tags written for fast list-view queries

---

## RAG pipeline (AI Chat)

When user sends a chat message:

```text
User query: "summarise all contracts from last year"
                    ↓
1. Embed the query: nomic-embed-text → [768-dim vector]
                    ↓
2. Vector search: SELECT doc, chunk, similarity
                  FROM document_embeddings
                  WHERE 1 - (embedding <=> $queryVector) > 0.75
                  AND userId = $userId
                  ORDER BY similarity DESC LIMIT 10
                    ↓
3. Retrieve top 10 relevant chunks from CockroachDB
   (with their document metadata: fileName, type, createdAt)
                    ↓
4. Build context for LLM:
   System: "You are a document assistant. Answer using only the provided documents."
   Context: [10 chunks with source labels]
   User: "summarise all contracts from last year"
                    ↓
5. Send to Ollama (llama3.2) → response
                    ↓
6. Extract source references from context (which chunks were used)
                    ↓
7. Return: {message, conversationId, sources: [{documentId, excerpt, relevance}]}
```

---

## Multi-turn conversation

Conversations maintained in Redis:

```text
Key: conversation:{conversationId}
Value: [{"role":"user","content":"..."}, {"role":"assistant","content":"..."}]
TTL: 30 minutes
```

Each turn appends to the conversation. Context window managed by token count — if >6000 tokens, oldest turns dropped.

---

## Auto-tagging

After entity extraction, auto-tags are generated:

- Document type as tag: `invoice`
- All organisations, lowercased + hyphenated: `acme-corp`
- Year from dates: `2024`
- Quarter if detected: `q1-2024`
- Custom: `paid` (if text contains "paid" or "payment received"), `overdue` (if contains "overdue")

---

## Image documents (Rekognition)

For `image/*` MIME types:

```text
1. Upload to S3
2. Call Rekognition DetectText → extract text
3. Call Rekognition DetectLabels → "Invoice", "Document", "Paper"
4. Continue normal pipeline with extracted text
```

---

## Audio/video documents (Transcribe)

Async — starts a Transcribe job, polls every 30s:

```text
1. Upload MP3/WAV/MP4 to S3
2. StartTranscriptionJob → jobName = documentId
3. Schedule a ScheduledTask to poll GetTranscriptionJob
4. When complete: download transcript JSON → extractedText
5. Publish nexusflow.ai.started and continue normal pipeline
```

---

## Bedrock model config

```java
@Configuration
public class BedrockConfig {
    @Bean
    public BedrockRuntimeClient bedrockClient() {
        return BedrockRuntimeClient.builder()
            .endpointOverride(URI.create("http://dj-pc:4566"))  // floci
            .region(Region.US_EAST_1)
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create("test", "test")))
            .build();
    }
}
```

Model ID for summarisation: `anthropic.claude-haiku-20240307-v1:0`

---

## Vertex AI config

```java
@Configuration
public class VertexAiConfig {
    @Value("${floci.gcp.endpoint:http://dj-pc:4588}")
    private String gcpEndpoint;

    @Bean
    public VertexAIEmbeddingClient vertexClient() {
        return VertexAIEmbeddingClient.builder()
            .projectId("floci-local")
            .location("us-central1")
            .build();
    }
}
```

---

## Ollama setup

Ollama runs in Docker on dj-pc under the `ai` compose profile. Models are already pulled:
`llama3.2` (3.2B) and `nomic-embed-text` (137M).

```bash
curl http://dj-pc:11434/api/tags   # verify from the Mac
```

Spring AI config:

```yaml
spring.ai.ollama.base-url: http://dj-pc:11434
```

Docker on dj-pc exposes only the `runc` runtime, so inference is CPU-only for now.

---

## Prompt templates

Stored as resources in `nexusflow-ai/src/main/resources/prompts/`:

**classify.st:**

```text
Classify the following document into one of these categories:
INVOICE, CONTRACT, REPORT, RECEIPT, IMAGE, AUDIO, OTHER

Return only the category name in UPPERCASE with no other text.

Document excerpt:
{excerpt}
```

**summarise.st:**

```text
Summarise the following document in exactly 3 sentences.
Focus on: key parties involved, main subject, key dates/amounts.
Be factual. Do not infer. Do not add information not in the document.

Document:
{text}
```

**chat-system.st:**

```text
You are NexusFlow Assistant, an AI that helps users understand their documents.

Rules:
- Answer ONLY using the provided document excerpts
- If the answer is not in the documents, say "I don't see that in your documents"
- Cite which document each fact comes from
- Be concise and factual

Available documents:
{context}
```
