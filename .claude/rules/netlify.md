# Netlify-/Deploy-Regeln

Vollständige Regeln: `docs/prd/05-claude-code-development-manual.md` §29–§30.

- `main` ist der Produktionsbranch (aktuell `index.html` = Kopie der App für Netlify-Root-Deploy). Kein Push auf `main` ohne ausdrückliche Freigabe.
- Environment Variables niemals im Repo oder in Logs.
- Deploy Previews sind der Abnahmeweg vor Produktion, nicht die Produktionsfreigabe selbst.
- Bei Function-Änderungen: Fehler-, Timeout- und Stale-Fall explizit testen, nicht nur den Erfolgsfall.
- Nach jedem Produktions-Deploy: kurzer Smoke-Test (Heute, CRM, Follow-ups, Pipeline, Markt, Backup).
- Aktuell existiert noch keine Zugriffsschutzstrategie für die öffentliche URL — bis diese entschieden ist, keine zusätzlichen produktiven personenbezogenen Echtdaten-Layer freischalten (siehe ADR-0000, offene Lücke; PRD Teil 1 §16).
