# ar-oni-hunt

現実世界を舞台に、AI 鬼から逃げながら AR アイテムを集めるソロ WebAR ゲーム。スマホをかざすと鬼の姿とアイテムが見える。

## コンセプト

- 公園や広場で 1 人プレイ
- GPS で定義したフィールドに AR アイテムが配置され、全部集めるとクリア
- AI 鬼が徘徊。一定距離まで近づくと追跡され、捕獲されるとゲームオーバー
- 鬼・アイテムはともに OpenStreetMap の道路グラフ上に配置される。`motorway/trunk/primary/secondary` 等の大通りは除外、それ以外の生活道路・歩道・小道は含む

## 対象プラットフォーム

Android Chrome のみ（iOS は対象外）。

## プレイ時の注意

- **車道・水場・私有地を含まないエリアでフィールドを設定すること**
- 周囲の交通や歩行者に注意し、画面を注視せず適宜顔を上げる
- 走らない（早歩きで充分追われる設計）
- イヤホン使用時も周囲音が聞こえる程度の音量で

## 技術スタック

- **WebAR**: [8th Wall](https://8thwall.org/) オープンソース版 (MIT)
- **3D**: A-Frame
- **位置情報**: GPS（精度 5-10m） + デバイスコンパス
- **トラッキング**: SLAM（8th Wall World Tracking）
- **地図データ**: OpenStreetMap (Overpass API)
- **ホスティング**: 静的（GitHub Pages / Netlify）

詳細は [docs/PLAN.md](docs/PLAN.md) を参照。
