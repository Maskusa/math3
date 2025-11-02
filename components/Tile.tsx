import React from 'react';
import { TILE_COLORS, TILE_SHAPES } from '../constants';

interface TileProps {
  type: number;
  row: number;
  col: number;
  onClick: () => void;
  isSelected: boolean;
  isMatched?: boolean;
  isHint?: boolean;
  size: number;
  gap: number;
  isProcessing: boolean;
}

const Tile: React.FC<TileProps> = ({ type, row, col, onClick, isSelected, isMatched, isHint, size, gap, isProcessing }) => {
  const color = TILE_COLORS[type] || 'bg-gray-700';
  const shape = TILE_SHAPES[type] || '';

  const tileStyle: React.CSSProperties = {
    position: 'absolute',
    width: `${size}px`,
    height: `${size}px`,
    top: `${row * (size + gap)}px`,
    left: `${col * (size + gap)}px`,
    transition: 'top 0.3s ease-in-out, left 0.3s ease-in-out, transform 0.2s ease-in-out, opacity 0.3s ease-in-out',
    transform: isMatched ? 'scale(0)' : (isSelected ? 'scale(1.1)' : 'scale(1)'),
    opacity: isMatched ? 0 : 1,
    zIndex: isSelected ? 10 : 1,
    pointerEvents: isProcessing ? 'none' : 'auto',
  };

  const hintAnimation = isHint && !isSelected ? 'animate-pulse' : '';

  return (
    <div
      style={tileStyle}
      onClick={onClick}
      className={`flex items-center justify-center rounded-md cursor-pointer transform ${color} ${
        isSelected ? 'ring-4 ring-cyan-400 shadow-lg' : 'ring-2 ring-inset ring-black/20'
      } ${hintAnimation}`}
    >
        <span className="text-4xl text-white drop-shadow-lg" style={{textShadow: '0 2px 2px rgba(0,0,0,0.4)'}}>{shape}</span>
    </div>
  );
};

export default React.memo(Tile);