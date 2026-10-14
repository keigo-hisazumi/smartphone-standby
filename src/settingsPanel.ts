// 設定画面（iOS の「設定 > スタンバイ」に相当する項目と、Web 版独自の項目）

import { requestMotionPermission } from './device';
import { h } from './dom';
import { openSheet, section, selectRow, timeRow, toggleRow } from './sheet';
import type { SettingsStore } from './settings';

export function openSettingsPanel(store: SettingsStore, batterySupported: boolean, onClose?: () => void): void {
  const s = store.get();
  const sheet = openSheet('スタンバイ', onClose);
  const set = store.set.bind(store);

  const nightTimes = h('div', {}, [
    timeRow('開始時刻', s.nightStart, (v) => set({ nightStart: v })),
    timeRow('終了時刻', s.nightEnd, (v) => set({ nightEnd: v })),
  ]);
  nightTimes.hidden = s.nightMode !== 'auto';

  sheet.body.append(
    section('開始条件', [
      toggleRow('自動で開始', s.autoStart, (v) => set({ autoStart: v }), '充電中に横向きにするとスタンバイを開始します'),
      toggleRow(
        '充電中のみ',
        s.requireCharging,
        (v) => set({ requireCharging: v }),
        batterySupported
          ? '充電をやめると終了します'
          : 'この端末のブラウザは充電状態を取得できないため、横向きだけで開始します',
      ),
    ]),
    section('ディスプレイ', [
      toggleRow('常に画面をオン', s.keepAwake, (v) => set({ keepAwake: v }), 'Screen Wake Lock で自動ロックを防ぎます'),
      selectRow(
        '自動で画面を消す',
        s.sleepAfterSec,
        [
          { value: 0, label: 'しない' },
          { value: 20, label: '20 秒' },
          { value: 60, label: '1 分' },
          { value: 300, label: '5 分' },
          { value: 900, label: '15 分' },
        ],
        (v) => set({ sleepAfterSec: v }),
        'タップ（またはモーション）で再表示します',
      ),
      toggleRow('夜間のみ画面を消す', s.sleepOnlyAtNight, (v) => set({ sleepOnlyAtNight: v })),
      toggleRow('焼き付き防止', s.burnInProtection, (v) => set({ burnInProtection: v }), '表示位置を毎分わずかにずらします'),
    ]),
    section('ナイトモード', [
      selectRow(
        'ナイトモード',
        s.nightMode,
        [
          { value: 'auto', label: '自動' },
          { value: 'on', label: 'オン' },
          { value: 'off', label: 'オフ' },
        ],
        (v) => {
          set({ nightMode: v });
          nightTimes.hidden = v !== 'auto';
        },
        '暗い環境では表示を赤い色調にします。照度センサーが使えない端末では時刻で切り替えます',
      ),
      nightTimes,
      toggleRow('モーションで起動', s.motionToWake, async (v) => {
        // iOS Safari ではユーザー操作中に許可を求める必要がある
        if (v) await requestMotionPermission();
        set({ motionToWake: v });
      }, '消灯中に端末の動きを検知すると画面を表示します'),
    ]),
    section('表示', [
      toggleRow('12 時間表示', s.hour12, (v) => set({ hour12: v })),
      toggleRow(
        'ウィジェットを自動で切り替え',
        s.smartRotate,
        (v) => set({ smartRotate: v }),
        'オンにすると 10 分ごとに次のウィジェットへ切り替えます。オフにすると上下スワイプした時だけ切り替わります',
      ),
      toggleRow('天気を表示', s.weatherEnabled, (v) => set({ weatherEnabled: v }), '位置情報を使い Open-Meteo から取得します'),
    ]),
  );
}
