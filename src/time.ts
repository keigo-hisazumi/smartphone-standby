// 時刻・日付の整形と計算をまとめたユーティリティ（DOM に依存しない純粋関数）

export const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export interface TimeParts {
  /** 表示用の「時」（12 時間表示なら 1〜12） */
  hours: string;
  minutes: string;
  seconds: string;
  /** 12 時間表示時の「午前」「午後」。24 時間表示なら空文字 */
  period: string;
}

/**
 * 時・分・秒を表示用文字列に変換する。
 * iOS のスタンバイ同様、12 時間表示では時の先頭ゼロを付けない。
 */
export function formatTimeParts(hour: number, minute: number, second: number, hour12: boolean): TimeParts {
  if (hour12) {
    const h = hour % 12 === 0 ? 12 : hour % 12;
    return { hours: String(h), minutes: pad2(minute), seconds: pad2(second), period: hour < 12 ? '午前' : '午後' };
  }
  return { hours: String(hour), minutes: pad2(minute), seconds: pad2(second), period: '' };
}

export function formatTime(d: Date, hour12: boolean): TimeParts {
  return formatTimeParts(d.getHours(), d.getMinutes(), d.getSeconds(), hour12);
}

/** 例: 「10月13日 火曜日」 */
export function formatDateLong(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS_JA[d.getDay()]}曜日`;
}

/** 例: 「13 火」 */
export function formatDateShort(d: Date): string {
  return `${d.getDate()} ${WEEKDAYS_JA[d.getDay()]}`;
}

/**
 * カレンダー表示用の月の行列を返す（日曜始まり）。
 * 当月以外のマスは null。
 */
export function monthMatrix(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export interface HandAngles {
  hour: number;
  minute: number;
  second: number;
}

/** アナログ時計の針の角度（12 時方向を 0 度として時計回り） */
export function handAngles(hour: number, minute: number, second: number, ms = 0): HandAngles {
  const s = second + ms / 1000;
  const m = minute + s / 60;
  const h = (hour % 12) + m / 60;
  return { hour: h * 30, minute: m * 6, second: s * 6 };
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const zonedFormatters = new Map<string, Intl.DateTimeFormat>();

/** 指定タイムゾーンでの日時の各要素を取得する */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  let fmt = zonedFormatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    zonedFormatters.set(timeZone, fmt);
  }
  const parts: Record<string, number> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour % 24,
    minute: parts.minute,
    second: parts.second,
  };
}

/** 指定タイムゾーンの UTC からのオフセット（分） */
export function zoneOffsetMinutes(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const actual = Math.floor(date.getTime() / 1000) * 1000;
  return Math.round((asUtc - actual) / 60000);
}

/**
 * 端末のローカル時刻と比べた時差の表示（iOS の世界時計ウィジェット風）。
 * 例: 「今日 -13時間」「明日 +1時間」
 */
export function describeZoneDiff(date: Date, timeZone: string): string {
  const diffMin = zoneOffsetMinutes(date, timeZone) + date.getTimezoneOffset();
  const p = zonedParts(date, timeZone);
  const zoneDay = Date.UTC(p.year, p.month - 1, p.day);
  const localDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((zoneDay - localDay) / 86400000);
  const dayLabel = dayDiff === 0 ? '今日' : dayDiff > 0 ? '明日' : '昨日';
  const hours = diffMin / 60;
  const hoursLabel = Number.isInteger(hours) ? String(Math.abs(hours)) : Math.abs(hours).toFixed(1);
  const sign = diffMin > 0 ? '+' : diffMin < 0 ? '-' : '+';
  return `${dayLabel} ${sign}${hoursLabel}時間`;
}

/** "HH:MM" 形式を 0 時からの分に変換する。不正な値は null */
export function parseHm(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}
