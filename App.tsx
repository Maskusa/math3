import React from 'react';
import GameBoard from './components/GameBoard';
import { useGameLogic } from './hooks/useGameLogic';
import GameInfo from './components/GameInfo';
import GameOverModal from './components/GameOverModal';
import Controls from './components/Controls';

const App: React.FC = () => {
  const {
    board,
    score,
    moves,
    level,
    gameOver,
    handleTileClick,
    selectedTile,
    restartGame,
    isAiActive,
    toggleAi,
    showHints,
    toggleHints,
    isProcessing,
  } = useGameLogic();

  return (
    <main className="bg-slate-900 min-h-screen text-white flex flex-col items-center justify-center p-4">
      <Controls 
        isAiActive={isAiActive}
        onToggleAi={toggleAi}
        showHints={showHints}
        onToggleHints={toggleHints}
        isProcessing={isProcessing}
      />
      <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-center justify-center mt-4">
        <div className="flex-shrink-0">
          <GameBoard
            board={board}
            onTileClick={handleTileClick}
            selectedTile={selectedTile}
            isProcessing={isProcessing}
          />
        </div>
        <GameInfo score={score} moves={moves} level={level} onRestart={restartGame} />
      </div>
      <GameOverModal isOpen={gameOver} score={score} onRestart={restartGame} />
       <footer className="text-center mt-8 text-slate-500 text-sm">
        <p>Inspired by Rembound's "How to make a Match-3 game" tutorial.</p>
        <p>Enhanced with animations, hints, and an AI bot.</p>
      </footer>
    </main>
  );
};

export default App;