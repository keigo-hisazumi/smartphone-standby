// 設定の定義と永続化（localStorage）

export type ViewId = 'widgets' | 'photos' | 'clock';
export type ClockFaceId = 'analog' | 'digital' | 'world' | 'solar' | 'float';
export type WidgetId = 'analog-clock' | 'digital-clock' | 'calendar' | 'date' | 'world-clock' | 'battery' | 'weather';
export type NightMode = 'auto' | 'on' | 'off';

export interface Settings {
  /** 充電中かつ横向きになったら自動でスタンバイを開始する */
  autoStart: boolean;
  /** 自動開始・自動終了の条件に充電状態を含める（取得できない端末では無視） */
  requireCharging: boolean;
  /** Screen Wake Lock で画面を点灯したままにする（常時表示） */
  keepAwake: boolean;
  /** 操作がない時に画面を消す秒数。0 なら消さない */
  sleepAfterSec: number;
  /** 画面を消すのをナイトモード中だけにする */
  sleepOnlyAtNight: boolean;
  /** ナイトモード（暗所で赤一色の表示にする） */
  nightMode: NightMode;
  nightStart: string;
  nightEnd: string;
  /** 端末の動きで画面を復帰する */
  motionToWake: boolean;
  /** 焼き付き防止のため表示位置を少しずつずらす */
  burnInProtection: boolean;
  hour12: boolean;
  /** スマートスタックを一定時間ごとに自動で切り替える */
  smartRotate: boolean;
  /** 天気ウィジェットで位置情報と Open-Meteo を使う */
  weatherEnabled: boolean;
  /** 写真の切り替え間隔（秒） */
  photoIntervalSec: number;
  view: ViewId;
  clockFace: ClockFaceId;
  clockColors: Record<ClockFaceId, string>;
  leftStack: WidgetId[];
  rightStack: WidgetId[];
  worldCities: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  autoStart: true,
  requireCharging: true,
  keepAwake: true,
  sleepAfterSec: 0,
  sleepOnlyAtNight: false,
  nightMode: 'auto',
  nightStart: '22:00',
  nightEnd: '06:00',
  motionToWake: true,
  burnInProtection: true,
  hour12: false,
  smartRotate: true,
  weatherEnabled: false,
  photoIntervalSec: 15,
  view: 'clock',
  clockFace: 'analog',
  clockColors: {
    analog: '#ff9f0a',
    digital: '#ff453a',
    world: '#ffd60a',
    solar: '#ffffff',
    float: '#64d2ff',
  },
  leftStack: ['analog-clock', 'world-clock', 'digital-clock', 'battery'],
  rightStack: ['calendar', 'date', 'weather'],
  worldCities: ['America/New_York', 'Europe/London', 'Asia/Tokyo'],
};

const STORAGE_KEY = 'smartphone-standby:settings';

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * 保存済みの値を既定値にマージする。
 * 型が既定値と異なる項目や未知の項目は捨てて、古いバージョンの保存データでも壊れないようにする。
 */
export function mergeSettings(saved: unknown): Settings {
  const result: Settings = structuredClone(DEFAULT_SETTINGS);
  if (!isObject(saved)) return result;
  const target = result as unknown as Record<string, unknown>;
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    const value = saved[key];
    if (value === undefined) continue;
    if (Array.isArray(def)) {
      if (Array.isArray(value) && value.every((v) => typeof v === 'string')) target[key] = [...value];
    } else if (isObject(def)) {
      if (isObject(value)) {
        const merged = { ...def };
        for (const k of Object.keys(def)) {
          if (typeof value[k] === typeof def[k]) merged[k] = value[k];
        }
        target[key] = merged;
      }
    } else if (typeof value === typeof def) {
      target[key] = value;
    }
  }
  return result;
}

type Listener = (settings: Settings, changed: (keyof Settings)[]) => void;

export class SettingsStore {
  private value: Settings;
  private listeners = new Set<Listener>();

  constructor() {
    let saved: unknown = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {
      // 保存データが壊れている・ストレージが使えない場合は既定値で動かす
    }
    this.value = mergeSettings(saved);
  }

  get(): Settings {
    return this.value;
  }

  set(patch: Partial<Settings>): void {
    const changed = (Object.keys(patch) as (keyof Settings)[]).filter(
      (k) => JSON.stringify(patch[k]) !== JSON.stringify(this.value[k]),
    );
    if (changed.length === 0) return;
    this.value = { ...this.value, ...patch };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.value));
    } catch {
      // 保存できなくても表示は続ける
    }
    for (const l of this.listeners) l(this.value, changed);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
