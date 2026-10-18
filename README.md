# smartphone-standby

iOS 17 の **スタンバイ（StandBy）** を、**どのスマートフォンでも** ブラウザで表示できるようにした Web アプリ（PWA）です。横向きに置くと、自動でウィジェットの全画面表示に切り替わります。

**公開 URL**: <https://keigo-hisazumi.github.io/smartphone-standby/>

## 主な機能

- **自動開始 / 終了**: 横向きにすると常に自動で開始、縦向きで終了（充電状態は監視しません）
- **ウィジェット画面**: 左右 2 つのスマートスタック（時計（アナログ / デジタル）・カレンダー（今月・来月）・日付・天気）
  - 天気は既定でオン（位置情報の許可が必要。設定でオフにできます）
  - どのウィジェットも左右どちらのスタックにも同じ順番で表示できます（既定は両方に全ウィジェット。最初に表示するのは 左: カレンダー / 右: 天気）。長押しで各スタックに表示するウィジェットを選べます
- **ナイトモード**: 夜間（照度センサーまたは時刻）は赤一色の表示
- **常時表示**: Screen Wake Lock で画面を点灯したままにする / 一定時間で消灯してタップ・モーションで復帰
- **焼き付き防止**: 表示位置を毎分わずかにずらす
- **12/24 時間表示**
- **カレンダーの祝日表示**: 土曜日は水色、日曜日・日本の祝日は赤色
- **オフライン対応**: Service Worker でキャッシュし、ホーム画面に追加して使える

## 使い方

1. スマートフォンのブラウザで公開 URL を開く: <https://keigo-hisazumi.github.io/smartphone-standby/>
2. 可能であれば「ホーム画面に追加」する（Android は起動画面の「ホーム画面に追加」ボタン、iPhone は共有ボタンから。全画面・オフラインで使えます）
3. 横向きに置く（自動でスタンバイが始まります）

| 操作 | 動作 |
| --- | --- |
| 上下スワイプ | タッチした側のスタック内のウィジェットを切り替え |
| 長押し | 編集（各スタックのウィジェットの選択）と設定 |
| タップ | 消灯中なら復帰、全画面でなければ全画面化 |

## 仕様と再現方針

iOS の仕様の洗い出しと、Web での再現方針は [`docs/standby-spec.md`](./docs/standby-spec.md) にまとめています。

## 技術スタック

- TypeScript（フレームワーク・ランタイム依存なし）
- Vite（ビルド。Service Worker のプリキャッシュ一覧を埋め込む独自プラグインを含む）
- Vitest（ユニットテスト）
- ESLint（typescript-eslint）
- Web API: Screen Wake Lock / Fullscreen / Ambient Light Sensor / DeviceMotion / Geolocation / Service Worker
- Open-Meteo（天気予報 API）
- GitHub Pages（ホスティング）

## 開発

### 必要な環境

- Node.js 22（CI の `node-version` に合わせる）

### コマンド

```bash
npm ci
npm run dev        # 開発サーバー（--host 付きなので同じ LAN のスマホから確認可能）
npm run lint       # ESLint
npm run type-check # TypeScript の型チェック
npm run test:unit  # Vitest によるユニットテスト
npm run build      # 型チェックのあと dist/ に本番ビルド
npm run preview    # ビルド結果をローカルで確認（--host 付き）
```

PR ごとに `.github/workflows/ci.yml` が lint / 型チェック / ユニットテスト / ビルドを実行します。

## ディレクトリ構成

```text
index.html            エントリーポイントの HTML
src/
  main.ts             起動処理
  app.ts              起動画面と自動開始・終了の制御、毎秒の更新ループ
  standby.ts          スタンバイ画面本体（ナイトモード・消灯・焼き付き防止）
  rules.ts            起動条件・ナイトモードなどの判定（純粋関数）
  device.ts           画面の向き / Wake Lock / 全画面 / 照度センサー / DeviceMotion のラッパー
  views/              ウィジェット画面（左右のスマートスタック）
  widgets/            ウィジェット
  settings.ts         設定と localStorage への保存
  settingsPanel.ts    設定画面
  weather.ts          天気の取得（Open-Meteo）
  holidays.ts         日本の祝日の判定（カレンダーで土曜日は水色、日曜日・祝日は赤色に表示）
  pwa.ts              PWA（Service Worker の登録・更新通知、ホーム画面への追加の案内）
  *.test.ts           Vitest のユニットテスト
public/               manifest・アイコン・Service Worker（ビルド時にプリキャッシュ一覧を埋め込む）
docs/standby-spec.md  iOS スタンバイの仕様と再現方針
vite.config.ts        Vite の設定（ベースパスとプリキャッシュ一覧の埋め込み）
```

## デプロイ

- `main` への PR マージ時に `.github/workflows/deploy.yml` が GitHub Pages（<https://keigo-hisazumi.github.io/smartphone-standby/>）へデプロイします
- PR ごとに `.github/workflows/pr-preview.yml` がプレビューを gh-pages の `pr-<番号>/` に公開し、URL と QR コードを PR にコメントします（PR クローズ時に削除）

## 開発ルール

開発ルールは [AGENTS.md](./AGENTS.md) を参照してください。
貢献の手順は [CONTRIBUTING.md](./CONTRIBUTING.md) を参照してください。

## ライセンス

MIT
