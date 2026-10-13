import { describe, expect, it } from 'vitest';
import { classifyGesture } from './gestures';
import { isLand } from './worldMap';

describe('classifyGesture', () => {
  it('ほとんど動かなければタップ', () => {
    expect(classifyGesture(3, -2, 10, 20)).toEqual({ type: 'tap', x: 10, y: 20 });
  });

  it('移動量の大きい方向のスワイプになる', () => {
    expect(classifyGesture(-120, 10, 0, 0)).toMatchObject({ type: 'swipe', direction: 'left' });
    expect(classifyGesture(80, -20, 0, 0)).toMatchObject({ type: 'swipe', direction: 'right' });
    expect(classifyGesture(5, -90, 0, 0)).toMatchObject({ type: 'swipe', direction: 'up' });
    expect(classifyGesture(-10, 60, 0, 0)).toMatchObject({ type: 'swipe', direction: 'down' });
  });

  it('中途半端な移動は何もしない', () => {
    expect(classifyGesture(20, 15, 0, 0)).toEqual({ type: 'none' });
  });
});

describe('isLand', () => {
  it('主要都市は陸地、海の真ん中は海', () => {
    expect(isLand(139.69, 35.68)).toBe(true); // 東京
    expect(isLand(-74, 41)).toBe(true); // ニューヨーク
    expect(isLand(2.35, 48.86)).toBe(true); // パリ
    expect(isLand(-150, 0)).toBe(false); // 太平洋
    expect(isLand(-30, 30)).toBe(false); // 大西洋
  });
});
