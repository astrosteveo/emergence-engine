/*
 * This file is part of Emergence Engine.
 * Copyright (C) 2026 astrosteveo
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

// Simplex noise implementation based on Stefan Gustavson's work
// Returns values in range [-1, 1]

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

const grad3 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

function buildPermutationTable(seed: number): Uint8Array {
  const perm = new Uint8Array(512);
  const source = new Uint8Array(256);

  for (let i = 0; i < 256; i++) {
    source[i] = i;
  }

  // Seed the random number generator
  let s = seed;
  const random = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  // Fisher-Yates shuffle
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [source[i], source[j]] = [source[j], source[i]];
  }

  for (let i = 0; i < 512; i++) {
    perm[i] = source[i & 255];
  }

  return perm;
}

let cachedPerm: Uint8Array | null = null;
let cachedSeed: number | null = null;

export function simplex2(x: number, y: number, seed = 0): number {
  // Cache permutation table for same seed
  if (cachedSeed !== seed || !cachedPerm) {
    cachedPerm = buildPermutationTable(seed);
    cachedSeed = seed;
  }
  const perm = cachedPerm;

  // Skew input space to determine simplex cell
  const s = (x + y) * F2;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);

  // Unskew back to (x, y) space
  const t = (i + j) * G2;
  const X0 = i - t;
  const Y0 = j - t;
  const x0 = x - X0;
  const y0 = y - Y0;

  // Determine which simplex we're in
  const i1 = x0 > y0 ? 1 : 0;
  const j1 = x0 > y0 ? 0 : 1;

  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;

  // Hash coordinates of corners
  const ii = i & 255;
  const jj = j & 255;

  // Calculate contributions from corners
  let n0 = 0, n1 = 0, n2 = 0;

  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 >= 0) {
    const gi0 = perm[ii + perm[jj]] % 8;
    t0 *= t0;
    n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
  }

  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 >= 0) {
    const gi1 = perm[ii + i1 + perm[jj + j1]] % 8;
    t1 *= t1;
    n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
  }

  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 >= 0) {
    const gi2 = perm[ii + 1 + perm[jj + 1]] % 8;
    t2 *= t2;
    n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
  }

  // Scale to [-1, 1]
  return 70 * (n0 + n1 + n2);
}
