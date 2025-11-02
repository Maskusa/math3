
export const BOARD_SIZE = 8;
export const TILE_TYPES = 6;
export const INITIAL_MOVES = 30;

export const TILE_COLORS: { [key: number]: string } = {
  0: 'bg-red-500',
  1: 'bg-green-500',
  2: 'bg-blue-500',
  3: 'bg-yellow-500',
  4: 'bg-purple-500',
  5: 'bg-orange-500',
};

export const TILE_SHAPES: { [key: number]: string } = {
  0: "◆", // Diamond
  1: "●", // Circle
  2: "▲", // Triangle
  3: "■", // Square
  4: "★", // Star
  5: "♥", // Heart
};
