import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { X } from 'lucide-react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="section-header">
      <div>
        <span className="section-accent" />
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Button({ children, variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'red' | 'gold' | 'green' | 'blue' | 'neutral' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Schließen"><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty-state"><strong>{title}</strong><span>{text}</span></div>;
}
