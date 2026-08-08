import { useState } from 'react';
import {
  createGame,
  getCurrentNightStep,
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

function App() {
  const [state, setState] = useState<GameState | null>(null);

  if (!state) {
    return <SetupScreen onStart={(setup: PlayerSetup[]) => setState(createGame(setup))} />;
  }

  function handleNightSubmit(targetId: string | null) {
    let next = submitNightStep(state!, targetId);
    if (getCurrentNightStep(next) === null) {
      next = resolveNight(next);
    }
    setState(next);
  }

  switch (state.phase) {
    case 'night':
      return <NightScreen state={state} onSubmit={handleNightSubmit} />;
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
}

export default App;
