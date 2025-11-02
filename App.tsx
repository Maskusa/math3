import React, { useState } from 'react';
import GameBoard from './components/GameBoard';
import { useGameLogic } from './hooks/useGameLogic';
import GameInfo from './components/GameInfo';
import GameOverModal from './components/GameOverModal';
import Controls from './components/Controls';
import { useSounds } from './hooks/useSounds';
import TimingControls from './components/TimingControls';
import { GamePhase } from './types';
import { SPECIAL_TILE_TYPES } from './constants';
import GenerationControls from './components/GenerationControls';

export interface TimingConfig {
  matchDelay: number;
  fallDelay: number;
  gameSpeed: number;
}

const App: React.FC = () => {
  const { playSound, isMuted, toggleMute } = useSounds();
  const [timingConfig, setTimingConfig] = useState<TimingConfig>({
    matchDelay: 300,
    fallDelay: 300,
    gameSpeed: 1.0,
  });
  const [isStepMode, setIsStepMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stepTrigger, setStepTrigger] = useState(0);
  const [gamePhase, setGamePhase] = useState<GamePhase>('IDLE');
  const [enabledSpecialTiles, setEnabledSpecialTiles] = useState<Record<number, boolean>>(
    SPECIAL_TILE_TYPES.reduce((acc, type) => ({ ...acc, [type]: true }), {})
  );

  const autoPauseInStepMode = () => {
    if (isStepMode) {
      setIsPaused(true);
    }
  };

  const {
    board,
    score,
    moves,
    level,
    handleTileClick,
    selectedTile,
    restartGame,
    isAiActive,
    toggleAi,
    showHints,
    toggleHints,
    isProcessing,
  } = useGameLogic({
      playSound,
      timingConfig,
      isPaused,
      stepTrigger,
      onPhaseChange: setGamePhase,
      isStepMode,
      autoPause: autoPauseInStepMode,
      enabledSpecialTiles,
  });

  const handleTimingChange = (newConfig: Partial<TimingConfig>) => {
    setTimingConfig(prev => ({ ...prev, ...newConfig }));
  };
  
  const handleToggleSpecialTile = (type: number) => {
    setEnabledSpecialTiles(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handlePlay = () => {
    setIsPaused(false);
    setIsStepMode(false);
  };
  const handlePause = () => setIsPaused(true);
  const handleStep = () => {
    if (isPaused) {
      setStepTrigger(s => s + 1);
    }
  };
  const handleToggleStepMode = () => {
    const newStepMode = !isStepMode;
    setIsStepMode(newStepMode);
    if (newStepMode) {
      if (isProcessing) {
        setIsPaused(true);
      }
    } else {
      // If we are turning step mode off, unpause the game
      setIsPaused(false);
    }
  }
  
  const gameOver = gamePhase === 'GAME_OVER';

  return (
    <main className="min-h-screen text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-8 items-center justify-center">
        <div className="flex-shrink-0">
          <GameBoard
            board={board}
            onTileClick={handleTileClick}
            selectedTile={selectedTile}
            isProcessing={isProcessing}
          />
        </div>
        <div className="flex flex-col gap-4 w-full md:w-64">
           <GameInfo score={score} moves={moves} level={level} />
           <Controls 
              isAiActive={isAiActive}
              onToggleAi={toggleAi}
              showHints={showHints}
              onToggleHints={toggleHints}
              isMuted={isMuted}
              onToggleMute={toggleMute}
              isProcessing={isProcessing}
              isPaused={isPaused}
              onPlay={handlePlay}
              onPause={handlePause}
              onStep={handleStep}
              gamePhase={gamePhase}
              onRestart={restartGame}
              isStepMode={isStepMode}
              onToggleStepMode={handleToggleStepMode}
            />
            <TimingControls
              config={timingConfig}
              onConfigChange={handleTimingChange}
              isDisabled={isProcessing && !isPaused}
            />
            <GenerationControls
              enabledTiles={enabledSpecialTiles}
              onToggle={handleToggleSpecialTile}
              isDisabled={isProcessing && !isPaused}
            />
        </div>
      </div>
      <GameOverModal isOpen={gameOver} score={score} onRestart={restartGame} />
       <footer className="text-center mt-8 text-slate-500 text-xs tracking-widest">
        <p>A CYBERPUNK TWIST ON A CLASSIC</p>
        <p>INSPIRED BY REMBOUND'S MATCH-3 TUTORIAL</p>
      </footer>
    </main>
  );
};

export default App;
