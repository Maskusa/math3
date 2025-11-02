import React from 'react';

interface GameOverModalProps {
  isOpen: boolean;
  score: number;
  onRestart: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ isOpen, score, onRestart }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-slate-900/80 border-2 border-fuchsia-500/50 rounded-lg p-8 text-center shadow-2xl transform transition-all scale-95 animate-modal-pop-in" style={{boxShadow: '0 0 40px rgba(217, 70, 239, 0.4)'}}>
        <h2 className="text-5xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400 font-orbitron">SYSTEM OFFLINE</h2>
        <p className="text-slate-300 text-lg mb-4 tracking-wider">Connection Terminated: No Moves Left</p>
        <div className="my-6">
            <p className="text-base text-slate-400 uppercase tracking-widest">Final Score</p>
            <p className="text-6xl font-bold text-cyan-400 font-orbitron">{score}</p>
        </div>
        <button
          onClick={onRestart}
          className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold py-3 px-4 rounded-md shadow-lg transition-transform transform hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-opacity-50 border-t-2 border-fuchsia-400"
        >
          Re-initialize Core
        </button>
      </div>
       <style>{`
        @keyframes modal-pop-in {
          0% {
            opacity: 0;
            transform: scale(0.9) rotate(-5deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }
        .animate-modal-pop-in {
          animation: modal-pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
    </div>
  );
};

export default GameOverModal;