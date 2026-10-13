import './style.css';
import { App } from './app';
import { PwaController } from './pwa';

const pwa = new PwaController();
const root = document.querySelector<HTMLElement>('#app');
if (root) void new App(root, pwa).start();

// オフラインでも起動できるように Service Worker を登録する。
// PR プレビューでは本番の SW とキャッシュが混ざらないように登録しない。
if (import.meta.env.PROD && import.meta.env.VITE_APP_ENV !== 'preview') {
  window.addEventListener('load', () => pwa.register(`${import.meta.env.BASE_URL}sw.js`));
}
