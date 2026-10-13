import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, mergeSettings } from './settings';

describe('mergeSettings', () => {
  it('保存データがなければ既定値', () => {
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings('broken')).toEqual(DEFAULT_SETTINGS);
  });

  it('保存済みの値で上書きし、型が違う値や未知の項目は捨てる', () => {
    const s = mergeSettings({ hour12: true, sleepAfterSec: '60', unknown: 1, leftStack: ['date'] });
    expect(s.hour12).toBe(true);
    expect(s.sleepAfterSec).toBe(DEFAULT_SETTINGS.sleepAfterSec);
    expect(s.leftStack).toEqual(['date']);
    expect('unknown' in s).toBe(false);
  });

  it('文字盤の色は項目ごとにマージする', () => {
    const s = mergeSettings({ clockColors: { digital: '#ffffff', analog: 3 } });
    expect(s.clockColors.digital).toBe('#ffffff');
    expect(s.clockColors.analog).toBe(DEFAULT_SETTINGS.clockColors.analog);
  });

  it('既定値オブジェクトを書き換えない', () => {
    const s = mergeSettings({});
    s.leftStack.push('date');
    expect(DEFAULT_SETTINGS.leftStack).toEqual(['analog-clock', 'world-clock', 'digital-clock', 'battery']);
    expect(s.leftStack).not.toBe(DEFAULT_SETTINGS.leftStack);
  });
});
