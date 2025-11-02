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
}

export type BoardType = TileData[];