import { describe, expect, it } from 'vitest';
import { solarPalette } from './clock/faces';
import { sunElevation, sunInfo } from './solar';

describe('太陽位置', () => {
  it('夏至ごろの太陽直下点は北回帰線付近', () => {
    const s = sunInfo(new Date(Date.UTC(2026, 5, 21, 12)));
    expect(s.subsolarLat).toBeGreaterThan(22.5);
    expect(s.subsolarLat).toBeLessThan(24);
    // UTC 正午の太陽直下点はほぼ経度 0
    expect(Math.abs(s.subsolarLon)).toBeLessThan(3);
  });

  it('東京の昼は太陽が高く、深夜は地平線の下', () => {
    // 2026-06-21 12:00 JST = 03:00 UTC
    expect(sunElevation(new Date(Date.UTC(2026, 5, 21, 3)), 35.68, 139.69)).toBeGreaterThan(70);
    // 2026-06-21 00:00 JST
    expect(sunElevation(new Date(Date.UTC(2026, 5, 20, 15)), 35.68, 139.69)).toBeLessThan(-20);
  });

  it('太陽高度に応じて空の色が変わる', () => {
    expect(solarPalette(-30).top).not.toBe(solarPalette(45).top);
    expect(solarPalette(0).bottom).toBe('#ff7a45');
  });
});
