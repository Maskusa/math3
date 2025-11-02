
import React from 'react';

interface GameOverModalProps {
  isOpen: boolean;
  score: number;
  onRestart: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ isOpen, score, onRestart }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-slate-800 border-2 border-slate-700 rounded-2xl p-8 text-center shadow-2xl transform transition-all scale-95 animate-modal-pop-in">
        <h2 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Game Over!</h2>
        <p className="text-slate-300 text-lg mb-4">You've run out of moves.</p>
        <div className="my-6">
            <p className="text-base text-slate-400 uppercase tracking-wider">Final Score</p>
            <p className="text-6xl font-bold text-cyan-400">{score}</p>
        </div>
        <button
          onClick={onRestart}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
        >
          Play Again
        </button>
      </div>
       <style>{`
        @keyframes modal-pop-in {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-modal-pop-in {
          animation: modal-pop-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default GameOverModal;
