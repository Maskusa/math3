import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import GameBoard from './components/GameBoard';
import GameInfo from './components/GameInfo';
import GameOverModal from './components/GameOverModal';
import Controls from './components/Controls';
import { useSounds } from './hooks/useSounds';
import { GamePhase, TileData, BoardSize, TimingConfig, GenerationConfig } from './types';
import TimingControls from './components/TimingControls';
import GenerationControls from './components/GenerationControls';
import BoardSizeControls from './components/BoardSizeControls';
import { TILE_COLORS, TILE_SHAPES, TILE_NAMES, NORMAL_TILE_TYPES, NORMAL_SPECIAL_TILE_TYPES, UNIQUE_TILE_TYPES, TILE_SHADOWS } from './constants';

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

// ================= STORAGE UTILS =================
const STORAGE_PREFIX = 'level_';

const getSavedLevels = (): string[] => {
    return Object.keys(localStorage)
        .filter(key => key.startsWith(STORAGE_PREFIX))
        .map(key => key.replace(STORAGE_PREFIX, ''))
        .sort();
};

const getNextLevelName = (): string => {
    const savedLevels = getSavedLevels();
    if (savedLevels.length === 0) {
        return 'level_1';
    }
    const levelNumbers = savedLevels
        .map(name => {
            const match = name.match(/_(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => !isNaN(num));
    
    const maxNum = Math.max(0, ...levelNumbers);
    return `level_${maxNum + 1}`;
};

const saveLevel = (name: string, data: { width: number, height: number, board: EditorBoard }) => {
    if (!name) return;
    localStorage.setItem(`${STORAGE_PREFIX}${name}`, JSON.stringify(data));
};

const loadLevel = (name: string): { width: number, height: number, board: EditorBoard } | null => {
    const data = localStorage.getItem(`${STORAGE_PREFIX}${name}`);
    if (data) {
        try {
            return JSON.parse(data);
        } catch (error) {
            console.error(`Failed to parse level: ${name}`, error);
            return null;
        }
    }
    return null;
};

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

// ================= MODAL COMPONENT =================
const Modal: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300">
      <div className={`bg-slate-900/80 border-2 border-cyan-500/50 rounded-lg p-6 text-center shadow-2xl ${className}`}>
        {children}
      </div>
    </div>
);

// ================= EDITOR COMPONENT =================
const Editor: React.FC<{ levelNameToLoad: string | null; onBackToMenu: () => void }> = ({ levelNameToLoad, onBackToMenu }) => {
    const [width, setWidth] = useState(8);
    const [height, setHeight] = useState(8);
    const [editorBoard, setEditorBoard] = useState<EditorBoard>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    
    const [activeTool, setActiveTool] = useState<Tool>('reset');
    const [selectedBrushTile, setSelectedBrushTile] = useState<number | null>(0);
    const [isPainting, setIsPainting] = useState(false);
    const [moveSource, setMoveSource] = useState<{ row: number, col: number } | null>(null);
    const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
    const mainContainerRef = useRef<HTMLDivElement>(null);

    const [currentLevelName, setCurrentLevelName] = useState<string | null>(levelNameToLoad);
    const [showSaveAsModal, setShowSaveAsModal] = useState(false);
    const [saveAsName, setSaveAsName] = useState('');
    const [showOverwriteModal, setShowOverwriteModal] = useState(false);
    const [nameToOverwrite, setNameToOverwrite] = useState('');

    const createGrid = useCallback(() => {
        const newBoard = Array.from({ length: height }, () => 
            Array.from({ length: width }, () => null)
        );
        setEditorBoard(newBoard);
        setHistory([{ board: newBoard, width, height }]);
    }, [width, height]);
    
    useEffect(() => {
        if (levelNameToLoad) {
            const levelData = loadLevel(levelNameToLoad);
            if (levelData) {
                setWidth(levelData.width);
                setHeight(levelData.height);
                setEditorBoard(levelData.board);
                setHistory([{ board: levelData.board, width: levelData.width, height: levelData.height }]);
            } else {
                 // Handle case where level is not found
                 onBackToMenu();
            }
        } else {
            createGrid();
        }
    }, [levelNameToLoad]);

    useEffect(() => {
        // Debounced or conditional grid creation if size changes
        const handler = setTimeout(() => {
            if (!levelNameToLoad) { // Only auto-create for new levels
                 createGrid();
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [width, height, levelNameToLoad, createGrid]);

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
    
    const handleSaveSimple = () => {
        if (currentLevelName) {
            saveLevel(currentLevelName, { width, height, board: editorBoard });
            // You could add a small "Saved!" notification here
        } else {
            handleSaveAs();
        }
    };
    
    const handleSaveAs = () => {
        const defaultName = currentLevelName || getNextLevelName();
        setSaveAsName(defaultName);
        setShowSaveAsModal(true);
    };

    const confirmSaveAs = () => {
        const trimmedName = saveAsName.trim();
        if (!trimmedName) {
            alert("Имя уровня не может быть пустым.");
            return;
        }
        
        const existingLevels = getSavedLevels();
        if (existingLevels.includes(trimmedName) && trimmedName !== currentLevelName) {
            setNameToOverwrite(trimmedName);
            setShowOverwriteModal(true);
        } else {
            performSave(trimmedName);
        }
    };

    const performSave = (name: string) => {
        saveLevel(name, { width, height, board: editorBoard });
        setCurrentLevelName(name);
        setShowSaveAsModal(false);
        setShowOverwriteModal(false);
        setNameToOverwrite('');
    };

    const confirmOverwrite = () => {
        performSave(nameToOverwrite);
    };

    const handleDrop = (row: number, col: number, tileType: number) => {
        if (activeTool !== 'reset') return;
        const newBoard = editorBoard.map(r => [...r]);
        newBoard[row][col] = tileType;
        updateBoardAndHistory(newBoard);
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
                        <button onClick={onBackToMenu} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-3 rounded-md shadow-md text-xs transition-transform transform hover:scale-105">МЕНЮ</button>
                        <div className="w-px h-6 bg-slate-600 mx-1"></div>
                        <span className="text-xs uppercase px-2">Ширина</span>
                        <input type="range" min="4" max="12" value={width} onChange={e => setWidth(Number(e.target.value))} className="w-24 accent-cyan-500"/>
                        <span className="font-bold text-cyan-400 w-4">{width}</span>
                        <span className="text-xs uppercase px-2">Высота</span>
                        <input type="range" min="4" max="12" value={height} onChange={e => setHeight(Number(e.target.value))} className="w-24 accent-cyan-500"/>
                        <span className="font-bold text-cyan-400 w-4">{height}</span>

                        <button onClick={() => setIsPlaying(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-md shadow-md text-xs transition-transform transform hover:scale-105">▶ PLAY</button>
                        <div className="w-px h-6 bg-slate-600 mx-1"></div>
                        <button onClick={handleSaveSimple} className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-3 rounded-md shadow-md text-xs transition-transform transform hover:scale-105">СОХРАНИТЬ</button>
                        <button onClick={handleSaveAs} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md shadow-md text-xs transition-transform transform hover:scale-105">СОХРАНИТЬ КАК...</button>
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
            {showSaveAsModal && (
                <Modal>
                    <h3 className="text-xl font-orbitron text-cyan-400 mb-4">Сохранить уровень как</h3>
                    <input 
                        type="text" 
                        value={saveAsName} 
                        onChange={e => setSaveAsName(e.target.value)}
                        className="bg-slate-800 border border-slate-600 text-white rounded-md p-2 w-full mb-4 focus:ring-cyan-500 focus:border-cyan-500" 
                        onKeyDown={(e) => e.key === 'Enter' && confirmSaveAs()}
                    />
                    <div className="flex justify-center gap-4">
                        <button onClick={() => setShowSaveAsModal(false)} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-md shadow-md transition-transform transform hover:scale-105">Отмена</button>
                        <button onClick={confirmSaveAs} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-md shadow-md transition-transform transform hover:scale-105">Сохранить</button>
                    </div>
                </Modal>
            )}
            {showOverwriteModal && (
                <Modal>
                    <h3 className="text-xl font-orbitron text-red-400 mb-4">Файл существует</h3>
                    <p className="text-slate-300 mb-6">Уровень с именем "{nameToOverwrite}" уже существует. Перезаписать его?</p>
                    <div className="flex justify-center gap-4">
                        <button onClick={() => setShowOverwriteModal(false)} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-md shadow-md transition-transform transform hover:scale-105">Нет</button>
                        <button onClick={confirmOverwrite} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md shadow-md transition-transform transform hover:scale-105">Да, перезаписать</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// ================= START SCREEN COMPONENT =================
const StartScreen: React.FC<{ onStart: (levelName: string | null) => void }> = ({ onStart }) => {
    const [levels, setLevels] = useState<string[]>([]);
    const [selectedLevel, setSelectedLevel] = useState<string>('');

    useEffect(() => {
        const savedLevels = getSavedLevels();
        setLevels(savedLevels);
        if (savedLevels.length > 0) {
            setSelectedLevel(savedLevels[0]);
        }
    }, []);

    const handleStart = () => {
        if (levels.length > 0 && selectedLevel) {
            onStart(selectedLevel);
        }
    };
    
    const handleNew = () => {
        onStart(null); // Indicates a new level
    }

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 gap-8">
            <h1 className="text-7xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 font-orbitron">HEXA-CORE EDITOR</h1>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-lg p-8 flex flex-col items-center gap-6 shadow-lg w-full max-w-md">
                <h2 className="text-2xl font-orbitron text-slate-300">Загрузить уровень</h2>
                <div className="flex items-center gap-2 w-full">
                    <select
                        value={selectedLevel}
                        onChange={e => setSelectedLevel(e.target.value)}
                        disabled={levels.length === 0}
                        className="flex-grow bg-slate-800 border border-slate-600 text-white text-lg rounded-md focus:ring-cyan-500 focus:border-cyan-500 p-3 disabled:opacity-50"
                    >
                        {levels.length === 0 ? (
                            <option>Нет сохраненных уровней</option>
                        ) : (
                            levels.map(level => <option key={level} value={level}>{level}</option>)
                        )}
                    </select>
                </div>
                 <button 
                    onClick={handleStart} 
                    disabled={levels.length === 0}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md shadow-lg transition-transform transform hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-lg font-orbitron"
                >
                    ЗАПУСК
                </button>
                <div className="relative flex py-2 items-center w-full">
                    <div className="flex-grow border-t border-slate-600"></div>
                    <span className="flex-shrink mx-4 text-slate-400">ИЛИ</span>
                    <div className="flex-grow border-t border-slate-600"></div>
                </div>
                 <button onClick={handleNew} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-md shadow-lg transition-transform transform hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-lg font-orbitron">
                    НОВЫЙ УРОВЕНЬ
                </button>
            </div>
        </div>
    );
};


// ================= MAIN APP COMPONENT =================
const App = () => {
    const [view, setView] = useState<'start' | 'editor'>('start');
    const [levelToLoad, setLevelToLoad] = useState<string | null>(null);

    const handleStartEditor = (levelName: string | null) => {
        setLevelToLoad(levelName);
        setView('editor');
    };
    
    const handleBackToMenu = () => {
        setView('start');
        setLevelToLoad(null);
    };

    if (view === 'start') {
        return <StartScreen onStart={handleStartEditor} />;
    }

    return <Editor levelNameToLoad={levelToLoad} onBackToMenu={handleBackToMenu} />;
};

export default App;