import React from 'react';

interface GameInfoProps {
  score: number;
  moves: number;
  level: number;
}

const InfoCard: React.FC<{ title: string, value: number | string }> = ({ title, value }) => (
    <div className="bg-black/30 p-4 rounded-md text-center shadow-md border border-cyan-400/30">
        <p className="text-sm text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-bold text-cyan-400 font-orbitron">{value}</p>
    </div>
);

const GameInfo: React.FC<GameInfoProps> = ({ score, moves, level }) => {
  return (
    <div className="flex flex-col gap-4 w-full text-white">
        <h1 className="text-5xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 font-orbitron">HEXA-CORE</h1>
        <InfoCard title="Счет" value={score} />
        <InfoCard title="Ходы" value={moves} />
        <InfoCard title="Уровень" value={level} />
    </div>
  );
};

export default GameInfo;