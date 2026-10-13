# smartphone-standby

iOS 17 の **スタンバイ（StandBy）** を、**どのスマートフォンでも** ブラウザで表示できるようにした Web アプリ（PWA）です。充電しながら横向きに置くと、自動で時計・ウィジェット・写真の全画面表示に切り替わります。

iOS の仕様の洗い出しと、Web での再現方針は [`docs/standby-spec.md`](./docs/standby-spec.md) にまとめています。

## 主な機能

- **自動開始 / 終了**: 充電中 + 横向きで開始、縦向き・充電終了で終了（充電状態を取得できない端末は横向きだけで判定）
- **3 つの画面**（左右スワイプで切り替え）
  - **ウィジェット**: 左右 2 つのスマートスタック（時計・カレンダー・日付・世界時計・バッテリー・天気）
  - **写真**: 端末内に保存した写真のスライドショー + 時刻表示
  - **時計**: アナログ / デジタル / ワールド / ソーラー / フロート の 5 種類（上下スワイプで切り替え、長押しで色変更）
- **ナイトモード**: 夜間（照度センサーまたは時刻）は赤一色の表示
- **常時表示**: Screen Wake Lock で画面を点灯したままにする / 一定時間で消灯してタップ・モーションで復帰
- **焼き付き防止**、**12/24 時間表示**、**オフライン対応**

## 使い方

1. スマートフォンのブラウザで公開 URL（GitHub Pages）を開く
2. 可能であれば「ホーム画面に追加」する（Android は起動画面の「ホーム画面に追加」ボタン、iPhone は共有ボタンから。全画面・オフラインで使えます）
3. 充電ケーブルをつないで横向きに置く（または「スタンバイを開始」をタップ）

| 操作 | 動作 |
| --- | --- |
| 左右スワイプ | ウィジェット / 写真 / 時計 を切り替え |
| 上下スワイプ | スタック内のウィジェット・写真・文字盤を切り替え |
| 長押し | 編集（ウィジェットの選択・写真の追加・文字盤の色）と設定 |
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
  standby.ts        スタンバイ画面本体（画面切り替え・ナイトモード・消灯・焼き付き防止）
  rules.ts          起動条件・ナイトモードなどの判定（純粋関数）
  device.ts         Battery / Wake Lock / 全画面 / 照度センサー / DeviceMotion のラッパー
  views/            ウィジェット・写真・時計の各画面
  widgets/          ウィジェット
  clock/faces.ts    時計の文字盤 5 種類
  solar.ts          太陽位置の計算（ソーラー・ワールド文字盤）
  settings.ts       設定と localStorage への保存
src/pwa.ts          PWA（Service Worker の登録・更新通知、ホーム画面への追加の案内）
public/             manifest・アイコン・Service Worker（ビルド時にプリキャッシュ一覧を埋め込む）
docs/standby-spec.md  iOS スタンバイの仕様と再現方針
```

## AI アシスタント運用方針

このテンプレートは **Claude をメインの AI アシスタント** として利用し、**Cursor / GitHub Copilot をサブツール** として併用するワークフローを想定しています。開発ルールの **正本は [`AGENTS.md`](./AGENTS.md)** で、各ツール向けの指示書はそれを参照する構成です。

| ツール | ファイル | 役割 |
| --- | --- | --- |
| 汎用 AI エージェント | [`AGENTS.md`](./AGENTS.md) | **正本**。すべてのルールはここに集約 |
| Claude Code | [`CLAUDE.md`](./CLAUDE.md) | `AGENTS.md` を参照 |
| Cursor | [`.cursor/rules/project.mdc`](./.cursor/rules/project.mdc) | `AGENTS.md` を参照 |
| GitHub Copilot | [`.github/copilot-instructions.md`](./.github/copilot-instructions.md) | `AGENTS.md` を参照 |

## 含まれるもの

### AI 向け指示書
- `AGENTS.md` — **正本**（汎用 AI エージェント向け）
- `CLAUDE.md` — Claude Code 向け（`AGENTS.md` を参照）
- `.cursor/rules/project.mdc` — Cursor 向け（`AGENTS.md` を参照）
- `.github/copilot-instructions.md` — GitHub Copilot 向け（`AGENTS.md` を参照）
- `.github/copilot-setup-steps.yml` — Copilot Coding Agent のビルド環境（日本語フォント）

### Issue / PR
- `.github/ISSUE_TEMPLATE/` — バグ報告 / 機能要望 / 質問テンプレート
- `.github/PULL_REQUEST_TEMPLATE.md` — PR テンプレート（日本語）
- `.github/CODEOWNERS` — レビュー自動アサイン
- `CONTRIBUTING.md` / `SECURITY.md` — 貢献ガイドとセキュリティポリシー

### CI/CD
- `.github/workflows/ci.yml` — PR 時の lint / typecheck / test / build（`package.json` がある場合のみ実行）
- `.github/workflows/actionlint.yml` — workflow 自体の Lint
- `.github/workflows/codeql.yml` — セキュリティスキャン（JS/TS ソースがある場合のみ実行）
- `.github/workflows/deploy.yml` — main への PR マージ時に GitHub Pages へデプロイ
- `.github/workflows/pr-preview.yml` — PR ごとのプレビュー環境（`pr-<番号>/`）を gh-pages にデプロイし、URL と QR コードをコメント
- `.github/workflows/release-drafter.yml` + `.github/release-drafter.yml` — リリースノート自動生成
- `.github/workflows/screenshot.yml` — PR スクリーンショット用 Playwright 雛形
- `.github/workflows/copilot-setup-steps.yml` — Copilot Coding Agent のセットアップ検証
- `.github/dependabot.yml` — 依存関係の自動更新

### 環境差異の吸収
- `.editorconfig` — エディタ間のインデント／改行統一
- `.gitattributes` — テキスト/バイナリ・改行コードの正規化
- `.gitignore` — OS / 言語 / ビルド成果物
- `.vscode/extensions.json`, `.vscode/settings.json` — VSCode 推奨拡張・設定

### その他
- `LICENSE` — MIT

## テンプレートの使い方

1. このテンプレートから新しいリポジトリを作成（GitHub の **Use this template** ボタン、または clone）。
2. `README.md`、`CODEOWNERS`、`LICENSE` のプロジェクト名や著作権者を書き換える。
3. 言語/フレームワークが決まったら以下を有効化:
   - `.github/workflows/ci.yml` の TODO コメントを実コマンドに差し替え（`lint` / `type-check` / `build` の npm script を用意）
   - `.github/workflows/codeql.yml` の `matrix.language` を設定（JS/TS 以外の場合は detect ジョブの判定条件も変更）
   - `.github/workflows/deploy.yml` / `pr-preview.yml` のベースパス変数名（既定は Vite の `VITE_BASE_PATH`）と `publish_dir` を確認
   - `.github/workflows/screenshot.yml` は Playwright 導入後、リポジトリ変数 `ENABLE_SCREENSHOT` を `true` に設定して有効化
   - `.github/dependabot.yml` の対応する `package-ecosystem` のコメントアウトを外す（typescript-eslint を使わない場合は typescript の `ignore` を削除）
4. **リポジトリ作成後の手動設定**（テンプレートに含められないため `README` で案内）:
   - `main` ブランチ保護ルールを設定（PR 必須、CI パス必須、force push 禁止）
   - GitHub Actions の権限を `Read and write` 許可（Release Drafter / GitHub Pages デプロイ / PR プレビュー用）
   - GitHub Pages のソースを `gh-pages` ブランチに設定（`deploy.yml` / `pr-preview.yml` を使う場合）
   - Secret スキャン / Dependabot Alerts を有効化

## VSCode 環境

VSCode をエディタとして使うワークフローを想定しています。`.vscode/extensions.json` に記載の拡張をインストールすると、Lint / Format / Spell check が即座に動きます。

## ライセンス

MIT
