import {
  DocumentProviderError,
  type DocumentBinarySource,
  type DocumentLocator,
  type DocumentProviderOperation,
  type DocumentShareGrant,
  type DocumentShareRequest,
  type DocumentStorageProvider,
  type DocumentUploadRequest,
  type DocumentVersionRequest,
  type StoredDocumentMetadata,
} from './DocumentStorageProvider';

export interface MockDocumentProviderOptions {
  failOperations?: ReadonlyArray<DocumentProviderOperation>;
  actorId?: string;
  now?: () => string;
}

export class MockDocumentStorageProvider implements DocumentStorageProvider {
  readonly providerId = 'mock-metadata-only';
  readonly providerName = 'VINCERE Metadata-Only Mock';
  readonly calls: DocumentProviderOperation[] = [];

  private readonly failOperations: ReadonlySet<DocumentProviderOperation>;
  private readonly actorId: string;
  private readonly now: () => string;
  private readonly metadata = new Map<string, StoredDocumentMetadata>();
  private readonly grants = new Map<string, DocumentShareGrant>();

  constructor(options: MockDocumentProviderOptions = {}) {
    this.failOperations = new Set(options.failOperations ?? []);
    this.actorId = options.actorId ?? 'mock-user';
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async upload(request: DocumentUploadRequest): Promise<StoredDocumentMetadata> {
    this.record('upload');
    this.assertScope(request);
    if (request.source.sizeBytes !== request.sizeBytes || request.source.mimeType !== request.mimeType) {
      throw new DocumentProviderError({
        code: 'file_rejected',
        operation: 'upload',
        message: 'Die synthetischen Quelldaten stimmen nicht mit den Metadaten überein.',
      });
    }
    const stored = this.createMetadata(request, 1);
    this.metadata.set(this.key(request), stored);
    return stored;
  }

  async download(locator: DocumentLocator): Promise<DocumentBinarySource> {
    this.record('download');
    this.assertScope(locator);
    const stored = this.getMetadata(locator, 'download');
    return {
      sizeBytes: stored.sizeBytes,
      mimeType: stored.mimeType,
      openStream: () => new ReadableStream<Uint8Array>({
        start(controller) {
          controller.close();
        },
      }),
    };
  }

  async readMetadata(locator: DocumentLocator): Promise<StoredDocumentMetadata> {
    this.record('readMetadata');
    this.assertScope(locator);
    return this.getMetadata(locator, 'readMetadata');
  }

  async createVersion(request: DocumentVersionRequest): Promise<StoredDocumentMetadata> {
    this.record('createVersion');
    this.assertScope(request);
    const previous = this.getMetadata(request, 'createVersion');
    if (previous.version !== request.previousVersion) {
      throw new DocumentProviderError({
        code: 'file_rejected',
        operation: 'createVersion',
        message: 'Die angegebene Vorversion entspricht nicht dem Mock-Metadatenstand.',
      });
    }
    const stored = this.createMetadata(request, previous.version + 1);
    this.metadata.set(this.key(request), stored);
    return stored;
  }

  async delete(locator: DocumentLocator, reason: string): Promise<void> {
    this.record('delete');
    this.assertScope(locator);
    if (!reason.trim()) {
      throw new DocumentProviderError({ code: 'file_rejected', operation: 'delete', message: 'Eine Löschbegründung ist erforderlich.' });
    }
    this.getMetadata(locator, 'delete');
    this.metadata.delete(this.key(locator));
  }

  async createShareLink(request: DocumentShareRequest): Promise<DocumentShareGrant> {
    this.record('createShareLink');
    this.assertScope(request);
    this.getMetadata(request, 'createShareLink');
    const grant: DocumentShareGrant = {
      id: `mock-grant-${this.grants.size + 1}`,
      documentId: request.documentId,
      expiresAt: request.expiresAt,
      url: `mock://document-share/${request.documentId}`,
      revocable: true,
    };
    this.grants.set(grant.id, grant);
    return grant;
  }

  async revokeAccess(grantId: string, reason: string): Promise<void> {
    this.record('revokeAccess');
    if (!reason.trim() || !this.grants.has(grantId)) {
      throw new DocumentProviderError({ code: 'not_found', operation: 'revokeAccess', message: 'Die Mock-Freigabe konnte nicht widerrufen werden.' });
    }
    this.grants.delete(grantId);
  }

  private record(operation: DocumentProviderOperation) {
    this.calls.push(operation);
    if (this.failOperations.has(operation)) {
      throw new DocumentProviderError({
        code: 'mock_failure',
        operation,
        message: `Simulierter Providerfehler bei ${operation}.`,
        retryable: operation === 'download' || operation === 'readMetadata',
      });
    }
  }

  private assertScope(locator: DocumentLocator) {
    if (!locator.workspaceId.trim()) {
      throw new DocumentProviderError({ code: 'workspace_scope_violation', operation: 'readMetadata', message: 'Workspace-Scope fehlt.' });
    }
    if (!locator.propertyId.trim()) {
      throw new DocumentProviderError({ code: 'object_scope_violation', operation: 'readMetadata', message: 'Objekt-Scope fehlt.' });
    }
  }

  private createMetadata(request: DocumentUploadRequest, version: number): StoredDocumentMetadata {
    return {
      workspaceId: request.workspaceId,
      propertyId: request.propertyId,
      documentId: request.documentId,
      providerKey: `${request.workspaceId}/${request.propertyId}/${request.documentId}/v${version}`,
      fileName: request.fileName,
      mimeType: request.mimeType,
      sizeBytes: request.sizeBytes,
      checksumSha256: request.checksumSha256,
      version,
      createdAt: this.now(),
      createdBy: this.actorId,
    };
  }

  private getMetadata(locator: DocumentLocator, operation: DocumentProviderOperation) {
    const stored = this.metadata.get(this.key(locator));
    if (!stored) {
      throw new DocumentProviderError({ code: 'not_found', operation, message: 'Der Mock-Metadatensatz wurde nicht gefunden.' });
    }
    return stored;
  }

  private key(locator: DocumentLocator) {
    return `${locator.workspaceId}:${locator.propertyId}:${locator.documentId}`;
  }
}
