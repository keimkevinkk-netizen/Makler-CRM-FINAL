import type { ConversationMode, ConversationModeId, ConversationStep, ConversationStepId, ObjectionGuide } from './salesCoachTypes';

const stepLabels: Record<ConversationStepId, string> = {
  opening: 'Einstieg',
  needs: 'Bedarfsermittlung',
  situation: 'Situation',
  motivation: 'Motivation',
  problem: 'Problem',
  consequence: 'Konsequenz',
  solution: 'Lösung',
  trust: 'Vertrauen',
  next_step: 'Nächster Schritt',
  close: 'Terminabschluss',
};

interface ModeBlueprint {
  label: string;
  shortLabel: string;
  description: string;
  minimumGoal: string;
  idealGoal: string;
  prompts: Record<ConversationStepId, string>;
  objectives: Record<ConversationStepId, string>;
}

const sharedListening = {
  opening: ['Zeitfenster', 'Gesprächsbereitschaft', 'aktueller Anlass'],
  needs: ['Erwartungen', 'Prioritäten', 'Entscheidungskriterien'],
  situation: ['Ausgangslage', 'Beteiligte', 'Zeithorizont'],
  motivation: ['persönlicher Treiber', 'gewünschtes Ergebnis', 'Dringlichkeit'],
  problem: ['Unsicherheit', 'Hindernisse', 'negative Erfahrung'],
  consequence: ['Risiko des Nichtstuns', 'Zeitverlust', 'finanzielle oder emotionale Belastung'],
  solution: ['passender Nutzen', 'gewünschte Unterstützung', 'Grenzen'],
  trust: ['Nachweisbedarf', 'Sicherheitsbedürfnis', 'Entscheidungsweg'],
  next_step: ['kleinste sinnvolle Zusage', 'Verantwortlicher', 'Termin'],
  close: ['Verbindlichkeit', 'Kalendereintrag', 'offene Bedingung'],
} satisfies Record<ConversationStepId, string[]>;

function makeSteps(blueprint: ModeBlueprint): ConversationStep[] {
  return (Object.keys(stepLabels) as ConversationStepId[]).map((id) => ({
    id,
    label: stepLabels[id],
    objective: blueprint.objectives[id],
    guidance: `Zuhören, zusammenfassen und nur mit dokumentierten Informationen weiterarbeiten. ${blueprint.objectives[id]}`,
    prompt: blueprint.prompts[id],
    listenFor: sharedListening[id],
  }));
}

const commonObjectives: Record<ConversationStepId, string> = {
  opening: 'Erlaubnis und einen klaren Rahmen für das Gespräch schaffen.',
  needs: 'Verstehen, was für die Person heute relevant ist.',
  situation: 'Die bekannte Ausgangslage überprüfen, ohne Annahmen als Fakten darzustellen.',
  motivation: 'Den persönlichen Anlass und die gewünschte Veränderung erkennen.',
  problem: 'Konkrete Hürden und Unsicherheiten sichtbar machen.',
  consequence: 'Auswirkungen sachlich klären, ohne Druck oder Angst zu erzeugen.',
  solution: 'Nur eine passende und realistische Unterstützung anbieten.',
  trust: 'Transparenz, Kompetenz und Entscheidungsfreiheit sichern.',
  next_step: 'Den kleinsten sinnvollen und beidseitig passenden Schritt vereinbaren.',
  close: 'Zeitpunkt, Verantwortlichkeit und Erwartung eindeutig bestätigen.',
};

const blueprints: Record<ConversationModeId, ModeBlueprint> = {
  owner_first_contact: {
    label: 'Erstkontakt Eigentümer', shortLabel: 'Erstkontakt',
    description: 'Respektvoller Erstkontakt zur Situation, Motivation und möglichen nächsten Orientierung.',
    minimumGoal: 'Erlaubnis für einen qualifizierten Folgekontakt mit dokumentiertem Anlass.',
    idealGoal: 'Konkreter Termin für eine unverbindliche Situations- oder Wertermittlung.',
    objectives: commonObjectives,
    prompts: {
      opening: 'Guten Tag, hier ist [Name] von VINCERE. Passt es für zwei Minuten, damit ich kurz den Anlass meines Anrufs einordnen kann?',
      needs: 'Was wäre für Sie bei einer möglichen Immobilienentscheidung besonders wichtig?',
      situation: 'Wie ist der aktuelle Stand – geht es bereits um einen Verkauf, um Orientierung oder noch um eine offene Überlegung?',
      motivation: 'Was hat das Thema gerade jetzt relevant gemacht?',
      problem: 'Wo sehen Sie aktuell die größte Unsicherheit oder Hürde?',
      consequence: 'Was wäre für Sie problematisch, wenn diese Frage in den nächsten Monaten ungeklärt bleibt?',
      solution: 'Welche Art von Unterstützung wäre hilfreich, ohne dass Sie sich heute zu etwas verpflichten müssen?',
      trust: 'Woran würden Sie erkennen, dass eine Beratung für Sie seriös und nützlich ist?',
      next_step: 'Wäre eine kurze, unverbindliche Bestandsaufnahme der sinnvollste nächste Schritt?',
      close: 'Welcher konkrete Zeitpunkt passt für diese Bestandsaufnahme?',
    },
  },
  owner_follow_up: {
    label: 'Follow-up Eigentümer', shortLabel: 'Follow-up',
    description: 'An frühere Aussagen anknüpfen, Veränderungen prüfen und einen klaren nächsten Schritt sichern.',
    minimumGoal: 'Aktuellen Stand und neuen Wiedervorlagetermin dokumentieren.',
    idealGoal: 'Konkreten Bewertungs- oder Beratungstermin vereinbaren.',
    objectives: commonObjectives,
    prompts: {
      opening: 'Guten Tag, wir hatten zuletzt über [dokumentierter Anlass] gesprochen. Passt es kurz, den aktuellen Stand abzugleichen?',
      needs: 'Was ist seit unserem letzten Gespräch wichtiger oder klarer geworden?',
      situation: 'Welche Punkte sind inzwischen entschieden und welche noch offen?',
      motivation: 'Was müsste passieren, damit Sie den nächsten Schritt jetzt angehen?',
      problem: 'Was hält Sie im Moment noch konkret zurück?',
      consequence: 'Welche Auswirkungen hätte es, wenn die Entscheidung weiter offen bleibt?',
      solution: 'Welche Information oder Unterstützung würde die Entscheidung erleichtern?',
      trust: 'Welche offenen Fragen muss ich transparent beantworten, bevor ein weiterer Schritt sinnvoll ist?',
      next_step: 'Welcher kleine nächste Schritt passt zu Ihrem aktuellen Stand?',
      close: 'Wann halten wir diesen Schritt verbindlich fest?',
    },
  },
  valuation_appointment: {
    label: 'Bewertungstermin vereinbaren', shortLabel: 'Bewertung',
    description: 'Nutzen, Ablauf und Grenzen einer Bewertung transparent klären.',
    minimumGoal: 'Erlaubnis, die benötigten Eckdaten strukturiert nachzufassen.',
    idealGoal: 'Bewertungstermin mit klaren Erwartungen und Beteiligten festlegen.',
    objectives: commonObjectives,
    prompts: {
      opening: 'Ich möchte kurz prüfen, ob eine Bewertung in Ihrer Situation wirklich der passende nächste Schritt ist.',
      needs: 'Wofür benötigen Sie die Einschätzung – Orientierung, Entscheidung, Finanzierung oder Verkaufsvorbereitung?',
      situation: 'Welche Eckdaten und Unterlagen liegen bereits vor?',
      motivation: 'Welche Entscheidung soll die Bewertung für Sie erleichtern?',
      problem: 'Wo fehlt Ihnen aktuell Sicherheit beim Wert oder beim weiteren Vorgehen?',
      consequence: 'Welche Fehlentscheidung möchten Sie mit einer fundierten Einschätzung vermeiden?',
      solution: 'Wäre eine transparente Marktwertspanne mit erklärten Annahmen für Sie hilfreich?',
      trust: 'Welche Fragen zu Methode, Datenbasis oder Unverbindlichkeit sind Ihnen wichtig?',
      next_step: 'Lassen Sie uns die Immobilie und Ihre Zielsetzung gemeinsam aufnehmen.',
      close: 'Wer sollte teilnehmen und welcher Termin passt?',
    },
  },
  referral_partner: {
    label: 'Empfehlung und Tippgeber', shortLabel: 'Tippgeber',
    description: 'Eine hilfreiche Verbindung ermöglichen, ohne Druck auf den Kontakt oder Dritte auszuüben.',
    minimumGoal: 'Ein klares Empfehlungsprofil und erlaubten Kontaktweg erhalten.',
    idealGoal: 'Konkrete, einvernehmliche Vorstellung bei einer passenden Person.',
    objectives: commonObjectives,
    prompts: {
      opening: 'Ich möchte kurz verstehen, bei welchen Immobilienthemen ich Ihrem Umfeld sinnvoll helfen kann.',
      needs: 'Welche Situationen erleben Sie bei Kunden, Kollegen oder Bekannten besonders häufig?',
      situation: 'Wie entstehen bei Ihnen normalerweise Empfehlungen oder Vorstellungen?',
      motivation: 'Was müsste gegeben sein, damit eine Empfehlung für Sie wirklich verantwortbar ist?',
      problem: 'Was macht Empfehlungen für Sie schwierig oder riskant?',
      consequence: 'Was passiert, wenn Betroffene zu spät eine neutrale Orientierung bekommen?',
      solution: 'Welche Form einer diskreten Erstorientierung wäre für Ihr Umfeld passend?',
      trust: 'Welche Standards erwarten Sie im Umgang mit einer empfohlenen Person?',
      next_step: 'Darf ich Ihnen eine kurze, weiterleitbare Beschreibung meines Angebots senden?',
      close: 'Über welchen Kanal und bis wann ist das sinnvoll?',
    },
  },
  buyer_qualification: {
    label: 'Käuferqualifizierung', shortLabel: 'Käufer',
    description: 'Bedarf, Entscheidungsreife und Rahmenbedingungen sauber erfassen.',
    minimumGoal: 'Suchprofil und fehlende Qualifikationsdaten dokumentieren.',
    idealGoal: 'Vollständiges Suchprofil mit realistischem nächsten Besichtigungsschritt.',
    objectives: commonObjectives,
    prompts: {
      opening: 'Damit ich nur passende Angebote einordne, würde ich Ihr Suchprofil kurz strukturiert verstehen.',
      needs: 'Welche drei Kriterien sind für Ihre Entscheidung unverzichtbar?',
      situation: 'Wo stehen Sie bei Finanzierung, Suchgebiet und Zeitplan?',
      motivation: 'Was ist der wichtigste Grund für den geplanten Kauf?',
      problem: 'Was hat bei bisherigen Angeboten nicht gepasst?',
      consequence: 'Welche Kompromisse wären teuer oder langfristig unpassend?',
      solution: 'Welche Prioritäten darf ich bei passenden Angeboten gegeneinander abwägen?',
      trust: 'Wie möchten Sie über Chancen, Risiken und fehlende Informationen informiert werden?',
      next_step: 'Welche Unterlagen oder Angaben vervollständigen wir als Nächstes?',
      close: 'Wann gleichen wir das erste passende Angebot gemeinsam ab?',
    },
  },
  network_conversation: {
    label: 'Netzwerkgespräch', shortLabel: 'Netzwerk',
    description: 'Gemeinsame Zielgruppen und gegenseitigen Nutzen ohne leere Versprechen klären.',
    minimumGoal: 'Relevanz und einen konkreten Wiedervorlagegrund dokumentieren.',
    idealGoal: 'Kleines gemeinsames Pilotvorhaben oder qualifizierten Vorstellungstermin vereinbaren.',
    objectives: commonObjectives,
    prompts: {
      opening: 'Ich möchte prüfen, ob unsere Arbeit für dieselben Menschen an unterschiedlichen Stellen hilfreich ist.',
      needs: 'Welche Kundensituationen haben für Sie derzeit höchste Priorität?',
      situation: 'Wo gibt es heute bereits Berührungspunkte mit Immobilienthemen?',
      motivation: 'Was wäre eine Zusammenarbeit, die für Sie echten Nutzen stiftet?',
      problem: 'Wo gehen heute Chancen oder Informationen zwischen Beteiligten verloren?',
      consequence: 'Welche Nachteile entstehen daraus für Kunden oder Prozesse?',
      solution: 'Welcher kleine, klar begrenzte Kooperationsansatz wäre sinnvoll?',
      trust: 'Welche Regeln zu Datenschutz, Qualität und Rückmeldung müssen gelten?',
      next_step: 'Welchen konkreten Fall oder Prozess können wir unverbindlich testen?',
      close: 'Wer macht was bis wann?',
    },
  },
  reactivation: {
    label: 'Reaktivierung', shortLabel: 'Reaktivierung',
    description: 'Einen ruhenden Kontakt mit ehrlichem Anlass und ohne künstliche Dringlichkeit neu einordnen.',
    minimumGoal: 'Aktuellen Status und Erlaubnis für künftige Kontaktaufnahme klären.',
    idealGoal: 'Neuen, relevanten Gesprächsanlass mit konkretem Folgeschritt vereinbaren.',
    objectives: commonObjectives,
    prompts: {
      opening: 'Unser letzter Austausch liegt etwas zurück. Ich möchte nicht einfach nachfassen, sondern kurz prüfen, ob das Thema für Sie noch relevant ist.',
      needs: 'Was hat sich seitdem bei Ihren Prioritäten verändert?',
      situation: 'Ist das damalige Thema erledigt, verschoben oder weiterhin offen?',
      motivation: 'Was könnte es wieder aktuell machen?',
      problem: 'Welche Hürde bestand damals oder besteht heute noch?',
      consequence: 'Gibt es einen Nachteil, wenn das Thema weiter unbeachtet bleibt?',
      solution: 'Welche neue Information wäre heute tatsächlich hilfreich?',
      trust: 'Wie und wie häufig darf ich sinnvoll Kontakt halten?',
      next_step: 'Soll ich einen konkreten Informationspunkt nachreichen oder das Thema vorerst schließen?',
      close: 'Welcher Zeitpunkt oder Auslöser ist für einen erneuten Kontakt passend?',
    },
  },
  objection_handling: {
    label: 'Einwandbehandlung', shortLabel: 'Einwand',
    description: 'Einwände verstehen, respektieren und in einen realistischen nächsten Schritt übersetzen.',
    minimumGoal: 'Tatsächliches Motiv hinter dem Einwand besser verstehen.',
    idealGoal: 'Einvernehmlichen nächsten Schritt trotz berechtigter Bedenken vereinbaren.',
    objectives: commonObjectives,
    prompts: {
      opening: 'Danke, dass Sie das so klar sagen. Darf ich kurz verstehen, was Ihnen dabei besonders wichtig ist?',
      needs: 'Welche Bedingung müsste erfüllt sein, damit das Thema für Sie sinnvoll wird?',
      situation: 'Welche Erfahrung oder Information prägt Ihre aktuelle Einschätzung?',
      motivation: 'Welches Ergebnis möchten Sie auf jeden Fall schützen?',
      problem: 'Was genau wäre aus Ihrer Sicht das größte Risiko?',
      consequence: 'Welche Alternative wäre für Sie akzeptabel, falls dieses Risiko bestehen bleibt?',
      solution: 'Darf ich eine Option erläutern, die genau diese Grenze berücksichtigt?',
      trust: 'Welche Nachweise oder Transparenz benötigen Sie, um die Option fair zu prüfen?',
      next_step: 'Was wäre der kleinste unverbindliche Schritt, den Sie mittragen können?',
      close: 'Wie halten wir diesen Schritt und Ihre Bedingungen fest?',
    },
  },
};

export const conversationModes: ConversationMode[] = (Object.keys(blueprints) as ConversationModeId[]).map((id) => ({
  id,
  ...blueprints[id],
  steps: makeSteps(blueprints[id]),
}));

export function getConversationMode(id: ConversationModeId) {
  return conversationModes.find((mode) => mode.id === id) ?? conversationModes[0];
}

export const objectionGuides: ObjectionGuide[] = [
  { id:'no_agent', objection:'Ich möchte keinen Makler', type:'Grundsatz-/Vertrauenseinwand', possibleMotive:'Wunsch nach Kontrolle, schlechte Erfahrung oder unklarer Nutzen.', followUpQuestion:'Was ist der wichtigste Grund, weshalb Sie einen Makler aktuell ausschließen?', responseStrategy:'Motiv anerkennen, konkrete Erwartung klären und nur einen unverbindlichen Informationsschritt anbieten.', unsuitableReaction:'Den Einwand kleinreden oder behaupten, ein Verkauf ohne Makler werde scheitern.', realisticGoal:'Erlaubnis für eine neutrale Situations- oder Marktpreiseinschätzung.' },
  { id:'private_first', objection:'Ich versuche es zuerst privat', type:'Autonomie-/Kosteneinwand', possibleMotive:'Kosten sparen, Kontrolle behalten oder Nachfrage testen.', followUpQuestion:'Woran würden Sie erkennen, dass der private Weg für Sie gut funktioniert?', responseStrategy:'Erfolgskriterien, Zeitrahmen und Risiken sachlich klären; Unterstützung als optionalen Vergleich anbieten.', unsuitableReaction:'Zeitdruck erzeugen oder private Verkaufsversuche abwerten.', realisticGoal:'Klarer Prüfzeitpunkt und Erlaubnis für ein späteres Follow-up.' },
  { id:'commission', objection:'Die Provision ist zu hoch', type:'Preis-/Werteinwand', possibleMotive:'Nutzen ist nicht klar, Budgetschutz oder Vergleich mit Alternativen.', followUpQuestion:'Welcher konkrete Nutzen müsste die Kosten für Sie rechtfertigen?', responseStrategy:'Leistungsumfang, Risiken und Nettoergebnis transparent machen, ohne Garantien.', unsuitableReaction:'Provision sofort rabattieren oder einen höheren Verkaufspreis versprechen.', realisticGoal:'Transparenter Leistungs- und Kostenvergleich.' },
  { id:'existing_agent', objection:'Ich habe bereits einen Makler', type:'Bindungs-/Loyalitätseinwand', possibleMotive:'Bestehender Vertrag, Zufriedenheit oder Wunsch nach Ruhe.', followUpQuestion:'Sind Sie mit der aktuellen Zusammenarbeit und dem Fortschritt zufrieden?', responseStrategy:'Bestehende Beziehung respektieren; nur bei ausdrücklichem Bedarf neutrale Zweitmeinung anbieten.', unsuitableReaction:'Den anderen Makler schlechtreden oder zur Vertragsverletzung drängen.', realisticGoal:'Kontakt respektvoll beenden oder erlaubten Wiedervorlagepunkt notieren.' },
  { id:'value_only', objection:'Ich möchte nur wissen, was die Immobilie wert ist', type:'Informationsanfrage', possibleMotive:'Orientierung, Vermögensplanung oder spätere Entscheidung.', followUpQuestion:'Welche Entscheidung möchten Sie mit der Werteinschätzung besser treffen?', responseStrategy:'Bewertungszweck, Datenbasis und Grenzen erklären; keine Verkaufsabsicht unterstellen.', unsuitableReaction:'Die Bewertung an einen Vermittlungsauftrag koppeln.', realisticGoal:'Sauber definierter Bewertungsauftrag mit benötigten Daten.' },
  { id:'not_selling', objection:'Ich verkaufe aktuell noch nicht', type:'Zeitpunkt-/Relevanzeinwand', possibleMotive:'Frühe Orientierung, familiäre Abstimmung oder fehlende Dringlichkeit.', followUpQuestion:'Was müsste sich ändern, damit das Thema später relevant wird?', responseStrategy:'Zeitpunkt respektieren und nur einen sinnvollen Auslöser für erneuten Kontakt vereinbaren.', unsuitableReaction:'Künstliche Knappheit oder Angst vor fallenden Preisen einsetzen.', realisticGoal:'Erlaubter Wiedervorlagezeitpunkt oder Auslöser.' },
  { id:'call_later', objection:'Rufen Sie später noch einmal an', type:'Zeit-/Prioritätseinwand', possibleMotive:'Unpassender Moment, geringe Relevanz oder höfliche Abwehr.', followUpQuestion:'Gerne – welcher Zeitpunkt und welches Thema machen den Rückruf für Sie sinnvoll?', responseStrategy:'Konkreten Zeitpunkt, Anlass und bevorzugten Kanal bestätigen.', unsuitableReaction:'Ohne Termin wiederholt anrufen.', realisticGoal:'Konkrete, erlaubte Wiedervorlage.' },
  { id:'number_source', objection:'Woher haben Sie meine Nummer?', type:'Datenschutz-/Vertrauenseinwand', possibleMotive:'Sorge über Datenherkunft und unerwünschte Kontaktaufnahme.', followUpQuestion:'Möchten Sie zuerst genau wissen, aus welcher dokumentierten Quelle der Kontakt stammt?', responseStrategy:'Nur die tatsächlich dokumentierte Quelle nennen, transparent informieren und Widerspruch respektieren.', unsuitableReaction:'Ausweichen, eine Quelle erfinden oder Einwilligung behaupten.', realisticGoal:'Transparenz herstellen und Kontaktwunsch eindeutig klären.' },
  { id:'know_someone', objection:'Ich kenne bereits jemanden', type:'Beziehungs-/Alternativeneinwand', possibleMotive:'Vertrauen in bekannte Person oder höfliche Abgrenzung.', followUpQuestion:'Ist damit Ihre Unterstützung bereits vollständig geklärt?', responseStrategy:'Beziehung respektieren; nur ergänzende Orientierung anbieten, wenn ein echter Bedarf besteht.', unsuitableReaction:'Bekannte Person abwerten oder Loyalität infrage stellen.', realisticGoal:'Bedarf klären oder Gespräch sauber beenden.' },
  { id:'family', objection:'Ich möchte erst mit meiner Familie sprechen', type:'Entscheidungsprozess', possibleMotive:'Gemeinsame Eigentümerschaft, Rückversicherung oder offene Interessen.', followUpQuestion:'Welche Informationen braucht Ihre Familie für eine gute gemeinsame Entscheidung?', responseStrategy:'Entscheidungsprozess unterstützen, Unterlagen anbieten und alle relevanten Personen einbeziehen.', unsuitableReaction:'Zur sofortigen Entscheidung drängen oder Familienmitglieder umgehen.', realisticGoal:'Benötigte Informationen und gemeinsamer Folgetermin.' },
];
