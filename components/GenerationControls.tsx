import React from 'react';
import { TILE_NAMES, NORMAL_SPECIAL_TILE_TYPES, TILE_SHAPES, TILE_TYPE_COMPLEX, NORMAL_TILE_TYPES, TILE_COLORS, TILE_TYPE_METAL, TILE_TYPE_STONE } from '../constants';
import { GenerationConfig } from '../types';

interface GenerationControlsProps {
    config: GenerationConfig;
    onConfigChange: (newConfig: Partial<GenerationConfig>) => void;
    isDisabled: boolean;
}

const GenerationControls: React.FC<GenerationControlsProps> = ({ config, onConfigChange, isDisabled }) => {
  
  const handleEnabledNormalToggle = (type: number) => {
    const newEnabledNormal = { ...config.enabledNormal, [type]: !config.enabledNormal[type] };
    const enabledCount = Object.values(newEnabledNormal).filter(Boolean).length;
    if (enabledCount < 1) {
      return; 
    }
    onConfigChange({ enabledNormal: newEnabledNormal });
  };
  
  const handleNormalToggle = (type: number) => {
    onConfigChange({
        normal: {
            ...config.normal,
            [type]: !config.normal[type],
        }
    })
  };

  const handleComplexToggle = () => {
    onConfigChange({
        unique: {
            ...config.unique,
            complex: {
                ...config.unique.complex,
                enabled: !config.unique.complex.enabled,
            }
        }
    })
  };

  const handleComplexHealthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
     onConfigChange({
        unique: {
            ...config.unique,
            complex: {
                ...config.unique.complex,
                health: Number(e.target.value),
            }
        }
    })
  }
  
  const handleMetalToggle = () => {
    onConfigChange({
        unique: {
            ...config.unique,
            metal: {
                ...config.unique.metal,
                enabled: !config.unique.metal.enabled,
            }
        }
    })
  };

  const handleStoneToggle = () => {
    onConfigChange({
        unique: {
            ...config.unique,
            stone: {
                ...config.unique.stone,
                enabled: !config.unique.stone.enabled,
            }
        }
    })
  };

  const enabledNormalCount = Object.values(config.enabledNormal).filter(Boolean).length;

  return (
    <div className="bg-black/30 p-3 rounded-lg shadow-lg border border-cyan-400/30 flex flex-col gap-3">
        <div>
            <h3 className="text-sm uppercase tracking-wider font-orbitron text-slate-400 text-center mb-2">Обычные</h3>
            <div className="grid grid-cols-3 items-center justify-center gap-2 px-2">
                {Array.from({ length: NORMAL_TILE_TYPES }).map((_, type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.enabledNormal[type] ?? false}
                            onChange={() => handleEnabledNormalToggle(type)}
                            disabled={isDisabled || (config.enabledNormal[type] && enabledNormalCount <= 1)}
                            className="w-4 h-4 bg-slate-700 border-slate-500 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center text-white text-2xl ${TILE_COLORS[type]}`}>
                            <span style={{textShadow: '0 0 5px rgba(0,0,0,0.7)'}}>{TILE_SHAPES[type]}</span>
                        </div>
                    </label>
                ))}
            </div>
        </div>
        <div className="w-full h-px bg-cyan-400/20"></div>
        <div>
            <h3 className="text-sm uppercase tracking-wider font-orbitron text-slate-400 text-center mb-2">Уникальные</h3>
            <div className="flex flex-col gap-2">
            {NORMAL_SPECIAL_TILE_TYPES.map(type => (
                <label key={type} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input 
                        type="checkbox"
                        checked={config.normal[type] ?? false}
                        onChange={() => handleNormalToggle(type)}
                        disabled={isDisabled}
                        className="w-4 h-4 bg-slate-700 border-slate-500 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="w-4 text-center">{TILE_SHAPES[type]}</span>
                    <span>{TILE_NAMES[type]}</span>
                </label>
            ))}
             <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer flex-grow">
                    <input 
                        type="checkbox"
                        checked={config.unique.complex.enabled}
                        onChange={handleComplexToggle}
                        disabled={isDisabled}
                        className="w-4 h-4 bg-slate-700 border-slate-500 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="w-4 text-center">{TILE_SHAPES[TILE_TYPE_COMPLEX]}</span>
                    <span>{TILE_NAMES[TILE_TYPE_COMPLEX]}</span>
                </label>
                 <select 
                    value={config.unique.complex.health}
                    onChange={handleComplexHealthChange}
                    disabled={isDisabled || !config.unique.complex.enabled}
                    className="bg-slate-700 border border-slate-500 text-white text-sm rounded-md focus:ring-cyan-500 focus:border-cyan-500 h-7 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input 
                    type="checkbox"
                    checked={config.unique.metal.enabled}
                    onChange={handleMetalToggle}
                    disabled={isDisabled}
                    className="w-4 h-4 bg-slate-700 border-slate-500 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="w-4 text-center">{TILE_SHAPES[TILE_TYPE_METAL]}</span>
                <span>{TILE_NAMES[TILE_TYPE_METAL]}</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input 
                    type="checkbox"
                    checked={config.unique.stone.enabled}
                    onChange={handleStoneToggle}
                    disabled={isDisabled}
                    className="w-4 h-4 bg-slate-700 border-slate-500 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="w-4 text-center">{TILE_SHAPES[TILE_TYPE_STONE]}</span>
                <span>{TILE_NAMES[TILE_TYPE_STONE]}</span>
            </label>
            </div>
        </div>
    </div>
  );
};

export default GenerationControls;