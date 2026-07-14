import { useMemo, useState } from 'react';
import { learningPaths, buildTrainingProgress, getLearningPath } from '../../domain/training/learningPaths';
import { getTrainingScenario } from '../../domain/training/scenarios';
import type { LearningPathId, TrainingScenarioId } from '../../domain/training/types';
import { evaluateTrainingResponse } from '../simulation/evaluationEngine';
import {
  createMockSimulationProvider,
  SimulationProviderUnavailableError,
  type SimulationProvider,
} from '../simulation/mockSimulationProvider';
import './academy.css';

interface TranscriptEntry {
  id: string;
  speaker: 'trainee' | 'partner';
  text: string;
}

export interface AcademyPageProps {
  provider?: SimulationProvider;
  initialPathId?: LearningPathId;
}

function entryId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AcademyPage({ provider, initialPathId = 'beginner' }: AcademyPageProps) {
  const initialPath = getLearningPath(initialPathId);
  const [pathId, setPathId] = useState<LearningPathId>(initialPathId);
  const [scenarioId, setScenarioId] = useState<TrainingScenarioId>(initialPath.scenarioIds[0]);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [draft, setDraft] = useState('');
  const [completedScenarioIds, setCompletedScenarioIds] = useState<TrainingScenarioId[]>([]);
  const [providerMessage, setProviderMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const simulator = useMemo(() => provider ?? createMockSimulationProvider(), [provider]);

  const path = getLearningPath(pathId);
  const scenario = getTrainingScenario(scenarioId);
  const progress = buildTrainingProgress(pathId, completedScenarioIds);
  const traineeResponses = transcript
    .filter((entry) => entry.speaker === 'trainee')
    .map((entry) => entry.text);
  const evaluation = evaluateTrainingResponse({ scenario, responses: traineeResponses });
  const currentScenarioIndex = path.scenarioIds.indexOf(scenarioId);

  const resetScenario = (nextScenarioId: TrainingScenarioId) => {
    setScenarioId(nextScenarioId);
    setTranscript([]);
    setDraft('');
    setProviderMessage('');
  };

  const selectPath = (nextPathId: LearningPathId) => {
    const nextPath = getLearningPath(nextPathId);
    setPathId(nextPathId);
    resetScenario(nextPath.scenarioIds[0]);
  };

  const sendResponse = async () => {
    const message = draft.trim();
    if (!message || isSending) return;

    const nextTraineeEntry: TranscriptEntry = {
      id: entryId('trainee'),
      speaker: 'trainee',
      text: message,
    };
    setTranscript((current) => [...current, nextTraineeEntry]);
    setDraft('');
    setProviderMessage('');
    setIsSending(true);

    try {
      const reply = await simulator.reply({
        scenario,
        traineeMessage: message,
        turn: traineeResponses.length,
      });
      setTranscript((current) => [
        ...current,
        { id: entryId('partner'), speaker: 'partner', text: reply.text },
      ]);
    } catch (reason) {
      setProviderMessage(
        reason instanceof SimulationProviderUnavailableError
          ? reason.message
          : 'Die lokale Simulation konnte diese Antwort nicht verarbeiten.',
      );
    } finally {
      setIsSending(false);
    }
  };

  const completeScenario = () => {
    if (traineeResponses.length === 0 || evaluation.totalScore < path.recommendedMinimumScore) return;
    setCompletedScenarioIds((current) => current.includes(scenarioId) ? current : [...current, scenarioId]);
  };

  return (
    <main className="academy-shell">
      <header className="academy-header">
        <div>
          <p className="academy-eyebrow">VINCERE Vertriebsakademie</p>
          <h1>Gespräche trainieren. Leistung messbar verbessern.</h1>
          <p>Lokale, deterministische Simulation ohne produktive KI-Anbindung oder echte Kundendaten.</p>
        </div>
        <div className="academy-progress-card" aria-label="Lernfortschritt">
          <div>
            <span>{path.label}</span>
            <strong>{progress.percent}%</strong>
          </div>
          <div className="academy-progress-track"><span style={{ width: `${progress.percent}%` }} /></div>
          <small>{progress.completed} von {progress.total} Szenarien abgeschlossen</small>
        </div>
      </header>

      <div className="academy-layout">
        <aside className="academy-sidebar">
          <section>
            <p className="academy-section-label">Lernpfade</p>
            <nav className="academy-path-list" aria-label="Lernpfade">
              {learningPaths.map((learningPath) => (
                <button
                  key={learningPath.id}
                  className={learningPath.id === pathId ? 'is-active' : ''}
                  onClick={() => selectPath(learningPath.id)}
                  type="button"
                >
                  <span>{learningPath.label}</span>
                  <small>{learningPath.scenarioIds.length} Module</small>
                </button>
              ))}
            </nav>
          </section>

          <section>
            <p className="academy-section-label">Szenarien</p>
            <div className="academy-scenario-list">
              {path.scenarioIds.map((id, index) => {
                const item = getTrainingScenario(id);
                const completed = completedScenarioIds.includes(id);
                return (
                  <button
                    key={id}
                    className={id === scenarioId ? 'is-active' : ''}
                    onClick={() => resetScenario(id)}
                    type="button"
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <small>Stufe {item.difficulty} {completed ? '· abgeschlossen' : ''}</small>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        <section className="academy-stage">
          <div className="academy-situation-card">
            <div className="academy-situation-heading">
              <div>
                <p className="academy-section-label">Gesprächssituation {currentScenarioIndex + 1}/{path.scenarioIds.length}</p>
                <h2>{scenario.title}</h2>
              </div>
              <span className="academy-difficulty">Schwierigkeit {scenario.difficulty}/5</span>
            </div>
            <p className="academy-lead">{scenario.openingSituation}</p>
            <div className="academy-brief-grid">
              <article><span>Gesprächspartner</span><p>{scenario.partnerProfile}</p></article>
              <article><span>Ziel</span><p>{scenario.primaryGoal}</p></article>
              <article><span>Mindestziel</span><p>{scenario.minimumGoal}</p></article>
              <article><span>Faktengrenze</span><p>{scenario.unknownFacts.join(', ')} sind nicht bekannt.</p></article>
            </div>
          </div>

          <div className="academy-conversation-card">
            <div className="academy-card-heading">
              <div>
                <p className="academy-section-label">Simulation</p>
                <h3>Gesprächsverlauf</h3>
              </div>
              <span className={`academy-provider-state ${simulator.state}`}>{simulator.state === 'ready' ? 'Lokaler Mock bereit' : 'Offline'}</span>
            </div>

            <div className="academy-transcript" aria-live="polite">
              {transcript.length === 0 ? (
                <div className="academy-empty-state">
                  <strong>Beginne mit deiner Gesprächseröffnung.</strong>
                  <p>Formuliere frei oder nutze einen der schnellen Einstiege. Jede Antwort wird ausschließlich lokal ausgewertet.</p>
                </div>
              ) : transcript.map((entry) => (
                <div key={entry.id} className={`academy-message ${entry.speaker}`}>
                  <span>{entry.speaker === 'trainee' ? 'Du' : 'Gesprächspartner'}</span>
                  <p>{entry.text}</p>
                </div>
              ))}
            </div>

            {providerMessage ? <p className="academy-provider-message">{providerMessage}</p> : null}

            <div className="academy-quick-replies">
              {scenario.quickReplies.map((reply) => (
                <button key={reply} onClick={() => setDraft(reply)} type="button">{reply}</button>
              ))}
            </div>

            <div className="academy-composer">
              <textarea
                aria-label="Deine Antwort"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void sendResponse();
                }}
                placeholder="Formuliere deine nächste Antwort oder Frage …"
                rows={4}
                value={draft}
              />
              <div>
                <small>Strg/Cmd + Enter zum Senden</small>
                <button disabled={!draft.trim() || isSending || simulator.state === 'offline'} onClick={() => void sendResponse()} type="button">
                  {isSending ? 'Simulation läuft …' : 'Antwort senden'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="academy-feedback-panel">
          <div className="academy-score-card">
            <p className="academy-section-label">Deterministische Bewertung</p>
            <div className="academy-score-row">
              <strong>{evaluation.totalScore}</strong>
              <span>/ 100<br />{evaluation.result}</span>
            </div>
            <small>Pfadziel: mindestens {path.recommendedMinimumScore} Punkte</small>
          </div>

          <section className="academy-feedback-section">
            <h3>Bewertungsprofil</h3>
            {evaluation.dimensions.map((dimension) => (
              <div className="academy-dimension" key={dimension.id}>
                <div><span>{dimension.label}</span><strong>{dimension.score}/10</strong></div>
                <div className="academy-dimension-track"><span style={{ width: `${dimension.score * 10}%` }} /></div>
              </div>
            ))}
          </section>

          <section className="academy-feedback-section">
            <h3>Konkretes Feedback</h3>
            <div className="academy-feedback-block positive">
              <span>Stärken</span>
              <ul>{evaluation.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="academy-feedback-block">
              <span>Verbesserungen</span>
              <ul>{evaluation.improvements.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="academy-feedback-block">
              <span>Verpasste Fragen</span>
              <ul>{evaluation.missedQuestions.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </section>

          {evaluation.problematicPhrases.length > 0 ? (
            <section className="academy-warning-card">
              <strong>Problematische Formulierung</strong>
              <p>{evaluation.problematicPhrases[0]}</p>
            </section>
          ) : null}

          <section className="academy-example-card">
            <span>Besseres Beispiel</span>
            <p>{evaluation.betterExample}</p>
          </section>

          <button
            className="academy-complete-button"
            disabled={traineeResponses.length === 0 || evaluation.totalScore < path.recommendedMinimumScore}
            onClick={completeScenario}
            type="button"
          >
            Training als bestanden markieren
          </button>
          <small className="academy-repeat-note">{evaluation.repeatRecommendation}</small>
        </aside>
      </div>
    </main>
  );
}
