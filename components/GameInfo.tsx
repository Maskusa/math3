import React from 'react';

interface GameInfoProps {
  score: number;
  moves: number;
  level: number;
  scoreThresholds: { star1: number; star2: number; star3: number };
}

const InfoCard: React.FC<{ title: string, value: number | string }> = ({ title, value }) => (
    <div className="bg-black/30 p-4 rounded-md text-center shadow-md border border-cyan-400/30">
        <p className="text-sm text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-bold text-cyan-400 font-orbitron">{value}</p>
    </div>
);

const GameInfo: React.FC<GameInfoProps> = ({ score, moves, level, scoreThresholds }) => {
  
  const getProgress = () => {
      if (score < scoreThresholds.star1) {
          return { progress: (score / scoreThresholds.star1) * 100, target: scoreThresholds.star1, stars: 1 };
      }
      if (score < scoreThresholds.star2) {
          return { progress: ((score - scoreThresholds.star1) / (scoreThresholds.star2 - scoreThresholds.star1)) * 100, target: scoreThresholds.star2, stars: 2 };
      }
      if (score < scoreThresholds.star3) {
           return { progress: ((score - scoreThresholds.star2) / (scoreThresholds.star3 - scoreThresholds.star2)) * 100, target: scoreThresholds.star3, stars: 3 };
      }
      return { progress: 100, target: scoreThresholds.star3, stars: 3 };
  };

  const { progress, target, stars } = getProgress();

  return (
    <div className="flex flex-col gap-4 w-full text-white">
        <h1 className="text-5xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 font-orbitron">HEXA-CORE</h1>
        <div className="bg-black/30 p-3 rounded-md shadow-md border border-cyan-400/30">
            <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-slate-400 uppercase tracking-widest">Прогресс</p>
                <div className="flex">
                    {[1, 2, 3].map(i => (
                        <span key={i} className={`text-lg ${i < stars ? 'text-yellow-400' : (i === stars ? 'text-yellow-400 animate-pulse' : 'text-slate-600')}`}>★</span>
                    ))}
                </div>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-4 border border-slate-500 overflow-hidden relative">
                <div 
                    className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-full transition-all duration-500 ease-out flex items-center justify-center text-black font-bold text-xs"
                    style={{ width: `${Math.min(100, progress)}%` }}
                >
                </div>
                 <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white" style={{ textShadow: '1px 1px 2px black'}}>
                    {score} / {Math.round(target)}
                </div>
            </div>
        </div>
        <InfoCard title="Счет" value={score} />
        <InfoCard title="Ходы" value={moves} />
        <InfoCard title="Уровень" value={level} />
    </div>
  );
};

export default GameInfo;
