import { useState, useEffect, useCallback, useRef } from 'react';
import { BoardType, Position, TileData, GamePhase, GameLogicProps } from '../types';
import { BOARD_SIZE, INITIAL_MOVES, NORMAL_TILE_TYPES, SPECIAL_TILE_SPAWN_CHANCE, SPECIAL_TILE_TYPES, TILE_TYPE_BOMB, TILE_TYPE_ELECTRIC, TILE_TYPE_LASER_CROSS, TILE_TYPE_LASER_H, TILE_TYPE_LASER_V } from '../constants';

let tileIdCounter = 0;

const hasInitialMatches = (board: BoardType): boolean => {
  const getTile = (r: number, c: number) => board.find(t => t.row === r && t.col === c);
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const tile = getTile(r, c);
      if (!tile || tile.type >= NORMAL_TILE_TYPES) continue;
      if (c < BOARD_SIZE - 2) {
        if (tile.type === getTile(r, c + 1)?.type && tile.type === getTile(r, c + 2)?.type) return true;
      }
      if (r < BOARD_SIZE - 2) {
        if (tile.type === getTile(r + 1, c)?.type && tile.type === getTile(r + 2, c)?.type) return true;
      }
    }
  }
  return false;
};

const findMatches = (board: BoardType): TileData[] => {
    const matchedTiles = new Set<TileData>();
    const getTile = (r: number, c: number) => board.find(t => t.row === r && t.col === c);

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const tile = getTile(r, c);
            if (!tile || tile.type >= NORMAL_TILE_TYPES) continue;

            if (c < BOARD_SIZE - 2 && tile.type === getTile(r, c + 1)?.type && tile.type === getTile(r, c + 2)?.type) {
                let i = c;
                while(i < BOARD_SIZE && getTile(r, i)?.type === tile.type) {
                    matchedTiles.add(getTile(r, i)!);
                    i++;
                }
            }
            if (r < BOARD_SIZE - 2 && tile.type === getTile(r + 1, c)?.type && tile.type === getTile(r + 2, c)?.type) {
                 let i = r;
                while(i < BOARD_SIZE && getTile(i, c)?.type === tile.type) {
                    matchedTiles.add(getTile(i, c)!);
                    i++;
                }
            }
        }
    }
    return Array.from(matchedTiles);
};

const getAffectedTiles = (specialTile: TileData, board: BoardType): TileData[] => {
  const affected = new Set<TileData>();
  affected.add(specialTile);
  const getTile = (r: number, c: number) => board.find(t => t.row === r && t.col === c);

  switch (specialTile.type) {
    case TILE_TYPE_BOMB:
      for (let r = specialTile.row - 1; r <= specialTile.row + 1; r++) {
        for (let c = specialTile.col - 1; c <= specialTile.col + 1; c++) {
          if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
            const tile = getTile(r, c);
            if (tile) affected.add(tile);
          }
        }
      }
      break;
    case TILE_TYPE_LASER_V:
      board.forEach(t => { if (t.col === specialTile.col) affected.add(t); });
      break;
    case TILE_TYPE_LASER_H:
      board.forEach(t => { if (t.row === specialTile.row) affected.add(t); });
      break;
    case TILE_TYPE_LASER_CROSS:
      board.forEach(t => { if (t.row === specialTile.row || t.col === specialTile.col) affected.add(t); });
      break;
    case TILE_TYPE_ELECTRIC:
      for (let i = -BOARD_SIZE; i < BOARD_SIZE; i++) {
        const t1 = getTile(specialTile.row + i, specialTile.col + i);
        const t2 = getTile(specialTile.row + i, specialTile.col - i);
        if (t1) affected.add(t1);
        if (t2) affected.add(t2);
      }
      break;
  }
  return Array.from(affected);
};

export const useGameLogic = (props: GameLogicProps) => {
  const { playSound, timingConfig, isPaused, stepTrigger, onPhaseChange, isStepMode, autoPause, enabledSpecialTiles } = props;
  const { matchDelay, fallDelay, gameSpeed } = timingConfig;

  const createTile = useCallback((row: number, col: number, trySpecial = true): TileData => {
    let type: number;
    const availableSpecials = SPECIAL_TILE_TYPES.filter(type => enabledSpecialTiles[type]);

    if (trySpecial && availableSpecials.length > 0 && Math.random() < SPECIAL_TILE_SPAWN_CHANCE) {
      type = availableSpecials[Math.floor(Math.random() * availableSpecials.length)];
    } else {
      type = Math.floor(Math.random() * NORMAL_TILE_TYPES);
    }
    return {
      id: tileIdCounter++,
      type: type,
      row,
      col,
      isNew: true, // Mark as new for animation
    };
  }, [enabledSpecialTiles]);

  const createBoard = useCallback((): BoardType => {
    let board: TileData[] = [];
    do {
      board = [];
      tileIdCounter = 0;
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          // Mark initial tiles as not new
          const tile = createTile(row, col, false);
          tile.isNew = false;
          board.push(tile);
        }
      }
    } while (hasInitialMatches(board));
    return board;
  }, [createTile]);
  
  const [board, setBoard] = useState<BoardType>(() => createBoard());
  const [selectedTile, setSelectedTile] = useState<Position | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(INITIAL_MOVES);
  const [level, setLevel] = useState(1);
  const [gamePhase, _setGamePhase] = useState<GamePhase>('IDLE');
  const [showHints, setShowHints] = useState(false);
  const [isAiActive, setIsAiActive] = useState(false);
  
  const processQueue = useRef<(() => void)[]>([]);
  const matchesToProcess = useRef<TileData[]>([]);
  const boardRef = useRef(board);
  boardRef.current = board;
  const gamePhaseRef = useRef(gamePhase);


  const setPhase = useCallback((phase: GamePhase) => {
    gamePhaseRef.current = phase;
    _setGamePhase(phase);
    onPhaseChange(phase);
  }, [onPhaseChange]);

  const findPossibleMoves = useCallback((currentBoard: BoardType): Position[] => {
    const getTile = (r: number, c: number) => currentBoard.find(t => t.row === r && t.col === c);
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const tile1 = getTile(r, c);
        if (!tile1) continue;

        const checkSwap = (r2: number, c2: number): boolean => {
          const tile2 = getTile(r2, c2);
          if (!tile2) return false;
          if (tile1.type >= NORMAL_TILE_TYPES || tile2.type >= NORMAL_TILE_TYPES) return true;
          const tempBoard = currentBoard.map(t => 
              t.id === tile1.id ? {...t, row: r2, col: c2} :
              t.id === tile2.id ? {...t, row: r, col: c} : t);
          return findMatches(tempBoard).length > 0;
        };
        
        if (c < BOARD_SIZE - 1) if (checkSwap(r, c + 1)) return [{row: r, col: c}, {row: r, col: c + 1}];
        if (r < BOARD_SIZE - 1) if (checkSwap(r + 1, c)) return [{row: r, col: c}, {row: r + 1, col: c}];
      }
    }
    return [];
  }, []);

  const handleTileClick = useCallback((row: number, col: number) => {
    if (gamePhaseRef.current !== 'IDLE') return;

    const clickedTile = boardRef.current.find(t => t.row === row && t.col === col);
    if (!clickedTile) return;

    if (!selectedTile) {
      setSelectedTile({ row, col });
    } else {
      const prevTile = boardRef.current.find(t => t.row === selectedTile.row && t.col === selectedTile.col);
      if (!prevTile) {
          setSelectedTile(null);
          return;
      }
      
      setSelectedTile(null);

      if (prevTile.id === clickedTile.id) return;
      
      const isAdjacent = Math.abs(prevTile.row - row) + Math.abs(prevTile.col - col) === 1;
      if (!isAdjacent) {
        playSound('invalid');
        setSelectedTile({ row, col });
        return;
      }

      const newBoard = boardRef.current.map(t => {
        if (t.id === prevTile.id) return { ...t, row: clickedTile.row, col: clickedTile.col };
        if (t.id === clickedTile.id) return { ...t, row: prevTile.row, col: prevTile.col };
        return t;
      });
      setBoard(newBoard);
      playSound('swap');
      
      const isSpecialSwap = prevTile.type >= NORMAL_TILE_TYPES || clickedTile.type >= NORMAL_TILE_TYPES;
      const matches = findMatches(newBoard);

      if (matches.length > 0 || isSpecialSwap) {
          setMoves(m => m - 1);
          let initialMatches: TileData[];
          if(isSpecialSwap){
            const special = prevTile.type >= NORMAL_TILE_TYPES ? prevTile : clickedTile;
            const other = prevTile.id === special.id ? clickedTile : prevTile;
            initialMatches = getAffectedTiles(special, newBoard);
            if(!initialMatches.find(t => t.id === other.id)) initialMatches.push(other);
          } else {
            initialMatches = matches;
          }
          matchesToProcess.current = initialMatches;
          setPhase('MATCHING');
          autoPause(); // Auto-pause if in step mode
      } else {
          playSound('invalid');
          setTimeout(() => setBoard(boardRef.current), 300 / gameSpeed);
      }
    }
  }, [selectedTile, playSound, gameSpeed, autoPause, setPhase]);

  useEffect(() => {
    if (gamePhaseRef.current !== 'IDLE' && (stepTrigger > 0 || !isPaused)) {
       const nextAction = processQueue.current.shift();
       if(nextAction) nextAction();
    }
  }, [stepTrigger, isPaused]);

  useEffect(() => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const scheduleAction = (action: () => void, delay: number) => {
          if (!isPaused) {
              timeoutId = setTimeout(action, delay / gameSpeed);
          } else {
             processQueue.current.push(action);
          }
      };

      const schedulePhase = (phase: GamePhase, delay: number) => {
        scheduleAction(() => setPhase(phase), delay);
      }

      switch (gamePhase) {
          case 'MATCHING': {
              const currentMatches = matchesToProcess.current;
              if (currentMatches.length === 0) {
                  setPhase('IDLE');
                  break;
              }
              
              const processedSpecials = new Set<number>();
              const allAffectedTiles = new Set<TileData>(currentMatches);
              
              let tilesToCheck = [...currentMatches];
              while(tilesToCheck.length > 0) {
                  const tile = tilesToCheck.pop();
                  if(!tile || processedSpecials.has(tile.id)) continue;

                  if(tile.type >= NORMAL_TILE_TYPES) {
                      processedSpecials.add(tile.id);
                      const affectedBySpecial = getAffectedTiles(tile, boardRef.current);
                      affectedBySpecial.forEach(affected => {
                          if(!allAffectedTiles.has(affected)) {
                              allAffectedTiles.add(affected);
                              tilesToCheck.push(affected);
                          }
                      });
                  }
              }

              if (processedSpecials.size > 0) {
                  const specials = Array.from(processedSpecials).map(id => boardRef.current.find(t=>t.id === id)!.type);
                  if (specials.includes(TILE_TYPE_BOMB)) playSound('bomb');
                  else if (specials.some(t => [TILE_TYPE_LASER_V, TILE_TYPE_LASER_H, TILE_TYPE_LASER_CROSS].includes(t))) playSound('laser');
                  else if (specials.includes(TILE_TYPE_ELECTRIC)) playSound('electric');
              } 
              if(currentMatches.length > 0) { playSound('match'); }

              const finalAffected = Array.from(allAffectedTiles);
              setBoard(prev => prev.map(t => finalAffected.find(m => m.id === t.id) ? { ...t, isMatched: true } : t));
              setScore(s => s + finalAffected.length * 10);
              
              schedulePhase('REMOVING', matchDelay);
              break;
          }
          case 'REMOVING': {
              setBoard(prev => prev.filter(t => !t.isMatched));
              schedulePhase('GRAVITY', 50); // Short delay for visual separation
              break;
          }
          case 'GRAVITY': {
              let boardChanged = false;
              
              setBoard(currentBoard => {
                const newBoard = [...currentBoard];
                for(let c = 0; c < BOARD_SIZE; c++) {
                    const column = newBoard.filter(t => t.col === c).sort((a,b) => b.row - a.row);
                    let emptyRow = BOARD_SIZE - 1;
                    for(const tile of column) {
                        if(tile.row !== emptyRow) {
                            tile.row = emptyRow;
                            boardChanged = true;
                        }
                        emptyRow--;
                    }
                }
                return newBoard;
              });
              
              if(boardChanged) { 
                playSound('fall');
              }
              
              scheduleAction(() => {
                const cascadeMatches = findMatches(boardRef.current);
                if (cascadeMatches.length > 0) {
                    matchesToProcess.current = cascadeMatches;
                    setPhase('MATCHING'); // Loop back to matching
                } else {
                    setPhase('REFILLING'); // Proceed to refill
                }
              }, fallDelay);
              break;
          }
          case 'REFILLING': {
                const newTiles: TileData[] = [];
                const currentBoard = boardRef.current;
                for (let c = 0; c < BOARD_SIZE; c++) {
                    const tilesInCol = currentBoard.filter(t => t.col === c).length;
                    const missingCount = BOARD_SIZE - tilesInCol;
                    for (let i = 0; i < missingCount; i++) {
                        newTiles.push(createTile(-(i + 1), c));
                    }
                }
                
                if (newTiles.length > 0) {
                    playSound('fall');
                    setBoard(prev => [...prev.map(t => ({...t, isNew: false})), ...newTiles]);
                    
                    const normalizeAndContinue = () => {
                        setBoard(boardWithNewTiles => {
                            const normalizedBoard = [...boardWithNewTiles];
                            for(let c = 0; c < BOARD_SIZE; c++) {
                                const column = normalizedBoard.filter(t => t.col === c).sort((a,b) => a.row - b.row);
                                let targetRow = 0;
                                for(const tile of column) {
                                    tile.row = targetRow;
                                    targetRow++;
                                }
                            }
                            
                            matchesToProcess.current = findMatches(normalizedBoard);
                    
                            if(matchesToProcess.current.length > 0) {
                                setPhase('MATCHING');
                            } else {
                                setPhase('IDLE');
                            }
                            
                            return normalizedBoard;
                        });
                    };
                    
                    scheduleAction(normalizeAndContinue, 300);
                } else {
                    setPhase('IDLE');
                }
                break;
            }
      }
      return () => { if(timeoutId) clearTimeout(timeoutId) };
  }, [gamePhase, isPaused, stepTrigger, playSound, matchDelay, fallDelay, gameSpeed, setPhase, createTile]);

  useEffect(() => {
    if (gamePhase === 'IDLE') {
        const currentBoard = boardRef.current;
        const possible = findPossibleMoves(currentBoard);
        if (showHints) {
            setBoard(b => b.map(t => ({...t, isHint: !!possible.find(p => p.row === t.row && p.col === t.col)})))
        } else {
            setBoard(b => b.map(t => ({...t, isHint: false})))
        }
        
        if (moves <= 0) {
            playSound('gameover');
            setPhase('GAME_OVER');
            return;
        }

        if (isAiActive && possible.length > 0 && !isPaused) {
            const [tile1Pos, tile2Pos] = possible;
            setTimeout(() => {
              if (isAiActive && gamePhaseRef.current === 'IDLE' && !isPaused) {
                  handleTileClick(tile1Pos.row, tile1Pos.col);
                  setTimeout(() => {
                      if (isAiActive && gamePhaseRef.current === 'IDLE' && !isPaused) {
                          handleTileClick(tile2Pos.row, tile2Pos.col);
                      }
                  }, 150 / gameSpeed);
              }
            }, 1000 / gameSpeed);
        }
    }
  }, [gamePhase, moves, showHints, isAiActive, findPossibleMoves, playSound, gameSpeed, handleTileClick, isPaused, setPhase]);

  const restartGame = useCallback(() => {
    setPhase('REMOVING');
    setBoard(prev => prev.map(t => ({ ...t, isMatched: true })));
    playSound('bomb');

    setTimeout(() => {
      setScore(0);
      setMoves(INITIAL_MOVES);
      setLevel(1);
      setSelectedTile(null);
      processQueue.current = [];
      matchesToProcess.current = [];
      
      const finalNewBoard = createBoard();
      const offscreenBoard = finalNewBoard.map(tile => ({
        ...tile,
        isNew: true,
        row: tile.row - BOARD_SIZE,
      }));
      
      setBoard(offscreenBoard);

      setTimeout(() => {
        setBoard(finalNewBoard);
        for (let i = 0; i < BOARD_SIZE; i++) {
            setTimeout(() => playSound('fall'), i * 50);
        }
        setTimeout(() => setPhase('IDLE'), 500 / gameSpeed);
      }, 50 / gameSpeed);

    }, (matchDelay + 100) / gameSpeed);
  }, [setPhase, playSound, matchDelay, gameSpeed, createBoard]);

  const toggleAi = () => setIsAiActive(p => !p);
  const toggleHints = () => setShowHints(p => !p);

  return { board, score, moves, level, handleTileClick, selectedTile, restartGame, isAiActive, toggleAi, showHints, toggleHints, isProcessing: gamePhase !== 'IDLE' && gamePhase !== 'GAME_OVER' };
};
