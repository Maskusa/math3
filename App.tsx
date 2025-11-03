import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import GameBoard from './components/GameBoard';
import GameInfo from './components/GameInfo';
import GameOverModal from './components/GameOverModal';
import Controls from './components/Controls';
import { useSounds } from './hooks/useSounds';
import { GamePhase, BoardType, TileData } from './types';
import TimingControls from './components/TimingControls';
import GenerationControls from './components/GenerationControls';
import BoardSizeControls from './components/BoardSizeControls';
import { TILE_COLORS, TILE_SHAPES, TILE_NAMES, NORMAL_TILE_TYPES, NORMAL_SPECIAL_TILE_TYPES, UNIQUE_TILE_TYPES, TILE_SHADOWS } from './constants';

export interface BoardSize {
  width: number;
  height: number;
}

export interface TimingConfig {
  swapDelay: number;
  matchDelay: number;
  fallDelay: number;
  gameSpeed: number;
}

export interface GenerationConfig {
  enabledNormal: { [key: number]: boolean };
  normal: { [key: number]: boolean };
  unique: {
      complex: { enabled: boolean; health: number };
      metal: { enabled: boolean };
      stone: { enabled: boolean };
  };
}

type EditorBoard = (number | null)[][];
type HistoryEntry = {
  board: EditorBoard;
  width: number;
  height: number;
};

const allLibraryTiles = [
  ...Array.from({ length: NORMAL_TILE_TYPES }, (_, i) => i),
  ...NORMAL_SPECIAL_TILE_TYPES,
  ...UNIQUE_TILE_TYPES,
];

type Tool = 'reset' | 'move' | 'brush' | 'eraser';

const ToolButton: React.FC<{
  label: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
  <button
    title={label}
    onClick={onClick}
    className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 border-2 ${
      isActive
        ? 'bg-cyan-500/30 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(56,189,248,0.5)]'
        : 'bg-slate-800/50 border-slate-600 text-slate-400 hover:bg-slate-700/50 hover:border-cyan-500'
    }`}
  >
    <span className="text-2xl">{icon}</span>
  </button>
);


const GameRunner: React.FC<{
    boardData: EditorBoard;
    width: number;
    height: number;
    onStop: () => void;
}> = ({ boardData, width, height, onStop }) => {
    const { playSound, isMuted, toggleMute } = useSounds();
    const [isPaused, setIsPaused] = useState(true);
    const [stepTrigger, setStepTrigger] = useState(0);
    const [isStepMode, setIsStepMode] = useState(false);
    const [gamePhase, setGamePhase] = useState<GamePhase>('IDLE');
    
    const [timingConfig, setTimingConfig] = useState<TimingConfig>({ swapDelay: 300, matchDelay: 400, fallDelay: 300, gameSpeed: 1 });
    const [generationConfig, setGenerationConfig] = useState<GenerationConfig>(() => {
        const enabledNormal: { [key: number]: boolean } = {};
        for (let i = 0; i < NORMAL_TILE_TYPES; i++) {
            enabledNormal[i] = true;
        }
        const normal: { [key: number]: boolean } = {};
        NORMAL_SPECIAL_TILE_TYPES.forEach(type => normal[type] = false);

        return {
            enabledNormal,
            normal,
            unique: {
                complex: { enabled: false, health: 3 },
                metal: { enabled: false },
                stone: { enabled: false }
            }
        };
    });
    
    const boardSize = { width, height };

    const { board, score, moves, level, handleTileClick, selectedTile, restartGame, isProcessing } = useGameLogic({
        playSound,
        timingConfig,
        isPaused,
        stepTrigger,
        onPhaseChange: setGamePhase,
        isStepMode,
        autoPause: () => { if (isStepMode) setIsPaused(true); },
        generationConfig,
        boardSize,
    });
    
    const createInitialBoardFromEditor = useCallback(() => {
        let idCounter = 0;
        const availableTypes = Object.entries(generationConfig.enabledNormal)
            .filter(([, enabled]) => enabled)
            .map(([type]) => Number(type));
            
        const newBoard: TileData[] = [];
        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                const typeFromEditor = boardData[r]?.[c];
                const type = (typeFromEditor === null || typeFromEditor === undefined)
                    ? availableTypes[Math.floor(Math.random() * availableTypes.length)]
                    : typeFromEditor;
                newBoard.push({ id: idCounter++, type, row: r, col: c });
            }
        }
        return newBoard;
    }, [width, height, boardData, generationConfig.enabledNormal]);
    
    useEffect(() => {
        restartGame(createInitialBoardFromEditor());
    }, []);

    const handlePlay = () => setIsPaused(false);
    const handlePause = () => setIsPaused(true);
    const handleStep = () => {
        if (isPaused) {
            setStepTrigger(v => v + 1);
        }
    };
    
    return (
        <div className="w-full flex flex-col items-center gap-4">
            <button
                onClick={onStop}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md shadow-lg transition-transform transform hover:scale-105"
            >
                ■ STOP
            </button>
            <div className="flex flex-col md:flex-row items-start justify-center gap-6">
                <GameBoard
                    board={board}
                    onTileClick={handleTileClick}
                    selectedTile={selectedTile}
                    isProcessing={isProcessing}
                    boardSize={boardSize}
                />
                <div className="flex flex-col gap-4 w-full md:w-56">
                     <GameInfo score={score} moves={moves} level={level} />
                     <Controls 
                        isAiActive={false}
                        onToggleAi={() => {}}
                        showHints={false}
                        onToggleHints={() => {}}
                        isMuted={isMuted}
                        onToggleMute={toggleMute}
                        isProcessing={isProcessing}
                        isPaused={isPaused}
                        onPlay={handlePlay}
                        onPause={handlePause}
                        onStep={handleStep}
                        gamePhase={gamePhase}
                        onRestart={() => restartGame(createInitialBoardFromEditor())}
                        isStepMode={isStepMode}
                        onToggleStepMode={() => setIsStepMode(p => !p)}
                     />
                </div>
            </div>
            <GameOverModal isOpen={moves <= 0 && gamePhase === 'GAME_OVER'} score={score} onRestart={() => restartGame(createInitialBoardFromEditor())} />
        </div>
    );
};


// =============== SANDBOX GENERATOR ===============
const SandboxGenerator = () => {
    const [width, setWidth] = useState(8);
    const [height, setHeight] = useState(8);
    const [editorBoard, setEditorBoard] = useState<EditorBoard>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    
    const [activeTool, setActiveTool] = useState<Tool>('reset');
    const [selectedBrushTile, setSelectedBrushTile] = useState<number | null>(null);
    const [isPainting, setIsPainting] = useState(false);
    const [moveSource, setMoveSource] = useState<{ row: number, col: number } | null>(null);
    const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
    const mainContainerRef = useRef<HTMLDivElement>(null);


    const createGrid = useCallback(() => {
        const newBoard = Array.from({ length: height }, () => 
            Array.from({ length: width }, () => null)
        );
        setEditorBoard(newBoard);
        setHistory([{ board: newBoard, width, height }]);
    }, [width, height]);

    useEffect(() => {
        createGrid();
    }, []);

    const addToHistory = (entry: HistoryEntry) => {
        setHistory(prev => [...prev.slice(-99), entry]); // Keep last 100 states
    };

    const handleUndo = () => {
        if (history.length > 1) {
            const newHistory = history.slice(0, -1);
            const prevState = newHistory[newHistory.length - 1];
            setHistory(newHistory);
            setEditorBoard(prevState.board);
            setWidth(prevState.width);
            setHeight(prevState.height);
        }
    };
    
    const updateBoardAndHistory = (newBoard: EditorBoard) => {
        setEditorBoard(newBoard);
        addToHistory({ board: newBoard, width, height });
    };

    const handleDrop = (row: number, col: number, tileType: number) => {
        if (activeTool !== 'reset') return;
        const newBoard = editorBoard.map(r => [...r]);
        newBoard[row][col] = tileType;
        updateBoardAndHistory(newBoard);
    };

    const handleSave = () => {
        const data = JSON.stringify({ width, height, board: editorBoard });
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'level.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleLoad = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target?.result as string);
                        if (data.width && data.height && data.board) {
                            setWidth(data.width);
                            setHeight(data.height);
                            setEditorBoard(data.board);
                            addToHistory({ board: data.board, width: data.width, height: data.height });
                        }
                    } catch (error) {
                        console.error("Failed to load or parse level file:", error);
                        alert("Не удалось загрузить файл уровня. Файл поврежден или имеет неверный формат.");
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

     const boardBeforePaintRef = useRef<EditorBoard | null>(null);

    const applyTool = (row: number, col: number) => {
        const newBoard = editorBoard.map(r => [...r]);
        
        if (activeTool === 'brush' && selectedBrushTile !== null) {
            if (newBoard[row][col] === selectedBrushTile) return;
            newBoard[row][col] = selectedBrushTile;
        } else if (activeTool === 'eraser') {
            if (newBoard[row][col] === null) return;
            newBoard[row][col] = null;
        } else {
            return;
        }
        setEditorBoard(newBoard);
    };

    const handleCellMouseDown = (row: number, col: number) => {
        if (activeTool === 'brush' || activeTool === 'eraser') {
            setIsPainting(true);
            boardBeforePaintRef.current = editorBoard;
            applyTool(row, col);
        }
    };

    const handleCellMouseEnter = (row: number, col: number) => {
        if (isPainting && (activeTool === 'brush' || activeTool === 'eraser')) {
            applyTool(row, col);
        }
    };

    const handleCellMouseUp = () => {
        if (isPainting) {
            setIsPainting(false);
            if (boardBeforePaintRef.current !== editorBoard) {
                addToHistory({ board: editorBoard, width, height });
            }
            boardBeforePaintRef.current = null;
        }
    };
    
    const handleCellClick = (row: number, col: number) => {
        if (activeTool !== 'move') return;

        const clickedTile = editorBoard[row][col];

        if (moveSource) {
            const sourceTile = editorBoard[moveSource.row][moveSource.col];
            
            const newBoard = editorBoard.map(r => [...r]);
            newBoard[row][col] = sourceTile;
            newBoard[moveSource.row][moveSource.col] = clickedTile;
            
            updateBoardAndHistory(newBoard);
            setMoveSource(null);
        } else {
             if (clickedTile !== null) {
                setMoveSource({ row, col });
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (mainContainerRef.current) {
            const rect = mainContainerRef.current.getBoundingClientRect();
            setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
    };
    
    useEffect(() => {
        const upListener = () => handleCellMouseUp();
        window.addEventListener('mouseup', upListener);
        return () => window.removeEventListener('mouseup', upListener);
    }, [isPainting]);

    const handleDragStart = (e: React.DragEvent, tileType: number) => {
        e.dataTransfer.setData('tileType', tileType.toString());
        setActiveTool('reset');
    };
    
    return (
        <div ref={mainContainerRef} onMouseMove={handleMouseMove} className="min-h-screen w-full flex flex-col items-center p-4 gap-4 overflow-hidden">
            {isPlaying ? (
                <GameRunner boardData={editorBoard} width={width} height={height} onStop={() => setIsPlaying(false)} />
            ) : (
                <>
                    <div className="flex-shrink-0 bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-lg p-2 flex items-center gap-2 flex-wrap shadow-lg">
                        <span className="text-xs uppercase px-2">Ширина</span>
                        <input type="range" min="4" max="12" value={width} onChange={e => setWidth(Number(e.target.value))} className="w-24 accent-cyan-500"/>
                        <span className="font-bold text-cyan-400 w-4">{width}</span>
                        <span className="text-xs uppercase px-2">Высота</span>
                        <input type="range" min="4" max="12" value={height} onChange={e => setHeight(Number(e.target.value))} className="w-24 accent-cyan-500"/>
                        <span className="font-bold text-cyan-400 w-4">{height}</span>

                        <button onClick={createGrid} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-3 rounded-md shadow-md text-xs transition-transform transform hover:scale-105">СОЗДАТЬ</button>
                        <button onClick={() => setIsPlaying(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-md shadow-md text-xs transition-transform transform hover:scale-105">▶ PLAY</button>
                        <button onClick={() => {}} disabled className="bg-red-800 text-red-400/50 font-bold py-2 px-3 rounded-md shadow-md text-xs cursor-not-allowed">■ STOP</button>
                        <button onClick={handleSave} className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-3 rounded-md shadow-md text-xs transition-transform transform hover:scale-105">СОХРАНИТЬ</button>
                        <button onClick={handleLoad} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold py-2 px-3 rounded-md shadow-md text-xs transition-transform transform hover:scale-105">ЗАГРУЗИТЬ</button>
                        <button onClick={handleUndo} disabled={history.length <= 1} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-3 rounded-md shadow-md text-xs transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">ОТМЕНИТЬ</button>
                    </div>

                    <div className="flex gap-4 items-start">
                        <div className="bg-slate-900/50 backdrop-blur-sm border-2 border-cyan-500/30 rounded-md shadow-[0_0_20px_rgba(56,189,248,0.2)] select-none">
                            <div
                                style={{
                                    gridTemplateColumns: `repeat(${width}, 48px)`,
                                    width: `${width * 48 + (width -1) * 4}px`
                                }}
                                className="grid gap-1 p-1"
                                onMouseLeave={handleCellMouseUp}
                            >
                                {editorBoard.map((row, r) =>
                                    row.map((tileType, c) => {
                                        const isMoveSource = moveSource?.row === r && moveSource?.col === c;
                                        return (
                                            <div
                                                key={`${r}-${c}`}
                                                className={`w-12 h-12 flex items-center justify-center rounded-md bg-black/30 transition-colors ${isMoveSource ? 'ring-2 ring-yellow-400' : ''}`}
                                                onDragOver={e => e.preventDefault()}
                                                onDrop={e => handleDrop(r, c, Number(e.dataTransfer.getData('tileType')))}
                                                onMouseDown={() => handleCellMouseDown(r, c)}
                                                onMouseEnter={() => handleCellMouseEnter(r, c)}
                                                onClick={() => handleCellClick(r, c)}
                                            >
                                                {tileType !== null && (
                                                    <div
                                                        className={`w-full h-full flex items-center justify-center rounded-md text-3xl text-white ${TILE_COLORS[tileType]} ${TILE_SHADOWS[tileType]}`}
                                                    >
                                                        <span style={{textShadow: '0 0 5px rgba(0,0,0,0.7)'}}>{TILE_SHAPES[tileType]}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-lg p-2 shadow-lg">
                                <h3 className="text-xs text-center uppercase text-slate-400 mb-2">Инструменты</h3>
                                <div className="grid grid-cols-4 gap-2">
                                    <ToolButton label="Reset/Drag-drop" icon="🚫" isActive={activeTool === 'reset'} onClick={() => setActiveTool('reset')} />
                                    <ToolButton label="Move" icon="✥" isActive={activeTool === 'move'} onClick={() => setActiveTool('move')} />
                                    <ToolButton label="Brush" icon="🖌️" isActive={activeTool === 'brush'} onClick={() => setActiveTool('brush')} />
                                    <ToolButton label="Eraser" icon="🧼" isActive={activeTool === 'eraser'} onClick={() => setActiveTool('eraser')} />
                                </div>
                            </div>

                            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-lg p-2 shadow-lg">
                                <h3 className="text-xs text-center uppercase text-slate-400 mb-2">Библиотека</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {allLibraryTiles.map(tileType => {
                                        const isSelected = selectedBrushTile === tileType && activeTool === 'brush';
                                        return(
                                            <div
                                                key={tileType}
                                                draggable
                                                onDragStart={e => handleDragStart(e, tileType)}
                                                onClick={() => setSelectedBrushTile(tileType)}
                                                className={`w-12 h-12 flex items-center justify-center rounded-md text-3xl text-white cursor-grab ${TILE_COLORS[tileType]} ${TILE_SHADOWS[tileType]} transition-all duration-200 ${isSelected ? 'ring-2 ring-yellow-300 scale-110' : 'ring-1 ring-inset ring-black/20'}`}
                                            >
                                                <div className="flex flex-col items-center justify-center relative">
                                                    <span style={{textShadow: '0 0 5px rgba(0,0,0,0.7)'}}>{TILE_SHAPES[tileType]}</span>
                                                    <span className="absolute -bottom-3 text-[8px] font-bold text-slate-300" style={{textShadow: '1px 1px 2px black'}}>{TILE_NAMES[tileType] || `Gem ${tileType}`}</span>
                                                </div>
                                            </div>
                                        );
                                     })}
                                </div>
                            </div>
                        </div>
                    </div>
                    {activeTool === 'brush' && selectedBrushTile !== null && (
                         <div
                            className={`pointer-events-none absolute w-10 h-10 flex items-center justify-center rounded-md text-3xl text-white ${TILE_COLORS[selectedBrushTile]} opacity-70`}
                            style={{ top: `${cursorPos.y - 20}px`, left: `${cursorPos.x - 20}px`, transform: `translate(-50%, -50%)` }}
                         >
                            <span style={{textShadow: '0 0 5px rgba(0,0,0,0.7)'}}>{TILE_SHAPES[selectedBrushTile]}</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const App = () => {
    return (
        <SandboxGenerator />
    );
};

export default App;
