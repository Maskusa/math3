import React, { useEffect, useState } from 'react';
import Tile from './Tile';
import { BoardType, Position } from '../types';
import { BOARD_SIZE, TILE_COLORS } from '../constants';

interface GameBoardProps {
  board: BoardType;
  onTileClick: (row: number, col: number) => void;
  selectedTile: Position | null;
  isProcessing: boolean;
}

const TILE_SIZE = 56; // Corresponds to md:w-14
const TILE_GAP = 4; // Corresponds to gap-1

const GameBoard: React.FC<GameBoardProps> = ({ board, onTileClick, selectedTile, isProcessing }) => {
  const [particles, setParticles] = useState<{id: number, x: number, y: number, color: string}[]>([]);

  useEffect(() => {
    const matchedTiles = board.filter(t => t.isMatched);
    if (matchedTiles.length > 0) {
        const newParticles = matchedTiles.flatMap(tile => {
            const color = TILE_COLORS[tile.type] || 'bg-gray-700';
            return Array.from({ length: 10 }).map((_, i) => ({
                id: Math.random(),
                x: (tile.col * (TILE_SIZE + TILE_GAP)) + TILE_SIZE / 2,
                y: (tile.row * (TILE_SIZE + TILE_GAP)) + TILE_SIZE / 2,
                color: color.replace('bg-', 'border-'), // Use border color for particles
            }));
        });
        setParticles(prev => [...prev, ...newParticles]);

        setTimeout(() => {
          setParticles([]);
        }, 700);
    }
  }, [board]);


  const containerSize = BOARD_SIZE * TILE_SIZE + (BOARD_SIZE - 1) * TILE_GAP;

  return (
    <div className="bg-slate-800 p-2 sm:p-4 rounded-lg shadow-lg border-2 border-slate-700">
      <div
        className="relative"
        style={{
          width: containerSize,
          height: containerSize,
        }}
      >
        {board.map((tile) => (
            <Tile
              key={tile.id}
              type={tile.type}
              row={tile.row}
              col={tile.col}
              isHint={tile.isHint}
              isMatched={tile.isMatched}
              onClick={() => onTileClick(tile.row, tile.col)}
              isSelected={
                selectedTile?.row === tile.row && selectedTile?.col === tile.col
              }
              size={TILE_SIZE}
              gap={TILE_GAP}
              isProcessing={isProcessing}
            />
          ))}
        {particles.map(p => (
            <div 
                key={p.id} 
                className={`absolute rounded-full animate-particle border-2 ${p.color}`}
                style={{
                    left: p.x,
                    top: p.y,
                    width: '8px',
                    height: '8px',
                    '--tw-translate-x': `${(Math.random() - 0.5) * 50}px`,
                    '--tw-translate-y': `${(Math.random() - 0.5) * 50}px`,
                }}
            />
        ))}
      </div>
    </div>
  );
};

export default GameBoard;