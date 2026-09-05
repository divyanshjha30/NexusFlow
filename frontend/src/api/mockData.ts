import type {
  ChatMessageDto,
  CloudEvent,
  CloudProvider,
  CloudStatus,
  DocumentDto,
  UserProfile,
} from "@/types";

const CLOUDS: CloudProvider[] = ["AWS", "AZURE", "GCP", "OCI"];

function iso(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

function storage(id: string, archived = false) {
  return {
    awsS3Url: `https://s3.local/nexusflow-documents/${id}`,
    azureBlobUrl: `https://devstoreaccount1.blob.local/${id}`,
    gcpStorageUrl: `https://storage.local/nexusflow-documents/${id}`,
    ociObjectUrl: archived
      ? `https://objectstorage.local/nexusflow-archive/${id}`
      : null,
    isArchived: archived,
  };
}

export const MOCK_DOCUMENTS: DocumentDto[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440000",
    fileName: "invoice-jan-2024.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 245760,
    documentType: "INVOICE",
    status: "READY",
    summary:
      "Invoice from Acme Corp for web development services totalling $1,250.00, dated January 15, 2024. Covers 25 hours at $50/hour for December 2023. Payment due within 30 days.",
    aiTags: ["invoice", "acme-corp", "web-development", "2024"],
    entities: {
      organizations: ["Acme Corp"],
      persons: [],
      dates: ["January 15, 2024", "December 2023"],
      amounts: ["$1,250.00", "25 hours", "$50/hour"],
      locations: [],
    },
    sentiment: "NEUTRAL",
    confidenceScore: 0.9823,
    storageLocations: storage("invoice-jan-2024.pdf"),
    extractedText:
      "INVOICE\n\nFrom: Acme Corp\nDate: January 15, 2024\nAmount Due: $1,250.00\n\nServices rendered: web development, 25 hours at $50/hour for the period December 2023.\n\nPayment is due within 30 days of the invoice date.",
    createdAt: iso(35),
    updatedAt: iso(34),
  },
  {
    id: "6f1c2e77-2b2e-4a1f-9a1e-0d1a2b3c4d5e",
    fileName: "contract-acme.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 1258291,
    documentType: "CONTRACT",
    status: "READY",
    summary:
      "Service agreement between NexusFlow Ltd and Acme Corp covering platform engineering support. The agreement runs until December 31, 2025 with automatic annual renewal.",
    aiTags: ["contract", "acme-corp", "active", "2024"],
    entities: {
      organizations: ["Acme Corp", "NexusFlow Ltd"],
      persons: ["Divya Jain"],
      dates: ["January 14, 2024", "December 31, 2025"],
      amounts: ["$96,000.00"],
      locations: ["London"],
    },
    sentiment: "NEUTRAL",
    confidenceScore: 0.9611,
    storageLocations: storage("contract-acme.pdf"),
    extractedText:
      "SERVICE AGREEMENT\n\nThis agreement is entered into between NexusFlow Ltd and Acme Corp...\n\nTerm: this agreement shall continue until December 31, 2025 unless terminated earlier.",
    createdAt: iso(120),
    updatedAt: iso(118),
  },
  {
    id: "7a2d3f88-3c3f-4b20-ab2f-1e2b3c4d5e6f",
    fileName: "receipt-groceries.jpg",
    mimeType: "image/jpeg",
    fileSizeBytes: 87040,
    documentType: "RECEIPT",
    status: "READY",
    summary:
      "Grocery receipt from Whole Foods dated January 13, 2024 totalling £42.18 across 12 line items.",
    aiTags: ["receipt", "groceries", "2024"],
    entities: {
      organizations: ["Whole Foods"],
      persons: [],
      dates: ["January 13, 2024"],
      amounts: ["£42.18"],
      locations: ["Camden"],
    },
    sentiment: "NEUTRAL",
    confidenceScore: 0.8734,
    storageLocations: storage("receipt-groceries.jpg"),
    createdAt: iso(240),
    updatedAt: iso(239),
  },
  {
    id: "8b3e4a99-4d40-4c31-bc30-2f3c4d5e6f70",
    fileName: "q4-performance-report.docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    fileSizeBytes: 524288,
    documentType: "REPORT",
    status: "PROCESSING",
    summary: null,
    aiTags: [],
    entities: {},
    sentiment: null,
    confidenceScore: null,
    storageLocations: {
      awsS3Url: "https://s3.local/nexusflow-documents/q4-report",
      azureBlobUrl: "https://devstoreaccount1.blob.local/q4-report",
      gcpStorageUrl: null,
      ociObjectUrl: null,
      isArchived: false,
    },
    createdAt: iso(2),
    updatedAt: iso(1),
  },
  {
    id: "9c4f5b00-5e51-4d42-cd41-304d5e6f7081",
    fileName: "standup-recording.mp3",
    mimeType: "audio/mpeg",
    fileSizeBytes: 8388608,
    documentType: "AUDIO",
    status: "READY",
    summary:
      "Team standup recording covering the multi-cloud storage rollout, Kafka topic partitioning, and the AI pipeline timeline.",
    aiTags: ["audio", "standup", "engineering"],
    entities: {
      organizations: ["NexusFlow Ltd"],
      persons: ["Divya Jain"],
      dates: ["January 12, 2024"],
      amounts: [],
      locations: [],
    },
    sentiment: "POSITIVE",
    confidenceScore: 0.7912,
    storageLocations: storage("standup-recording.mp3"),
    createdAt: iso(1440),
    updatedAt: iso(1438),
  },
  {
    id: "0d5a6c11-6f62-4e53-de52-415e6f708192",
    fileName: "old-tax-return-2019.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 3145728,
    documentType: "REPORT",
    status: "ARCHIVED",
    summary:
      "Archived 2019 tax return. Moved to OCI cold storage after 30 days without access.",
    aiTags: ["report", "tax", "2019", "archived"],
    entities: {
      organizations: ["HMRC"],
      persons: ["Divya Jain"],
      dates: ["April 5, 2019"],
      amounts: ["£12,480.00"],
      locations: [],
    },
    sentiment: "NEUTRAL",
    confidenceScore: 0.9102,
    storageLocations: storage("old-tax-return-2019.pdf", true),
    createdAt: iso(60 * 24 * 45),
    updatedAt: iso(60 * 24 * 12),
  },
  {
    id: "1e6b7d22-7073-4f64-ef63-526f70819203",
    fileName: "corrupted-scan.png",
    mimeType: "image/png",
    fileSizeBytes: 12288,
    documentType: "IMAGE",
    status: "FAILED",
    summary: null,
    aiTags: [],
    entities: {},
    sentiment: null,
    confidenceScore: null,
    storageLocations: storage("corrupted-scan.png"),
    createdAt: iso(400),
    updatedAt: iso(399),
  },
];

export const MOCK_CLOUD_STATUS: Record<CloudProvider, CloudStatus> = {
  AWS: {
    status: "UP",
    endpoint: "http://dj-pc:4566",
    latencyMs: 12,
    objectCount: 142,
    services: {
      S3: "UP",
      DynamoDB: "UP",
      "Bedrock Runtime": "UP",
      Cognito: "UP",
      SQS: "UP",
      SNS: "UP",
    },
  },
  AZURE: {
    status: "UP",
    endpoint: "http://dj-pc:4577",
    latencyMs: 8,
    objectCount: 142,
    services: {
      Blob: "UP",
      Queue: "UP",
      "Service Bus": "UP",
      "Cosmos DB": "UP",
      "Key Vault": "UP",
    },
  },
  GCP: {
    status: "UP",
    endpoint: "http://dj-pc:4588",
    latencyMs: 10,
    objectCount: 142,
    services: {
      Storage: "UP",
      "Pub/Sub": "UP",
      Firestore: "UP",
      "Vertex AI": "UP",
      BigQuery: "UP",
    },
  },
  OCI: {
    status: "UP",
    endpoint: "http://dj-pc:4599",
    latencyMs: 15,
    objectCount: 28,
    services: {
      "Object Storage": "UP",
      Streaming: "UP",
      Vault: "UP",
      Monitoring: "UP",
    },
  },
};

export const MOCK_EVENTS: CloudEvent[] = [
  {
    id: "e1",
    timestamp: iso(1),
    eventType: "FILE_STORED",
    fileName: "invoice-jan-2024.pdf",
    cloud: "AWS",
    target: "AWS S3",
    durationMs: 342,
  },
  {
    id: "e2",
    timestamp: iso(1),
    eventType: "FILE_STORED",
    fileName: "invoice-jan-2024.pdf",
    cloud: "AZURE",
    target: "Azure Blob",
    durationMs: 218,
  },
  {
    id: "e3",
    timestamp: iso(1),
    eventType: "FILE_STORED",
    fileName: "invoice-jan-2024.pdf",
    cloud: "GCP",
    target: "GCP Storage",
    durationMs: 291,
  },
  {
    id: "e4",
    timestamp: iso(1),
    eventType: "FILE_STORED",
    fileName: "invoice-jan-2024.pdf",
    cloud: "OCI",
    target: "OCI Object",
    durationMs: 401,
  },
  {
    id: "e5",
    timestamp: iso(1),
    eventType: "AI_CLASSIFIED",
    fileName: "invoice-jan-2024.pdf",
    cloud: "GCP",
    target: "INVOICE",
    durationMs: 891,
  },
  {
    id: "e6",
    timestamp: iso(0),
    eventType: "AI_SUMMARISED",
    fileName: "invoice-jan-2024.pdf",
    cloud: "AWS",
    target: "done",
    durationMs: 1240,
  },
];

export const MOCK_USER: UserProfile = {
  id: "u-1",
  email: "divya@example.com",
  displayName: "Divya",
  role: "USER",
  storageUsedBytes: 52_428_800,
  storageLimitBytes: 5_368_709_120,
  documentCount: MOCK_DOCUMENTS.length,
};

export const MOCK_CHAT_REPLY = (question: string): ChatMessageDto => ({
  id: crypto.randomUUID(),
  role: "assistant",
  createdAt: new Date().toISOString(),
  content:
    `You asked: "${question}".\n\n` +
    "Based on your library, you have 1 active contract with Acme Corp running until " +
    "31 December 2025, and an outstanding invoice for $1,250.00 dated 15 January 2024.\n\n" +
    "_(Demo response — the backend is not reachable, so this is generated locally.)_",
  sources: [
    {
      documentId: MOCK_DOCUMENTS[1].id,
      fileName: MOCK_DOCUMENTS[1].fileName,
      excerpt: "...this agreement shall continue until December 31, 2025...",
      relevanceScore: 0.95,
    },
    {
      documentId: MOCK_DOCUMENTS[0].id,
      fileName: MOCK_DOCUMENTS[0].fileName,
      excerpt: "...Amount Due: $1,250.00, payment due within 30 days...",
      relevanceScore: 0.88,
    },
  ],
});

export { CLOUDS };
