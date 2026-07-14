export type DocumentProviderOperation =
  | 'upload'
  | 'download'
  | 'readMetadata'
  | 'createVersion'
  | 'delete'
  | 'createShareLink'
  | 'revokeAccess';

export interface DocumentBinarySource {
  readonly sizeBytes: number;
  readonly mimeType: string;
  readonly openStream: () => ReadableStream<Uint8Array>;
}

export interface DocumentUploadRequest {
  workspaceId: string;
  propertyId: string;
  documentId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  source: DocumentBinarySource;
}

export interface DocumentLocator {
  workspaceId: string;
  propertyId: string;
  documentId: string;
  version?: number;
}

export interface StoredDocumentMetadata extends DocumentLocator {
  providerKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  version: number;
  createdAt: string;
  createdBy: string;
}

export interface DocumentVersionRequest extends DocumentUploadRequest {
  previousVersion: number;
  reason: string;
}

export interface DocumentShareRequest extends DocumentLocator {
  expiresAt: string;
  purpose: string;
  recipientReference?: string;
}

export interface DocumentShareGrant {
  id: string;
  documentId: string;
  expiresAt: string;
  url: string;
  revocable: boolean;
}

export interface DocumentStorageProvider {
  readonly providerId: string;
  readonly providerName: string;
  upload(request: DocumentUploadRequest): Promise<StoredDocumentMetadata>;
  download(locator: DocumentLocator): Promise<DocumentBinarySource>;
  readMetadata(locator: DocumentLocator): Promise<StoredDocumentMetadata>;
  createVersion(request: DocumentVersionRequest): Promise<StoredDocumentMetadata>;
  delete(locator: DocumentLocator, reason: string): Promise<void>;
  createShareLink(request: DocumentShareRequest): Promise<DocumentShareGrant>;
  revokeAccess(grantId: string, reason: string): Promise<void>;
}

export type DocumentProviderErrorCode =
  | 'provider_unavailable'
  | 'operation_not_supported'
  | 'workspace_scope_violation'
  | 'object_scope_violation'
  | 'file_rejected'
  | 'not_found'
  | 'access_denied'
  | 'mock_failure';

export class DocumentProviderError extends Error {
  readonly code: DocumentProviderErrorCode;
  readonly operation: DocumentProviderOperation;
  readonly retryable: boolean;

  constructor(options: {
    code: DocumentProviderErrorCode;
    operation: DocumentProviderOperation;
    message: string;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = 'DocumentProviderError';
    this.code = options.code;
    this.operation = options.operation;
    this.retryable = options.retryable ?? false;
  }
}
