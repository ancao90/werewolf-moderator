import { useState } from 'react';
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
import { Backdrop } from './components/Backdrop';

function App() {
  const [state, setState] = useState<GameState | null>(null);

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
