import { describe, expect, it } from 'vitest';
import { installMode, type InstallEnv } from './pwa';

const base: InstallEnv = {
  standalone: false,
  hasPrompt: false,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36',
  platform: 'Linux armv8l',
  maxTouchPoints: 5,
};

describe('installMode', () => {
  it('ホーム画面から起動中ならインストール済み', () => {
    expect(installMode({ ...base, standalone: true, hasPrompt: true })).toBe('installed');
  });

  it('beforeinstallprompt を受け取っていればボタンでインストールできる', () => {
    expect(installMode({ ...base, hasPrompt: true })).toBe('prompt');
  });

  it('iPhone の Safari では共有メニューからの追加を案内する', () => {
    const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
    expect(installMode({ ...base, userAgent, platform: 'iPhone' })).toBe('ios-manual');
  });

  it('Mac と同じ UA の iPad もタッチ対応なら iOS として扱う', () => {
    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15';
    expect(installMode({ ...base, userAgent, platform: 'MacIntel', maxTouchPoints: 5 })).toBe('ios-manual');
    expect(installMode({ ...base, userAgent, platform: 'MacIntel', maxTouchPoints: 0 })).toBe('none');
  });

  it('案内できる手段がなければ none', () => {
    expect(installMode(base)).toBe('none');
  });
});
