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

export type GamePhase = 'IDLE' | 'MATCHING' | 'REMOVING' | 'GRAVITY' | 'REFILLING' | 'GAME_OVER';

export interface GameLogicProps {
    playSound: (sound: 'swap' | 'match' | 'invalid' | 'fall' | 'gameover' | 'bomb' | 'laser' | 'electric' | 'rainbow' | 'complex_hit' | 'complex_destroy') => void;
    timingConfig: TimingConfig;
    isPaused: boolean;
    stepTrigger: number;
    onPhaseChange: (phase: GamePhase) => void;
    isStepMode: boolean;
    autoPause: () => void;
    generationConfig: GenerationConfig;
    boardSize: BoardSize;
}