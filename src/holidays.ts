// 日本の祝日の判定（「国民の祝日に関する法律」に基づく。DOM・通信に依存しない純粋関数）
// 対象は 2000〜2099 年。春分・秋分の日は計算式による推定値（官報での正式発表は前年 2 月）

/** month 月（0 始まり）の第 n 月曜日の日付 */
function nthMonday(year: number, month: number, n: number): number {
  const first = new Date(year, month, 1).getDay();
  return 1 + ((8 - first) % 7) + (n - 1) * 7;
}

function vernalEquinox(year: number): number {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function autumnalEquinox(year: number): number {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

/** 振替休日・国民の休日を除いた、法律で日付が決まっている祝日か（month は 0 始まり） */
function isBaseHoliday(year: number, month: number, day: number): boolean {
  const m = month + 1;
  // 東京オリンピック・パラリンピックに伴う 2020・2021 年の移動
  const olympic: Record<number, [number, number][]> = {
    2020: [[7, 23], [7, 24], [8, 10]],
    2021: [[7, 22], [7, 23], [8, 8]],
  };
  const moved = olympic[year];
  if (moved && moved.some(([mm, dd]) => mm === m && dd === day)) return true;

  switch (m) {
    case 1:
      return day === 1 || day === nthMonday(year, month, 2);
    case 2:
      return day === 11 || (year >= 2020 && day === 23);
    case 3:
      return day === vernalEquinox(year);
    case 4:
      return day === 29;
    case 5:
      // 2019 年は天皇の即位の日
      return day === 3 || day === 4 || day === 5 || (year === 2019 && day === 1);
    case 7:
      // 海の日（2020・2021 年は移動済み）
      if (moved) return false;
      return year >= 2003 ? day === nthMonday(year, month, 3) : day === 20;
    case 8:
      // 山の日（2016 年から。2020・2021 年は移動済み）
      return year >= 2016 && !moved && day === 11;
    case 9:
      return (year >= 2003 ? day === nthMonday(year, month, 3) : day === 15) || day === autumnalEquinox(year);
    case 10:
      // スポーツの日（体育の日）。2020・2021 年は移動済み。2019 年は即位礼正殿の儀
      return (!moved && day === nthMonday(year, month, 2)) || (year === 2019 && day === 22);
    case 11:
      return day === 3 || day === 23;
    case 12:
      return year <= 2018 && day === 23;
    default:
      return false;
  }
}

function isBaseHolidayDate(d: Date): boolean {
  return isBaseHoliday(d.getFullYear(), d.getMonth(), d.getDate());
}

/** year 年 month 月（0 始まり）day 日が日本の祝日（振替休日・国民の休日を含む）か */
export function isJapaneseHoliday(year: number, month: number, day: number): boolean {
  if (isBaseHoliday(year, month, day)) return true;
  const date = new Date(year, month, day);
  // 振替休日: 日曜日の祝日から祝日が続いた後の最初の平日
  const prev = new Date(year, month, day - 1);
  while (isBaseHolidayDate(prev)) {
    if (prev.getDay() === 0) return true;
    prev.setDate(prev.getDate() - 1);
  }
  // 国民の休日: 前日と翌日が祝日に挟まれた平日
  return (
    date.getDay() !== 0 &&
    isBaseHolidayDate(new Date(year, month, day - 1)) &&
    isBaseHolidayDate(new Date(year, month, day + 1))
  );
}
