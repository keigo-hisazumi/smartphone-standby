// 時計表示: 上下スワイプで文字盤を切り替え、長押しで色を変える

import { FACES, type ClockFace } from '../clock/faces';
import { h } from '../dom';
import { buttonRow, openSheet, section } from '../sheet';
import type { SettingsStore } from '../settings';
import type { StandbyView, ViewActions } from './types';

export function createClockView(store: SettingsStore, actions: ViewActions): StandbyView {
  const ctx = { settings: () => store.get() };
  const dots = h('div', { class: 'face-dots' }, FACES.map(() => h('span')));
  const holder = h('div', { class: 'face-holder' });
  const el = h('div', { class: 'view view-clock' }, [holder, dots]);
  let face: ClockFace | null = null;
  let faceId = '';
  let dotsTimer: number | undefined;

  const mount = () => {
    const s = store.get();
    if (faceId === s.clockFace && face) return;
    face?.destroy?.();
    const def = FACES.find((f) => f.id === s.clockFace) ?? FACES[0];
    faceId = def.id;
    face = def.create(ctx, s.clockColors[def.id]);
    holder.replaceChildren(face.el);
    Array.from(dots.children).forEach((d, i) => d.classList.toggle('on', FACES[i].id === def.id));
    face.update(new Date());
  };
  mount();
  store.subscribe((s, changed) => {
    if (changed.includes('clockFace')) mount();
    if (changed.includes('clockColors')) face?.setColor(s.clockColors[s.clockFace]);
  });

  return {
    el,
    update(now) {
      face?.update(now);
    },
    onVerticalSwipe(dir) {
      const i = FACES.findIndex((f) => f.id === store.get().clockFace);
      const next = FACES[(i + (dir === 'up' ? 1 : -1) + FACES.length) % FACES.length];
      store.set({ clockFace: next.id });
      dots.classList.add('show');
      window.clearTimeout(dotsTimer);
      dotsTimer = window.setTimeout(() => dots.classList.remove('show'), 1500);
    },
    onLongPress() {
      const def = FACES.find((f) => f.id === store.get().clockFace) ?? FACES[0];
      const sheet = openSheet(`${def.name} を編集`);
      const swatches = h('div', { class: 'swatches' });
      const render = () => {
        swatches.replaceChildren(
          ...def.colors.map((c) => {
            const b = h('button', { class: 'swatch', attrs: { type: 'button', 'aria-label': c } });
            b.style.background = c;
            b.classList.toggle('on', store.get().clockColors[def.id] === c);
            b.addEventListener('click', () => {
              store.set({ clockColors: { ...store.get().clockColors, [def.id]: c } });
              render();
            });
            return b;
          }),
        );
      };
      render();
      sheet.body.append(
        def.colors.length > 0
          ? section('色', [swatches])
          : section('色', [h('div', { class: 'row-note', text: 'この文字盤の色は太陽の位置に合わせて自動で変わります。' })]),
        section('文字盤', [h('div', { class: 'row-note', text: '上下にスワイプすると アナログ / デジタル / ワールド / ソーラー / フロート を切り替えられます。' })]),
        section('', [buttonRow('設定', () => (sheet.close(), actions.openSettings())), buttonRow('スタンバイを終了', () => (sheet.close(), actions.exit()), 'danger')]),
      );
    },
  };
}
