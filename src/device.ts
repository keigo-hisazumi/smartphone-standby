// 端末の状態（充電・向き・照度・動き）の取得と、画面点灯・全画面などのブラウザ API のラッパー

import type { DeviceState } from './rules';

interface BatteryManager extends EventTarget {
  charging: boolean;
  level: number;
}

interface WakeLockSentinelLike extends EventTarget {
  release(): Promise<void>;
  released: boolean;
}

export interface BatteryInfo {
  supported: boolean;
  charging: boolean;
  /** 0〜1。取得できない場合は null */
  level: number | null;
}

type Listener<T> = (value: T) => void;

/** 充電状態と画面の向きを監視する */
export class DeviceMonitor {
  battery: BatteryInfo = { supported: false, charging: false, level: null };
  landscape = false;
  private listeners = new Set<Listener<DeviceMonitor>>();
  private mql = window.matchMedia('(orientation: landscape)');

  async init(): Promise<void> {
    this.landscape = this.mql.matches;
    this.mql.addEventListener('change', () => {
      this.landscape = this.mql.matches;
      this.emit();
    });
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManager> };
    if (typeof nav.getBattery === 'function') {
      try {
        const bm = await nav.getBattery();
        const read = () => {
          this.battery = { supported: true, charging: bm.charging, level: bm.level };
          this.emit();
        };
        bm.addEventListener('chargingchange', read);
        bm.addEventListener('levelchange', read);
        read();
      } catch {
        // 取得に失敗した場合は未対応として扱う
      }
    }
  }

  state(): DeviceState {
    return { batterySupported: this.battery.supported, charging: this.battery.charging, landscape: this.landscape };
  }

  subscribe(listener: Listener<DeviceMonitor>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const l of this.listeners) l(this);
  }
}

/** Screen Wake Lock を管理する。タブが裏に回ると解除されるので、表示に戻ったら取り直す */
export class WakeLockController {
  private sentinel: WakeLockSentinelLike | null = null;
  private wanted = false;

  constructor() {
    document.addEventListener('visibilitychange', () => {
      if (this.wanted && document.visibilityState === 'visible') void this.acquire();
    });
  }

  get supported(): boolean {
    return 'wakeLock' in navigator;
  }

  get active(): boolean {
    return this.sentinel !== null && !this.sentinel.released;
  }

  async enable(): Promise<void> {
    this.wanted = true;
    await this.acquire();
  }

  async disable(): Promise<void> {
    this.wanted = false;
    const s = this.sentinel;
    this.sentinel = null;
    if (s && !s.released) await s.release().catch(() => undefined);
  }

  private async acquire(): Promise<void> {
    if (!this.supported || this.active) return;
    try {
      const wl = (navigator as Navigator & { wakeLock: { request(type: 'screen'): Promise<WakeLockSentinelLike> } })
        .wakeLock;
      this.sentinel = await wl.request('screen');
    } catch {
      // 省電力モードなどで拒否されることがある
    }
  }
}

/** 全画面表示と横向き固定（対応ブラウザのみ）。ユーザー操作の中から呼ぶ必要がある */
export async function enterFullscreen(): Promise<void> {
  const el = document.documentElement;
  if (!document.fullscreenElement && typeof el.requestFullscreen === 'function') {
    try {
      await el.requestFullscreen({ navigationUI: 'hide' });
    } catch {
      return;
    }
  }
  const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
  if (orientation && typeof orientation.lock === 'function') {
    await orientation.lock('landscape').catch(() => undefined);
  }
}

export async function exitFullscreen(): Promise<void> {
  const orientation = screen.orientation as ScreenOrientation & { unlock?: () => void };
  try {
    orientation?.unlock?.();
  } catch {
    // 固定していない場合は何もしない
  }
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
}

/** 照度センサー（Generic Sensor API）。使えない端末では null を返し続ける */
export class AmbientLight {
  lux: number | null = null;

  start(onChange: () => void): void {
    const Ctor = (window as unknown as { AmbientLightSensor?: new (o: { frequency: number }) => EventTarget & { illuminance: number; start(): void } }).AmbientLightSensor;
    if (!Ctor) return;
    try {
      const sensor = new Ctor({ frequency: 0.5 });
      sensor.addEventListener('reading', () => {
        this.lux = sensor.illuminance;
        onChange();
      });
      sensor.addEventListener('error', () => {
        this.lux = null;
      });
      sensor.start();
    } catch {
      this.lux = null;
    }
  }
}

/**
 * iOS 13 以降の Safari では DeviceMotion の利用にユーザー操作中の許可が必要。
 * それ以外のブラウザではそのまま true を返す。
 */
export async function requestMotionPermission(): Promise<boolean> {
  const DME = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> } | undefined;
  if (!DME) return false;
  if (typeof DME.requestPermission !== 'function') return true;
  try {
    return (await DME.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

/** 端末が動かされたことを検知する（モーションで起動） */
export function watchMotion(onMove: () => void, threshold = 1.2): () => void {
  let last: { x: number; y: number; z: number } | null = null;
  const handler = (e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x === null || a.y === null || a.z === null) return;
    const cur = { x: a.x, y: a.y, z: a.z };
    if (last) {
      const delta = Math.abs(cur.x - last.x) + Math.abs(cur.y - last.y) + Math.abs(cur.z - last.z);
      if (delta > threshold) onMove();
    }
    last = cur;
  };
  window.addEventListener('devicemotion', handler);
  return () => window.removeEventListener('devicemotion', handler);
}
