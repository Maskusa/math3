import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import GameBoard from './components/GameBoard';
import GameInfo from './components/GameInfo';
import GameOverModal from './components/GameOverModal';
import GameWinModal from './components/GameWinModal';
import GameReadyOverlay from './components/GameReadyOverlay';
import Controls from './components/Controls';
import { useSounds } from './hooks/useSounds';
import { GamePhase, TileData, LevelData, EditorBoard, LevelProgress } from './types';
import TimingControls from './components/TimingControls';
import GenerationControls from './components/GenerationControls';
import BoardSizeControls from './components/BoardSizeControls';
import { TILE_COLORS, TILE_SHAPES, TILE_NAMES, NORMAL_TILE_TYPES, NORMAL_SPECIAL_TILE_TYPES, UNIQUE_TILE_TYPES, TILE_SHADOWS, INITIAL_MOVES } from './constants';

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
const LEVEL_STORAGE_PREFIX = 'level_';
const PROGRESS_STORAGE_KEY = 'hexa-core-progress';

const getSavedLevels = (): string[] => {
    return Object.keys(localStorage)
        .filter(key => key.startsWith(LEVEL_STORAGE_PREFIX))
        .map(key => key.replace(LEVEL_STORAGE_PREFIX, ''))
        .sort((a, b) => {
             const numA = parseInt(a.split('_')[1] || '0');
             const numB = parseInt(b.split('_')[1] || '0');
             return numA - numB;
        });
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

const saveLevel = (name: string, data: Omit<LevelData, 'bestScore' | 'stars'>) => {
    if (!name) return;
    localStorage.setItem(`${LEVEL_STORAGE_PREFIX}${name}`, JSON.stringify(data));
};

type StoredLevelData = Omit<LevelData, 'bestScore' | 'stars'>;

const isPartialLevelData = (data: any): data is Partial<StoredLevelData> => {
    return (
        typeof data === 'object' &&
        data !== null &&
        !Array.isArray(data) &&
        typeof data.width === 'number' && data.width >= 4 && data.width <= 12 &&
        typeof data.height === 'number' && data.height >= 4 && data.height <= 12 &&
        Array.isArray(data.board) &&
        data.board.length === data.height &&
        data.board.every((row: any) => Array.isArray(row) && row.length === data.width)
    );
};

const loadLevel = (name: string): StoredLevelData | null => {
    const dataStr = localStorage.getItem(`${LEVEL_STORAGE_PREFIX}${name}`);
    if (dataStr) {
        try {
            const parsedData = JSON.parse(dataStr);
            if (isPartialLevelData(parsedData)) {
                return {
                    width: parsedData.width!,
                    height: parsedData.height!,
                    board: parsedData.board!,
                    finishScore: parsedData.finishScore ?? 1000,
                    moves: parsedData.moves ?? INITIAL_MOVES,
                };
            }
            console.error(`Invalid level data structure for level: ${name}`);
            return null;
        } catch (error) {
            console.error(`Failed to parse JSON for level: ${name}`, error);
            return null;
        }
    }
    return null;
};

const loadAllProgress = (): { [key: string]: LevelProgress } => {
    try {
        const progressStr = localStorage.getItem(PROGRESS_STORAGE_KEY);
        if (progressStr) {
            return JSON.parse(progressStr);
        }
    } catch (error) {
        console.error("Failed to load progress data:", error);
    }
    return {};
};

const saveAllProgress = (progress: { [key: string]: LevelProgress }) => {
    try {
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
        console.error("Failed to save progress data:", error);
    }
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
    levelData: StoredLevelData;
    onGameEnd: (result: { score: number; stars: number }) => void;
    onPhaseChange: (phase: GamePhase) => void;
    gamePhase: GamePhase;
    stopButtonLabel?: string;
    isDebugMode?: boolean;
    levelName?: string;
    onStop: () => void;
}> = ({ levelData, onGameEnd, onPhaseChange, gamePhase, onStop, stopButtonLabel = '■ STOP', isDebugMode = false, levelName = 'untitled' }) => {
    const { playSound, isMuted, toggleMute } = useSounds();
    const [isPaused, setIsPaused] = useState(true);
    const [stepTrigger, setStepTrigger] = useState(0);
    const [isStepMode, setIsStepMode] = useState(false);
    
    const [timingConfig, setTimingConfig] = useState({ swapDelay: 300, matchDelay: 400, fallDelay: 300, gameSpeed: 1 });
    const [generationConfig, setGenerationConfig] = useState(() => {
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
    
    const boardSize = { width: levelData.width, height: levelData.height };
    const scoreThresholds = {
        star1: levelData.finishScore,
        star2: levelData.finishScore * 1.25,
        star3: levelData.finishScore * 1.50,
    };

    const { board, score, moves, level, handleTileClick, selectedTile, restartGame, isProcessing, logCollectorRef } = useGameLogic({
        playSound,
        timingConfig,
        isPaused,
        stepTrigger,
        onPhaseChange,
        gamePhase,
        isStepMode,
        autoPause: () => { if (isStepMode) setIsPaused(true); },
        generationConfig,
        boardSize,
        isDebugMode,
        scoreThresholds,
        initialMoves: levelData.moves,
        onGameEnd,
    });
    
    const createInitialBoardFromEditor = useCallback(() => {
        let idCounter = 0;
        const availableTypes = Object.entries(generationConfig.enabledNormal)
            .filter(([, enabled]) => enabled)
            .map(([type]) => Number(type));
            
        const newBoard: TileData[] = [];
        for (let r = 0; r < levelData.height; r++) {
            for (let c = 0; c < levelData.width; c++) {
                const typeFromEditor = levelData.board[r]?.[c];
                const type = (typeFromEditor === null || typeFromEditor === undefined)
                    ? availableTypes[Math.floor(Math.random() * availableTypes.length)]
                    : typeFromEditor;
                newBoard.push({ id: idCounter++, type, row: r, col: c });
            }
        }
        if (isDebugMode) {
            console.log('[DEBUG] Creating initial board from editor data:', newBoard);
        }
        return newBoard;
    }, [levelData, generationConfig.enabledNormal, isDebugMode]);
    
    useEffect(() => {
        restartGame(createInitialBoardFromEditor());
    }, [createInitialBoardFromEditor, restartGame]);

    const handleReadySequenceEnd = () => {
        setIsPaused(false);
        onPhaseChange('IDLE');
    };

    const handleStep = () => {
        if (isPaused) {
            setStepTrigger(v => v + 1);
        }
    };
    
    const handleDownloadLog = () => {
        if (!logCollectorRef.current) return;
        const logData = logCollectorRef.current.join('\n');
        const blob = new Blob([logData], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `hexa-core-log-${levelName.replace(/ /g, '_')}-${timestamp}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="w-full flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
                <button
                    onClick={onStop}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md shadow-lg transition-transform transform hover:scale-105"
                >
                    {stopButtonLabel}
                </button>
                {isDebugMode && (
                    <button
                        onClick={handleDownloadLog}
                        className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-md shadow-lg transition-transform transform hover:scale-105"
                        title="Скачать журнал отладки для этой сессии"
                    >
                        СКАЧАТЬ ЛОГ
                    </button>
                )}
            </div>
            <div className="flex flex-col md:flex-row items-start justify-center gap-6">
                <div className="relative">
                    <GameBoard
                        board={board}
                        onTileClick={handleTileClick}
                        selectedTile={selectedTile}
                        isProcessing={isProcessing || gamePhase === 'READY'}
                        boardSize={boardSize}
                    />
                    {gamePhase === 'READY' && <GameReadyOverlay onFinished={handleReadySequenceEnd} />}
                </div>
                <div className="flex flex-col gap-4 w-full md:w-56">
                     <GameInfo score={score} moves={moves} level={level} scoreThresholds={scoreThresholds} />
                     <Controls 
                        isAiActive={false}
                        onToggleAi={() => {}}
                        showHints={false}
                        onToggleHints={() => {}}
                        isMuted={isMuted}
                        onToggleMute={toggleMute}
                        isProcessing={isProcessing}
                        isPaused={isPaused}
                        onPlay={() => setIsPaused(false)}
                        onPause={() => setIsPaused(true)}
                        onStep={handleStep}
                        gamePhase={gamePhase}
                        onRestart={() => restartGame(createInitialBoardFromEditor())}
                        isStepMode={isStepMode}
                        onToggleStepMode={() => setIsStepMode(p => !p)}
                     />
                </div>
            </div>
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
    const [finishScore, setFinishScore] = useState(1000);
    const [moves, setMoves] = useState(INITIAL_MOVES);
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
                setFinishScore(levelData.finishScore);
                setMoves(levelData.moves);
                setHistory([{ board: levelData.board, width: levelData.width, height: levelData.height }]);
            } else {
                 onBackToMenu();
            }
        } else {
            createGrid();
        }
    }, [levelNameToLoad, onBackToMenu, createGrid]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (!levelNameToLoad) {
                 createGrid();
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [width, height, levelNameToLoad, createGrid]);

    const addToHistory = useCallback((entry: { board: EditorBoard, width: number, height: number }) => {
        setHistory(prev => [...prev.slice(-99), entry]);
    }, []);

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
            saveLevel(currentLevelName, { width, height, board: editorBoard, finishScore, moves });
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
        saveLevel(name, { width, height, board: editorBoard, finishScore, moves });
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

    const handleCellMouseUp = useCallback(() => {
        if (isPainting) {
            setIsPainting(false);
            if (boardBeforePaintRef.current !== editorBoard) {
                addToHistory({ board: editorBoard, width, height });
            }
            boardBeforePaintRef.current = null;
        }
    }, [isPainting, editorBoard, width, height, addToHistory]);
    
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
    }, [handleCellMouseUp]);

    const handleDragStart = (e: React.DragEvent, tileType: number) => {
        e.dataTransfer.setData('tileType', tileType.toString());
        setActiveTool('reset');
    };
    
    const editorLevelData = { width, height, board: editorBoard, finishScore, moves };

    return (
        <div ref={mainContainerRef} onMouseMove={handleMouseMove} className="min-h-screen w-full flex flex-col items-center p-4 gap-4 overflow-hidden">
            {isPlaying ? (
                <PlayScreenInternal
                    levelData={editorLevelData}
                    levelName={currentLevelName || 'new-level'}
                    onBackToMenu={() => setIsPlaying(false)}
                    onNextLevel={() => setIsPlaying(false)}
                    onReplay={() => {
                        // This will just stop playtesting and return to editor
                        setIsPlaying(false);
                        setTimeout(() => setIsPlaying(true), 50);
                    }}
                    isDebugMode={false} // Debug mode is not available for test runs
                />
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
                         <div className="w-px h-6 bg-slate-600 mx-1"></div>
                        <span className="text-xs uppercase px-2">Очки (1★)</span>
                        <input type="number" step="100" min="0" value={finishScore} onChange={e => setFinishScore(Math.max(0, Number(e.target.value)))} className="bg-slate-800 border border-slate-600 rounded-md w-24 p-1 text-center font-bold text-cyan-400"/>
                        <span className="text-xs uppercase px-2">Ходы</span>
                        <input type="number" step="1" min="1" value={moves} onChange={e => setMoves(Math.max(1, Number(e.target.value)))} className="bg-slate-800 border border-slate-600 rounded-md w-20 p-1 text-center font-bold text-cyan-400"/>

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

// ================= PLAY SCREEN HELPER =================
const PlayScreenInternal: React.FC<{
    levelData: StoredLevelData;
    levelName: string;
    onBackToMenu: () => void;
    onNextLevel: () => void;
    onReplay: () => void;
    isDebugMode: boolean;
}> = ({ levelData, levelName, onBackToMenu, onNextLevel, onReplay, isDebugMode }) => {
    const [gamePhase, setGamePhase] = useState<GamePhase>('READY');
    const [gameResult, setGameResult] = useState<{ score: number, stars: number } | null>(null);

    const handleGameEnd = useCallback((result: { score: number, stars: number }) => {
        setGameResult(result);
        const allProgress = loadAllProgress();
        const existingProgress = allProgress[levelName];

        if (!existingProgress || result.score > existingProgress.bestScore) {
            allProgress[levelName] = { bestScore: result.score, stars: result.stars };
            saveAllProgress(allProgress);
        }
    }, [levelName]);

    return (
        <div className="min-h-screen w-full flex flex-col items-center p-4">
            <GameRunner
                levelData={levelData}
                onGameEnd={handleGameEnd}
                onPhaseChange={setGamePhase}
                gamePhase={gamePhase}
                onStop={onBackToMenu}
                stopButtonLabel="ВЫХОД В МЕНЮ"
                isDebugMode={isDebugMode}
                levelName={levelName}
            />
            {gameResult && gamePhase === 'WIN' && (
                <GameWinModal
                    isOpen={true}
                    score={gameResult.score}
                    stars={gameResult.stars}
                    onMenu={onBackToMenu}
                    onNext={onNextLevel}
                    onReplay={onReplay}
                />
            )}
            {gameResult && gamePhase === 'GAME_OVER' && (
                 <GameOverModal
                    isOpen={true}
                    score={gameResult.score}
                    onReplay={onReplay}
                />
            )}
        </div>
    );
}

// ================= PLAY SCREEN COMPONENT =================
const PlayScreen: React.FC<{
    levelNameToLoad: string;
    onBackToMenu: () => void;
    isDebugMode: boolean;
    onLoadLevel: (levelName: string) => void;
}> = ({ levelNameToLoad, onBackToMenu, isDebugMode, onLoadLevel }) => {
    const [levelData, setLevelData] = useState<StoredLevelData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [gameKey, setGameKey] = useState(0); // Used to force re-mount on replay

    useEffect(() => {
        setError(null);
        const data = loadLevel(levelNameToLoad);
        if (data) {
            setLevelData(data);
            setGameKey(k => k + 1); // Ensure GameRunner remounts if level changes
        } else {
            setError(`Не удалось загрузить уровень: ${levelNameToLoad}`);
        }
    }, [levelNameToLoad]);

    const handleNextLevel = () => {
        const currentNumMatch = levelNameToLoad.match(/_(\d+)$/);
        if (currentNumMatch) {
            const currentNum = parseInt(currentNumMatch[1], 10);
            const nextLevelName = levelNameToLoad.replace(`_${currentNum}`, `_${currentNum + 1}`);

            const savedLevels = getSavedLevels();
            if (savedLevels.includes(nextLevelName)) {
                onLoadLevel(nextLevelName);
            } else {
                alert("Поздравляем! Вы прошли последний уровень.");
                onBackToMenu();
            }
        } else {
            onBackToMenu();
        }
    };

    const handleReplay = () => {
        setGameKey(k => k + 1); // Remounts GameRunner, effectively restarting the level
    };

    if (error) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 gap-4">
                <p className="text-red-500 text-xl">{error}</p>
                <button onClick={onBackToMenu} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-md shadow-md transition-transform transform hover:scale-105">
                    Назад в меню
                </button>
            </div>
        );
    }

    if (!levelData) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center">
                <p className="text-2xl text-cyan-400 font-orbitron animate-pulse">ЗАГРУЗКА ИНТЕРФЕЙСА...</p>
            </div>
        );
    }

    return (
       <PlayScreenInternal
            key={gameKey}
            levelData={levelData}
            levelName={levelNameToLoad}
            onBackToMenu={onBackToMenu}
            onNextLevel={handleNextLevel}
            onReplay={handleReplay}
            isDebugMode={isDebugMode}
       />
    );
};

const StarRating: React.FC<{ stars: number; size?: 'sm' | 'lg' }> = ({ stars, size = 'sm' }) => (
    <div className="flex">
        {[1, 2, 3].map(i => (
            <span key={i} className={`
                ${i <= stars ? 'text-yellow-400' : 'text-slate-600'}
                ${size === 'sm' ? 'text-2xl' : 'text-5xl'}
            `}>
                ★
            </span>
        ))}
    </div>
);


// ================= START SCREEN COMPONENT =================
const StartScreen: React.FC<{
    onPlay: (levelName: string) => void;
    onEdit: (levelName: string | null) => void;
    isDebugMode: boolean;
    onDebugModeChange: (isEnabled: boolean) => void;
}> = ({ onPlay, onEdit, isDebugMode, onDebugModeChange }) => {
    const [levels, setLevels] = useState<string[]>([]);
    const [progress, setProgress] = useState<{ [key: string]: LevelProgress }>({});
    const importInputRef = useRef<HTMLInputElement>(null);

    const refreshData = useCallback(() => {
        const savedLevels = getSavedLevels();
        const savedProgress = loadAllProgress();
        setLevels(savedLevels);
        setProgress(savedProgress);
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const handleNewClick = () => {
        onEdit(null); // Indicates a new level
    };

    const handleExport = () => {
        const savedLevels = getSavedLevels();
        if (savedLevels.length === 0) {
            alert("Нет уровней для экспорта.");
            return;
        }
        const allProgress = loadAllProgress();
        const exportData: { [key: string]: LevelData } = {};
        
        savedLevels.forEach(levelName => {
            const levelData = loadLevel(levelName);
            if (levelData) {
                const levelProgress = allProgress[levelName];
                exportData[levelName] = {
                    ...levelData,
                    bestScore: levelProgress?.bestScore || 0,
                    stars: levelProgress?.stars || 0,
                };
            }
        });

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `hexa-core-levels-${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        importInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("Не удалось прочитать файл.");
                
                const importedData = JSON.parse(text);
                if (typeof importedData !== 'object' || importedData === null || Array.isArray(importedData)) {
                     throw new Error("Неверный формат файла.");
                }

                const allProgress = loadAllProgress();
                let importedCount = 0;

                Object.entries(importedData).forEach(([levelName, data]) => {
                    if (isPartialLevelData(data)) {
                        const { bestScore, stars, ...levelDesign } = data as LevelData;
                        saveLevel(levelName, levelDesign);

                        if (typeof bestScore === 'number' && typeof stars === 'number' && (bestScore > 0 || stars > 0)) {
                            const localProgress = allProgress[levelName];
                            if (!localProgress || bestScore > localProgress.bestScore) {
                                allProgress[levelName] = { bestScore, stars };
                            }
                        }
                        importedCount++;
                    } else {
                        console.warn(`Пропущен неверный уровень '${levelName}' при импорте.`);
                    }
                });
                
                saveAllProgress(allProgress);
                alert(`Импорт завершен! Загружено ${importedCount} уровней.`);
                refreshData();

            } catch (error) {
                console.error("Ошибка импорта:", error);
                alert(`Ошибка импорта: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`);
            } finally {
                if (event.target) event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 gap-8">
            <h1 className="text-7xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 font-orbitron">HEXA-CORE</h1>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-lg p-8 flex flex-col items-center gap-6 shadow-lg w-full max-w-2xl">
                <h2 className="text-2xl font-orbitron text-slate-300">ВЫБЕРИТЕ УРОВЕНЬ</h2>
                
                <div className="w-full h-64 overflow-y-auto bg-slate-800/50 border border-slate-600 rounded-lg p-2 flex flex-col gap-2">
                    {levels.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-slate-400">Нет сохраненных уровней</div>
                    ) : (
                        levels.map(level => (
                            <div key={level} className="flex items-center gap-4 bg-slate-900/70 p-2 rounded-md border border-transparent hover:border-cyan-500 transition-colors">
                                <div className="flex-grow flex items-center gap-4">
                                    <StarRating stars={progress[level]?.stars || 0} />
                                    <span className="text-lg text-white">{level}</span>
                                </div>
                                <button onClick={() => onEdit(level)} className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-md shadow-md text-xs transition-transform transform hover:scale-105">РЕДАКТ.</button>
                                <button onClick={() => onPlay(level)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md shadow-md text-xs transition-transform transform hover:scale-105">ИГРАТЬ</button>
                            </div>
                        ))
                    )}
                </div>

                <div className="relative flex py-2 items-center w-full">
                    <div className="flex-grow border-t border-slate-600"></div>
                    <span className="flex-shrink mx-4 text-slate-400 font-orbitron">РЕДАКТОР</span>
                    <div className="flex-grow border-t border-slate-600"></div>
                </div>
                 <div className="w-full">
                    <button onClick={handleNewClick} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-md shadow-lg transition-transform transform hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-lg font-orbitron">
                        СОЗДАТЬ НОВЫЙ УРОВЕНЬ
                    </button>
                </div>

                <div className="relative flex py-2 items-center w-full">
                    <div className="flex-grow border-t border-slate-600"></div>
                    <span className="flex-shrink mx-4 text-slate-400 font-orbitron">УПРАВЛЕНИЕ</span>
                    <div className="flex-grow border-t border-slate-600"></div>
                </div>
                <div className="flex gap-4 w-full">
                    <button onClick={handleImportClick} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md shadow-lg transition-transform transform hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-orbitron">
                        ИМПОРТ
                    </button>
                    <button onClick={handleExport} disabled={levels.length === 0} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-md shadow-lg transition-transform transform hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg font-orbitron disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed">
                        ЭКСПОРТ
                    </button>
                    <input
                        type="file"
                        ref={importInputRef}
                        onChange={handleFileImport}
                        accept=".json,application/json"
                        className="hidden"
                    />
                </div>

                <div className="w-full border-t border-slate-600 pt-4 mt-2">
                    <label className="flex items-center justify-center gap-3 text-slate-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isDebugMode}
                            onChange={(e) => onDebugModeChange(e.target.checked)}
                            className="w-5 h-5 bg-slate-800 border-slate-600 rounded text-cyan-500 focus:ring-cyan-500"
                        />
                        <span className="font-orbitron">ДЕБАГ МОД</span>
                    </label>
                </div>
            </div>
        </div>
    );
};


// ================= MAIN APP COMPONENT =================
const App = () => {
    const [view, setView] = useState<'start' | 'editor' | 'play'>('start');
    const [levelToLoad, setLevelToLoad] = useState<string | null>(null);
    const [isDebugMode, setIsDebugMode] = useState(false);

    const handleStartEditor = (levelName: string | null) => {
        setLevelToLoad(levelName);
        setView('editor');
    };

    const handlePlay = (levelName: string) => {
        if (!levelName) return;
        setLevelToLoad(levelName);
        setView('play');
    };
    
    const handleBackToMenu = () => {
        setView('start');
        setLevelToLoad(null);
    };

    const handleLoadLevel = useCallback((levelName: string) => {
        const data = loadLevel(levelName);
        if (data) {
            setLevelToLoad(levelName);
        } else {
            handleBackToMenu();
        }
    }, []);

    if (view === 'start') {
        return <StartScreen onPlay={handlePlay} onEdit={handleStartEditor} isDebugMode={isDebugMode} onDebugModeChange={setIsDebugMode} />;
    }
    
    if (view === 'play' && levelToLoad) {
        return <PlayScreen levelNameToLoad={levelToLoad} onBackToMenu={handleBackToMenu} isDebugMode={isDebugMode} onLoadLevel={handleLoadLevel} />;
    }

    return <Editor levelNameToLoad={levelToLoad} onBackToMenu={handleBackToMenu} />;
};

export default App;