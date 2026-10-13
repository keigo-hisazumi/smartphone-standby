// 天気の取得（Open-Meteo: API キー不要）。位置情報の許可が必要。

export interface WeatherData {
  temperature: number;
  code: number;
  max: number;
  min: number;
  fetchedAt: number;
}

const REFRESH_MS = 30 * 60 * 1000;
const RETRY_MS = 5 * 60 * 1000;

export class WeatherService {
  data: WeatherData | null = null;
  error: string | null = null;
  private loading = false;
  private lastAttempt = 0;

  refreshIfStale(now: Date): void {
    if (this.loading) return;
    const t = now.getTime();
    if (this.data && t - this.data.fetchedAt < REFRESH_MS) return;
    if (t - this.lastAttempt < (this.error ? RETRY_MS : 0)) return;
    this.lastAttempt = t;
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading = true;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!('geolocation' in navigator)) reject(new Error('位置情報に未対応'));
        navigator.geolocation.getCurrentPosition(resolve, reject, { maximumAge: 60 * 60 * 1000, timeout: 15000 });
      });
      const { latitude, longitude } = pos.coords;
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(2)}&longitude=${longitude.toFixed(2)}` +
        '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      this.data = {
        temperature: json.current.temperature_2m,
        code: json.current.weather_code,
        max: json.daily.temperature_2m_max[0],
        min: json.daily.temperature_2m_min[0],
        fetchedAt: Date.now(),
      };
      this.error = null;
    } catch (e) {
      // GeolocationPositionError はグローバルに無いブラウザもあるので code で判定する
      const geoCode = typeof e === 'object' && e !== null && 'code' in e ? (e as { code: unknown }).code : null;
      this.error = geoCode === 1 ? '位置情報が許可されていません' : geoCode !== null ? '位置情報を取得できません' : '通信エラー';
    } finally {
      this.loading = false;
    }
  }
}

/** WMO 天気コードを日本語の表示に変換する */
export function weatherLabel(code: number): { icon: string; text: string } {
  if (code === 0) return { icon: '☀️', text: '快晴' };
  if (code <= 2) return { icon: '🌤️', text: '晴れ' };
  if (code === 3) return { icon: '☁️', text: 'くもり' };
  if (code === 45 || code === 48) return { icon: '🌫️', text: '霧' };
  if (code >= 51 && code <= 57) return { icon: '🌦️', text: '霧雨' };
  if (code >= 61 && code <= 67) return { icon: '🌧️', text: '雨' };
  if (code >= 71 && code <= 77) return { icon: '🌨️', text: '雪' };
  if (code >= 80 && code <= 82) return { icon: '🌧️', text: 'にわか雨' };
  if (code === 85 || code === 86) return { icon: '🌨️', text: 'にわか雪' };
  if (code >= 95) return { icon: '⛈️', text: '雷雨' };
  return { icon: '🌡️', text: '—' };
}
