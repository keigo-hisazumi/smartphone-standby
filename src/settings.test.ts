import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, mergeSettings, sortWidgets, WIDGET_ORDER } from './settings';

describe('mergeSettings', () => {
  it('保存データがなければ既定値', () => {
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings('broken')).toEqual(DEFAULT_SETTINGS);
  });

  it('保存済みの値で上書きし、型が違う値や未知の項目は捨てる', () => {
    const s = mergeSettings({ layoutVersion: 6, hour12: true, sleepAfterSec: '60', unknown: 1, leftStack: ['date'] });
    expect(s.hour12).toBe(true);
    expect(s.sleepAfterSec).toBe(DEFAULT_SETTINGS.sleepAfterSec);
    expect(s.leftStack).toEqual(['date']);
    expect('unknown' in s).toBe(false);
  });

  it('既定では左右どちらのスタックにも全ウィジェットを同じ順番で表示し、先頭はカレンダー', () => {
    expect(DEFAULT_SETTINGS.leftStack).toEqual(WIDGET_ORDER);
    expect(DEFAULT_SETTINGS.rightStack).toEqual(WIDGET_ORDER);
    expect(WIDGET_ORDER[0]).toBe('calendar');
  });

  it('旧バージョンの保存データは左右どちらにも全ウィジェットを同じ順番で並べる', () => {
    const s = mergeSettings({
      view: 'photos',
      leftStack: ['analog-clock', 'world-clock', 'digital-clock', 'battery'],
      rightStack: ['calendar', 'date', 'weather'],
    });
    expect(s.leftStack).toEqual(WIDGET_ORDER);
    expect(s.rightStack).toEqual(WIDGET_ORDER);
    expect(s.layoutVersion).toBe(DEFAULT_SETTINGS.layoutVersion);
    expect('view' in s).toBe(false);
  });

  it('左右で順番が異なる保存データは、選択を維持したまま同じ順番に揃える', () => {
    const s = mergeSettings({
      layoutVersion: 3,
      leftStack: ['calendar', 'date', 'weather', 'analog-clock', 'digital-clock'],
      rightStack: ['analog-clock', 'digital-clock', 'calendar', 'date', 'weather'],
    });
    expect(s.leftStack).toEqual(WIDGET_ORDER);
    expect(s.rightStack).toEqual(WIDGET_ORDER);
    const partial = mergeSettings({ layoutVersion: 6, leftStack: ['digital-clock', 'calendar'], rightStack: ['weather', 'date'] });
    expect(partial.leftStack).toEqual(['calendar', 'digital-clock']);
    expect(partial.rightStack).toEqual(['date', 'weather']);
  });

  it('天気は既定でオン。旧バージョンの保存データもオンにし、移行後のオフは維持する', () => {
    expect(DEFAULT_SETTINGS.weatherEnabled).toBe(true);
    expect(mergeSettings({ layoutVersion: 4, weatherEnabled: false }).weatherEnabled).toBe(true);
    expect(mergeSettings({ weatherEnabled: false }).weatherEnabled).toBe(true);
    expect(mergeSettings({ layoutVersion: 5, weatherEnabled: false }).weatherEnabled).toBe(false);
  });

  it('来月のカレンダーがなかった頃の保存データは、左右のスタックに来月のカレンダーを追加する', () => {
    const s = mergeSettings({ layoutVersion: 5, leftStack: ['calendar', 'date'], rightStack: ['weather'] });
    expect(s.leftStack).toEqual(['calendar', 'calendar-next', 'date']);
    expect(s.rightStack).toEqual(['calendar-next', 'weather']);
    // 移行後に外した場合は維持する
    expect(mergeSettings({ layoutVersion: 6, leftStack: ['calendar'] }).leftStack).toEqual(['calendar']);
  });

  it('未知のウィジェットしかない保存データは既定値に戻す', () => {
    const s = mergeSettings({ layoutVersion: 6, leftStack: ['photos'], rightStack: [] });
    expect(s.leftStack).toEqual(WIDGET_ORDER);
    expect(s.rightStack).toEqual(WIDGET_ORDER);
  });
});

describe('sortWidgets', () => {
  it('WIDGET_ORDER の順に並べ、重複と未知の ID を除く', () => {
    expect(sortWidgets(['digital-clock', 'calendar', 'digital-clock', 'unknown'])).toEqual(['calendar', 'digital-clock']);
  });

  it('廃止したバッテリー・世界時計のウィジェットと都市の設定は保存データから取り除く', () => {
    const s = mergeSettings({
      layoutVersion: 6,
      leftStack: ['battery', 'world-clock', 'date'],
      rightStack: ['battery', 'world-clock'],
      worldCities: ['Asia/Tokyo'],
    });
    expect(s.leftStack).toEqual(['date']);
    expect(s.rightStack).toEqual(WIDGET_ORDER);
    expect('worldCities' in s).toBe(false);
  });

  it('廃止した充電状態・自動開始の設定は保存データから取り除く', () => {
    const s = mergeSettings({ layoutVersion: 6, requireCharging: true, autoStart: false });
    expect('requireCharging' in s).toBe(false);
    expect('autoStart' in s).toBe(false);
  });
});

describe('mergeSettings（既定値の保護）', () => {
  it('既定値オブジェクトを書き換えない', () => {
    const before = [...DEFAULT_SETTINGS.leftStack];
    const s = mergeSettings({});
    s.leftStack.push('date');
    expect(DEFAULT_SETTINGS.leftStack).toEqual(before);
    expect(s.leftStack).not.toBe(DEFAULT_SETTINGS.leftStack);
  });
});
