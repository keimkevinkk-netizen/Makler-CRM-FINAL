import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  buildDemoTransactionRoom,
  calculateChecklistProgress,
  createChecklist,
  createCompleteChecklist,
  deriveTransactionRisks,
  findDuplicateDocuments,
  findWrongPropertyAssignments,
  getDocumentTypeDefinition,
  normalizeDocumentType,
  type DocumentRecord,
} from '../src/domain/documents/documentModel';
import { DocumentStatusLegend } from '../src/features/documents/DocumentStatusLegend';
import { DocumentTransactionRoom } from '../src/features/transactions/DocumentTransactionRoom';
import { MockDocumentStorageProvider } from '../src/services/documents/MockDocumentStorageProvider';
import { DocumentProviderError } from '../src/services/documents/DocumentStorageProvider';

const documentRecord = (patch: Partial<DocumentRecord> = {}): DocumentRecord => ({
  id: 'document-1',
  workspaceId: 'workspace-1',
  propertyId: 'property-1',
  type: 'grundbuchauszug',
  title: 'Grundbuchauszug',
  status: 'vorhanden',
  version: 1,
  createdAt: '2026-07-14T08:00:00.000Z',
  updatedAt: '2026-07-14T08:00:00.000Z',
  ...patch,
});

const syntheticSource = () => {
  const openStream = vi.fn(() => new ReadableStream<Uint8Array>({
    start(controller) {
      controller.close();
    },
  }));
  return { source: { sizeBytes: 12, mimeType: 'application/pdf', openStream }, openStream };
};

describe('VINCERE Dokumenten- und Transaktionsraum', () => {
  it('berechnet eine vollständig erledigte Checkliste mit 100 Prozent', () => {
    const checklist = createCompleteChecklist('vermarktungsstart');
    expect(calculateChecklistProgress(checklist)).toEqual({ completed: checklist.length, total: checklist.length, percent: 100 });
  });

  it('erkennt fehlende und veraltete Dokumente als Risiken', () => {
    const room = buildDemoTransactionRoom();
    const risks = deriveTransactionRisks(room);
    expect(risks.some((risk) => risk.title.includes('Energieausweis: Fehlt'))).toBe(true);
    expect(risks.some((risk) => risk.title.includes('Grundbuchauszug: Veraltet'))).toBe(true);
  });

  it('ordnet unbekannte Dokumenttypen nicht ungeprüft einem Standardtyp zu', () => {
    expect(normalizeDocumentType('Unbekannte Sonderbescheinigung')).toBe('unknown');
    expect(getDocumentTypeDefinition('unknown').label).toBe('Unbekannter Dokumenttyp');
  });

  it('erkennt doppelte Dokumente je Workspace, Objekt und Typ', () => {
    const duplicates = findDuplicateDocuments([
      documentRecord(),
      documentRecord({ id: 'document-2', version: 2 }),
      documentRecord({ id: 'document-3', propertyId: 'property-2' }),
    ]);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].map((document) => document.id)).toEqual(['document-1', 'document-2']);
  });

  it('erkennt eine falsche Objektzuordnung', () => {
    const wrong = findWrongPropertyAssignments('property-1', [
      documentRecord(),
      documentRecord({ id: 'document-2', propertyId: 'property-2' }),
    ]);
    expect(wrong.map((document) => document.id)).toEqual(['document-2']);
  });

  it('berechnet den Fortschritt bei gleichem Zustand deterministisch', () => {
    const checklist = createChecklist('kaufvertragsvorbereitung').map((item, index) => ({
      ...item,
      status: index < 2 ? 'complete' as const : 'open' as const,
    }));
    expect(calculateChecklistProgress(checklist)).toEqual(calculateChecklistProgress([...checklist].reverse()));
  });

  it('zeigt einem Viewer keine schreibenden Aktionen', () => {
    render(<DocumentTransactionRoom role="viewer" />);
    expect(screen.getByText(/Viewer sehen den vollständigen Transaktionsstand/)).toBeInTheDocument();
    expect(screen.queryAllByTestId('write-action')).toHaveLength(0);
    expect(screen.queryByText(/Datei hochladen/i)).not.toBeInTheDocument();
  });

  it('erläutert alle neun Dokumentstatus verständlich', () => {
    render(<DocumentStatusLegend />);
    expect(screen.getAllByRole('article')).toHaveLength(9);
    expect(screen.getByText('Prüfung notwendig')).toBeInTheDocument();
    expect(screen.getByText(/benötigt aber noch eine fachliche oder rechtliche Prüfung/)).toBeInTheDocument();
  });

  it('liefert einen typisierten Mock-Providerfehler', async () => {
    const provider = new MockDocumentStorageProvider({ failOperations: ['readMetadata'] });
    await expect(provider.readMetadata({ workspaceId: 'workspace-1', propertyId: 'property-1', documentId: 'document-1' }))
      .rejects.toMatchObject<DocumentProviderError>({ code: 'mock_failure', operation: 'readMetadata', retryable: true });
  });

  it('führt im Metadata-Only Mock keine echten Datei- oder Netzwerkoperationen aus', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { source, openStream } = syntheticSource();
    const provider = new MockDocumentStorageProvider({ now: () => '2026-07-14T08:00:00.000Z' });

    const metadata = await provider.upload({
      workspaceId: 'workspace-1',
      propertyId: 'property-1',
      documentId: 'document-1',
      fileName: 'synthetic.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 12,
      checksumSha256: 'synthetic-checksum',
      source,
    });

    expect(metadata.providerKey).toBe('workspace-1/property-1/document-1/v1');
    expect(openStream).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
