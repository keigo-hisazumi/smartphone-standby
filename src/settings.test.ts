import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, mergeSettings } from './settings';

describe('mergeSettings', () => {
  it('保存データがなければ既定値', () => {
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings('broken')).toEqual(DEFAULT_SETTINGS);
  });

  it('保存済みの値で上書きし、型が違う値や未知の項目は捨てる', () => {
    const s = mergeSettings({ layoutVersion: 3, hour12: true, sleepAfterSec: '60', unknown: 1, leftStack: ['date'] });
    expect(s.hour12).toBe(true);
    expect(s.sleepAfterSec).toBe(DEFAULT_SETTINGS.sleepAfterSec);
    expect(s.leftStack).toEqual(['date']);
    expect('unknown' in s).toBe(false);
  });

  it('既定では左右どちらのスタックにも全ウィジェットを表示し、左の先頭はカレンダー', () => {
    expect(DEFAULT_SETTINGS.leftStack[0]).toBe('calendar');
    expect(DEFAULT_SETTINGS.rightStack[0]).toBe('analog-clock');
    expect([...DEFAULT_SETTINGS.leftStack].sort()).toEqual([...DEFAULT_SETTINGS.rightStack].sort());
  });

  it('旧バージョンの保存データは左右どちらにも全ウィジェットが並ぶように移行する', () => {
    const s = mergeSettings({
      view: 'photos',
      leftStack: ['analog-clock', 'world-clock', 'digital-clock', 'battery'],
      rightStack: ['calendar', 'date', 'weather'],
    });
    expect(s.leftStack).toEqual(['calendar', 'analog-clock', 'world-clock', 'digital-clock', 'battery', 'date', 'weather']);
    expect(s.rightStack).toEqual(['calendar', 'date', 'weather', 'analog-clock', 'world-clock', 'digital-clock', 'battery']);
    expect(s.leftStack).toHaveLength(DEFAULT_SETTINGS.leftStack.length);
    expect(s.layoutVersion).toBe(DEFAULT_SETTINGS.layoutVersion);
    expect('view' in s).toBe(false);
  });

  it('構成バージョン 2 の保存データも左右に全ウィジェットを追加する', () => {
    const s = mergeSettings({ layoutVersion: 2, leftStack: ['calendar', 'date'], rightStack: ['battery'] });
    expect([...s.leftStack].sort()).toEqual([...DEFAULT_SETTINGS.leftStack].sort());
    expect(s.leftStack.slice(0, 2)).toEqual(['calendar', 'date']);
    expect([...s.rightStack].sort()).toEqual([...DEFAULT_SETTINGS.rightStack].sort());
    expect(s.rightStack[0]).toBe('battery');
  });

  it('移行済みの保存データは並びを変えない', () => {
    const s = mergeSettings({ layoutVersion: 3, leftStack: ['date'], rightStack: ['calendar'] });
    expect(s.leftStack).toEqual(['date']);
    expect(s.rightStack).toEqual(['calendar']);
  });

  it('既定値オブジェクトを書き換えない', () => {
    const before = [...DEFAULT_SETTINGS.leftStack];
    const s = mergeSettings({});
    s.leftStack.push('date');
    expect(DEFAULT_SETTINGS.leftStack).toEqual(before);
    expect(s.leftStack).not.toBe(DEFAULT_SETTINGS.leftStack);
  });
});
