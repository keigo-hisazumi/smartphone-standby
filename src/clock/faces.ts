// 全画面の時計表示（iOS 17 のスタンバイと同じ 5 種類の文字盤）

import { createAnalogClock } from '../analogClock';
import { h, setText, type Component } from '../dom';
import { approxLocation } from '../location';
import { elevationFrom, sunElevation, sunInfo } from '../solar';
import { formatDateLong, formatDateShort, formatTime } from '../time';
import { landDots, MAP_LAT_BOTTOM, MAP_LAT_TOP } from '../worldMap';
import type { ClockFaceId, Settings } from '../settings';

export interface ClockFace extends Component {
  setColor(color: string): void;
}

export interface FaceContext {
  settings: () => Settings;
}

export interface FaceDefinition {
  id: ClockFaceId;
  name: string;
  /** 長押しの編集で選べる色。空なら色の変更なし */
  colors: string[];
  create(ctx: FaceContext, color: string): ClockFace;
}

export const ACCENT_COLORS = ['#ff453a', '#ff9f0a', '#ffd60a', '#30d158', '#64d2ff', '#0a84ff', '#bf5af2', '#ff375f', '#ffffff'];

/** アナログ: 数字入りの大きな文字盤。秒針の色を変えられる */
function analogFace(_ctx: FaceContext, color: string): ClockFace {
  const clock = createAnalogClock({ numerals: true, face: false, accent: color });
  const el = h('div', { class: 'face face-analog' }, [clock.el]);
  return {
    el,
    update(now) {
      clock.set(now.getHours(), now.getMinutes(), now.getSeconds());
    },
    setColor: clock.setAccent,
  };
}

/** デジタル: 画面いっぱいの数字と日付 */
function digitalFace(ctx: FaceContext, color: string): ClockFace {
  const date = h('div', { class: 'face-digital-date' });
  const time = h('div', { class: 'face-digital-time' });
  const period = h('span', { class: 'face-digital-period' });
  const el = h('div', { class: 'face face-digital' }, [date, h('div', { class: 'face-digital-row' }, [time, period])]);
  const setColor = (c: string) => {
    el.style.setProperty('--accent', c);
  };
  setColor(color);
  return {
    el,
    update(now) {
      const t = formatTime(now, ctx.settings().hour12);
      setText(time, `${t.hours}:${t.minutes}`);
      setText(period, t.period);
      setText(date, formatDateLong(now));
    },
    setColor,
  };
}

/** フロート: 丸みのある大きな数字がふわふわ動く */
function floatFace(ctx: FaceContext, color: string): ClockFace {
  const digits = Array.from({ length: 4 }, (_, i) => h('span', { class: `float-digit float-digit-${i}` }));
  const el = h('div', { class: 'face face-float' }, [
    h('div', { class: 'float-group' }, [digits[0], digits[1]]),
    h('div', { class: 'float-group' }, [digits[2], digits[3]]),
  ]);
  const setColor = (c: string) => el.style.setProperty('--accent', c);
  setColor(color);
  return {
    el,
    update(now) {
      const t = formatTime(now, ctx.settings().hour12);
      const hh = t.hours.padStart(2, ' ');
      const text = hh + t.minutes;
      digits.forEach((d, i) => {
        setText(d, text[i].trim());
        d.classList.toggle('float-digit-empty', text[i] === ' ');
      });
    },
    setColor,
  };
}

/** ソーラー: 太陽の高さに合わせて背景のグラデーションが変わる */
function solarFace(ctx: FaceContext, color: string): ClockFace {
  const loc = approxLocation();
  const sun = h('div', { class: 'solar-sun' });
  const time = h('div', { class: 'face-solar-time' });
  const date = h('div', { class: 'face-solar-date' });
  const el = h('div', { class: 'face face-solar' }, [sun, h('div', { class: 'face-solar-text' }, [date, time])]);
  const setColor = (c: string) => el.style.setProperty('--accent', c);
  setColor(color);
  let lastMinute = -1;
  return {
    el,
    update(now) {
      const t = formatTime(now, ctx.settings().hour12);
      setText(time, `${t.hours}:${t.minutes}`);
      setText(date, formatDateLong(now));
      if (now.getMinutes() === lastMinute) return;
      lastMinute = now.getMinutes();
      const elev = sunElevation(now, loc.lat, loc.lon);
      const { top, bottom, glow } = solarPalette(elev);
      el.style.setProperty('--sky-top', top);
      el.style.setProperty('--sky-bottom', bottom);
      el.style.setProperty('--sun-glow', glow);
      // 太陽の位置: 1 日の時刻で左右、太陽高度で上下
      const dayFrac = (now.getHours() * 60 + now.getMinutes()) / 1440;
      sun.style.left = `${dayFrac * 100}%`;
      sun.style.top = `${Math.max(5, Math.min(110, 70 - elev))}%`;
    },
    setColor,
  };
}

/** 太陽高度から空の色を決める */
export function solarPalette(elevation: number): { top: string; bottom: string; glow: string } {
  if (elevation < -12) return { top: '#000004', bottom: '#0b1030', glow: 'rgba(80,90,160,0.25)' };
  if (elevation < -4) return { top: '#05071a', bottom: '#3a2a6b', glow: 'rgba(255,120,120,0.35)' };
  if (elevation < 4) return { top: '#1b2a6b', bottom: '#ff7a45', glow: 'rgba(255,170,90,0.85)' };
  if (elevation < 20) return { top: '#2f6fd6', bottom: '#ffb36b', glow: 'rgba(255,220,140,0.9)' };
  return { top: '#1c7cf0', bottom: '#7cc8ff', glow: 'rgba(255,250,210,0.95)' };
}

/** ワールド: 昼夜の分かる点描の世界地図と現在地 */
function worldFace(ctx: FaceContext, color: string): ClockFace {
  const loc = approxLocation();
  const canvas = h('canvas', { class: 'world-canvas' });
  const time = h('div', { class: 'face-world-time' });
  const city = h('div', { class: 'face-world-city' });
  const el = h('div', { class: 'face face-world' }, [canvas, h('div', { class: 'face-world-text' }, [city, time])]);
  let accent = color;
  let lastKey = '';

  const draw = (now: Date) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const key = `${rect.width}x${rect.height}:${now.getHours()}:${now.getMinutes()}:${accent}`;
    if (key === lastKey) return;
    lastKey = key;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const g = canvas.getContext('2d');
    if (!g) return;
    g.scale(dpr, dpr);
    g.clearRect(0, 0, rect.width, rect.height);
    const cols = 96;
    const rows = Math.round((cols * (MAP_LAT_TOP - MAP_LAT_BOTTOM)) / 360);
    const cell = Math.min(rect.width / cols, rect.height / rows);
    const offX = (rect.width - cell * cols) / 2;
    const offY = (rect.height - cell * rows) / 2;
    const toXY = (lon: number, lat: number) => ({
      x: offX + ((lon + 180) / 360) * cols * cell,
      y: offY + ((MAP_LAT_TOP - lat) / (MAP_LAT_TOP - MAP_LAT_BOTTOM)) * rows * cell,
    });
    const sun = sunInfo(now);
    for (const d of landDots(cols, rows)) {
      const { x, y } = toXY(d.lon, d.lat);
      const day = elevationFrom(sun, d.lat, d.lon) > 0;
      g.fillStyle = day ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.22)';
      g.beginPath();
      g.arc(x, y, cell * 0.32, 0, Math.PI * 2);
      g.fill();
    }
    const p = toXY(loc.lon, loc.lat);
    g.fillStyle = accent;
    g.shadowColor = accent;
    g.shadowBlur = cell * 2;
    g.beginPath();
    g.arc(p.x, p.y, cell * 0.7, 0, Math.PI * 2);
    g.fill();
  };

  return {
    el,
    update(now) {
      const t = formatTime(now, ctx.settings().hour12);
      setText(time, `${t.period}${t.hours}:${t.minutes}`);
      setText(city, `${loc.city}  ${formatDateShort(now)}`);
      draw(now);
    },
    setColor(c) {
      accent = c;
      el.style.setProperty('--accent', c);
    },
  };
}

export const FACES: FaceDefinition[] = [
  { id: 'analog', name: 'アナログ', colors: ACCENT_COLORS, create: analogFace },
  { id: 'digital', name: 'デジタル', colors: ACCENT_COLORS, create: digitalFace },
  { id: 'world', name: 'ワールド', colors: ACCENT_COLORS, create: worldFace },
  { id: 'solar', name: 'ソーラー', colors: [], create: solarFace },
  { id: 'float', name: 'フロート', colors: ACCENT_COLORS, create: floatFace },
];
