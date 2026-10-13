// アプリ全体: 起動画面、端末状態の監視による自動開始・終了、毎秒の更新ループ

import { DeviceMonitor, requestMotionPermission } from './device';
import { h, setText } from './dom';
import { shouldAutoExit, shouldAutoStart, type DeviceState } from './rules';
import { SettingsStore } from './settings';
import { openSettingsPanel } from './settingsPanel';
import type { PwaController } from './pwa';
import { Standby } from './standby';
import { formatDateLong, formatTime } from './time';

export class App {
  private store = new SettingsStore();
  private device = new DeviceMonitor();
  private standby: Standby;
  private launcher: HTMLElement;
  private status = {
    time: h('div', { class: 'launcher-time' }),
    date: h('div', { class: 'launcher-date' }),
    charging: h('span', { class: 'chip' }),
    orientation: h('span', { class: 'chip' }),
    auto: h('span', { class: 'chip' }),
    hint: h('p', { class: 'launcher-hint' }),
  };
  private pwaBox = h('div', { class: 'pwa-box' });
  private prevState: DeviceState | null = null;
  /** 手動で終了した後、条件を満たしたままでも再開しないためのフラグ */
  private suppressAuto = false;

  constructor(
    private root: HTMLElement,
    private pwa: PwaController,
  ) {
    this.standby = new Standby({
      store: this.store,
      device: this.device,
      openSettings: () => this.openSettings(),
      onExit: () => {
        this.suppressAuto = true;
        this.renderLauncher();
      },
    });
    const startButton = h('button', { class: 'primary-button', text: 'スタンバイを開始', attrs: { type: 'button' } });
    startButton.addEventListener('click', async () => {
      if (this.store.get().motionToWake) await requestMotionPermission();
      this.suppressAuto = false;
      this.standby.enter(true);
    });
    const settingsButton = h('button', { class: 'secondary-button', text: '設定', attrs: { type: 'button' } });
    settingsButton.addEventListener('click', () => this.openSettings());

    this.launcher = h('main', { class: 'launcher' }, [
      h('div', { class: 'launcher-clock' }, [this.status.time, this.status.date]),
      h('h1', { class: 'launcher-title', text: 'StandBy' }),
      h('div', { class: 'chips' }, [this.status.charging, this.status.orientation, this.status.auto]),
      this.status.hint,
      h('div', { class: 'launcher-actions' }, [startButton, settingsButton]),
      this.pwaBox,
      h('p', { class: 'launcher-tips' }, [
        '操作: 左右スワイプで「ウィジェット / 写真 / 時計」、上下スワイプで切り替え、長押しで編集。',
      ]),
    ]);
    this.root.append(this.launcher, this.standby.el);
  }

  async start(): Promise<void> {
    await this.device.init();
    this.device.subscribe(() => this.onDeviceChange());
    this.store.subscribe(() => this.onDeviceChange());
    this.pwa.subscribe(() => this.renderPwa());
    this.onDeviceChange();
    this.renderPwa();
    this.loop();
  }

  private openSettings(): void {
    openSettingsPanel(this.store, this.device.battery.supported);
  }

  private onDeviceChange(): void {
    const state = this.device.state();
    const settings = this.store.get();
    const prev = this.prevState;
    this.prevState = state;
    if (this.standby.active) {
      if (prev && shouldAutoExit(prev, state, settings)) this.standby.exit();
    } else if (prev && !prev.landscape && state.landscape) {
      // 横向きにし直したら手動終了の抑止を解除する
      this.suppressAuto = false;
    }
    if (prev && prev.charging !== state.charging) this.suppressAuto = false;
    if (!this.standby.active && !this.suppressAuto && shouldAutoStart(state, settings)) this.standby.enter(false);
    this.renderLauncher();
  }

  private renderLauncher(): void {
    const b = this.device.battery;
    const s = this.store.get();
    setText(
      this.status.charging,
      !b.supported ? '🔌 充電状態: 取得不可' : b.charging ? `⚡ 充電中 ${Math.round((b.level ?? 0) * 100)}%` : `🔋 未充電 ${Math.round((b.level ?? 0) * 100)}%`,
    );
    this.status.charging.classList.toggle('chip-on', b.supported && b.charging);
    setText(this.status.orientation, this.device.landscape ? '↔ 横向き' : '↕ 縦向き');
    this.status.orientation.classList.toggle('chip-on', this.device.landscape);
    setText(this.status.auto, s.autoStart ? '自動開始: オン' : '自動開始: オフ');
    this.status.auto.classList.toggle('chip-on', s.autoStart);
    const needCharging = s.requireCharging && b.supported;
    setText(
      this.status.hint,
      s.autoStart
        ? needCharging
          ? '充電しながら横向きに置くと、自動でスタンバイが始まります。'
          : '横向きに置くと、自動でスタンバイが始まります。'
        : '「スタンバイを開始」をタップすると表示します。',
    );
  }

  /** 更新のお知らせと、ホーム画面への追加の案内を描画する */
  private renderPwa(): void {
    const items: HTMLElement[] = [];
    if (this.pwa.updateReady) {
      const button = h('button', { class: 'pwa-button', text: '更新', attrs: { type: 'button' } });
      button.addEventListener('click', () => this.pwa.applyUpdate());
      items.push(h('div', { class: 'pwa-notice' }, [h('span', { text: '新しいバージョンがあります' }), button]));
    }
    const mode = this.pwa.installMode;
    if (mode === 'prompt') {
      const button = h('button', { class: 'pwa-button', text: 'ホーム画面に追加', attrs: { type: 'button' } });
      button.addEventListener('click', () => void this.pwa.install());
      items.push(
        h('div', { class: 'pwa-notice' }, [h('span', { text: 'アプリとして追加すると全画面・オフラインで使えます' }), button]),
      );
    } else if (mode === 'ios-manual') {
      items.push(
        h('p', {
          class: 'pwa-hint',
          text: '共有ボタン →「ホーム画面に追加」でアプリとして追加すると、全画面・オフラインで使えます。',
        }),
      );
    }
    this.pwaBox.replaceChildren(...items);
    this.pwaBox.hidden = items.length === 0;
  }

  private loop(): void {
    const tick = () => {
      const now = new Date();
      this.standby.tick(now);
      if (!this.standby.active) {
        const t = formatTime(now, this.store.get().hour12);
        setText(this.status.time, `${t.period}${t.hours}:${t.minutes}`);
        setText(this.status.date, formatDateLong(now));
      }
      // 秒の切り替わりに合わせて次の更新を予約する
      window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
  }
}
