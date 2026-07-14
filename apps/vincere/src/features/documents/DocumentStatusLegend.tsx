import { Badge, Card, SectionHeader } from '../../components/ui';
import { DOCUMENT_STATUS_DEFINITIONS } from '../../domain/documents/documentModel';
import './document-status.css';

export function DocumentStatusLegend() {
  return (
    <Card className="document-status-legend">
      <SectionHeader title="Bedeutung der Dokumentstatus" subtitle="Jeder Status besitzt eine eindeutige operative Aussage" />
      <div className="document-status-legend-grid">
        {DOCUMENT_STATUS_DEFINITIONS.map((status) => (
          <article key={status.id}>
            <Badge tone={status.tone}>{status.label}</Badge>
            <p>{status.meaning}</p>
          </article>
        ))}
      </div>
    </Card>
  );
}
