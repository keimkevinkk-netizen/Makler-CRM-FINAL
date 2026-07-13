import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui';
import { useAppStore } from '../../app/AppStore';
import type { Contact } from '../../types/domain';

export function ContactForm({ onDone }: { onDone: () => void }) {
  const { addContact } = useAppStore();
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', city: '', source: 'Direktkontakt', role: 'Eigentümer' as Contact['role'], notes: '' });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    addContact({
      ...form,
      stage: 'lead',
      priority: 'medium',
      potential: 50,
    });
    onDone();
  };

  return (
    <form className="form-grid" onSubmit={submit}>
      <label>Vorname<input required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></label>
      <label>Nachname<input required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></label>
      <label>Telefon<input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
      <label>E-Mail<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
      <label>Ort<input required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
      <label>Quelle<input value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} /></label>
      <label>Rolle<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Contact['role'] })}><option>Eigentümer</option><option>Käufer</option><option>Tippgeber</option><option>Netzwerk</option></select></label>
      <label className="form-span">Notizen<textarea rows={4} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
      <div className="form-actions form-span"><Button variant="secondary" type="button" onClick={onDone}>Abbrechen</Button><Button type="submit">Kontakt speichern</Button></div>
    </form>
  );
}
