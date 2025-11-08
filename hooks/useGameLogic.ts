import { useState, useEffect, useCallback, useRef } from 'react';
import { BoardType, GameLogicProps, GamePhase, Position, TileData } from '../types';
import { INITIAL_MOVES, TILE_TYPE_BOMB, TILE_TYPE_LASER_H, TILE_TYPE_LASER_V } from '../constants';

const areAdjacent = (pos1: Position, pos2: Position) => {
    return Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col) === 1;
};

export const useGameLogic = ({
    playSound,
    timingConfig,
    isPaused,
    stepTrigger,
    onPhaseChange,
    gamePhase,
    autoPause,
    generationConfig,
    boardSize,
    isDebugMode = false,
    finishScore
}: GameLogicProps) => {
    const [board, setBoard] = useState<BoardType>([]);
    const [score, setScore] = useState(0);
    const [moves, setMoves] = useState(INITIAL_MOVES);
    const [level, setLevel] = useState(1);
    const [selectedTile, setSelectedTile] = useState<Position | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAiActive, setIsAiActive] = useState(false);
    const [showHints, setShowHints] = useState(false);

    const isProcessingRef = useRef(isProcessing);
    useEffect(() => {
        isProcessingRef.current = isProcessing;
    }, [isProcessing]);
    
    const scoreRef = useRef(score);
     useEffect(() => {
        scoreRef.current = score;
    }, [score]);

    const logCollectorRef = useRef<string[]>([]);
    const indentLevelRef = useRef(0);

    const log = useCallback((...args: any[]) => {
        const message = args.map(arg => {
            try {
                // Safely stringify objects, handling potential circular references
                return typeof arg === 'object' && arg !== null ? JSON.stringify(arg, null, 2) : String(arg);
            } catch (e) {
                return '[Circular Object]';
            }
        }).join(' ');
        const indentedMessage = '  '.repeat(indentLevelRef.current) + message;
        logCollectorRef.current.push(indentedMessage);
        if (isDebugMode) console.log('[DEBUG]', ...args);
    }, [isDebugMode]);

    const group = useCallback((label: string) => {
        const message = '  '.repeat(indentLevelRef.current) + label;
        logCollectorRef.current.push(message);
        logCollectorRef.current.push('  '.repeat(indentLevelRef.current) + '{');
        indentLevelRef.current++;
        if (isDebugMode) console.group(label);
    }, [isDebugMode]);

    const groupEnd = useCallback(() => {
        indentLevelRef.current = Math.max(0, indentLevelRef.current - 1);
        logCollectorRef.current.push('  '.repeat(indentLevelRef.current) + '}');
        if (isDebugMode) console.groupEnd();
    }, [isDebugMode]);
    
    // FIX: Use ReturnType<typeof setTimeout> for browser compatibility instead of NodeJS.Timeout.
    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const clearTimeouts = useCallback(() => {
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];
    }, []);

    const delay = (ms: number) => {
        return new Promise<void>(resolve => {
            if (isPaused && stepTrigger === 0) return;
            const timeout = setTimeout(() => resolve(), ms / timingConfig.gameSpeed);
            timeoutsRef.current.push(timeout);
        });
    };

    const getRandomTileType = useCallback(() => {
        const availableTypes = Object.entries(generationConfig.enabledNormal)
            .filter(([, enabled]) => enabled)
            .map(([type]) => Number(type));
        return availableTypes[Math.floor(Math.random() * availableTypes.length)];
    }, [generationConfig.enabledNormal]);

    const findMatches = useCallback((currentBoard: BoardType): TileData[] => {
        const matches = new Set<TileData>();
        const get = (r: number, c: number) => currentBoard.find(t => t.row === r && t.col === c);

        // Horizontal
        for (let r = 0; r < boardSize.height; r++) {
            for (let c = 0; c < boardSize.width - 2; c++) {
                const t1 = get(r, c);
                const t2 = get(r, c + 1);
                const t3 = get(r, c + 2);
                if (t1 && t2 && t3 && t1.type === t2.type && t2.type === t3.type && t1.type < TILE_TYPE_BOMB) {
                    [t1, t2, t3].forEach(t => matches.add(t));
                }
            }
        }
        // Vertical
        for (let c = 0; c < boardSize.width; c++) {
            for (let r = 0; r < boardSize.height - 2; r++) {
                const t1 = get(r, c);
                const t2 = get(r + 1, c);
                const t3 = get(r + 2, c);
                if (t1 && t2 && t3 && t1.type === t2.type && t2.type === t3.type && t1.type < TILE_TYPE_BOMB) {
                    [t1, t2, t3].forEach(t => matches.add(t));
                }
            }
        }
        return Array.from(matches);
    }, [boardSize]);

    const createBoard = useCallback(() => {
        let newBoard: TileData[] = [];
        let idCounter = 0;
        for (let r = 0; r < boardSize.height; r++) {
            for (let c = 0; c < boardSize.width; c++) {
                newBoard.push({ id: idCounter++, type: -1, row: r, col: c });
            }
        }

        for (let r = 0; r < boardSize.height; r++) {
            for (let c = 0; c < boardSize.width; c++) {
                const tile = newBoard.find(t => t.row === r && t.col === c)!;
                let possibleTypes = Object.entries(generationConfig.enabledNormal).filter(e => e[1]).map(e => Number(e[0]));
                
                const get = (row:number, col:number) => newBoard.find(t => t.row === row && t.col === col);

                if (c >= 2 && get(r, c - 1)?.type === get(r, c - 2)?.type) {
                    possibleTypes = possibleTypes.filter(t => t !== get(r, c - 1)?.type);
                }
                if (r >= 2 && get(r - 1, c)?.type === get(r - 2, c)?.type) {
                     possibleTypes = possibleTypes.filter(t => t !== get(r - 1, c)?.type);
                }
                tile.type = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
            }
        }
        setBoard(newBoard);
        return newBoard;
    }, [boardSize, generationConfig.enabledNormal]);

    const gameLoop = useCallback(async (currentBoard: BoardType, specialTilesToActivate: TileData[] = []) => {
        if (isProcessingRef.current || gamePhase === 'WIN' || gamePhase === 'GAME_OVER') return;
        setIsProcessing(true);

        let boardState = currentBoard.map(t => ({...t}));
        let chain = 0;

        let activeSpecials = [...specialTilesToActivate];

        while(true) {
            chain++;
            group(`Game Loop - Chain ${chain}`);
            
            if(isPaused) {
                log('Game loop paused.');
                setIsProcessing(false); 
                groupEnd();
                return;
            }
            onPhaseChange('MATCHING'); autoPause();
            log(`Phase: MATCHING. Searching for matches in board of ${boardState.length} tiles.`);
            const matches = findMatches(boardState);
            
            let tilesToDestroy = new Set<TileData>([...matches, ...activeSpecials]);
            log(`Initial matches: ${matches.length}, Initial special activations: ${activeSpecials.length}. Total to process: ${tilesToDestroy.size}`);
            activeSpecials = []; // Consume specials

            if (tilesToDestroy.size === 0) {
                 log('No matches or specials to process. Ending game loop.');
                 groupEnd();
                 break;
            }
            
            const processingQueue = [...tilesToDestroy].filter(t => t.type >= TILE_TYPE_BOMB);
            const processedSpecials = new Set<number>();

            while(processingQueue.length > 0) {
                const specialTile = processingQueue.shift()!;
                if (processedSpecials.has(specialTile.id)) continue;
                processedSpecials.add(specialTile.id);
                
                log(`Activating special tile: type ${specialTile.type} at (${specialTile.row}, ${specialTile.col})`);
                
                switch(specialTile.type) {
                    case TILE_TYPE_BOMB:
                        playSound('bomb');
                        for (let r = specialTile.row - 1; r <= specialTile.row + 1; r++) {
                            for (let c = specialTile.col - 1; c <= specialTile.col + 1; c++) {
                                if (r >= 0 && r < boardSize.height && c >= 0 && c < boardSize.width) {
                                    const neighbor = boardState.find(t => t.row === r && t.col === c);
                                    if (neighbor && !tilesToDestroy.has(neighbor)) {
                                        tilesToDestroy.add(neighbor);
                                        if (neighbor.type >= TILE_TYPE_BOMB) processingQueue.push(neighbor);
                                    }
                                }
                            }
                        }
                        break;
                    case TILE_TYPE_LASER_V:
                        playSound('laser');
                         boardState.filter(t => t.col === specialTile.col).forEach(t => {
                             if (!tilesToDestroy.has(t)) {
                                 tilesToDestroy.add(t);
                                 if (t.type >= TILE_TYPE_BOMB) processingQueue.push(t);
                             }
                         });
                        break;
                    case TILE_TYPE_LASER_H:
                        playSound('laser');
                        boardState.filter(t => t.row === specialTile.row).forEach(t => {
                            if (!tilesToDestroy.has(t)) {
                                 tilesToDestroy.add(t);
                                 if (t.type >= TILE_TYPE_BOMB) processingQueue.push(t);
                             }
                        });
                        break;
                }
            }
            
            playSound('match');
            const pointsToAdd = tilesToDestroy.size * 10 * chain;
            setScore(s => s + pointsToAdd);

            if (finishScore && (scoreRef.current + pointsToAdd) >= finishScore) {
                log(`WIN CONDITION MET: score ${scoreRef.current + pointsToAdd} >= finishScore ${finishScore}`);
                setBoard(boardState.map(t => tilesToDestroy.has(t) ? {...t, isMatched: true} : t));
                await delay(timingConfig.matchDelay);
                onPhaseChange('WIN');
                playSound('win');
                setIsProcessing(false);
                groupEnd();
                return;
            }

            onPhaseChange('REMOVING'); autoPause();
            log(`Phase: REMOVING. Total tiles to destroy after specials: ${tilesToDestroy.size}`, [...tilesToDestroy].map(t => `id:${t.id} type:${t.type} @(${t.row},${t.col})`));
            
            setBoard(boardState.map(t => tilesToDestroy.has(t) ? {...t, isMatched: true} : t));
            await delay(timingConfig.matchDelay);
            if (isPaused) { log('Game loop paused during REMOVING phase.'); setIsProcessing(false); groupEnd(); return; }

            boardState = boardState.filter(t => !tilesToDestroy.has(t));

            onPhaseChange('GRAVITY'); autoPause();
            log('Phase: GRAVITY. Applying gravity to remaining tiles.');
            let moved = false;
            for (let c = 0; c < boardSize.width; c++) {
                const column = boardState.filter(t => t.col === c).sort((a,b) => b.row - a.row);
                for (let i = 0; i < column.length; i++) {
                    const tile = column[i];
                    const targetRow = boardSize.height - 1 - i;
                    if (tile.row !== targetRow) {
                        log(`Tile ${tile.id} moving from row ${tile.row} to ${targetRow}`);
                        tile.row = targetRow;
                        moved = true;
                    }
                }
            }

            if (moved) playSound('fall');
            setBoard([...boardState]);
            await delay(timingConfig.fallDelay);
            if (isPaused) { log('Game loop paused during GRAVITY phase.'); setIsProcessing(false); groupEnd(); return; }

            onPhaseChange('REFILLING'); autoPause();
            let maxId = Math.max(0, ...boardState.map(t => t.id), ...[...tilesToDestroy].map(t => t.id));
            const newTiles: TileData[] = [];
            for (let c = 0; c < boardSize.width; c++) {
                const count = boardState.filter(t => t.col === c).length;
                for (let r = 0; r < boardSize.height - count; r++) {
                    newTiles.push({ id: ++maxId, type: getRandomTileType(), col: c, row: -1 - r, isNew: true });
                }
            }
            log(`Phase: REFILLING. Adding ${newTiles.length} new tiles.`);
            
            boardState = [...boardState, ...newTiles];
            setBoard([...boardState]);
            await delay(50);
            if (isPaused) { log('Game loop paused during initial REFILLING phase.'); setIsProcessing(false); groupEnd(); return; }

            boardState.forEach(t => {
                if (t.isNew) {
                    const colCount = boardState.filter(t2 => t2.col === t.col && !t2.isNew).length;
                    t.row = boardSize.height - colCount - 1;
                    delete t.isNew;
                }
            });

            playSound('fall');
            setBoard([...boardState]);
            await delay(timingConfig.fallDelay);
            if (isPaused) { log('Game loop paused during final REFILLING phase.'); setIsProcessing(false); groupEnd(); return; }
            groupEnd();
        }

        if (moves <= 0 && scoreRef.current < (finishScore || Infinity)) {
            log('GAME OVER: No moves left.');
            onPhaseChange('GAME_OVER');
            playSound('gameover');
        } else {
            log('Game loop finished. No more matches found. Setting phase to IDLE.');
            onPhaseChange('IDLE');
        }
        setIsProcessing(false);
    }, [isPaused, boardSize, findMatches, playSound, setScore, onPhaseChange, autoPause, delay, timingConfig, getRandomTileType, moves, log, group, groupEnd, finishScore, gamePhase]);
    
    const handleTileClick = useCallback(async (row: number, col: number) => {
        if (isProcessingRef.current || isPaused || moves <= 0) return;

        group(`Player Move: Click at (${row}, ${col})`);
        const getTile = (r: number, c: number) => board.find(t => t.row === r && t.col === c);

        if (selectedTile) {
            const current = getTile(row, col);
            const selected = getTile(selectedTile.row, selectedTile.col);
            
            log(`Second tile selected at (${row}, ${col})`);

            if (current && selected && areAdjacent({row, col}, selectedTile)) {
                log('Tiles are adjacent. Attempting swap:', { from: selected, to: current });
                
                const newBoard = board.map(t => ({...t}));
                const currentIndex = newBoard.findIndex(t => t.id === current.id);
                const selectedIndex = newBoard.findIndex(t => t.id === selected.id);

                [newBoard[currentIndex].row, newBoard[selectedIndex].row] = [selected.row, current.row];
                [newBoard[currentIndex].col, newBoard[selectedIndex].col] = [selected.col, current.col];

                const matches = findMatches(newBoard);
                const wasSpecialMoved = current.type >= TILE_TYPE_BOMB || selected.type >= TILE_TYPE_BOMB;

                if (matches.length > 0) {
                    log(`Swap is valid. Found ${matches.length} matched tiles. Special moved: ${wasSpecialMoved}`);
                    playSound('swap');
                    setSelectedTile(null);
                    setBoard(newBoard);
                    await delay(timingConfig.swapDelay);

                    setMoves(m => {
                        log(`Decrementing moves. New count: ${m - 1}`);
                        return m - 1;
                    });
                    
                    let specialToActivate: TileData[] = [];
                    if (wasSpecialMoved) {
                        if (current.type >= TILE_TYPE_BOMB) specialToActivate.push(newBoard.find(t => t.id === current.id)!);
                        if (selected.type >= TILE_TYPE_BOMB) specialToActivate.push(newBoard.find(t => t.id === selected.id)!);
                    }
                    gameLoop(newBoard, specialToActivate);
                } else {
                    log('Swap is invalid. No matches found.');
                    playSound('invalid');
                    setSelectedTile(null);
                }
            } else {
                 log('Second tile is not adjacent or is the same tile. Selecting new tile.');
                setSelectedTile({row, col});
            }
        } else {
            log('First tile selected.');
            setSelectedTile({row, col});
        }
        groupEnd();
    }, [board, selectedTile, moves, isPaused, playSound, timingConfig.swapDelay, findMatches, gameLoop, delay, log, group, groupEnd]);

    const restartGame = useCallback((customBoard?: BoardType) => {
        logCollectorRef.current = [];
        indentLevelRef.current = 0;
        log('Restarting game. Custom board provided:', !!customBoard);
        clearTimeouts();
        setIsProcessing(false);
        setScore(0);
        setMoves(INITIAL_MOVES);
        setLevel(1);
        setSelectedTile(null);
        if (customBoard) {
            setBoard(customBoard);
        } else {
            createBoard();
        }
    }, [createBoard, clearTimeouts, log]);

    useEffect(() => {
        // This effect will run on initial mount if not in a custom game runner context
        // In the sandbox, we call restartGame manually with a custom board.
    }, [boardSize]);
    
    useEffect(() => {
        if (!isPaused && gamePhase !== 'WIN' && gamePhase !== 'GAME_OVER') {
            // When un-paused (e.g., after the "Ready" screen or user clicks Play),
            // we should kick off the game loop to check for initial matches.
            // The gameLoop function itself has a re-entry guard, so this is safe.
            gameLoop(board);
        } else {
            clearTimeouts();
        }
    }, [isPaused, stepTrigger, board, gameLoop, clearTimeouts, gamePhase]);

    const toggleAi = () => setIsAiActive(p => !p);
    const toggleHints = () => setShowHints(p => !p);

    return { board, score, moves, level, handleTileClick, selectedTile, restartGame, isAiActive, toggleAi, showHints, toggleHints, isProcessing, logCollectorRef };
};