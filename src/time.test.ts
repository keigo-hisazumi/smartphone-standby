import { describe, expect, it } from 'vitest';
import { describeZoneDiff, formatDateLong, formatTimeParts, handAngles, monthMatrix, parseHm, zonedParts, zoneOffsetMinutes } from './time';

describe('formatTimeParts', () => {
  it('24 時間表示では時をそのまま表示する', () => {
    expect(formatTimeParts(7, 5, 9, false)).toEqual({ hours: '7', minutes: '05', seconds: '09', period: '' });
    expect(formatTimeParts(23, 59, 0, false).hours).toBe('23');
  });

  it('12 時間表示では 0 時と 12 時を 12 にし、午前・午後を付ける', () => {
    expect(formatTimeParts(0, 0, 0, true)).toMatchObject({ hours: '12', period: '午前' });
    expect(formatTimeParts(12, 30, 0, true)).toMatchObject({ hours: '12', period: '午後' });
    expect(formatTimeParts(15, 1, 0, true)).toMatchObject({ hours: '3', minutes: '01', period: '午後' });
  });
});

describe('formatDateLong', () => {
  it('日本語の日付と曜日を返す', () => {
    expect(formatDateLong(new Date(2026, 9, 13))).toBe('10月13日 火曜日');
  });
});

describe('monthMatrix', () => {
  it('2026 年 10 月は木曜始まりで 5 週', () => {
    const m = monthMatrix(2026, 9);
    expect(m).toHaveLength(5);
    expect(m[0]).toEqual([null, null, null, null, 1, 2, 3]);
    expect(m[4][6]).toBe(31);
  });

  it('2026 年 2 月（28 日、日曜始まり）は 4 週', () => {
    const m = monthMatrix(2026, 1);
    expect(m).toHaveLength(4);
    expect(m[0][0]).toBe(1);
  });
});

describe('handAngles', () => {
  it('3:00 は時針 90 度、分針 0 度', () => {
    expect(handAngles(15, 0, 0)).toEqual({ hour: 90, minute: 0, second: 0 });
  });

  it('時針は分に応じて進む', () => {
    expect(handAngles(6, 30, 0).hour).toBeCloseTo(195);
    expect(handAngles(6, 30, 0).minute).toBeCloseTo(180);
  });
});

describe('parseHm', () => {
  it('HH:MM を分に変換し、不正な値は null', () => {
    expect(parseHm('22:00')).toBe(1320);
    expect(parseHm('6:05')).toBe(365);
    expect(parseHm('24:00')).toBeNull();
    expect(parseHm('abc')).toBeNull();
  });
});

describe('タイムゾーン', () => {
  const date = new Date(Date.UTC(2026, 0, 15, 20, 30, 0));

  it('指定タイムゾーンの時刻を返す', () => {
    expect(zonedParts(date, 'Asia/Tokyo')).toMatchObject({ day: 16, hour: 5, minute: 30 });
    expect(zonedParts(date, 'America/New_York')).toMatchObject({ day: 15, hour: 15 });
  });

  it('UTC からのオフセット（分）を返す', () => {
    expect(zoneOffsetMinutes(date, 'Asia/Tokyo')).toBe(540);
    expect(zoneOffsetMinutes(date, 'Asia/Kolkata')).toBe(330);
    expect(zoneOffsetMinutes(date, 'America/New_York')).toBe(-300);
  });

  it('時差の表示は端末のタイムゾーン基準', () => {
    // 端末のタイムゾーンと同じなら「今日 +0時間」
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(describeZoneDiff(date, local)).toBe('今日 +0時間');
  });
});
