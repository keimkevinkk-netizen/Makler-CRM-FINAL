# VINCERE Mobile PWA – Validierungsgrenzen

Die verpflichtenden Prüfungen werden auf dem tatsächlichen gestapelten Draft-PR gegen `feat/vincere-communication-hub` ausgeführt. Damit werden Typecheck, ESLint, Vitest und Produktionsbuild gemeinsam mit dem aktuellen Zielbranch geprüft.

Unabhängig hinzugekommene Fehler des Zielbranches werden nicht durch dieses Arbeitspaket verändert, ausgeblendet oder über abgeschwächte Regeln umgangen. Sobald der Zielbranch korrigiert ist, muss die reguläre Produkt-PR-CI erneut vollständig laufen.

Maßgeblich sind ausschließlich die Ergebnisse des Produkt-PRs. Temporäre technische Prüf-PRs werden geschlossen und nicht gemergt.

Es erfolgen kein Merge und kein Deployment.
