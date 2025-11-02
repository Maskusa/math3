import { TimingConfig } from '../App';

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
}

export type BoardType = TileData[];

export type GamePhase = 'IDLE' | 'MATCHING' | 'REMOVING' | 'GRAVITY' | 'REFILLING' | 'GAME_OVER';

export interface GameLogicProps {
    playSound: (sound: 'swap' | 'match' | 'invalid' | 'fall' | 'gameover' | 'bomb' | 'laser' | 'electric') => void;
    timingConfig: TimingConfig;
    isPaused: boolean;
    stepTrigger: number;
    onPhaseChange: (phase: GamePhase) => void;
    isStepMode: boolean;
    autoPause: () => void;
    enabledSpecialTiles: Record<number, boolean>;
}
