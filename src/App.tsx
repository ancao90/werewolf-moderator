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
import { Backdrop, getPhaseTheme } from './components/Backdrop';

const GAME_KEY = 'werewolf_game';

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

  useEffect(() => {
    if (state) localStorage.setItem(GAME_KEY, JSON.stringify(state));
    else localStorage.removeItem(GAME_KEY);
  }, [state]);

  useEffect(() => {
    const theme = getPhaseTheme(state?.phase ?? 'setup');
    if (theme) document.documentElement.dataset.phase = theme;
    else delete document.documentElement.dataset.phase;
  }, [state?.phase]);

  function handleNightSubmit(targetId: string | null) {
    let next = submitNightStep(state!, targetId);
    if (getCurrentNightStep(next) === null) {
      next = resolveNight(next);
    }
    setState(next);
  }

  function handleIdentify(playerIds: string[]) {
    setState(identifyNightRoleHolders(state!, playerIds));
  }

  if (!state) {
    return (
      <>
        <Backdrop phase="setup" />
        <SetupScreen
          onStart={(setup: PlayerSetup[], roleComposition: Record<string, number>) =>
            setState(createGame(setup, roleComposition))
          }
        />
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
                onResolve={(eliminatedId) => setState(resolveVote(state, eliminatedId))}
              />
            );
          case 'resolution':
            return <ResolutionScreen state={state} onStartNight={() => setState(startNextNight(state))} />;
          case 'gameover':
            return <GameOverScreen state={state} onNewGame={() => setState(null)} />;
          default:
            return null;
        }
      })()}
    </>
  );
}

export default App;
