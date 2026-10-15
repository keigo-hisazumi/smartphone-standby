# smartphone-standby

iOS 17 の **スタンバイ（StandBy）** を、**どのスマートフォンでも** ブラウザで表示できるようにした Web アプリ（PWA）です。横向きに置くと、自動でウィジェットの全画面表示に切り替わります。

**公開 URL**: <https://keigo-hisazumi.github.io/smartphone-standby/>

iOS の仕様の洗い出しと、Web での再現方針は [`docs/standby-spec.md`](./docs/standby-spec.md) にまとめています。

## 主な機能

- **自動開始 / 終了**: 横向きにすると常に自動で開始、縦向きで終了（充電状態は監視しません）
- **ウィジェット画面**: 左右 2 つのスマートスタック（時計・カレンダー（今月・来月）・日付・天気）
  - 天気は既定でオン（位置情報の許可が必要。設定でオフにできます）
  - どのウィジェットも左右どちらのスタックにも同じ順番で表示できます（既定は両方に全ウィジェット。最初に表示するのは 左: カレンダー / 右: 天気）。長押しで各スタックに表示するウィジェットを選べます
- **ナイトモード**: 夜間（照度センサーまたは時刻）は赤一色の表示
- **常時表示**: Screen Wake Lock で画面を点灯したままにする / 一定時間で消灯してタップ・モーションで復帰
- **焼き付き防止**、**12/24 時間表示**、**オフライン対応**

## 使い方

1. スマートフォンのブラウザで公開 URL を開く: <https://keigo-hisazumi.github.io/smartphone-standby/>
2. 可能であれば「ホーム画面に追加」する（Android は起動画面の「ホーム画面に追加」ボタン、iPhone は共有ボタンから。全画面・オフラインで使えます）
3. 横向きに置く（自動でスタンバイが始まります）

| 操作 | 動作 |
| --- | --- |
| 上下スワイプ | タッチした側のスタック内のウィジェットを切り替え |
| 長押し | 編集（各スタックのウィジェットの選択）と設定 |
| タップ | 消灯中なら復帰、全画面でなければ全画面化 |

## 開発

```bash
npm ci
npm run dev        # 開発サーバー（--host 付きなので同じ LAN のスマホから確認可能）
npm run lint       # ESLint
npm run type-check # TypeScript の型チェック
npm run test:unit  # Vitest によるユニットテスト
npm run build      # dist/ に本番ビルド
```

技術構成: Vite + TypeScript（フレームワーク・ランタイム依存なし）

### ディレクトリ構成

```
src/
  app.ts            起動画面と自動開始・終了の制御、毎秒の更新ループ
  standby.ts        スタンバイ画面本体（ナイトモード・消灯・焼き付き防止）
  rules.ts          起動条件・ナイトモードなどの判定（純粋関数）
  device.ts         画面の向き / Wake Lock / 全画面 / 照度センサー / DeviceMotion のラッパー
  views/            ウィジェット画面（左右のスマートスタック）
  widgets/          ウィジェット
  settings.ts       設定と localStorage への保存
  holidays.ts       日本の祝日の判定（カレンダーで土曜日は水色、日曜日・祝日は赤色に表示）
  pwa.ts            PWA（Service Worker の登録・更新通知、ホーム画面への追加の案内）
public/             manifest・アイコン・Service Worker（ビルド時にプリキャッシュ一覧を埋め込む）
docs/standby-spec.md  iOS スタンバイの仕様と再現方針
```

## CI / デプロイ

- PR ごとに lint / 型チェック / ユニットテスト / ビルドを実行（`.github/workflows/ci.yml`）
- PR ごとにプレビュー環境（`pr-<番号>/`）を GitHub Pages にデプロイし、URL と QR コードをコメント（`.github/workflows/pr-preview.yml`）
- `main` へのマージ時に GitHub Pages へデプロイ（`.github/workflows/deploy.yml`）

コントリビュートの方法は [`CONTRIBUTING.md`](./CONTRIBUTING.md)、脆弱性の報告方法は [`SECURITY.md`](./SECURITY.md) を参照してください。

## ライセンス

[MIT](./LICENSE)
