import { TileData } from './types';
export const NORMAL_TILE_TYPES = 6;

// New special tile types start after normal types
export const TILE_TYPE_BOMB = 6;
export const TILE_TYPE_LASER_V = 7;
export const TILE_TYPE_LASER_H = 8;
export const TILE_TYPE_LASER_CROSS = 9;
export const TILE_TYPE_ELECTRIC = 10;

export const SPECIAL_TILE_TYPES = [
  TILE_TYPE_BOMB,
  TILE_TYPE_LASER_V,
  TILE_TYPE_LASER_H,
  TILE_TYPE_LASER_CROSS,
  TILE_TYPE_ELECTRIC,
];

export const TILE_TYPES = NORMAL_TILE_TYPES + SPECIAL_TILE_TYPES.length;
export const SPECIAL_TILE_SPAWN_CHANCE = 0.05; // 5% chance

export const BOARD_SIZE = 8;
export const INITIAL_MOVES = 30;

// Cyberpunk color palette
export const TILE_COLORS: { [key: number]: string } = {
  0: 'bg-cyan-400',    // Neon Blue
  1: 'bg-fuchsia-500', // Neon Pink
  2: 'bg-lime-400',    // Neon Green
  3: 'bg-yellow-300',  // Electric Yellow
  4: 'bg-rose-500',    // Hot Red
  5: 'bg-indigo-400',  // Electric Purple
  // Special Tiles
  [TILE_TYPE_BOMB]: 'bg-orange-500',
  [TILE_TYPE_LASER_V]: 'bg-sky-500',
  [TILE_TYPE_LASER_H]: 'bg-sky-500',
  [TILE_TYPE_LASER_CROSS]: 'bg-sky-300',
  [TILE_TYPE_ELECTRIC]: 'bg-amber-400',
};

export const TILE_SHADOWS: { [key: number]: string } = {
  0: 'shadow-[0_0_15px_rgba(56,189,248,0.7)]',
  1: 'shadow-[0_0_15px_rgba(217,70,239,0.7)]',
  2: 'shadow-[0_0_15px_rgba(163,230,53,0.7)]',
  3: 'shadow-[0_0_15px_rgba(253,224,71,0.7)]',
  4: 'shadow-[0_0_15px_rgba(244,63,94,0.7)]',
  5: 'shadow-[0_0_15px_rgba(129,140,248,0.7)]',
    // Special Tiles
  [TILE_TYPE_BOMB]: 'shadow-[0_0_20px_rgba(249,115,22,0.9)]',
  [TILE_TYPE_LASER_V]: 'shadow-[0_0_20px_rgba(14,165,233,0.9)]',
  [TILE_TYPE_LASER_H]: 'shadow-[0_0_20px_rgba(14,165,233,0.9)]',
  [TILE_TYPE_LASER_CROSS]: 'shadow-[0_0_20px_rgba(125,211,252,0.9)]',
  [TILE_TYPE_ELECTRIC]: 'shadow-[0_0_20px_rgba(251,191,36,0.9)]',
};

// Cyberpunk/tech-themed shapes
export const TILE_SHAPES: { [key: number]: string } = {
  0: "⬢", // Hexagon
  1: "⮿", // Circuit
  2: "⭘", // Target
  3: "⯐", // Database
  4: "⯇", // Play Icon
  5: "⭍", // Sync Icon
  // Special Tiles
  [TILE_TYPE_BOMB]: '◎',
  [TILE_TYPE_LASER_V]: '⬍',
  [TILE_TYPE_LASER_H]: '⇔',
  [TILE_TYPE_LASER_CROSS]: '╋',
  [TILE_TYPE_ELECTRIC]: '⚡',
};

export const SPECIAL_TILE_NAMES: { [key: number]: string } = {
    [TILE_TYPE_BOMB]: 'Бомба',
    [TILE_TYPE_LASER_V]: 'Лазер (В)',
    [TILE_TYPE_LASER_H]: 'Лазер (Г)',
    [TILE_TYPE_LASER_CROSS]: 'Лазер (Крест)',
    [TILE_TYPE_ELECTRIC]: 'Электричество',
};
