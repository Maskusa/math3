import React, { useEffect } from 'react';

interface GameReadyOverlayProps {
  onFinished: () => void;
}

const GameReadyOverlay: React.FC<GameReadyOverlayProps> = ({ onFinished }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinished();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onFinished]);

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in-out-bg rounded-md">
      <h2 className="text-6xl font-orbitron text-white font-bold animate-fade-in-out-text" style={{textShadow: '0 0 15px white'}}>
        Вперёд
      </h2>
      <style>{`
        @keyframes fadeInOutBg {
          0% { opacity: 0; }
          10% { opacity: 0.7; }
          90% { opacity: 0.7; }
          100% { opacity: 0; }
        }
        .animate-fade-in-out-bg {
          animation: fadeInOutBg 1.5s ease-in-out forwards;
        }
        @keyframes fadeInOutText {
          0% { opacity: 0; transform: scale(0.8); }
          20% { opacity: 1; transform: scale(1); }
          80% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.2); }
        }
        .animate-fade-in-out-text {
          animation: fadeInOutText 1.5s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};

export default GameReadyOverlay;
