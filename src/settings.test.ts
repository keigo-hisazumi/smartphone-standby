import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, mergeSettings } from './settings';

describe('mergeSettings', () => {
  it('保存データがなければ既定値', () => {
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings('broken')).toEqual(DEFAULT_SETTINGS);
  });

  it('保存済みの値で上書きし、型が違う値や未知の項目は捨てる', () => {
    const s = mergeSettings({ layoutVersion: 2, hour12: true, sleepAfterSec: '60', unknown: 1, leftStack: ['date'] });
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

  it('旧バージョンの保存データは左のスタックの先頭にカレンダーを追加し、右はそのまま', () => {
    const s = mergeSettings({
      view: 'photos',
      leftStack: ['analog-clock', 'battery'],
      rightStack: ['calendar', 'date'],
    });
    expect(s.leftStack).toEqual(['calendar', 'analog-clock', 'battery']);
    expect(s.rightStack).toEqual(['calendar', 'date']);
    expect(s.layoutVersion).toBe(DEFAULT_SETTINGS.layoutVersion);
    expect('view' in s).toBe(false);
  });

  it('移行済みの保存データは並びを変えない', () => {
    const s = mergeSettings({ layoutVersion: 2, leftStack: ['date'], rightStack: ['calendar'] });
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
