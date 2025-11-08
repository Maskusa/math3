import React from 'react';

interface GameInfoProps {
  score: number;
  moves: number;
  level: number;
  finishScore?: number;
}

const InfoCard: React.FC<{ title: string, value: number | string }> = ({ title, value }) => (
    <div className="bg-black/30 p-4 rounded-md text-center shadow-md border border-cyan-400/30">
        <p className="text-sm text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-bold text-cyan-400 font-orbitron">{value}</p>
    </div>
);

const GameInfo: React.FC<GameInfoProps> = ({ score, moves, level, finishScore = 0 }) => {
  const progress = finishScore > 0 ? Math.min(100, (score / finishScore) * 100) : 0;
  
  return (
    <div className="flex flex-col gap-4 w-full text-white">
        <h1 className="text-5xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 font-orbitron">HEXA-CORE</h1>
        {finishScore > 0 && (
            <div className="bg-black/30 p-3 rounded-md shadow-md border border-cyan-400/30">
                <p className="text-xs text-center text-slate-400 uppercase tracking-widest mb-2">Прогресс</p>
                <div className="w-full bg-slate-700 rounded-full h-4 border border-slate-500 overflow-hidden relative">
                    <div 
                        className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-full transition-all duration-500 ease-out flex items-center justify-center text-black font-bold text-xs"
                        style={{ width: `${progress}%` }}
                    >
                    </div>
                     <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white" style={{ textShadow: '1px 1px 2px black'}}>
                        {score} / {finishScore}
                    </div>
                </div>
            </div>
        )}
        <InfoCard title="Счет" value={score} />
        <InfoCard title="Ходы" value={moves} />
        <InfoCard title="Уровень" value={level} />
    </div>
  );
};

export default GameInfo;