import { BOARD_SIZE } from './constants';
import { Ship } from './types';

export function boardWithFill<T>(fill: T) {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => fill)
  );
}

export function shipToNumStrArr(ship: Ship) {
  return [ship.x.toString(), ship.y.toString(), ship.horizontal ? '1' : '0'];
}

export function proofToCommaSeparated(proof: any) {
  return [
    proof.pi_a[0],
    proof.pi_a[1],
    proof.pi_b[0][0],
    proof.pi_b[0][1],
    proof.pi_b[1][0],
    proof.pi_b[1][1],
    proof.pi_c[0],
    proof.pi_c[1],
  ].join(',');
}
