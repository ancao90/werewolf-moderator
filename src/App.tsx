import { useEffect, useState } from 'react';
import {
  createGame,
  getCurrentNightStep,
  identifyNightRoleHolders,
  resolveNight,
  resolveVote,
  startNextNight,
  startVoting,
  submitNightStep,
  type PlayerSetup,
} from './engine/engine';
import type { GameState } from './engine/types';
import { SetupScreen } from './components/SetupScreen';
import { NightScreen } from './components/NightScreen';
import { DayScreen } from './components/DayScreen';
import { VotingScreen } from './components/VotingScreen';
import { ResolutionScreen } from './components/ResolutionScreen';
import { GameOverScreen } from './components/GameOverScreen';
import { HomeScreen } from './components/HomeScreen';
import { SessionScreen } from './components/SessionScreen';
import { Backdrop, getPhaseTheme } from './components/Backdrop';
import { createSession, getSession, loadSessions, recordGameResult } from './history';

const GAME_KEY = 'werewolf_game';
const SESSION_ID_KEY = 'werewolf_current_session_id';

function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(GAME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const validPhases = ['night', 'day', 'voting', 'resolution', 'gameover'];
    if (
      parsed &&
      typeof parsed === 'object' &&
      validPhases.includes(parsed.phase) &&
      Array.isArray(parsed.players)
    ) {
      return parsed as GameState;
    }
    return null;
  } catch {
    return null;
  }
}

function App() {
  const [state, setState] = useState<GameState | null>(loadGame);
  const [sessionId, setSessionId] = useState<string | null>(() =>
    localStorage.getItem(SESSION_ID_KEY),
  );
  const [subView, setSubView] = useState<'sessionDetail' | 'setup'>('sessionDetail');

  useEffect(() => {
    if (state) localStorage.setItem(GAME_KEY, JSON.stringify(state));
    else localStorage.removeItem(GAME_KEY);
  }, [state]);

  useEffect(() => {
    if (sessionId) localStorage.setItem(SESSION_ID_KEY, sessionId);
    else localStorage.removeItem(SESSION_ID_KEY);
  }, [sessionId]);

  useEffect(() => {
    const theme = getPhaseTheme(state?.phase ?? 'setup');
    if (theme) document.documentElement.dataset.phase = theme;
    else delete document.documentElement.dataset.phase;
  }, [state?.phase]);

  const session = sessionId ? getSession(sessionId) : null;

  useEffect(() => {
    if (sessionId && !session) setSessionId(null);
  }, [sessionId, session]);

  function handleNightSubmit(targetId: string | null) {
    let next = submitNightStep(state!, targetId);
    if (getCurrentNightStep(next) === null) {
      next = resolveNight(next);
      if (next.phase === 'gameover') recordGameResult(sessionId!, next);
    }
    setState(next);
  }

  function handleIdentify(playerIds: string[]) {
    setState(identifyNightRoleHolders(state!, playerIds));
  }

  function handleCreateSession() {
    const session = createSession();
    setSessionId(session.id);
    setSubView('setup');
  }

  function handleSelectSession(id: string) {
    setSessionId(id);
    setSubView('sessionDetail');
  }

  if (!sessionId) {
    return (
      <>
        <Backdrop phase="setup" />
        <HomeScreen
          sessions={loadSessions()}
          onCreateSession={handleCreateSession}
          onSelectSession={handleSelectSession}
        />
      </>
    );
  }

  if (!session) return null;

  if (!state) {
    return (
      <>
        <Backdrop phase="setup" />
        {subView === 'sessionDetail' ? (
          <SessionScreen
            session={session}
            onStartGame={() => setSubView('setup')}
            onBack={() => setSessionId(null)}
          />
        ) : (
          <SetupScreen
            session={session}
            onStart={(setup: PlayerSetup[], roleComposition: Record<string, number>) =>
              setState(createGame(setup, roleComposition))
            }
            onBack={() => setSubView('sessionDetail')}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Backdrop phase={state.phase} />
      {(() => {
        switch (state.phase) {
          case 'night':
            return <NightScreen state={state} onSubmit={handleNightSubmit} onIdentify={handleIdentify} />;
          case 'day':
            return <DayScreen state={state} onStartVote={() => setState(startVoting(state))} />;
          case 'voting':
            return (
              <VotingScreen
                state={state}
                onResolve={(eliminatedId) => {
                  const next = resolveVote(state, eliminatedId);
                  if (next.phase === 'gameover') recordGameResult(sessionId, next);
                  setState(next);
                }}
              />
            );
          case 'resolution':
            return <ResolutionScreen state={state} onStartNight={() => setState(startNextNight(state))} />;
          case 'gameover':
            return (
              <GameOverScreen
                state={state}
                onNewGame={() => {
                  setState(null);
                  setSubView('setup');
                }}
              />
            );
          default:
            return null;
        }
      })()}
    </>
  );
}

export default App;
