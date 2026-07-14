# VINCERE Mobile PWA – Validierungsgrenzen

Die verpflichtenden Prüfungen werden auf zwei Ebenen betrachtet:

1. Der Feature-Head wird unverändert gegen den stabilen technischen Vorgänger geprüft. Damit werden Typecheck, ESLint, Vitest und Produktionsbuild des Mobile-PWA-Arbeitspakets vollständig ausgeführt.
2. Der eigentliche gestapelte Draft-PR bleibt gegen `feat/vincere-communication-hub` gerichtet. Dort können unabhängig hinzugekommene Fehler des Zielbranches die kombinierte PR-CI blockieren.

Ein Fehler in einer ausdrücklich gesperrten Datei des Zielbranches wird nicht durch dieses Arbeitspaket verändert, ausgeblendet oder über eine abgeschwächte Lint-Regel umgangen. Die Ergebnisse beider Ebenen müssen im Draft-PR transparent dokumentiert werden.

Es erfolgen kein Merge und kein Deployment.
