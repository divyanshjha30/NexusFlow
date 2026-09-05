# NexusFlow — Project Overview

## What is NexusFlow?

NexusFlow is a multi-cloud event-driven document intelligence platform.

Upload any document. NexusFlow stores it across all 4 clouds simultaneously, runs AI
analysis on it, makes it searchable with natural language, and shows you exactly what
every cloud is doing in real time — via a beautiful live dashboard.

## One-line pitch

"Upload once. Stored everywhere. Understood by AI. Found instantly."

## Why it exists

This project teaches and demonstrates real enterprise cloud architecture using every
service floci provides — locally, for free, with zero cloud accounts needed in dev.

## Tech stack

| Layer                        | Technology                          |
| ---------------------------- | ----------------------------------- |
| Backend framework            | Spring Boot 3.x (Java 21)           |
| Backend modules              | Multi-module Maven project          |
| AI                           | Spring AI + Ollama (local LLM)      |
| Event backbone               | Apache Kafka                        |
| Database                     | CockroachDB (Postgres-compatible)   |
| Cache                        | Redis                               |
| AWS emulator                 | floci :4566                         |
| Azure emulator               | floci-az :4577                      |
| GCP emulator                 | floci-gcp :4588                     |
| OCI emulator                 | floci-oci :4599                     |
| Frontend                     | React 18 + Tailwind CSS 3 + Vite    |
| Real-time                    | WebSocket (Spring + STOMP)          |
| Auth                         | AWS Cognito (floci)                 |
| Container                    | Docker + Docker Compose             |
| Dev \u2014 code + app        | Mac (Spring Boot :8080, Vite :5173) |
| Dev \u2014 infra + emulators | Windows PC `dj-pc` over Tailscale   |
| Prod frontend                | Vercel                              |
| Prod backend                 | Oracle Cloud Free Tier              |

## Core user journey

1. User opens NexusFlow in browser
2. Logs in via AWS Cognito (OAuth2)
3. Drags and drops a file onto the upload zone
4. Progress bar shows real-time upload status
5. Live event feed shows each cloud receiving the file
6. AI analysis results appear: summary, tags, entities, classification
7. File appears in the document library, fully searchable
8. User types: "find all invoices from last month" → instant results
9. User opens AI chat: "summarise everything tagged contracts" → LLM answer
10. Cloud topology view shows where every file lives across 4 clouds

## Project folder structure

```
NexusFlow/
├── plan/                          ← architecture & design docs (you are here)
│   ├── 00-overview.md
│   ├── 01-architecture.md
│   ├── 02-cloud-service-map.md
│   ├── 03-data-models.md
│   ├── 04-api-contracts.md
│   ├── 05-kafka-events.md
│   ├── 06-ai-design.md
│   ├── 07-frontend-design.md
│   ├── 08-ui-components.md
│   ├── 09-docker-setup.md
│   └── 10-implementation-order.md
│
├── backend/                       ← Spring Boot multi-module Maven
│   ├── pom.xml                    ← parent POM
│   ├── nexusflow-common/          ← shared DTOs, enums, utils, config
│   ├── nexusflow-api/             ← REST controllers, WebSocket, auth
│   ├── nexusflow-storage/         ← all 4 cloud storage SDKs
│   ├── nexusflow-events/          ← Kafka producers & consumers
│   ├── nexusflow-ai/              ← Spring AI, RAG, embeddings, chat
│   └── nexusflow-pipeline/        ← Step Functions, scheduled jobs
│
├── frontend/                      ← React + Tailwind + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── api/
│   └── package.json
│
└── docker/                        ← Docker Compose files
    ├── docker-compose.dev.yml     ← full local dev stack
    └── docker-compose.infra.yml   ← just infra (Kafka, DB, Redis)
```

## Deployment plan

| Phase | What              | Where                        | Cost |
| ----- | ----------------- | ---------------------------- | ---- |
| Dev   | Everything local  | Your PC via Docker + floci   | Free |
| Demo  | Backend deployed  | Oracle Cloud Free Tier       | Free |
| Demo  | Frontend deployed | Vercel                       | Free |
| Prod  | Real clouds       | AWS/Azure/GCP/OCI free tiers | Free |
