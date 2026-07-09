# UI-/Design-Regeln

Vollständige Regeln: `docs/prd/02-ux-design-bible.md`.

- Jede klickbare Kennzahl/KPI muss in eine sichtbar gefilterte, arbeitsbereite Zielansicht führen (§6.2, §41 "Klickbare Zahl ohne gefiltertes Ziel" ist ein Anti-Pattern).
- Call-First: Telefonie steht im Dashboard über nachrangigen Analysen (§6, §7).
- Jede neue/geänderte Komponente braucht Normal-, Leer-, Lade-, Fehler- und ggf. Offline-Zustand (§21, §42).
- Desktop UND Mobile (390px) gleichzeitig planen, nicht Mobile "am Ende kurz prüfen" (§31, Teil 5 §40 Anti-Pattern-Tabelle).
- Kein zweites Dialogsystem, keine zweite Navigation, keine parallele Komponentenfamilie (§0.2).
- `KK_APP_SHELL.REGISTRY` und `KK_V30_SHELL.tabs` synchron halten, bis KK_NAV sie ersetzt.
- Statusfarben immer zusätzlich mit Text/Symbol, nie Farbe allein (§24, §32).
- Bestehende Card-Table-/Formular-Collapse-/Touch-Ziel-Patterns aus Phase E wiederverwenden statt neu erfinden.
