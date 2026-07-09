# Security-Regeln

Vollständige Regeln: `docs/prd/03-architecture-data-model.md` §35–§36, `docs/prd/05-claude-code-development-manual.md` §27.

- Keine API-Keys/Tokens/Secrets in `index.html`, Commits, Logs, Screenshots oder Chat-Antworten.
- Schlüsselpflichtige Provider ausschließlich über Netlify Functions + Environment Variables.
- Alle Nutzereingaben, die ins DOM geschrieben werden, über bestehende `esc()`/sichere DOM-Builder — kein neues ungefiltertes `innerHTML`.
- Importdateien vor Übernahme validieren (Schema, Größe, JSON-Gültigkeit); vor Import automatisch einen Wiederherstellungspunkt erzeugen.
- Fehlerlogs enthalten keine Telefonnummern, Notizen, Adressen oder Provider-Antworten im Klartext.
- CSP-Änderungen minimal halten und im Commit begründen; keine pauschale Lockerung.
- Secret im Repo gefunden → Blocker: sofort melden, nicht committen, Secret nicht selbst rotieren ohne Rücksprache.
