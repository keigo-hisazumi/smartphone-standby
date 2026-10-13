// 太陽位置の近似計算（NOAA の簡易式）。ソーラー文字盤と世界地図の昼夜表示に使う。

const RAD = Math.PI / 180;

export interface SunInfo {
  /** 太陽直下点の緯度（= 赤緯、度） */
  subsolarLat: number;
  /** 太陽直下点の経度（度、-180〜180） */
  subsolarLon: number;
}

function normalizeLon(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

/** 指定時刻の太陽直下点を求める */
export function sunInfo(date: Date): SunInfo {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = (date.getTime() - startOfYear) / 86400000;
  const g = ((2 * Math.PI) / 365) * dayOfYear;
  // 均時差（分）
  const eqTime =
    229.18 *
    (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  // 赤緯（ラジアン）
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  // 真太陽時が 12:00（720 分）になる経度が太陽直下点
  const subsolarLon = normalizeLon((720 - utcMinutes - eqTime) / 4);
  return { subsolarLat: decl / RAD, subsolarLon };
}

/** 太陽直下点から見た、地点 (lat, lon) の太陽高度（度） */
export function elevationFrom(sun: SunInfo, lat: number, lon: number): number {
  const cosZenith =
    Math.sin(lat * RAD) * Math.sin(sun.subsolarLat * RAD) +
    Math.cos(lat * RAD) * Math.cos(sun.subsolarLat * RAD) * Math.cos((lon - sun.subsolarLon) * RAD);
  return 90 - Math.acos(Math.min(1, Math.max(-1, cosZenith))) / RAD;
}

/** 指定時刻・地点の太陽高度（度）。正なら昼、負なら夜 */
export function sunElevation(date: Date, lat: number, lon: number): number {
  return elevationFrom(sunInfo(date), lat, lon);
}
