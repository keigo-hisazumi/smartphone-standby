# Template

このリポジトリは新しいプロジェクト用のテンプレートです。AI アシスタント向けの指示書、Issue / PR テンプレート、CI/CD の雛形、エディタ設定、各種ドット・ガバナンスファイルを含みます。

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

## 使い方

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
