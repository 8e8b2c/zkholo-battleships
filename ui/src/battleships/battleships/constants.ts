export const BOARD_SIZE = 10;

export type ShipLabel = '5' | '4' | '3_a' | '3_b' | '2';

export const SHIP_SIZES_ENTRIES: [ShipLabel, number][] = [
  ['5', 5],
  ['4', 4],
  ['3_a', 3],
  ['3_b', 3],
  ['2', 2],
];

export const SHIP_LABELS = SHIP_SIZES_ENTRIES.map(([label]) => label);

export const SHIP_SIZE_TO_LABEL = Object.fromEntries(SHIP_SIZES_ENTRIES);
