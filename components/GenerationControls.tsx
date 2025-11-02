import React from 'react';
import { SPECIAL_TILE_NAMES, SPECIAL_TILE_TYPES, TILE_SHAPES } from '../constants';

interface GenerationControlsProps {
    enabledTiles: Record<number, boolean>;
    onToggle: (type: number) => void;
    isDisabled: boolean;
}

const GenerationControls: React.FC<GenerationControlsProps> = ({ enabledTiles, onToggle, isDisabled }) => {
  return (
    <div className="bg-black/30 p-3 rounded-lg shadow-lg border border-cyan-400/30 flex flex-col gap-2">
        <h3 className="text-sm uppercase tracking-wider font-orbitron text-slate-400 text-center mb-1">Генерация</h3>
        {SPECIAL_TILE_TYPES.map(type => (
            <label key={type} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input 
                    type="checkbox"
                    checked={enabledTiles[type] ?? false}
                    onChange={() => onToggle(type)}
                    disabled={isDisabled}
                    className="w-4 h-4 bg-slate-700 border-slate-500 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="w-4 text-center">{TILE_SHAPES[type]}</span>
                <span>{SPECIAL_TILE_NAMES[type]}</span>
            </label>
        ))}
    </div>
  );
};

export default GenerationControls;
