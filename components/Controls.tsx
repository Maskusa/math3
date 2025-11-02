import React from 'react';

interface ControlsProps {
    isAiActive: boolean;
    onToggleAi: () => void;
    showHints: boolean;
    onToggleHints: () => void;
    isProcessing: boolean;
}

const ControlButton: React.FC<{onClick: () => void, isActive: boolean, disabled: boolean, children: React.ReactNode}> = ({onClick, isActive, disabled, children}) => {
    const baseClasses = "font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200 transform focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed";
    const activeClasses = "bg-cyan-500 text-white hover:bg-cyan-600 focus:ring-cyan-400";
    const inactiveClasses = "bg-slate-700 text-slate-300 hover:bg-slate-600 focus:ring-slate-500";
    
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
        >
            {children}
        </button>
    )
}


const Controls: React.FC<ControlsProps> = ({ isAiActive, onToggleAi, showHints, onToggleHints, isProcessing }) => {
  return (
    <div className="bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-700 flex items-center justify-center gap-4">
        <ControlButton onClick={onToggleHints} isActive={showHints} disabled={isProcessing}>
           {showHints ? 'Hide Hints' : 'Show Hints'}
        </ControlButton>
         <ControlButton onClick={onToggleAi} isActive={isAiActive} disabled={isProcessing}>
           {isAiActive ? 'AI Bot: ON' : 'AI Bot: OFF'}
        </ControlButton>
    </div>
  );
};

export default Controls;