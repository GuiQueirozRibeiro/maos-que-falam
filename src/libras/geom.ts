import type { Pt } from '../vision/handTracker';

export type { Pt };

export const v = (x: number, y: number, z: number): Pt => ({ x, y, z });
export const add = (a: Pt, b: Pt): Pt => v(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub = (a: Pt, b: Pt): Pt => v(a.x - b.x, a.y - b.y, a.z - b.z);
export const scale = (a: Pt, k: number): Pt => v(a.x * k, a.y * k, a.z * k);
export const dot = (a: Pt, b: Pt) => a.x * b.x + a.y * b.y + a.z * b.z;
export const len = (a: Pt) => Math.hypot(a.x, a.y, a.z);
export const dist = (a: Pt, b: Pt) => len(sub(a, b));
export const norm = (a: Pt): Pt => {
  const l = len(a) || 1;
  return scale(a, 1 / l);
};
export const lerp = (a: Pt, b: Pt, t: number): Pt => add(a, scale(sub(b, a), t));

/** Ângulo (rad) entre dois vetores. */
export function angle(a: Pt, b: Pt): number {
  const c = dot(a, b) / ((len(a) || 1) * (len(b) || 1));
  return Math.acos(Math.max(-1, Math.min(1, c)));
}

export const rotZ = (p: Pt, a: number): Pt =>
  v(p.x * Math.cos(a) - p.y * Math.sin(a), p.x * Math.sin(a) + p.y * Math.cos(a), p.z);
export const rotX = (p: Pt, a: number): Pt =>
  v(p.x, p.y * Math.cos(a) - p.z * Math.sin(a), p.y * Math.sin(a) + p.z * Math.cos(a));
export const rotY = (p: Pt, a: number): Pt =>
  v(p.x * Math.cos(a) + p.z * Math.sin(a), p.y, -p.x * Math.sin(a) + p.z * Math.cos(a));

export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
