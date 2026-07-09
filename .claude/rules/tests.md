# Test-Regeln

Vollständige Regeln: `docs/prd/05-claude-code-development-manual.md` §22–§26.

## Pflicht vor jedem Phase-Commit
1. Playwright-Smoke-Test: alle Haupttabs (Heute, Marktmonitor, CRM, Follow-ups, Pipeline, Tippgeber, KI-Prompts, KPIs, Backup, Wissen) auf Desktop 1440×1000 und Mobile 390×844.
2. Kein horizontaler Body-Overflow (`document.documentElement.scrollWidth <= clientWidth + 3`).
3. Keine ungeklärten Console-Errors/pageerrors.
4. XSS-Regressionstest (Payload in Namens-/Freitextfeld, prüfen dass kein `<img>`/Script ungeescaped im DOM landet).
5. **Mit echten synthetischen Datensätzen testen, nicht nur Leerzustand** — mehrere reale Bugs (z. B. Card-Table-Overflow) wurden erst mit befüllten Listen sichtbar.
6. Bei Storage-/Migrationsänderungen: Export → Reload → Re-Import-Test.

## Viewports (bei UI-Phasen zusätzlich)
1440×1000 (Desktop-Referenz), 1280×800, 768×1024 (Tablet), 430×932, 390×844 (primärer Mobile-Referenzwert), 375×812.

## Ergebnis-Status
PASS / PASS WITH NOTES / FAIL / BLOCKED — siehe Teil 5 §23. Kein Commit als "fertig" bei FAIL.
