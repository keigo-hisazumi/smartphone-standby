// 端末のタイムゾーンからおおよその現在地を推定する（位置情報の許可なしで世界地図・ソーラー表示に使う）

export interface ApproxLocation {
  lat: number;
  lon: number;
  city: string;
}

const KNOWN_ZONES: Record<string, ApproxLocation> = {
  'Asia/Tokyo': { lat: 35.68, lon: 139.69, city: '東京' },
  'Asia/Seoul': { lat: 37.57, lon: 126.98, city: 'ソウル' },
  'Asia/Shanghai': { lat: 31.23, lon: 121.47, city: '上海' },
  'Asia/Hong_Kong': { lat: 22.32, lon: 114.17, city: '香港' },
  'Asia/Taipei': { lat: 25.03, lon: 121.57, city: '台北' },
  'Asia/Singapore': { lat: 1.35, lon: 103.82, city: 'シンガポール' },
  'Asia/Bangkok': { lat: 13.76, lon: 100.5, city: 'バンコク' },
  'Asia/Kolkata': { lat: 19.08, lon: 72.88, city: 'ムンバイ' },
  'Asia/Dubai': { lat: 25.2, lon: 55.27, city: 'ドバイ' },
  'Europe/London': { lat: 51.51, lon: -0.13, city: 'ロンドン' },
  'Europe/Paris': { lat: 48.86, lon: 2.35, city: 'パリ' },
  'Europe/Berlin': { lat: 52.52, lon: 13.4, city: 'ベルリン' },
  'Europe/Moscow': { lat: 55.76, lon: 37.62, city: 'モスクワ' },
  'America/New_York': { lat: 40.71, lon: -74.01, city: 'ニューヨーク' },
  'America/Chicago': { lat: 41.88, lon: -87.63, city: 'シカゴ' },
  'America/Denver': { lat: 39.74, lon: -104.99, city: 'デンバー' },
  'America/Los_Angeles': { lat: 34.05, lon: -118.24, city: 'ロサンゼルス' },
  'America/Sao_Paulo': { lat: -23.55, lon: -46.63, city: 'サンパウロ' },
  'Australia/Sydney': { lat: -33.87, lon: 151.21, city: 'シドニー' },
  'Pacific/Auckland': { lat: -36.85, lon: 174.76, city: 'オークランド' },
  'Pacific/Honolulu': { lat: 21.31, lon: -157.86, city: 'ホノルル' },
};

/** タイムゾーン ID の都市名（日本語が分かればそれを返す） */
export function cityName(timeZone: string): string {
  return KNOWN_ZONES[timeZone]?.city ?? timeZone.split('/').pop()?.replace(/_/g, ' ') ?? timeZone;
}

/** 端末のタイムゾーンからおおよその現在地を返す */
export function approxLocation(timeZone?: string, now = new Date()): ApproxLocation {
  const tz = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const known = tz ? KNOWN_ZONES[tz] : undefined;
  if (known) return known;
  // 未知のタイムゾーンは UTC オフセットから経度だけ推定する
  const lon = Math.max(-180, Math.min(180, (-now.getTimezoneOffset() / 60) * 15));
  return { lat: 30, lon, city: tz ? cityName(tz) : '現在地' };
}
