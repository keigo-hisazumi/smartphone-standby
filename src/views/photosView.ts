// 写真表示: 端末内に保存した写真をスライドショーし、時刻を重ねて表示する

import { h, setText } from '../dom';
import { addPhotos, clearPhotos, listPhotos } from '../photoStore';
import { buttonRow, openSheet, section, selectRow } from '../sheet';
import type { SettingsStore } from '../settings';
import { formatDateLong, formatTime } from '../time';
import type { StandbyView, ViewActions } from './types';

export function createPhotosView(store: SettingsStore, actions: ViewActions): StandbyView {
  const layers = [h('div', { class: 'photo-layer' }), h('div', { class: 'photo-layer' })];
  const time = h('div', { class: 'photo-time' });
  const date = h('div', { class: 'photo-date' });
  const empty = h('div', { class: 'photo-empty' }, [
    h('div', { class: 'photo-empty-title', text: '写真がありません' }),
    h('div', { text: '長押しして「写真を追加」から選んでください' }),
  ]);
  const el = h('div', { class: 'view view-photos' }, [
    ...layers,
    empty,
    h('div', { class: 'photo-overlay' }, [date, time]),
  ]);

  let urls: string[] = [];
  let index = 0;
  let front = 0;
  let lastSwitch = Date.now();
  let visible = false;

  const show = () => {
    empty.hidden = urls.length > 0;
    if (urls.length === 0) {
      layers.forEach((l) => l.classList.remove('on'));
      return;
    }
    const next = 1 - front;
    layers[next].style.backgroundImage = `url("${urls[index]}")`;
    // アニメーションをやり直すために一度クラスを外す
    layers[next].classList.remove('kenburns');
    void layers[next].offsetWidth;
    layers[next].classList.add('on', 'kenburns');
    layers[front].classList.remove('on');
    front = next;
    lastSwitch = Date.now();
  };

  const reload = async () => {
    urls.forEach((u) => URL.revokeObjectURL(u));
    const photos = await listPhotos();
    urls = photos.map((p) => URL.createObjectURL(p.blob));
    // 毎回同じ順にならないようにシャッフルする
    for (let i = urls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [urls[i], urls[j]] = [urls[j], urls[i]];
    }
    index = 0;
    show();
  };
  void reload();

  const step = (dir: 1 | -1) => {
    if (urls.length < 2) return;
    index = (index + dir + urls.length) % urls.length;
    show();
  };

  return {
    el,
    update(now) {
      const t = formatTime(now, store.get().hour12);
      setText(time, `${t.period}${t.hours}:${t.minutes}`);
      setText(date, formatDateLong(now));
      if (visible && Date.now() - lastSwitch > store.get().photoIntervalSec * 1000) step(1);
    },
    setVisible(v) {
      visible = v;
    },
    onVerticalSwipe(dir) {
      step(dir === 'up' ? 1 : -1);
    },
    onLongPress() {
      const sheet = openSheet('写真を編集');
      const input = h('input', { attrs: { type: 'file', accept: 'image/*', multiple: '' } });
      input.hidden = true;
      input.addEventListener('change', async () => {
        if (input.files) await addPhotos(Array.from(input.files));
        await reload();
        sheet.close();
      });
      sheet.body.append(
        input,
        section(`写真（${urls.length} 枚）`, [
          h('div', { class: 'row-note', text: '写真はこの端末のブラウザ内にだけ保存され、外部には送信されません。' }),
          buttonRow('写真を追加', () => input.click()),
          buttonRow(
            'すべての写真を削除',
            async () => {
              await clearPhotos();
              await reload();
              sheet.close();
            },
            'danger',
          ),
        ]),
        section('スライドショー', [
          selectRow(
            '切り替え間隔',
            store.get().photoIntervalSec,
            [
              { value: 10, label: '10 秒' },
              { value: 15, label: '15 秒' },
              { value: 30, label: '30 秒' },
              { value: 60, label: '1 分' },
              { value: 300, label: '5 分' },
            ],
            (v) => store.set({ photoIntervalSec: v }),
          ),
        ]),
        section('', [buttonRow('設定', () => (sheet.close(), actions.openSettings())), buttonRow('スタンバイを終了', () => (sheet.close(), actions.exit()), 'danger')]),
      );
    },
  };
}
