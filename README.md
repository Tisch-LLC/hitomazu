# app

Built with Claude: Japan 2026 の提出用アプリです（作品の内容は準備中）。

## 構成

```text
package.json / bun.lock   # 依存関係
build.ts                  # 静的ビルド（bun run build → dist/）
src/index.ts              # Bun.serve によるサーバーとAPIルート
src/index.html            # フロントエンドのHTML入口
src/frontend.tsx          # React のマウント
src/App.tsx               # React コンポーネント（現状は雛形のサンプル）
src/APITester.tsx         # 雛形のAPI動作確認用コンポーネント
src/index.css             # Tailwind CSS
```

React 19、Tailwind CSS 4、TypeScript を使い、サーバーとフロントエンドを Bun の1プロセスで動かします。

## 使い方

[Bun](https://bun.com) 1.4 以降が必要です。

```bash
bun install   # 依存関係のインストール
bun dev       # 開発サーバー（ホットリロード）
bun run build # dist/ へビルド
bun start     # 本番モードで起動
bun check     # 型チェック
```

秘密情報（APIキーなど）は `.env` に置きます。`.env` はコミットされません。

## 制作の経緯

2026-11-02 に `bun init --react=tailwind`（bun 1.4.4）で生成した雛形から開始しました。初期コミット以降の変更が、ハッカソン期間中に作成した部分です。
