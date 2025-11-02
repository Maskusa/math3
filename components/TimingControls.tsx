import React from 'react';
import { TimingConfig } from '../App';

interface TimingControlsProps {
    config: TimingConfig;
    onConfigChange: (newConfig: Partial<TimingConfig>) => void;
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
            <span className="font-bold text-cyan-400">{value.toFixed(1)}{unit}</span>
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

const TimingControls: React.FC<TimingControlsProps> = ({ config, onConfigChange, isDisabled }) => {
  return (
    <div className="bg-black/30 p-3 rounded-lg shadow-lg border border-cyan-400/30 flex flex-wrap items-center justify-center gap-4">
        <SliderControl
            label="Задержка совпадений"
            value={config.matchDelay}
            min={100}
            max={5000}
            step={100}
            unit="ms"
            onChange={(e) => onConfigChange({ matchDelay: Number(e.target.value) })}
            isDisabled={isDisabled}
        />
        <SliderControl
            label="Задержка падения"
            value={config.fallDelay}
            min={100}
            max={5000}
            step={100}
            unit="ms"
            onChange={(e) => onConfigChange({ fallDelay: Number(e.target.value) })}
            isDisabled={isDisabled}
        />
         <SliderControl
            label="Скорость игры"
            value={config.gameSpeed}
            min={0.1}
            max={2.0}
            step={0.1}
            unit="x"
            onChange={(e) => onConfigChange({ gameSpeed: Number(e.target.value) })}
            isDisabled={isDisabled}
        />
    </div>
  );
};

export default TimingControls;