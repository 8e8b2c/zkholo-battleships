import { BOARD_SIZE } from './constants';

export function boardWithFill<T>(fill: T) {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => fill)
  );
}
