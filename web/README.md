# ar-oni-hunt / web

ar-oni-hunt の WebAR フロントエンド。[8thwall/aframe-world-effects-example](https://github.com/8thwall/aframe-world-effects-example) を雛形として開始。

## セットアップ

```bash
npm install
npm run serve
```

`webpack-dev-server` が HTTPS で立ち上がるので、同一 LAN の Android Chrome からアクセスしてカメラ許可を出すと AR が起動します（[8th Wall の test-on-mobile ガイド](https://8th.io/test-on-mobile)）。

## ビルド

```bash
npm run build
```

`dist/` に静的ファイルが出力される。HTTPS な静的ホスティング（GitHub Pages / Netlify 等）に置けばそのまま動く。

## ライセンス

- 雛形コード（`src/`, `config/`）: MIT — `LICENSE` 参照
- 8th Wall XR Engine（`@8thwall/engine-binary`、CDN ロード）: バイナリ専用ライセンス — `LICENSE-XR.txt` 参照
