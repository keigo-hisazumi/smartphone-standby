// スタンバイ画面本体: 3 画面の切り替え、ナイトモード、自動スリープ、焼き付き防止を管理する

import { AmbientLight, DeviceMonitor, enterFullscreen, exitFullscreen, WakeLockController, watchMotion } from './device';
import { h } from './dom';
import { attachGestures } from './gestures';
import { burnInOffset, isNightActive, sleepEnabled } from './rules';
import type { SettingsStore, ViewId } from './settings';
import { createClockView } from './views/clockView';
import { createPhotosView } from './views/photosView';
import type { StandbyView } from './views/types';
import { createWidgetsView } from './views/widgetsView';
import { WeatherService } from './weather';

const VIEW_ORDER: ViewId[] = ['widgets', 'photos', 'clock'];

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
  private pages: HTMLElement;
  private content: HTMLElement;
  private views: Record<ViewId, StandbyView>;
  private sleepOverlay: HTMLElement;
  private rotateHint: HTMLElement;
  private viewDots: HTMLElement;
  private wakeLock = new WakeLockController();
  private ambient = new AmbientLight();
  private lastActivity = Date.now();
  private asleep = false;
  private stopMotion: (() => void) | null = null;
  private dotsTimer: number | undefined;

  constructor(private opts: StandbyOptions) {
    const { store, device } = opts;
    const actions = { openSettings: () => opts.openSettings(), exit: () => this.userExit() };
    const weather = new WeatherService();
    this.views = {
      widgets: createWidgetsView({ settings: () => store.get(), device, weather }, store, actions),
      photos: createPhotosView(store, actions),
      clock: createClockView(store, actions),
    };
    this.pages = h(
      'div',
      { class: 'pages' },
      VIEW_ORDER.map((id) => h('div', { class: 'page' }, [this.views[id].el])),
    );
    this.viewDots = h('div', { class: 'view-dots' }, VIEW_ORDER.map(() => h('span')));
    this.content = h('div', { class: 'standby-content' }, [this.pages, this.viewDots]);
    this.sleepOverlay = h('div', { class: 'sleep-overlay' });
    this.rotateHint = h('div', { class: 'rotate-hint' }, [
      h('div', { class: 'rotate-hint-icon', text: '📱↻' }),
      h('div', { text: '横向きにしてください' }),
    ]);
    this.el = h('div', { class: 'standby', attrs: { 'aria-hidden': 'true' } }, [
      this.content,
      this.rotateHint,
      this.sleepOverlay,
    ]);

    attachGestures(this.pages, {
      onActivity: () => this.activity(),
      // 自動開始時は全画面にできないので、最初のタップで全画面にする
      onTap: () => {
        if (!document.fullscreenElement) void enterFullscreen();
      },
      onLongPress: () => this.currentView().onLongPress(),
      onSwipe: (dir, x) => {
        if (dir === 'left') this.go(1);
        else if (dir === 'right') this.go(-1);
        else this.currentView().onVerticalSwipe(dir, x);
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
      if (changed.includes('view')) this.layout();
      this.tick(new Date());
    });
    this.layout();
  }

  /** スタンバイを開始する。fromGesture はユーザー操作から呼ばれたか（全画面化に必要） */
  enter(fromGesture: boolean): void {
    if (fromGesture) void enterFullscreen();
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
    this.layout();
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
    for (const id of VIEW_ORDER) this.views[id].setVisible?.(false);
  }

  /** 毎秒呼ばれる */
  tick(now: Date): void {
    if (!this.active) return;
    const view = this.opts.store.get().view;
    this.views[view].update(now);
    const night = this.applyNight(now);
    const s = this.opts.store.get();
    if (!this.asleep && sleepEnabled(s, night) && Date.now() - this.lastActivity > s.sleepAfterSec * 1000) {
      this.asleep = true;
      this.sleepOverlay.classList.add('on');
    }
    const offset = s.burnInProtection ? burnInOffset(now) : { x: 0, y: 0 };
    this.el.style.setProperty('--shift-x', `${offset.x}px`);
    this.el.style.setProperty('--shift-y', `${offset.y}px`);
    this.rotateHint.classList.toggle('on', !this.opts.device.landscape);
  }

  private userExit(): void {
    this.exit();
    this.opts.onExit();
  }

  private currentView(): StandbyView {
    return this.views[this.opts.store.get().view];
  }

  private go(delta: number): void {
    const i = VIEW_ORDER.indexOf(this.opts.store.get().view);
    const next = Math.max(0, Math.min(VIEW_ORDER.length - 1, i + delta));
    if (next === i) return;
    this.opts.store.set({ view: VIEW_ORDER[next] });
    this.viewDots.classList.add('show');
    window.clearTimeout(this.dotsTimer);
    this.dotsTimer = window.setTimeout(() => this.viewDots.classList.remove('show'), 1500);
  }

  private layout(): void {
    const view = this.opts.store.get().view;
    const i = VIEW_ORDER.indexOf(view);
    this.pages.style.transform = `translateX(${-i * 100}vw)`;
    Array.from(this.viewDots.children).forEach((d, j) => d.classList.toggle('on', j === i));
    VIEW_ORDER.forEach((id) => this.views[id].setVisible?.(this.active && id === view));
    this.views[view].update(new Date());
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
