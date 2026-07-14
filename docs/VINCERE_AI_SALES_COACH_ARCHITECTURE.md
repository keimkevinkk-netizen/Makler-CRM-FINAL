# VINCERE KI-Verkaufscoach V2

## Umfang dieses Arbeitspakets

Der Telefonbereich nutzt eine deterministische, providerunabhängige Coach-Grundlage. Es gibt keine produktive Modellanbindung, keine API-Schlüssel und keine zusätzliche Persistenz. Der lokale Mock-Provider demonstriert strukturierte Requests und Responses, Timeout, Abbruch, Rate-Limit- und Fehlerzustände.

## Sicherheitsgrenze

Produktive Inferenz darf später nicht direkt aus dem Browser zu einem Modellanbieter erfolgen. Der Browser darf ausschließlich einen eigenen authentifizierten Server-/Edge-Endpunkt aufrufen. API-Schlüssel, Provider-Routing, Rate Limits, Auditierung, Kostenlimits, Inhaltsfilter und Protokollierung müssen serverseitig bleiben.

## Spätere Integrationspunkte

1. Einen serverseitigen Provider implementieren, der die `AiProvider`-Schnittstelle erfüllt und nur strukturierte, schema-validierte Antworten zurückgibt.
2. Workspace- und Benutzerkontext serverseitig autorisieren; nur minimal erforderliche Kontaktdaten übertragen.
3. Einwilligung, Datenschutz, Löschfristen und Auditierung für Gesprächsdaten definieren.
4. Die strukturierte Nachbereitung kontrolliert auf bestehende Telefon-, Follow-up- und Terminbefehle abbilden. Dieses Paket legt bewusst keine Follow-ups oder Termine automatisch an.
5. Streaming oder Live-Transkription erst nach einer separaten Datenschutz-, Berechtigungs- und Architekturentscheidung ergänzen.
6. Provider-Metriken, Kostenlimits, Rate-Limit-Rückgaben und Fallback-Verhalten zentral überwachen.

## Qualitätsprinzipien

- Fehlende Fakten werden als `Unbekannt` markiert.
- Mögliche Ziele und Einwände sind als Möglichkeiten formuliert, nicht als Tatsachen.
- Keine Garantien, Täuschung, künstliche Dringlichkeit oder aggressive Manipulation.
- Jeder Modus führt zu einem realistischen nächsten Schritt.
- Der Mock-Modus ist vollständig testbar und offline nutzbar.
