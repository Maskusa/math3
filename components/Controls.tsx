import React from 'react';
import { GamePhase } from '../types';

interface ControlsProps {
    isAiActive: boolean;
    onToggleAi: () => void;
    showHints: boolean;
    onToggleHints: () => void;
    isMuted: boolean;
    onToggleMute: () => void;
    isProcessing: boolean;
    isPaused: boolean;
    onPlay: () => void;
    onPause: () => void;
    onStep: () => void;
    gamePhase: GamePhase;
    onRestart: () => void;
    isStepMode: boolean;
    onToggleStepMode: () => void;
}

const ControlButton: React.FC<{onClick: () => void, isActive?: boolean, disabled: boolean, children: React.ReactNode, className?: string}> = ({onClick, isActive, disabled, children, className}) => {
    const baseClasses = "font-bold py-2 px-4 rounded-md shadow-md transition-all duration-200 transform focus:outline-none focus:ring-2 focus:ring-opacity-70 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-xs border-b-2";
    const activeClasses = "bg-cyan-500 text-white hover:bg-cyan-600 focus:ring-cyan-400 border-cyan-300";
    const inactiveClasses = "bg-slate-700 text-slate-300 hover:bg-slate-600 focus:ring-slate-500 border-slate-500";
    
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses} font-orbitron ${className}`}
        >
            {children}
        </button>
    )
}

const getPhaseLabel = (phase: GamePhase): string => {
    switch(phase) {
        case 'IDLE': return 'Ожидание';
        case 'MATCHING': return 'Поиск';
        case 'REMOVING': return 'Удаление';
        case 'GRAVITY': return 'Падение';
        case 'REFILLING': return 'Заполнение';
        case 'GAME_OVER': return 'Конец игры';
        default: return '';
    }
}

const Controls: React.FC<ControlsProps> = (props) => {
  const { isAiActive, onToggleAi, showHints, onToggleHints, isMuted, onToggleMute, isProcessing, isPaused, onPlay, onPause, onStep, gamePhase, onRestart, isStepMode, onToggleStepMode } = props;
  
  return (
    <div className="bg-black/30 p-3 rounded-lg shadow-lg border border-cyan-400/30 flex flex-col items-center justify-center gap-4 w-full">
        <div className="grid grid-cols-2 gap-3 w-full">
            <ControlButton onClick={onToggleHints} isActive={showHints} disabled={isProcessing && !isPaused}>
               {showHints ? 'Hints: ON' : 'Hints: OFF'}
            </ControlButton>
             <ControlButton onClick={onToggleAi} isActive={isAiActive} disabled={isProcessing && !isPaused}>
               {isAiActive ? 'Bot: Active' : 'Bot: Idle'}
            </ControlButton>
            <ControlButton onClick={onToggleMute} isActive={!isMuted} disabled={false}>
               {isMuted ? 'Sound: OFF' : 'Sound: ON'}
            </ControlButton>
            <ControlButton onClick={onRestart} isActive={false} disabled={false}>
               Сброс
            </ControlButton>
        </div>
        <div className="w-full h-px bg-cyan-400/20"></div>

        <div className="flex items-center justify-center gap-2 w-full">
            <label className="flex items-center gap-2 text-sm uppercase tracking-wider font-orbitron text-slate-300 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isStepMode}
                onChange={onToggleStepMode}
                disabled={isProcessing && !isPaused}
                className="w-4 h-4 bg-slate-700 border-slate-500 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer disabled:cursor-not-allowed"
              />
              Шаг
            </label>
        </div>

        <div className="flex items-center justify-center gap-3 w-full">
            {isPaused ? (
              <ControlButton onClick={onPlay} isActive={true} disabled={false} className="flex-1">
                Play ▶️
              </ControlButton>
            ) : (
              <ControlButton onClick={onPause} isActive={false} disabled={!isProcessing} className="flex-1">
                Pause ⏸️
              </ControlButton>
            )}
             <ControlButton onClick={onStep} isActive={false} disabled={!isPaused} className="flex-1">
               Шаг ⏯️
            </ControlButton>
        </div>
        <div className="text-center text-xs text-cyan-300 h-4 mt-1 tracking-wider">
            {isProcessing ? `Фаза: ${getPhaseLabel(gamePhase)}` : ''}
        </div>
    </div>
  );
};

export default Controls;