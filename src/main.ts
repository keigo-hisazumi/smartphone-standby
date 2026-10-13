import './style.css';
import { App } from './app';
import { PwaController } from './pwa';

// 写真画面の廃止に伴い、以前のバージョンで端末内に保存した写真（IndexedDB）を削除する
try {
  indexedDB.deleteDatabase('smartphone-standby');
} catch {
  // IndexedDB が使えない環境では何もしない
}

const pwa = new PwaController();
const root = document.querySelector<HTMLElement>('#app');
if (root) void new App(root, pwa).start();

// オフラインでも起動できるように Service Worker を登録する。
// PR プレビューでは本番の SW とキャッシュが混ざらないように登録しない。
if (import.meta.env.PROD && import.meta.env.VITE_APP_ENV !== 'preview') {
  window.addEventListener('load', () => pwa.register(`${import.meta.env.BASE_URL}sw.js`));
}
