import React from 'react';
import { TILE_COLORS, TILE_SHAPES, TILE_SHADOWS } from '../constants';

interface TileProps {
  type: number;
  row: number;
  col: number;
  onClick: () => void;
  isSelected: boolean;
  isMatched?: boolean;
  isHint?: boolean;
  isNew?: boolean;
  size: number;
  gap: number;
  isProcessing: boolean;
  health?: number;
  maxHealth?: number;
}

const Tile: React.FC<TileProps> = ({ type, row, col, onClick, isSelected, isMatched, isHint, isNew, size, gap, isProcessing, health, maxHealth }) => {
  const color = TILE_COLORS[type] || 'bg-gray-700';
  const shape = TILE_SHAPES[type] || '';
  const shadow = TILE_SHADOWS[type] || '';
  
  const targetTop = row * (size + gap);
  const targetLeft = col * (size + gap);

  const hasHealth = typeof health === 'number' && typeof maxHealth === 'number' && maxHealth > 0;

  const tileStyle: React.CSSProperties = {
    position: 'absolute',
    width: `${size}px`,
    height: `${size}px`,
    top: `${targetTop}px`,
    left: `${targetLeft}px`,
    transition: 'top 0.3s ease-out, left 0.3s ease-out, transform 0.2s ease-in-out, opacity 0.3s ease-in-out, box-shadow 0.2s ease-in-out',
    transform: isMatched ? 'scale(0)' : (isSelected ? 'scale(1.1)' : 'scale(1)'),
    opacity: isMatched ? 0 : 1,
    zIndex: isSelected ? 10 : 1,
    pointerEvents: isProcessing ? 'none' : 'auto',
  };

  if (hasHealth) {
    tileStyle.opacity = (health / maxHealth) * 0.5 + 0.5;
  }
  
  // Apply initial off-screen position for animation
  if (isNew) {
      tileStyle.transform = `translateY(-50px)`;
      tileStyle.opacity = 0;
      // Trigger the animation to the final position
      requestAnimationFrame(() => {
          tileStyle.transform = 'translateY(0px)';
          tileStyle.opacity = 1;
      });
  }


  const hintAnimation = isHint && !isSelected ? 'animate-pulse' : '';

  return (
    <div
      style={tileStyle}
      onClick={onClick}
      className={`relative flex items-center justify-center rounded-md cursor-pointer transform ${color} ${shadow} ${
        isSelected ? 'ring-4 ring-yellow-300 shadow-lg' : 'ring-2 ring-inset ring-black/30'
      } ${hintAnimation}`}
    >
        <span className="text-4xl text-white drop-shadow-lg" style={{textShadow: '0 0 5px rgba(0,0,0,0.7)'}}>{shape}</span>
        {typeof health === 'number' && health > 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-white font-bold text-2xl" style={{textShadow: '0 0 5px black, 0 0 5px black'}}>
            {health}
          </div>
        )}
        {hasHealth && (
            <div className="absolute bottom-1 left-1 right-1 h-2 bg-black/50 rounded-full overflow-hidden border border-slate-500/50">
                <div 
                    className="h-full bg-gradient-to-r from-lime-500 to-green-400 transition-all duration-300 ease-in-out"
                    style={{ width: `${(health / maxHealth) * 100}%` }}
                ></div>
            </div>
        )}
    </div>
  );
};

export default React.memo(Tile);