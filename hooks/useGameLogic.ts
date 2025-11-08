import { useState, useEffect, useCallback, useRef } from 'react';
import { BoardType, GameLogicProps, GamePhase, Position, TileData } from '../types';
import { TILE_TYPE_BOMB, TILE_TYPE_LASER_H, TILE_TYPE_LASER_V, TILE_TYPE_LASER_CROSS, TILE_TYPE_ELECTRIC, TILE_TYPE_RAINBOW, TILE_TYPE_COMPLEX, TILE_TYPE_STONE, TILE_TYPE_METAL, NORMAL_TILE_TYPES } from '../constants';

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
    scoreThresholds,
    initialMoves,
    onGameEnd
}: GameLogicProps) => {
    const [board, setBoard] = useState<BoardType>([]);
    const [score, setScore] = useState(0);
    const [moves, setMoves] = useState(initialMoves);
    const [level, setLevel] = useState(1);
    const [selectedTile, setSelectedTile] = useState<Position | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
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

    const removeAndScore = useCallback((boardState: BoardType, tilesToDestroy: Set<TileData>) => {
        let scoreToAdd = 0;
        const destroyedIds = new Set<number>();
        const boardAfterDamage = boardState.map(t => ({ ...t }));
        let hadMatches = false;

        // Process collateral damage to Complex/Stone tiles from adjacent normal matches
        const matchedNormalTiles = [...tilesToDestroy].filter(t => t.type < NORMAL_TILE_TYPES);
        for (const tile of matchedNormalTiles) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (Math.abs(dr) + Math.abs(dc) !== 1) continue; 
                    const neighbor = boardAfterDamage.find(t => t.row === tile.row + dr && t.col === tile.col + dc);
                    if (neighbor && (neighbor.type === TILE_TYPE_COMPLEX || neighbor.type === TILE_TYPE_STONE)) {
                       if (!tilesToDestroy.has(neighbor)) {
                           tilesToDestroy.add(neighbor);
                       }
                    }
                }
            }
        }
    
        for (const tile of tilesToDestroy) {
            const boardTile = boardAfterDamage.find(t => t.id === tile.id);
            if (!boardTile || destroyedIds.has(boardTile.id)) continue;
    
            let shouldBeDestroyed = true;
    
            if (boardTile.type === TILE_TYPE_COMPLEX || boardTile.type === TILE_TYPE_STONE) {
                if (boardTile.health && boardTile.health > 0) {
                    boardTile.health -= 1;
                    if (boardTile.health > 0) {
                        playSound('complex_hit');
                        shouldBeDestroyed = false;
                    } else {
                        playSound('complex_destroy');
                    }
                }
            }
            
            if (shouldBeDestroyed) {
                if (boardTile.type < TILE_TYPE_BOMB) hadMatches = true;
                destroyedIds.add(boardTile.id);
                scoreToAdd += 10;
            }
        }
        
        const nextBoard = boardAfterDamage.filter(t => !destroyedIds.has(t.id)).map(t => ({...t, isMatched: false}));
        
        if (hadMatches) playSound('match');

        return { nextBoard, scoreToAdd };
    }, [playSound]);

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
            activeSpecials = [];

            if (tilesToDestroy.size > 0) {
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
                                        const tile = boardState.find(t => t.row === r && t.col === c);
                                        if (tile) {
                                            tilesToDestroy.add(tile);
                                            if (tile.type >= TILE_TYPE_BOMB && !processedSpecials.has(tile.id)) {
                                                processingQueue.push(tile);
                                            }
                                        }
                                    }
                                }
                            }
                            break;
                        case TILE_TYPE_LASER_V:
                        case TILE_TYPE_LASER_H:
                        case TILE_TYPE_LASER_CROSS:
                            playSound('laser');
                            if (specialTile.type === TILE_TYPE_LASER_V || specialTile.type === TILE_TYPE_LASER_CROSS) {
                                boardState.filter(t => t.col === specialTile.col).forEach(t => {
                                    tilesToDestroy.add(t);
                                    if (t.type >= TILE_TYPE_BOMB && !processedSpecials.has(t.id)) processingQueue.push(t);
                                });
                            }
                            if (specialTile.type === TILE_TYPE_LASER_H || specialTile.type === TILE_TYPE_LASER_CROSS) {
                                boardState.filter(t => t.row === specialTile.row).forEach(t => {
                                    tilesToDestroy.add(t);
                                    if (t.type >= TILE_TYPE_BOMB && !processedSpecials.has(t.id)) processingQueue.push(t);
                                });
                            }
                            break;
                        case TILE_TYPE_ELECTRIC:
                            playSound('electric');
                            const normalTypesOnBoard = [...new Set(boardState.filter(t => t.type < NORMAL_TILE_TYPES).map(t => t.type))];
                            if (normalTypesOnBoard.length > 0) {
                                const typeToDestroy = normalTypesOnBoard[Math.floor(Math.random() * normalTypesOnBoard.length)];
                                boardState.filter(t => t.type === typeToDestroy).forEach(t => tilesToDestroy.add(t));
                            }
                            break;
                        case TILE_TYPE_RAINBOW:
                             playSound('rainbow');
                             const typesOnBoard = [...new Set(boardState.filter(t => t.type < NORMAL_TILE_TYPES).map(t => t.type))];
                             if(typesOnBoard.length > 0) {
                                const typeToDestroy = typesOnBoard[Math.floor(Math.random() * typesOnBoard.length)];
                                boardState.filter(t => t.type === typeToDestroy).forEach(t => tilesToDestroy.add(t));
                             }
                            break;
                    }
                }
            }
            
            if (tilesToDestroy.size === 0) {
                 log('No matches or specials to process. Ending game loop.');
                 groupEnd();
                 break;
            }
            
            onPhaseChange('REMOVING');
            log(`Phase: REMOVING. Total tiles to destroy after specials: ${tilesToDestroy.size}`, [...tilesToDestroy].map(t => `id:${t.id} type:${t.type} @(${t.row},${t.col})`));
            setBoard(b => b.map(tile => {
                const isMatched = [...tilesToDestroy].some(destroyed => destroyed.id === tile.id);
                const updatedTile = boardState.find(bst => bst.id === tile.id);
                return {
                    ...tile,
                    isMatched,
                    health: updatedTile?.health
                };
            }));

            await delay(timingConfig.matchDelay); autoPause();

            const { nextBoard, scoreToAdd } = removeAndScore(boardState, tilesToDestroy);
            if (scoreToAdd > 0) {
                setScore(s => s + scoreToAdd);
            }
            boardState = nextBoard;
            setBoard(boardState);

            onPhaseChange('GRAVITY'); autoPause();
            log('Phase: GRAVITY. Applying gravity to remaining tiles.');
            await delay(timingConfig.fallDelay); autoPause();

            let gravityApplied = false;
            let movedTiles: { [key: number]: { fromRow: number, toRow: number } } = {};
            for (let c = 0; c < boardSize.width; c++) {
                const column = boardState.filter(t => t.col === c).sort((a, b) => a.row - b.row);
                let emptyRow = boardSize.height - 1;
                for (let r = column.length - 1; r >= 0; r--) {
                    const tile = column[r];
                    if (tile.row !== emptyRow) {
                        gravityApplied = true;
                        movedTiles[tile.id] = { fromRow: tile.row, toRow: emptyRow };
                        log(`Tile ${tile.id} moving from row ${tile.row} to ${emptyRow}`);
                        tile.row = emptyRow;
                    }
                    emptyRow--;
                }
            }
            
            if (gravityApplied) {
                playSound('fall');
                setBoard(b => b.map(tile => movedTiles[tile.id] ? { ...tile, row: movedTiles[tile.id].toRow } : tile));
                await delay(timingConfig.fallDelay); autoPause();
            }

            onPhaseChange('REFILLING'); autoPause();
            let newTiles: TileData[] = [];
            let idCounter = Math.max(...boardState.map(t => t.id), 0) + 1;
            for (let c = 0; c < boardSize.width; c++) {
                const colSize = boardState.filter(t => t.col === c).length;
                const newTilesCount = boardSize.height - colSize;
                for (let i = 0; i < newTilesCount; i++) {
                    const newTile: TileData = { id: idCounter++, type: getRandomTileType(), row: -1 - i, col: c, isNew: true };
                    if (newTile.type === TILE_TYPE_COMPLEX) {
                        newTile.health = 3; newTile.maxHealth = 3;
                    }
                    if (newTile.type === TILE_TYPE_STONE) {
                        newTile.health = 2; newTile.maxHealth = 2;
                    }
                    boardState.push(newTile);
                    newTiles.push(newTile);
                }
            }

            if(newTiles.length > 0) {
                log(`Phase: REFILLING. Adding ${newTiles.length} new tiles.`);
                setBoard([...boardState]);
                await delay(50); 
                
                boardState.forEach(t => {
                     const column = boardState.filter(tile => tile.col === t.col).sort((a,b) => a.row - b.row);
                     let emptyRow = boardSize.height - 1;
                     for(let i = column.length - 1; i >= 0; i--) {
                        column[i].row = emptyRow;
                        emptyRow--;
                     }
                });
                
                playSound('fall');
                setBoard([...boardState]);
                await delay(timingConfig.fallDelay); autoPause();
                boardState.forEach(t => t.isNew = false);
            }
            groupEnd();
        }

        setIsProcessing(false);
        onPhaseChange('IDLE');
    }, [isPaused, gamePhase, onPhaseChange, findMatches, boardSize, playSound, timingConfig, autoPause, getRandomTileType, log, group, groupEnd, removeAndScore]);

    const findMatchesAfterSwap = (board: BoardType, pos1: Position, pos2: Position): TileData[] => {
        const tempBoard = board.map(t => ({ ...t }));
        const tile1 = tempBoard.find(t => t.row === pos1.row && t.col === pos1.col)!;
        const tile2 = tempBoard.find(t => t.row === pos2.row && t.col === pos2.col)!;

        [tile1.row, tile1.col, tile2.row, tile2.col] = [tile2.row, tile2.col, tile1.row, tile1.col];

        return findMatches(tempBoard);
    };

    const handleSwap = useCallback(async (pos1: Position, pos2: Position) => {
        const tile1 = board.find(t => t.row === pos1.row && t.col === pos1.col);
        const tile2 = board.find(t => t.row === pos2.row && t.col === pos2.col);
        if (!tile1 || !tile2) return;

        group('Player Move: Swap');
        log(`Swapping tile id:${tile1.id} type:${tile1.type} @(${tile1.row},${tile1.col}) with tile id:${tile2.id} type:${tile2.type} @(${tile2.row},${tile2.col})`);

        // Handle Rainbow Tile Swap
        if (tile1.type === TILE_TYPE_RAINBOW && tile2.type < NORMAL_TILE_TYPES) {
            playSound('rainbow');
            const typeToDestroy = tile2.type;
            const specialsToActivate = board.filter(t => t.type === typeToDestroy || t.id === tile1.id);
            const nextBoard = board.filter(t => t.id !== tile1.id && t.id !== tile2.id);
            setMoves(m => m - 1);
            log(`Rainbow swap detected. Destroying all type ${typeToDestroy} tiles.`);
            groupEnd();
            gameLoop(nextBoard, specialsToActivate);
            return;
        }
        if (tile2.type === TILE_TYPE_RAINBOW && tile1.type < NORMAL_TILE_TYPES) {
            playSound('rainbow');
            const typeToDestroy = tile1.type;
            const specialsToActivate = board.filter(t => t.type === typeToDestroy || t.id === tile2.id);
            const nextBoard = board.filter(t => t.id !== tile1.id && t.id !== tile2.id);
            setMoves(m => m - 1);
            log(`Rainbow swap detected. Destroying all type ${typeToDestroy} tiles.`);
            groupEnd();
            gameLoop(nextBoard, specialsToActivate);
            return;
        }

        const matches = findMatchesAfterSwap(board, pos1, pos2);

        const newBoard = board.map(t => {
            if (t.row === pos1.row && t.col === pos1.col) return { ...t, row: pos2.row, col: pos2.col };
            if (t.row === pos2.row && t.col === pos2.col) return { ...t, row: pos1.row, col: pos1.col };
            return t;
        });
        
        playSound('swap');
        setBoard(newBoard);
        await delay(timingConfig.swapDelay);

        if (matches.length > 0) {
            log(`Swap is valid. Found ${matches.length} matched tiles.`);
            setMoves(m => m - 1);
            groupEnd();
            gameLoop(newBoard);
        } else {
            log('Invalid swap. Reverting.');
            playSound('invalid');
            setBoard(board);
            await delay(timingConfig.swapDelay);
            groupEnd();
        }
    }, [board, delay, timingConfig.swapDelay, findMatchesAfterSwap, playSound, gameLoop, log, group, groupEnd]);

    const handleTileClick = useCallback((row: number, col: number) => {
        if (isProcessingRef.current) return;
        group(`Player Move: Click at (${row}, ${col})`);

        const clickedTile = board.find(t => t.row === row && t.col === col);
        if (clickedTile && (clickedTile.type === TILE_TYPE_METAL)) {
            playSound('invalid');
            log(`Clicked on indestructible tile type ${clickedTile.type}. Ignoring.`);
            setSelectedTile(null);
            groupEnd();
            return;
        }

        if (selectedTile) {
            log(`Second tile selected at (${row}, ${col})`);
            if (areAdjacent(selectedTile, { row, col })) {
                handleSwap(selectedTile, { row, col });
            } else {
                playSound('invalid');
                log('Tiles are not adjacent. Resetting selection.');
            }
            setSelectedTile(null);
        } else {
            log('First tile selected.');
            setSelectedTile({ row, col });
        }
        groupEnd();
    }, [selectedTile, board, handleSwap, playSound, log, group, groupEnd]);
    
    const restartGame = useCallback((initialBoard?: TileData[]) => {
        group('Restarting game.');
        clearTimeouts();
        setIsProcessing(false);
        setScore(0);
        setMoves(initialMoves);
        setSelectedTile(null);
        let boardToStart: TileData[];
        if (initialBoard) {
            log('Custom board provided: true');
            boardToStart = initialBoard;
        } else {
            log('Custom board provided: false. Creating random board.');
            // This part is not used in the current App structure but kept for potential future use
            boardToStart = []; // createBoard() would go here
        }
        
        const boardWithHealth = boardToStart.map(tile => {
            if (tile.type === TILE_TYPE_COMPLEX) {
                return { ...tile, health: 3, maxHealth: 3 };
            }
            if (tile.type === TILE_TYPE_STONE) {
                return { ...tile, health: 2, maxHealth: 2 };
            }
            return tile;
        });
        
        setBoard(boardWithHealth);
        onPhaseChange('READY');
        logCollectorRef.current = [];
        groupEnd();
    }, [initialMoves, onPhaseChange, clearTimeouts, log, group, groupEnd]);

    useEffect(() => {
        // Check for end game conditions only when the board is stable and not in a special sequence.
        if (!isProcessing && gamePhase === 'IDLE' && moves <= 0) {
            log('End game condition met: No more moves.');
            group('Game End Calculation');
            const finalScore = scoreRef.current;
            let stars = 0;
            if (finalScore >= scoreThresholds.star1) stars = 1;
            if (finalScore >= scoreThresholds.star2) stars = 2;
            if (finalScore >= scoreThresholds.star3) stars = 3;

            log(`Final Score: ${finalScore}, Stars: ${stars}`);
            
            if (stars > 0) {
                log('Result: WIN');
                playSound('win');
                onPhaseChange('WIN');
            } else {
                log('Result: GAME OVER');
                playSound('gameover');
                onPhaseChange('GAME_OVER');
            }
            groupEnd();
            onGameEnd({ score: finalScore, stars });
        }
    }, [isProcessing, gamePhase, moves, scoreThresholds, onGameEnd, onPhaseChange, playSound, log, group, groupEnd]);

    useEffect(() => {
        if (isPaused) {
            clearTimeouts();
        } else if (!isProcessingRef.current && gamePhase === 'IDLE') {
             gameLoop(board);
        }
    }, [isPaused, stepTrigger, gamePhase, board, gameLoop, clearTimeouts]);
    
    useEffect(() => {
        if (!isProcessing) {
            const matches = findMatches(board);
            if (matches.length > 0) {
                gameLoop(board);
            }
        }
    }, [board, findMatches, gameLoop, isProcessing]);

    return { board, score, moves, level, handleTileClick, selectedTile, restartGame, isProcessing, logCollectorRef };
};