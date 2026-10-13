import './style.css';
import { App } from './app';

const root = document.querySelector<HTMLElement>('#app');
if (root) void new App(root).start();

// オフラインでも起動できるように Service Worker を登録する。
// PR プレビューでは本番の SW とキャッシュが混ざらないように登録しない。
if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.VITE_APP_ENV !== 'preview') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
  });
}
