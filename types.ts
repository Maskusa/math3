import { TILE_COLORS } from './constants';
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

export type EditorBoard = (number | null)[][];

export interface LevelData {
  width: number;
  height: number;
  board: EditorBoard;
  finishScore: number;
}

export interface Position {
  row: number;
  col: number;
}

export type TileType = number;

export interface TileData {
    id: number;
    type: TileType;
    row: number;
    col: number;
    isMatched?: boolean;
    isHint?: boolean;
    isNew?: boolean;
    health?: number;
    maxHealth?: number;
}

export type BoardType = TileData[];

export type GamePhase = 'READY' | 'IDLE' | 'MATCHING' | 'REMOVING' | 'GRAVITY' | 'REFILLING' | 'GAME_OVER' | 'WIN';

export interface GameLogicProps {
    playSound: (sound: 'swap' | 'match' | 'invalid' | 'fall' | 'gameover' | 'bomb' | 'laser' | 'electric' | 'rainbow' | 'complex_hit' | 'complex_destroy' | 'win') => void;
    timingConfig: TimingConfig;
    isPaused: boolean;
    stepTrigger: number;
    onPhaseChange: (phase: GamePhase) => void;
    gamePhase: GamePhase;
    isStepMode: boolean;
    autoPause: () => void;
    generationConfig: GenerationConfig;
    boardSize: BoardSize;
    isDebugMode?: boolean;
    finishScore?: number;
}