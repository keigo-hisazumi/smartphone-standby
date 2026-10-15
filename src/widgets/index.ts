// スタンバイのウィジェット（スマートスタックに並べる部品）

import { createAnalogClock } from '../analogClock';
import { h, setText, type Component } from '../dom';
import type { DeviceMonitor } from '../device';
import type { Settings, WidgetId } from '../settings';
import { formatDateLong, formatTime, monthMatrix, WEEKDAYS_JA } from '../time';
import { WeatherService, weatherLabel } from '../weather';

export interface WidgetContext {
  settings: () => Settings;
  device: DeviceMonitor;
  weather: WeatherService;
}

export interface WidgetDefinition {
  id: WidgetId;
  name: string;
  create(ctx: WidgetContext): Component;
}

function card(kind: string, children: (Node | string)[]): HTMLElement {
  return h('div', { class: `widget widget-${kind}` }, children);
}

/** 時計（アナログ）: 現在地の時刻 */
function analogClockWidget(): Component {
  const clock = createAnalogClock({ numerals: true, face: true, accent: '#ff9f0a' });
  const el = card('analog-clock', [clock.el]);
  return { el, update: (now) => clock.set(now.getHours(), now.getMinutes(), now.getSeconds()) };
}

/** 時計（デジタル） */
function digitalClockWidget(ctx: WidgetContext): Component {
  const time = h('div', { class: 'wd-time' });
  const sub = h('div', { class: 'wd-sub' });
  const el = card('digital-clock', [sub, time]);
  return {
    el,
    update(now) {
      const t = formatTime(now, ctx.settings().hour12);
      setText(time, `${t.hours}:${t.minutes}`);
      setText(sub, t.period ? `${t.period}・${formatDateLong(now)}` : formatDateLong(now));
    },
  };
}

/** カレンダー（月表示）: 今日を赤丸で強調 */
function calendarWidget(): Component {
  const title = h('div', { class: 'wc-title' });
  const grid = h('div', { class: 'wc-grid' });
  const el = card('calendar', [title, grid]);
  let rendered = '';
  return {
    el,
    update(now) {
      const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      if (key === rendered) return;
      rendered = key;
      title.textContent = `${now.getMonth() + 1}月`;
      grid.replaceChildren(
        ...WEEKDAYS_JA.map((w, i) => h('span', { class: `wc-head${i === 0 ? ' wc-sun' : ''}`, text: w })),
      );
      for (const week of monthMatrix(now.getFullYear(), now.getMonth())) {
        week.forEach((d, i) => {
          const cls = ['wc-day'];
          if (d === now.getDate()) cls.push('wc-today');
          if (i === 0) cls.push('wc-sun');
          grid.append(h('span', { class: cls.join(' '), text: d === null ? '' : String(d) }));
        });
      }
    },
  };
}

/** 日付: 曜日と大きな日付 */
function dateWidget(): Component {
  const weekday = h('div', { class: 'wdt-weekday' });
  const day = h('div', { class: 'wdt-day' });
  const month = h('div', { class: 'wdt-month' });
  const el = card('date', [weekday, day, month]);
  return {
    el,
    update(now) {
      setText(weekday, `${WEEKDAYS_JA[now.getDay()]}曜日`);
      setText(day, String(now.getDate()));
      setText(month, `${now.getFullYear()}年${now.getMonth() + 1}月`);
    },
  };
}

/** 天気: 位置情報 + Open-Meteo（設定で有効にした場合のみ通信する） */
function weatherWidget(ctx: WidgetContext): Component {
  const place = h('div', { class: 'ww2-place', text: '現在地' });
  const temp = h('div', { class: 'ww2-temp' });
  const cond = h('div', { class: 'ww2-cond' });
  const range = h('div', { class: 'ww2-range' });
  const el = card('weather', [place, temp, cond, range]);
  return {
    el,
    update(now) {
      if (!ctx.settings().weatherEnabled) {
        setText(temp, '--°');
        setText(cond, '天気はオフ');
        setText(range, '設定で有効にできます');
        return;
      }
      ctx.weather.refreshIfStale(now);
      const w = ctx.weather.data;
      if (ctx.weather.error) {
        setText(temp, '--°');
        setText(cond, '取得できません');
        setText(range, ctx.weather.error);
        return;
      }
      if (!w) {
        setText(temp, '--°');
        setText(cond, '読み込み中…');
        setText(range, '');
        return;
      }
      const l = weatherLabel(w.code);
      setText(temp, `${Math.round(w.temperature)}°`);
      setText(cond, `${l.icon} ${l.text}`);
      setText(range, `最高 ${Math.round(w.max)}°  最低 ${Math.round(w.min)}°`);
    },
  };
}

export const WIDGETS: Record<WidgetId, WidgetDefinition> = {
  'analog-clock': { id: 'analog-clock', name: '時計（アナログ）', create: analogClockWidget },
  'digital-clock': { id: 'digital-clock', name: '時計（デジタル）', create: digitalClockWidget },
  calendar: { id: 'calendar', name: 'カレンダー（月）', create: calendarWidget },
  date: { id: 'date', name: '日付', create: dateWidget },
  weather: { id: 'weather', name: '天気', create: weatherWidget },
};
