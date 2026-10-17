import { describe, it, expect } from 'vitest';
import { collisionGrid, isBlocked, moveWithCollision } from '../core/world/collision.js';

// 4x2 cells stretched over a 400x100 map (cells of 100x50); cell (col 2, row 0) blocked
const grid = collisionGrid([0, 0, 1, 0, 0, 0, 0, 0], 4, 2, 400, 100);

describe('map tile collision', () => {
  it('no blocked cell means no grid', () => {
    expect(collisionGrid([0, 0, 0, 0], 2, 2, 100, 100)).toBeNull();
    expect(moveWithCollision(null, 0, 0, 5, 5)).toEqual({ x: 5, y: 5 });
  });

  it('cells are stretched over the map size', () => {
    expect(isBlocked(grid, 250, 25)).toBe(true);
    expect(isBlocked(grid, 250, 75)).toBe(false);
    expect(isBlocked(grid, 195, 25)).toBe(false);
    expect(isBlocked(grid, 195, 25, 6)).toBe(true); // footprint touches the wall
  });

  it('a move into a wall slides along it or stops', () => {
    // moving right and down into the wall: keeps the free axis (down)
    expect(moveWithCollision(grid, 180, 40, 210, 45, 0)).toEqual({ x: 180, y: 45 });
    // moving up into the wall from below: keeps x
    expect(moveWithCollision(grid, 250, 60, 255, 45, 0)).toEqual({ x: 255, y: 60 });
    // straight into it: stays
    expect(moveWithCollision(grid, 190, 25, 210, 25, 0)).toEqual({ x: 190, y: 25 });
  });

  it('a hero already inside a wall can walk out', () => {
    expect(moveWithCollision(grid, 250, 25, 260, 30, 0)).toEqual({ x: 260, y: 30 });
  });
});
