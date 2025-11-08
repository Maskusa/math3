import React from 'react';

interface GameWinModalProps {
  isOpen: boolean;
  score: number;
  stars: number;
  onMenu: () => void;
  onNext: () => void;
  onReplay: () => void;
}

const GameWinModal: React.FC<GameWinModalProps> = ({ isOpen, score, stars, onMenu, onNext, onReplay }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-slate-900/80 border-2 border-cyan-400/50 rounded-lg p-8 text-center shadow-2xl transform transition-all scale-95 animate-modal-pop-in" style={{boxShadow: '0 0 40px rgba(56, 189, 248, 0.4)'}}>
        <h2 className="text-5xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400 font-orbitron">УРОВЕНЬ ПРОЙДЕН</h2>
        <p className="text-slate-300 text-lg mb-4 tracking-wider">Сигнал стабилизирован: цель достигнута</p>
        
        <div className="flex justify-center my-4">
            {[1, 2, 3].map(i => (
                <span key={i} className={`
                    transition-colors duration-500
                    ${i <= stars ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]' : 'text-slate-700'}
                    text-7xl
                    ${i <= stars ? 'animate-star-pop-in' : ''}
                `}
                style={{ animationDelay: `${i * 150}ms` } as React.CSSProperties}
                >
                    ★
                </span>
            ))}
        </div>

        <div className="my-6">
            <p className="text-base text-slate-400 uppercase tracking-widest">Итоговый счет</p>
            <p className="text-6xl font-bold text-cyan-400 font-orbitron">{score}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onMenu}
              className="w-full bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-md shadow-lg transition-transform transform hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              МЕНЮ
            </button>
            {stars < 3 && (
                <button
                  onClick={onReplay}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md shadow-lg transition-transform transform hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  ПЕРЕИГРАТЬ
                </button>
            )}
            <button
              onClick={onNext}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md shadow-lg transition-transform transform hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-green-500 border-t-2 border-green-400"
            >
              СЛЕДУЮЩИЙ УРОВЕНЬ
            </button>
        </div>
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
        @keyframes star-pop-in {
            0% { transform: scale(0) rotate(-180deg); opacity: 0; }
            50% { transform: scale(1.3) rotate(10deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-star-pop-in {
            animation: star-pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            transform: scale(0);
        }
      `}</style>
    </div>
  );
};

export default GameWinModal;
