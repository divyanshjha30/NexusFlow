export type CloudProvider = "AWS" | "AZURE" | "GCP" | "OCI";

export type DocumentType =
  | "INVOICE"
  | "CONTRACT"
  | "REPORT"
  | "RECEIPT"
  | "IMAGE"
  | "AUDIO"
  | "OTHER";

export type DocumentStatus =
  | "UPLOADING"
  | "PROCESSING"
  | "READY"
  | "FAILED"
  | "ARCHIVED";

export type Sentiment = "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";

export interface StorageLocations {
  awsS3Url: string | null;
  azureBlobUrl: string | null;
  gcpStorageUrl: string | null;
  ociObjectUrl: string | null;
  isArchived: boolean;
}

export interface DocumentDto {
  id: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  documentType: DocumentType | null;
  status: DocumentStatus;
  summary: string | null;
  aiTags: string[];
  entities: Record<string, string[]>;
  sentiment: Sentiment | null;
  confidenceScore: number | null;
  storageLocations: StorageLocations;
  extractedText?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface DocumentFilters {
  page: number;
  size: number;
  sort: string;
  direction: "asc" | "desc";
  type?: DocumentType | "ALL";
  status?: DocumentStatus | "ALL";
  cloud?: CloudProvider | "ALL";
  search?: string;
  archived?: boolean;
}

export type ProcessingEventType =
  | "STORED_AWS"
  | "STORED_AZURE"
  | "STORED_GCP"
  | "STORED_OCI"
  | "AI_STARTED"
  | "AI_CLASSIFIED"
  | "AI_SUMMARISED"
  | "AI_ENTITIES"
  | "AI_COMPLETE"
  | "FAILED";

export interface ProcessingEvent {
  documentId: string;
  eventType: ProcessingEventType;
  progress: number;
  message: string;
  timestamp: string;
}

export interface UploadItem {
  documentId: string;
  fileName: string;
  fileSizeBytes: number;
  progress: number;
  status: DocumentStatus;
  clouds: Record<CloudProvider, boolean>;
  documentType?: DocumentType | null;
  error?: string | null;
}

export type ServiceStatus = "UP" | "DOWN" | "CHECKING";

export interface CloudStatus {
  status: ServiceStatus;
  endpoint: string;
  services: Record<string, ServiceStatus>;
  latencyMs: number;
  objectCount: number;
}

export interface CloudEvent {
  id: string;
  timestamp: string;
  eventType: string;
  fileName: string;
  cloud: CloudProvider | null;
  target: string;
  durationMs: number;
}

export interface SourceRef {
  documentId: string;
  fileName: string;
  excerpt: string;
  relevanceScore: number;
}

export interface ChatMessageDto {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceRef[];
  pending?: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: string;
  storageUsedBytes: number;
  storageLimitBytes: number;
  documentCount: number;
}
