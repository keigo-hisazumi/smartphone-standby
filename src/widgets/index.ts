// スタンバイのウィジェット（スマートスタックに並べる部品）

import { createAnalogClock } from '../analogClock';
import { isJapaneseHoliday } from '../holidays';
import { h, setText, type Component } from '../dom';
import type { DeviceMonitor } from '../device';
import type { Settings, WidgetId } from '../settings';
import { addMonths, formatDateLong, formatTime, monthMatrix, WEEKDAYS_JA } from '../time';
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

/**
 * カレンダー（月表示）: 今月から offset か月後の月を表示し、今日を赤丸で強調する
 * （今日が含まれない月では強調しない）。土曜日は水色、日曜日と祝日は赤色で表示する。
 * 設定に応じて日曜始まり・月曜始まりを切り替える
 */
function calendarWidget(ctx: WidgetContext, offset: number): Component {
  const title = h('div', { class: 'wc-title' });
  const grid = h('div', { class: 'wc-grid' });
  const el = card('calendar', [title, grid]);
  let rendered = '';
  return {
    el,
    update(now) {
      const weekStart = ctx.settings().weekStartsOnMonday ? 1 : 0;
      const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${weekStart}`;
      if (key === rendered) return;
      rendered = key;
      const { year, month } = addMonths(now.getFullYear(), now.getMonth(), offset);
      const today = offset === 0 ? now.getDate() : null;
      // 年をまたぐ月は年も表示して今年の月と区別できるようにする
      title.textContent = year === now.getFullYear() ? `${month + 1}月` : `${year}年${month + 1}月`;
      // 列番号 col の曜日（0: 日曜 〜 6: 土曜）
      const weekdayOf = (col: number) => (col + weekStart) % 7;
      const weekdayClass = (wd: number) => (wd === 0 ? ' wc-sun' : wd === 6 ? ' wc-sat' : '');
      grid.replaceChildren(
        ...WEEKDAYS_JA.map((_, col) => {
          const wd = weekdayOf(col);
          return h('span', { class: `wc-head${weekdayClass(wd)}`, text: WEEKDAYS_JA[wd] });
        }),
      );
      for (const week of monthMatrix(year, month, weekStart)) {
        week.forEach((d, col) => {
          const wd = weekdayOf(col);
          const cls = ['wc-day'];
          if (d !== null && d === today) cls.push('wc-today');
          if (wd === 0) cls.push('wc-sun');
          else if (d !== null && isJapaneseHoliday(year, month, d)) cls.push('wc-holiday');
          else if (wd === 6) cls.push('wc-sat');
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
  calendar: { id: 'calendar', name: 'カレンダー（今月）', create: (ctx) => calendarWidget(ctx, 0) },
  'calendar-next': { id: 'calendar-next', name: 'カレンダー（来月）', create: (ctx) => calendarWidget(ctx, 1) },
  date: { id: 'date', name: '日付', create: dateWidget },
  weather: { id: 'weather', name: '天気', create: weatherWidget },
};
