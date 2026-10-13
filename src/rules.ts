// スタンバイの起動条件・ナイトモード・スリープの判定ロジック（純粋関数）

import { parseHm } from './time';
import type { Settings } from './settings';

export interface DeviceState {
  /** Battery Status API が使えるか */
  batterySupported: boolean;
  charging: boolean;
  landscape: boolean;
}

/**
 * iOS と同じく「充電中」かつ「横向き」でスタンバイに入るかを判定する。
 * 充電状態を取得できない端末（iOS Safari など）では横向きだけを条件にする。
 */
export function shouldAutoStart(device: DeviceState, settings: Pick<Settings, 'autoStart' | 'requireCharging'>): boolean {
  if (!settings.autoStart) return false;
  if (!device.landscape) return false;
  if (settings.requireCharging && device.batterySupported && !device.charging) return false;
  return true;
}

/**
 * 表示中のスタンバイを終了すべきか。
 * iOS は縦向きにする・充電をやめるとスタンバイを抜ける。
 * 充電状態での終了は、充電を条件に開始した場合だけ行う（手動開始なら充電なしでも続ける）。
 */
export function shouldAutoExit(
  prev: DeviceState,
  next: DeviceState,
  settings: Pick<Settings, 'requireCharging'>,
): boolean {
  if (prev.landscape && !next.landscape) return true;
  if (settings.requireCharging && next.batterySupported && prev.charging && !next.charging) return true;
  return false;
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
