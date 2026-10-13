import { describe, expect, it } from 'vitest';
import { burnInOffset, isInNightWindow, isNightActive, shouldAutoExit, shouldAutoStart, sleepEnabled } from './rules';

const at = (h: number, m = 0) => new Date(2026, 9, 13, h, m);

describe('shouldAutoStart', () => {
  const settings = { autoStart: true, requireCharging: true };

  it('充電中かつ横向きで開始する', () => {
    expect(shouldAutoStart({ batterySupported: true, charging: true, landscape: true }, settings)).toBe(true);
  });

  it('縦向き・未充電では開始しない', () => {
    expect(shouldAutoStart({ batterySupported: true, charging: true, landscape: false }, settings)).toBe(false);
    expect(shouldAutoStart({ batterySupported: true, charging: false, landscape: true }, settings)).toBe(false);
  });

  it('充電状態を取得できない端末では横向きだけで開始する', () => {
    expect(shouldAutoStart({ batterySupported: false, charging: false, landscape: true }, settings)).toBe(true);
  });

  it('充電条件をオフにすれば未充電でも開始する', () => {
    expect(
      shouldAutoStart({ batterySupported: true, charging: false, landscape: true }, { ...settings, requireCharging: false }),
    ).toBe(true);
  });

  it('自動開始がオフなら開始しない', () => {
    expect(shouldAutoStart({ batterySupported: true, charging: true, landscape: true }, { ...settings, autoStart: false })).toBe(
      false,
    );
  });
});

describe('shouldAutoExit', () => {
  const on = { batterySupported: true, charging: true, landscape: true };

  it('縦向きにすると終了する', () => {
    expect(shouldAutoExit(on, { ...on, landscape: false }, { requireCharging: true })).toBe(true);
  });

  it('充電をやめると終了する（充電条件がオンの場合のみ）', () => {
    expect(shouldAutoExit(on, { ...on, charging: false }, { requireCharging: true })).toBe(true);
    expect(shouldAutoExit(on, { ...on, charging: false }, { requireCharging: false })).toBe(false);
  });

  it('状態が変わらなければ終了しない', () => {
    expect(shouldAutoExit(on, on, { requireCharging: true })).toBe(false);
  });
});

describe('ナイトモード', () => {
  it('日をまたぐ時間帯を判定できる', () => {
    expect(isInNightWindow(at(23), '22:00', '06:00')).toBe(true);
    expect(isInNightWindow(at(3), '22:00', '06:00')).toBe(true);
    expect(isInNightWindow(at(6), '22:00', '06:00')).toBe(false);
    expect(isInNightWindow(at(12), '22:00', '06:00')).toBe(false);
  });

  it('日をまたがない時間帯も判定できる', () => {
    expect(isInNightWindow(at(1), '00:30', '05:00')).toBe(true);
    expect(isInNightWindow(at(0, 10), '00:30', '05:00')).toBe(false);
  });

  it('照度センサーの値があれば時刻より優先する', () => {
    const s = { nightMode: 'auto' as const, nightStart: '22:00', nightEnd: '06:00' };
    expect(isNightActive(at(12), s, 1)).toBe(true);
    expect(isNightActive(at(23), s, 300)).toBe(false);
    expect(isNightActive(at(23), s, null)).toBe(true);
  });

  it('オン・オフは時刻に関係なく固定', () => {
    expect(isNightActive(at(12), { nightMode: 'on', nightStart: '22:00', nightEnd: '06:00' }, null)).toBe(true);
    expect(isNightActive(at(23), { nightMode: 'off', nightStart: '22:00', nightEnd: '06:00' }, 0)).toBe(false);
  });
});

describe('sleepEnabled', () => {
  it('0 秒なら消灯しない', () => {
    expect(sleepEnabled({ sleepAfterSec: 0, sleepOnlyAtNight: false }, true)).toBe(false);
  });

  it('夜間のみの設定ではナイトモード中だけ消灯する', () => {
    expect(sleepEnabled({ sleepAfterSec: 60, sleepOnlyAtNight: true }, false)).toBe(false);
    expect(sleepEnabled({ sleepAfterSec: 60, sleepOnlyAtNight: true }, true)).toBe(true);
  });
});

describe('burnInOffset', () => {
  it('ずらし量は半径以内で、分ごとに変わる', () => {
    for (let m = 0; m < 12; m++) {
      const o = burnInOffset(at(10, m), 4);
      expect(Math.hypot(o.x, o.y)).toBeLessThanOrEqual(4.5);
    }
    expect(burnInOffset(at(10, 0))).not.toEqual(burnInOffset(at(10, 3)));
  });
});
