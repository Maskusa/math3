import { useState, useEffect, useCallback, useRef } from 'react';
import { BoardType, Position, TileData } from '../types';
import { BOARD_SIZE, TILE_TYPES, INITIAL_MOVES } from '../constants';

let tileIdCounter = 0;

const createTile = (row: number, col: number): TileData => ({
  id: tileIdCounter++,
  type: Math.floor(Math.random() * TILE_TYPES),
  row,
  col,
});

const createBoard = (): BoardType => {
  let board: TileData[] = [];
  do {
    board = [];
    tileIdCounter = 0;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        board.push(createTile(row, col));
      }
    }
  } while (hasInitialMatches(board));
  return board;
};

const hasInitialMatches = (board: BoardType): boolean => {
  const getTile = (r: number, c: number) => board.find(t => t.row === r && t.col === c);
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const tile = getTile(r, c);
      if (!tile) continue;
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
            if (!tile) continue;

            // Horizontal matches
            if (c < BOARD_SIZE - 2 && tile.type === getTile(r, c + 1)?.type && tile.type === getTile(r, c + 2)?.type) {
                matchedTiles.add(tile);
                matchedTiles.add(getTile(r, c + 1)!);
                matchedTiles.add(getTile(r, c + 2)!);
            }
            // Vertical matches
            if (r < BOARD_SIZE - 2 && tile.type === getTile(r + 1, c)?.type && tile.type === getTile(r + 2, c)?.type) {
                matchedTiles.add(tile);
                matchedTiles.add(getTile(r + 1, c)!);
                matchedTiles.add(getTile(r + 2, c)!);
            }
        }
    }
    return Array.from(matchedTiles);
};

export const useGameLogic = () => {
  const [board, setBoard] = useState<BoardType>(createBoard());
  const [selectedTile, setSelectedTile] = useState<Position | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(INITIAL_MOVES);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [showHints, setShowHints] = useState(false);
  const [isAiActive, setIsAiActive] = useState(false);
  const [possibleMove, setPossibleMove] = useState<Position[]>([]);

  const boardRef = useRef(board);
  boardRef.current = board;
  
  const findPossibleMoves = useCallback((currentBoard: BoardType): Position[] => {
    const getTile = (r: number, c: number) => currentBoard.find(t => t.row === r && t.col === c);
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const tile1 = getTile(r, c);
        if (!tile1) continue;
        
        // Check swap right
        if (c < BOARD_SIZE - 1) {
          const tile2 = getTile(r, c + 1);
          if (tile2) {
            const tempBoard = currentBoard.map(t => 
                t.id === tile1.id ? {...t, col: c + 1} :
                t.id === tile2.id ? {...t, col: c} : t);
            if (findMatches(tempBoard).length > 0) return [{row: r, col: c}, {row: r, col: c + 1}];
          }
        }
        
        // Check swap down
        if (r < BOARD_SIZE - 1) {
          const tile2 = getTile(r + 1, c);
          if (tile2) {
            const tempBoard = currentBoard.map(t => 
                t.id === tile1.id ? {...t, row: r + 1} :
                t.id === tile2.id ? {...t, row: r} : t);
            if (findMatches(tempBoard).length > 0) return [{row: r, col: c}, {row: r + 1, col: c}];
          }
        }
      }
    }
    return [];
  }, []);

  const processMatches = useCallback(async (currentBoard: BoardType) => {
    let boardCopy = [...currentBoard];
    let matches = findMatches(boardCopy);

    if(!isProcessing) setIsProcessing(true);

    while (matches.length > 0) {
      setScore(prev => prev + matches.length * 10);

      // 1. Animate destruction
      boardCopy = boardCopy.map(t => matches.some(m => m.id === t.id) ? {...t, isMatched: true} : t);
      setBoard(boardCopy);
      await new Promise(res => setTimeout(res, 300));
      
      // 2. Remove matched tiles
      boardCopy = boardCopy.filter(t => !t.isMatched);
      
      // 3. Gravity
      for (let c = 0; c < BOARD_SIZE; c++) {
          const column = boardCopy.filter(t => t.col === c).sort((a,b) => a.row - b.row);
          column.forEach((tile, r) => {
              tile.row = BOARD_SIZE - column.length + r;
          });
      }
      setBoard([...boardCopy]);
      await new Promise(res => setTimeout(res, 300));

      // 4. Refill
      const newTiles: TileData[] = [];
      for (let c = 0; c < BOARD_SIZE; c++) {
          const tilesInCol = boardCopy.filter(t => t.col === c).length;
          for (let r = 0; r < BOARD_SIZE - tilesInCol; r++) {
              const newTile = createTile(-1 -r, c);
              newTiles.push(newTile);
          }
      }
      boardCopy = [...boardCopy, ...newTiles];
      setBoard(boardCopy);
      await new Promise(res => setTimeout(res, 50)); // Short delay before falling
      
      // Settle new tiles into their final positions
      const finalBoard = boardCopy.map(t => ({...t}));
      for (let c = 0; c < BOARD_SIZE; c++) {
        const column = finalBoard.filter(t => t.col === c).sort((a, b) => a.row - b.row);
        column.forEach((tile, newRowIndex) => {
            tile.row = newRowIndex;
        });
      }
      
      setBoard(finalBoard);
      await new Promise(res => setTimeout(res, 300));

      boardCopy = finalBoard;
      matches = findMatches(boardCopy);
    }
    
    // After all cascades
    const nextMove = findPossibleMoves(boardCopy);
    setPossibleMove(nextMove);
    setBoard(b => b.map(t => ({...t, isHint: showHints && nextMove.some(p => p.row === t.row && p.col === t.col)})));
    
    if (moves <= 0 && !gameOver) {
        setGameOver(true);
    }
    
    setIsProcessing(false);

  }, [moves, findPossibleMoves, showHints, gameOver, isProcessing]);

  const handleTileClick = (row: number, col: number) => {
    if (gameOver || isProcessing) return;

    if (selectedTile) {
      const { row: selectedRow, col: selectedCol } = selectedTile;

      if (row === selectedRow && col === selectedCol) {
        setSelectedTile(null);
        return;
      }

      const isAdjacent = Math.abs(row - selectedRow) + Math.abs(col - selectedCol) === 1;

      if (isAdjacent) {
        setIsProcessing(true);
        setSelectedTile(null);

        let newBoard = [...board];
        const tile1 = newBoard.find(t => t.row === selectedRow && t.col === selectedCol);
        const tile2 = newBoard.find(t => t.row === row && t.col === col);
        
        if (!tile1 || !tile2) {
          setIsProcessing(false);
          return;
        }

        const tile1Id = tile1.id;
        const tile2Id = tile2.id;
        const tempRow = tile1.row, tempCol = tile1.col;
        tile1.row = tile2.row; tile1.col = tile2.col;
        tile2.row = tempRow; tile2.col = tempCol;
        
        setBoard([...newBoard]);
        
        setTimeout(() => {
          const boardAfterSwap = boardRef.current;
          if (findMatches(boardAfterSwap).length > 0) {
              setMoves(m => m - 1);
              processMatches(boardAfterSwap);
          } else {
              let boardToRevert = [...boardAfterSwap];
              const tile1b = boardToRevert.find(t => t.id === tile1Id);
              const tile2b = boardToRevert.find(t => t.id === tile2Id);
              if (tile1b && tile2b) {
                const tempRowB = tile1b.row, tempColB = tile1b.col;
                tile1b.row = tile2b.row; tile1b.col = tile2b.col;
                tile2b.row = tempRowB; tile2b.col = tempColB;
                setBoard([...boardToRevert]);
              }
              setTimeout(() => setIsProcessing(false), 300);
          }
        }, 300);
      } else {
        setSelectedTile({ row, col });
      }
    } else {
      setSelectedTile({ row, col });
    }
  };
  
  useEffect(() => {
      const currentBoard = boardRef.current;
      if (!isProcessing) {
        const nextMove = findPossibleMoves(currentBoard);
        setPossibleMove(nextMove);
        if (nextMove.length === 0 && !hasInitialMatches(currentBoard) && findMatches(currentBoard).length === 0) {
            // No more moves, this is a soft-lock.
            // In a real game you might shuffle the board here.
            // For now, let's end the game.
            if(moves > 0) setGameOver(true);
        }
      }
  }, [board, isProcessing, findPossibleMoves, moves]);

  useEffect(() => {
    setBoard(b => b.map(t => ({...t, isHint: showHints && possibleMove.some(p => p.row === t.row && p.col === t.col)})));
  }, [showHints, possibleMove]);

  useEffect(() => {
      if(isAiActive && !isProcessing && possibleMove.length > 0 && !gameOver) {
          const [tile1, tile2] = possibleMove;
          const timeout = setTimeout(() => {
              handleTileClick(tile1.row, tile1.col);
              setTimeout(() => handleTileClick(tile2.row, tile2.col), 100);
          }, 700);
          return () => clearTimeout(timeout);
      }
  }, [isAiActive, isProcessing, possibleMove, gameOver]);


  const restartGame = () => {
    setBoard(createBoard());
    setScore(0);
    setMoves(INITIAL_MOVES);
    setLevel(1);
    setGameOver(false);
    setSelectedTile(null);
    setIsProcessing(false);
    setIsAiActive(false);
    setShowHints(false);
  };
  
  const toggleAi = () => setIsAiActive(p => !p);
  const toggleHints = () => setShowHints(p => !p);

  return { board, score, moves, level, gameOver, selectedTile, handleTileClick, restartGame, isProcessing, isAiActive, toggleAi, showHints, toggleHints };
};