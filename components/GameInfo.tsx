
import React from 'react';

interface GameInfoProps {
  score: number;
  moves: number;
  level: number;
  onRestart: () => void;
}

const InfoCard: React.FC<{ title: string, value: number | string }> = ({ title, value }) => (
    <div className="bg-slate-800 p-4 rounded-lg text-center shadow-md border border-slate-700">
        <p className="text-sm text-slate-400 uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-bold text-cyan-400">{value}</p>
    </div>
);

const GameInfo: React.FC<GameInfoProps> = ({ score, moves, level, onRestart }) => {
  return (
    <div className="flex flex-col gap-4 w-full md:w-48 text-white">
        <h1 className="text-4xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Gem Swap</h1>
        <InfoCard title="Score" value={score} />
        <InfoCard title="Moves Left" value={moves} />
        <InfoCard title="Level" value={level} />
        <button 
            onClick={onRestart}
            className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
        >
            New Game
        </button>
    </div>
  );
};

export default GameInfo;
