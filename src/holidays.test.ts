import { describe, expect, it } from 'vitest';
import { isJapaneseHoliday } from './holidays';

/** year 年 month 月（1 始まり）の祝日の日付一覧 */
function holidaysOf(year: number, month: number): number[] {
  const days = new Date(year, month, 0).getDate();
  const result: number[] = [];
  for (let d = 1; d <= days; d++) if (isJapaneseHoliday(year, month - 1, d)) result.push(d);
  return result;
}

describe('isJapaneseHoliday', () => {
  it('2026 年の祝日（振替休日・国民の休日を含む）を判定できる', () => {
    expect(holidaysOf(2026, 1)).toEqual([1, 12]);
    expect(holidaysOf(2026, 2)).toEqual([11, 23]);
    expect(holidaysOf(2026, 3)).toEqual([20]);
    expect(holidaysOf(2026, 4)).toEqual([29]);
    expect(holidaysOf(2026, 5)).toEqual([3, 4, 5, 6]);
    expect(holidaysOf(2026, 6)).toEqual([]);
    expect(holidaysOf(2026, 7)).toEqual([20]);
    expect(holidaysOf(2026, 8)).toEqual([11]);
    expect(holidaysOf(2026, 9)).toEqual([21, 22, 23]);
    expect(holidaysOf(2026, 10)).toEqual([12]);
    expect(holidaysOf(2026, 11)).toEqual([3, 23]);
    expect(holidaysOf(2026, 12)).toEqual([]);
  });

  it('2027 年の振替休日を判定できる', () => {
    expect(holidaysOf(2027, 3)).toEqual([21, 22]);
    expect(holidaysOf(2027, 2)).toEqual([11, 23]);
  });

  it('2019〜2021 年の特例を判定できる', () => {
    expect(holidaysOf(2019, 4)).toEqual([29, 30]);
    expect(holidaysOf(2019, 5)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(holidaysOf(2019, 10)).toEqual([14, 22]);
    expect(holidaysOf(2019, 12)).toEqual([]);
    expect(holidaysOf(2020, 7)).toEqual([23, 24]);
    expect(holidaysOf(2020, 8)).toEqual([10]);
    expect(holidaysOf(2020, 10)).toEqual([]);
    expect(holidaysOf(2021, 7)).toEqual([22, 23]);
    expect(holidaysOf(2021, 8)).toEqual([8, 9]);
  });
});
