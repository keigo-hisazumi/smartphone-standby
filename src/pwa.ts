// PWA: Service Worker の登録と更新検知、ホーム画面への追加（インストール）の導線

/** Chromium 系ブラウザが発火する beforeinstallprompt イベント（標準の型定義にはない） */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** 長時間表示し続ける用途なので、定期的に新しいバージョンを確認する */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export type InstallMode =
  /** インストール済み（ホーム画面から起動中）なので案内しない */
  | 'installed'
  /** beforeinstallprompt を受け取っており、ボタンからインストールできる */
  | 'prompt'
  /** iOS / iPadOS の Safari など、共有メニューから手動で追加する必要がある */
  | 'ios-manual'
  /** 案内できる手段がない */
  | 'none';

export interface InstallEnv {
  standalone: boolean;
  hasPrompt: boolean;
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}

/** 実行環境からインストール導線の種類を決める */
export function installMode(env: InstallEnv): InstallMode {
  if (env.standalone) return 'installed';
  if (env.hasPrompt) return 'prompt';
  // iPadOS 13 以降は Mac と同じ UA になるため、タッチ対応かどうかで判別する
  const ios = /iPad|iPhone|iPod/.test(env.userAgent) || (env.platform === 'MacIntel' && env.maxTouchPoints > 1);
  return ios ? 'ios-manual' : 'none';
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  );
}

export class PwaController {
  /** 新しいバージョンの Service Worker が待機中 */
  updateReady = false;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private waiting: ServiceWorker | null = null;
  private listeners = new Set<() => void>();

  constructor() {
    window.addEventListener('beforeinstallprompt', (e) => {
      // ブラウザ既定のミニバーを出さず、起動画面のボタンから表示する
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.emit();
    });
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.emit();
    });
  }

  subscribe(fn: () => void): void {
    this.listeners.add(fn);
  }

  get installMode(): InstallMode {
    return installMode({
      standalone: isStandalone(),
      hasPrompt: this.deferredPrompt !== null,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints,
    });
  }

  /** ブラウザのインストールダイアログを表示する */
  async install(): Promise<void> {
    const prompt = this.deferredPrompt;
    if (!prompt) return;
    this.deferredPrompt = null;
    await prompt.prompt();
    await prompt.userChoice.catch(() => undefined);
    this.emit();
  }

  /** 待機中の新しい Service Worker を有効化し、切り替わったら再読み込みする */
  applyUpdate(): void {
    this.waiting?.postMessage({ type: 'SKIP_WAITING' });
  }

  /** Service Worker を登録し、更新を監視する */
  register(url: string): void {
    if (!('serviceWorker' in navigator)) return;
    const sw = navigator.serviceWorker;
    // 更新前から制御されていた場合だけ、新しい SW への切り替え時に再読み込みする（初回インストール時は不要）
    const hadController = sw.controller !== null;
    let reloading = false;
    sw.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    });

    sw.register(url)
      .then((reg) => {
        if (reg.waiting && sw.controller) this.setWaiting(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const next = reg.installing;
          next?.addEventListener('statechange', () => {
            if (next.state === 'installed' && sw.controller) this.setWaiting(next);
          });
        });
        const check = () => void reg.update().catch(() => undefined);
        window.setInterval(check, UPDATE_CHECK_INTERVAL_MS);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check();
        });
      })
      .catch(() => undefined);
  }

  private setWaiting(worker: ServiceWorker): void {
    this.waiting = worker;
    this.updateReady = true;
    this.emit();
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }
}
