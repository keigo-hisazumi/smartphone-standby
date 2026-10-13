// アナログ時計ウィジェットの SVG 部品

import { s } from './dom';
import { handAngles } from './time';

export interface AnalogClockOptions {
  /** 1〜12 の数字を表示する */
  numerals: boolean;
  /** 文字盤の背景を描く */
  face: boolean;
  accent: string;
}

export interface AnalogClock {
  el: SVGSVGElement;
  set(hour: number, minute: number, second: number): void;
  setAccent(color: string): void;
}

export function createAnalogClock(opts: AnalogClockOptions): AnalogClock {
  const svg = s('svg', { viewBox: '-100 -100 200 200', class: 'analog-clock' });
  if (opts.face) svg.append(s('circle', { r: 98, class: 'ac-face' }));

  // 60 本の目盛り（5 分ごとは太く）
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    const angle = (i * 6 * Math.PI) / 180;
    const r1 = 92;
    const r2 = major ? 82 : 87;
    svg.append(
      s('line', {
        x1: Math.sin(angle) * r1,
        y1: -Math.cos(angle) * r1,
        x2: Math.sin(angle) * r2,
        y2: -Math.cos(angle) * r2,
        class: major ? 'ac-tick ac-tick-major' : 'ac-tick',
      }),
    );
  }
  if (opts.numerals) {
    for (let n = 1; n <= 12; n++) {
      const angle = (n * 30 * Math.PI) / 180;
      const t = s('text', { x: Math.sin(angle) * 64, y: -Math.cos(angle) * 64 + 7, class: 'ac-num' });
      t.textContent = String(n);
      svg.append(t);
    }
  }
  const hourHand = s('line', { x1: 0, y1: 8, x2: 0, y2: -48, class: 'ac-hour' });
  const minuteHand = s('line', { x1: 0, y1: 10, x2: 0, y2: -80, class: 'ac-minute' });
  const secondHand = s('line', { x1: 0, y1: 18, x2: 0, y2: -88, class: 'ac-second' });
  const capOuter = s('circle', { r: 5, class: 'ac-cap' });
  const capInner = s('circle', { r: 2, class: 'ac-cap-inner' });
  svg.append(hourHand, minuteHand, secondHand, capOuter, capInner);

  const setAccent = (color: string) => {
    secondHand.style.stroke = color;
    capOuter.style.fill = color;
  };
  setAccent(opts.accent);

  return {
    el: svg,
    set(hour, minute, second) {
      const a = handAngles(hour, minute, second);
      hourHand.setAttribute('transform', `rotate(${a.hour})`);
      minuteHand.setAttribute('transform', `rotate(${a.minute})`);
      secondHand.setAttribute('transform', `rotate(${a.second})`);
    },
    setAccent,
  };
}
