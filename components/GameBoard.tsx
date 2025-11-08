import React, { useEffect, useState } from 'react';
import Tile from './Tile';
import { BoardType, Position, BoardSize } from '../types';
import { TILE_COLORS } from '../constants';

interface GameBoardProps {
  board: BoardType;
  onTileClick: (row: number, col: number) => void;
  selectedTile: Position | null;
  isProcessing: boolean;
  boardSize: BoardSize;
}

const TILE_SIZE = 56; // Corresponds to md:w-14
const TILE_GAP = 4; // Corresponds to gap-1

const GameBoard: React.FC<GameBoardProps> = ({ board, onTileClick, selectedTile, isProcessing, boardSize }) => {
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


  const containerWidth = boardSize.width * TILE_SIZE + (boardSize.width - 1) * TILE_GAP;
  const containerHeight = boardSize.height * TILE_SIZE + (boardSize.height - 1) * TILE_GAP;

  return (
    <div className="bg-black/30 p-2 sm:p-4 rounded-md shadow-lg border-2 border-cyan-400/50 shadow-cyan-400/20" style={{boxShadow: '0 0 25px rgba(56, 189, 248, 0.3)'}}>
      <div
        className="relative transition-all duration-300"
        style={{
          width: containerWidth,
          height: containerHeight,
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
              health={tile.health}
              maxHealth={tile.maxHealth}
            />
          ))}
        {particles.map(p => (
            <div 
                key={p.id} 
                className={`absolute rounded-full animate-particle border-2 ${p.color}`}
                /* FIX: Cast style object to allow custom CSS properties for animation */
                style={{
                    left: p.x,
                    top: p.y,
                    width: '8px',
                    height: '8px',
                    '--tw-translate-x': `${(Math.random() - 0.5) * 60}px`,
                    '--tw-translate-y': `${(Math.random() - 0.5) * 60}px`,
                } as React.CSSProperties}
            />
        ))}
      </div>
    </div>
  );
};

export default GameBoard;