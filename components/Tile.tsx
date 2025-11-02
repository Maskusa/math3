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
}

const Tile: React.FC<TileProps> = ({ type, row, col, onClick, isSelected, isMatched, isHint, isNew, size, gap, isProcessing }) => {
  const color = TILE_COLORS[type] || 'bg-gray-700';
  const shape = TILE_SHAPES[type] || '';
  const shadow = TILE_SHADOWS[type] || '';
  
  const targetTop = row * (size + gap);
  const targetLeft = col * (size + gap);
  
  const initialTop = isNew ? targetTop - 50 : targetTop;
  const initialOpacity = isNew ? 0 : 1;

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
      className={`flex items-center justify-center rounded-md cursor-pointer transform ${color} ${shadow} ${
        isSelected ? 'ring-4 ring-yellow-300 shadow-lg' : 'ring-2 ring-inset ring-black/30'
      } ${hintAnimation}`}
    >
        <span className="text-4xl text-white drop-shadow-lg" style={{textShadow: '0 0 5px rgba(0,0,0,0.7)'}}>{shape}</span>
    </div>
  );
};

export default React.memo(Tile);