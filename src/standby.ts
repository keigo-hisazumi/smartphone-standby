// スタンバイ画面本体: ウィジェット画面の表示、ナイトモード、自動スリープ、焼き付き防止を管理する

import {
  AmbientLight,
  DeviceMonitor,
  enterFullscreen,
  exitFullscreen,
  requestMotionPermission,
  WakeLockController,
  watchMotion,
} from './device';
import { h } from './dom';
import { attachGestures } from './gestures';
import { burnInOffset, isNightActive, sleepEnabled } from './rules';
import type { SettingsStore } from './settings';
import type { StandbyView } from './views/types';
import { createWidgetsView } from './views/widgetsView';
import { WeatherService } from './weather';

export interface StandbyOptions {
  store: SettingsStore;
  device: DeviceMonitor;
  openSettings(): void;
  /** ユーザー操作でスタンバイを終了した */
  onExit(): void;
}

export class Standby {
  readonly el: HTMLElement;
  active = false;
  private content: HTMLElement;
  private view: StandbyView;
  private sleepOverlay: HTMLElement;
  private wakeLock = new WakeLockController();
  private ambient = new AmbientLight();
  private lastActivity = Date.now();
  private asleep = false;
  private stopMotion: (() => void) | null = null;

  constructor(private opts: StandbyOptions) {
    const { store, device } = opts;
    const actions = { openSettings: () => opts.openSettings(), exit: () => this.userExit() };
    const weather = new WeatherService();
    this.view = createWidgetsView({ settings: () => store.get(), device, weather }, store, actions);
    this.content = h('div', { class: 'standby-content' }, [this.view.el]);
    this.sleepOverlay = h('div', { class: 'sleep-overlay' });
    this.el = h('div', { class: 'standby', attrs: { 'aria-hidden': 'true' } }, [this.content, this.sleepOverlay]);

    attachGestures(this.content, {
      onActivity: () => this.activity(),
      // 自動開始時は全画面にできないので、最初のタップで全画面にする。
      // iOS Safari のモーションの許可もユーザー操作中にしか求められないため、ここで求める
      onTap: () => {
        if (store.get().motionToWake) void requestMotionPermission();
        if (!document.fullscreenElement) void enterFullscreen();
      },
      onLongPress: () => this.view.onLongPress(),
      onSwipe: (dir, x) => {
        // 画面は 1 つだけなので左右スワイプは無視する
        if (dir === 'up' || dir === 'down') this.view.onVerticalSwipe(dir, x);
      },
    });
    // 消灯中はタップで復帰する（操作として扱わない）
    this.sleepOverlay.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.wake();
    });
    this.ambient.start(() => this.applyNight(new Date()));
    store.subscribe((_s, changed) => {
      if (!this.active) return;
      if (changed.includes('keepAwake')) void this.syncWakeLock();
      if (changed.includes('motionToWake')) this.syncMotion();
      this.tick(new Date());
    });
  }

  /** スタンバイを開始する */
  enter(): void {
    if (this.active) return;
    this.active = true;
    this.el.classList.add('active');
    this.el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('standby-on');
    this.lastActivity = Date.now();
    this.asleep = false;
    this.sleepOverlay.classList.remove('on');
    void this.syncWakeLock();
    this.syncMotion();
    this.view.setVisible?.(true);
    this.tick(new Date());
  }

  exit(): void {
    if (!this.active) return;
    this.active = false;
    this.el.classList.remove('active');
    this.el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('standby-on');
    void this.wakeLock.disable();
    this.stopMotion?.();
    this.stopMotion = null;
    void exitFullscreen();
    this.view.setVisible?.(false);
  }

  /** 毎秒呼ばれる */
  tick(now: Date): void {
    if (!this.active) return;
    this.view.update(now);
    const night = this.applyNight(now);
    const s = this.opts.store.get();
    if (!this.asleep && sleepEnabled(s, night) && Date.now() - this.lastActivity > s.sleepAfterSec * 1000) {
      this.asleep = true;
      this.sleepOverlay.classList.add('on');
    }
    const offset = s.burnInProtection ? burnInOffset(now) : { x: 0, y: 0 };
    this.el.style.setProperty('--shift-x', `${offset.x}px`);
    this.el.style.setProperty('--shift-y', `${offset.y}px`);
  }

  private userExit(): void {
    this.exit();
    this.opts.onExit();
  }

  private applyNight(now: Date): boolean {
    const night = isNightActive(now, this.opts.store.get(), this.ambient.lux);
    this.el.classList.toggle('night', night);
    return night;
  }

  private activity(): void {
    this.lastActivity = Date.now();
  }

  private wake(): void {
    this.lastActivity = Date.now();
    if (!this.asleep) return;
    this.asleep = false;
    this.sleepOverlay.classList.remove('on');
  }

  private async syncWakeLock(): Promise<void> {
    if (this.active && this.opts.store.get().keepAwake) await this.wakeLock.enable();
    else await this.wakeLock.disable();
  }

  private syncMotion(): void {
    this.stopMotion?.();
    this.stopMotion = null;
    if (this.active && this.opts.store.get().motionToWake) this.stopMotion = watchMotion(() => this.wake());
  }
}
