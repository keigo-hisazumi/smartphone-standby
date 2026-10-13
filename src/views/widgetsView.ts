// ウィジェット表示: 左右 2 つのスマートスタック。上下スワイプでスタック内を切り替える

import { h, type Component } from '../dom';
import { buttonRow, openSheet, section, toggleRow } from '../sheet';
import { sortWidgets, WIDGET_ORDER, type SettingsStore, type WidgetId } from '../settings';
import { WIDGETS, type WidgetContext } from '../widgets';
import type { StandbyView, ViewActions } from './types';

/** スマートローテーションで次のウィジェットに切り替える間隔 */
const SMART_ROTATE_MS = 10 * 60 * 1000;

class SmartStack {
  el = h('div', { class: 'stack' });
  private track = h('div', { class: 'stack-track' });
  private dots = h('div', { class: 'stack-dots' });
  private items: Component[] = [];
  private ids: WidgetId[] = [];
  private index = 0;
  private dotsTimer: number | undefined;
  private lastChange = Date.now();

  /** initialId: 最初に表示するウィジェット（左右で同じ順番でも、最初は別のウィジェットを見せるため） */
  constructor(
    private ctx: WidgetContext,
    private initialId?: WidgetId,
  ) {
    this.el.append(this.track, this.dots);
  }

  setIds(ids: WidgetId[]): void {
    if (ids.join() === this.ids.join()) return;
    for (const item of this.items) item.destroy?.();
    // 並びが変わっても、表示中のウィジェットを表示し続ける
    const current = this.ids[this.index] ?? this.initialId;
    this.ids = [...ids];
    this.items = ids.map((id) => WIDGETS[id].create(this.ctx));
    this.track.replaceChildren(...this.items.map((i) => h('div', { class: 'stack-item' }, [i.el])));
    this.dots.replaceChildren(...this.items.map(() => h('span')));
    const kept = current ? ids.indexOf(current) : -1;
    this.index = kept >= 0 ? kept : Math.min(this.index, Math.max(0, this.items.length - 1));
    this.layout();
  }

  step(dir: 1 | -1, showDots = true): void {
    if (this.items.length < 2) return;
    this.index = (this.index + dir + this.items.length) % this.items.length;
    this.lastChange = Date.now();
    this.layout();
    this.update(new Date());
    if (showDots) {
      this.dots.classList.add('show');
      window.clearTimeout(this.dotsTimer);
      this.dotsTimer = window.setTimeout(() => this.dots.classList.remove('show'), 1500);
    }
  }

  maybeRotate(now: Date, enabled: boolean): void {
    if (enabled && now.getTime() - this.lastChange > SMART_ROTATE_MS) this.step(1, false);
  }

  update(now: Date): void {
    this.items[this.index]?.update(now);
  }

  private layout(): void {
    Array.from(this.track.children).forEach((c, i) => {
      (c as HTMLElement).style.transform = `translateY(${(i - this.index) * 110}%)`;
      c.classList.toggle('active', i === this.index);
    });
    Array.from(this.dots.children).forEach((d, i) => d.classList.toggle('on', i === this.index));
  }
}

export function createWidgetsView(ctx: WidgetContext, store: SettingsStore, actions: ViewActions): StandbyView {
  const left = new SmartStack(ctx);
  const right = new SmartStack(ctx, 'weather');
  const el = h('div', { class: 'view view-widgets' }, [left.el, right.el]);
  const sync = () => {
    left.setIds(store.get().leftStack);
    right.setIds(store.get().rightStack);
  };
  sync();
  store.subscribe((_s, changed) => {
    if (changed.includes('leftStack') || changed.includes('rightStack')) sync();
  });

  const stackEditor = (title: string, key: 'leftStack' | 'rightStack') =>
    section(
      title,
      WIDGET_ORDER.map((id) =>
        toggleRow(WIDGETS[id].name, store.get()[key].includes(id), (on) => {
          const rest = store.get()[key].filter((x) => x !== id);
          // 左右で同じ順番になるように、常に WIDGET_ORDER の順に並べる
          const next = sortWidgets(on ? [...rest, id] : rest);
          // 空のスタックにはしない
          if (next.length > 0) store.set({ [key]: next });
        }),
      ),
    );

  return {
    el,
    update(now) {
      const smart = store.get().smartRotate;
      left.maybeRotate(now, smart);
      right.maybeRotate(now, smart);
      left.update(now);
      right.update(now);
    },
    onVerticalSwipe(dir, x) {
      const stack = x < window.innerWidth / 2 ? left : right;
      stack.step(dir === 'up' ? 1 : -1);
    },
    onLongPress() {
      const sheet = openSheet('ウィジェットを編集');
      sheet.body.append(
        section('', [h('div', { class: 'row-note', text: '同じウィジェットを左右どちらのスタックにも、同じ順番で表示できます。' })]),
        stackEditor('左のスタック', 'leftStack'),
        stackEditor('右のスタック', 'rightStack'),
        section('スマートスタック', [
          toggleRow('スマートローテーション', store.get().smartRotate, (v) => store.set({ smartRotate: v }), '10 分ごとに次のウィジェットへ切り替えます'),
        ]),
        section('', [buttonRow('設定', () => (sheet.close(), actions.openSettings())), buttonRow('スタンバイを終了', () => (sheet.close(), actions.exit()), 'danger')]),
      );
    },
  };
}
