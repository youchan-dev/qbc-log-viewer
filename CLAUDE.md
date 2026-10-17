# CLAUDE.md

## プロジェクト概要

QBC (Query By Committee) ログビューア。LAMMPS MD シミュレーションの QBC サブサンプリングログを解析し、収束状況を可視化する React + TypeScript アプリ。

- `qbc-log-viewer/` — Vite + React + TypeScript フロントエンド
- `sample_qbc.log` — 動作確認用サンプルログ

## 開発サーバー

```bash
cd qbc-log-viewer
npm run dev
```

## ビルド・チェック

```bash
npm run build   # tsc + vite build
npm run lint    # eslint
```

## 安全な運用ルール

### 確認なしで行ってよい操作

- ファイルの読み取り・検索
- `npm run dev` / `npm run build` / `npm run lint` の実行
- ソースコード (`src/`) の編集

### 必ず確認を取る操作

- `git push` — リモートへの送信前に確認
- `git reset --hard` / `git checkout .` などの変更破棄
- `node_modules/` や `dist/` 以外のディレクトリ・ファイルの削除
- 外部サービス（API、クラウド等）への接続

### 禁止操作

- `--no-verify` フラグによるフック迂回
- force push (`git push --force`)
- `.env` ファイルや認証情報のコミット

## コーディング規約

- コメントは「なぜそうするか (WHY)」が自明でない場合のみ書く
- 不要な抽象化・将来の拡張のためのコードは追加しない
- ログパーサ変更時は `sample_qbc.log` で動作確認すること
