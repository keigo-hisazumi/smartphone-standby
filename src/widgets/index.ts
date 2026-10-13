// スタンバイのウィジェット（スマートスタックに並べる部品）

import { createAnalogClock } from '../analogClock';
import { h, setText, type Component } from '../dom';
import type { DeviceMonitor } from '../device';
import { cityName } from '../location';
import type { Settings, WidgetId } from '../settings';
import { describeZoneDiff, formatDateLong, formatTime, formatTimeParts, monthMatrix, WEEKDAYS_JA, zonedParts } from '../time';
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

/** 世界時計: 登録した都市の時刻と時差 */
function worldClockWidget(ctx: WidgetContext): Component {
  const list = h('div', { class: 'ww-list' });
  const el = card('world-clock', [list]);
  let rows: { tz: string; time: HTMLElement; period: HTMLElement; diff: HTMLElement }[] = [];
  let citiesKey = '';
  return {
    el,
    update(now) {
      const cities = ctx.settings().worldCities;
      if (cities.join() !== citiesKey) {
        citiesKey = cities.join();
        rows = cities.map((tz) => ({
          tz,
          time: h('span', { class: 'ww-time' }),
          period: h('span', { class: 'ww-period' }),
          diff: h('div', { class: 'ww-diff' }),
        }));
        list.replaceChildren(
          ...rows.map((r) =>
            h('div', { class: 'ww-row' }, [
              h('div', { class: 'ww-left' }, [h('div', { class: 'ww-city', text: cityName(r.tz) }), r.diff]),
              h('div', { class: 'ww-right' }, [r.period, r.time]),
            ]),
          ),
        );
      }
      for (const r of rows) {
        try {
          const p = zonedParts(now, r.tz);
          const t = formatTimeParts(p.hour, p.minute, p.second, ctx.settings().hour12);
          setText(r.time, `${t.hours}:${t.minutes}`);
          setText(r.period, t.period);
          setText(r.diff, describeZoneDiff(now, r.tz));
        } catch {
          setText(r.time, '--:--');
        }
      }
    },
  };
}

/** バッテリー: 残量リングと充電中アイコン */
function batteryWidget(ctx: WidgetContext): Component {
  const R = 40;
  const C = 2 * Math.PI * R;
  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ring.setAttribute('viewBox', '0 0 100 100');
  ring.setAttribute('class', 'wb-ring');
  ring.innerHTML = `<circle cx="50" cy="50" r="${R}" class="wb-track"/><circle cx="50" cy="50" r="${R}" class="wb-bar" stroke-dasharray="${C}" stroke-dashoffset="${C}" transform="rotate(-90 50 50)"/>`;
  const bar = ring.querySelector('.wb-bar') as SVGCircleElement;
  const icon = h('div', { class: 'wb-icon' });
  const pct = h('div', { class: 'wb-pct' });
  const label = h('div', { class: 'wb-label' });
  const el = card('battery', [h('div', { class: 'wb-ring-wrap' }, [ring, icon]), pct, label]);
  return {
    el,
    update() {
      const b = ctx.device.battery;
      if (!b.supported || b.level === null) {
        setText(pct, '--');
        setText(label, 'この端末では取得できません');
        setText(icon, '📱');
        bar.setAttribute('stroke-dashoffset', String(C));
        return;
      }
      const level = Math.round(b.level * 100);
      setText(pct, `${level}%`);
      setText(label, b.charging ? '充電中' : 'バッテリー');
      setText(icon, b.charging ? '⚡' : '📱');
      bar.setAttribute('stroke-dashoffset', String(C * (1 - b.level)));
      bar.classList.toggle('wb-low', level <= 20 && !b.charging);
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
  'world-clock': { id: 'world-clock', name: '世界時計', create: worldClockWidget },
  battery: { id: 'battery', name: 'バッテリー', create: batteryWidget },
  weather: { id: 'weather', name: '天気', create: weatherWidget },
};
