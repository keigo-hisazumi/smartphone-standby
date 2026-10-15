// スタンバイの起動条件・ナイトモード・スリープの判定ロジック（純粋関数）

import { parseHm } from './time';
import type { Settings } from './settings';

export interface DeviceState {
  landscape: boolean;
}

/** 横向きになったらスタンバイに入るかを判定する（充電状態は監視しない） */
export function shouldAutoStart(device: DeviceState, settings: Pick<Settings, 'autoStart'>): boolean {
  if (!settings.autoStart) return false;
  return device.landscape;
}

/** 表示中のスタンバイを終了すべきか。iOS と同じく縦向きにするとスタンバイを抜ける */
export function shouldAutoExit(prev: DeviceState, next: DeviceState): boolean {
  return prev.landscape && !next.landscape;
}

/** 指定時刻がナイトモードの時間帯か（日をまたぐ設定にも対応） */
export function isInNightWindow(now: Date, start: string, end: string): boolean {
  const s = parseHm(start);
  const e = parseHm(end);
  if (s === null || e === null || s === e) return false;
  const m = now.getHours() * 60 + now.getMinutes();
  return s < e ? m >= s && m < e : m >= s || m < e;
}

/**
 * ナイトモードを有効にするか。
 * 自動の場合、照度センサーの値（lux）があればそれを優先し、なければ時間帯で判定する。
 */
export function isNightActive(
  now: Date,
  settings: Pick<Settings, 'nightMode' | 'nightStart' | 'nightEnd'>,
  ambientLux: number | null,
): boolean {
  if (settings.nightMode === 'on') return true;
  if (settings.nightMode === 'off') return false;
  if (ambientLux !== null) return ambientLux < 5;
  return isInNightWindow(now, settings.nightStart, settings.nightEnd);
}

/** 自動スリープ（画面消灯）を行うべき状況か */
export function sleepEnabled(settings: Pick<Settings, 'sleepAfterSec' | 'sleepOnlyAtNight'>, night: boolean): boolean {
  if (settings.sleepAfterSec <= 0) return false;
  return settings.sleepOnlyAtNight ? night : true;
}

/** 焼き付き防止用の表示オフセット（分ごとに円を描くように最大 radius px ずらす） */
export function burnInOffset(now: Date, radius = 4): { x: number; y: number } {
  const step = (now.getHours() * 60 + now.getMinutes()) % 12;
  const angle = (step / 12) * Math.PI * 2;
  return { x: Math.round(Math.cos(angle) * radius), y: Math.round(Math.sin(angle) * radius) };
}
