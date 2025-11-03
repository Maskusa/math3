import React from 'react';
import { BoardSize } from '../App';

interface BoardSizeControlsProps {
    config: BoardSize;
    onConfigChange: (newConfig: Partial<BoardSize>) => void;
    isDisabled: boolean;
}

const SliderControl: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isDisabled: boolean;
}> = ({ label, value, min, max, step, unit, onChange, isDisabled }) => (
    <div className="flex flex-col text-xs w-40">
        <label className="text-slate-400 uppercase tracking-wider mb-1 flex justify-between">
            <span>{label}</span>
            <span className="font-bold text-cyan-400">{value}{unit}</span>
        </label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            disabled={isDisabled}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
            style={{
                accentColor: '#22d3ee',
            }}
        />
    </div>
);

const BoardSizeControls: React.FC<BoardSizeControlsProps> = ({ config, onConfigChange, isDisabled }) => {
  return (
    <div className="bg-black/30 p-3 rounded-lg shadow-lg border border-cyan-400/30 flex flex-wrap items-center justify-center gap-4">
        <SliderControl
            label="Ширина поля"
            value={config.width}
            min={4}
            max={12}
            step={1}
            unit=" кл."
            onChange={(e) => onConfigChange({ width: Number(e.target.value) })}
            isDisabled={isDisabled}
        />
        <SliderControl
            label="Высота поля"
            value={config.height}
            min={4}
            max={12}
            step={1}
            unit=" кл."
            onChange={(e) => onConfigChange({ height: Number(e.target.value) })}
            isDisabled={isDisabled}
        />
    </div>
  );
};

export default BoardSizeControls;
