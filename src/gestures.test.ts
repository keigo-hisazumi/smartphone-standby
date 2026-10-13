import { describe, expect, it } from 'vitest';
import { classifyGesture } from './gestures';

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
