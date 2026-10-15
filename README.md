# つづきから

途中の漫画・アニメ・本を「切符」にして、夜行列車の車掌さんと一緒に少しずつ完走を目指す、自分専用のアプリ（PWA）。

- **いま見てる**：同時に追うのは 3 作品（1〜3 号車）まで。空席は埋めなくていい
- **パンチ**：見た話数をタップして記録。しおりメモで次に思い出したいことを残す
- **区切りと終点**：長い作品は区切りごとにスタンプ。完走すると終点スタンプ
- **途中下車**：あとでに戻しても切符は有効期限なし

記録はブラウザの localStorage に保存される。機種変更などに備えて、右上の月アイコンからバックアップ（JSON）を書き出し・読み込みできる。

## 開発

```bash
npm install
npm run dev
```

ビルドには Node 20 以上を使う（`.nvmrc`）。Node 18 系の古い版では PWA のビルドが失敗するので、その場合は次のように実行する。

```bash
NODE_OPTIONS=--experimental-global-webcrypto npm run build
```

## 公開

`main` に push すると GitHub Actions がビルドして GitHub Pages に公開する（`.github/workflows/deploy.yml`）。スマホで開いて「ホーム画面に追加」するとアプリのように使える。

## 構成

- `src/lib/model.ts` — 型、作品の種類ごとの初期値、区切りの計算
- `src/lib/store.ts` — 状態と操作（発行・乗車・途中下車・記録・完走）、localStorage への保存
- `src/views/` — いま見てる／あとで／完走 の 3 画面
- `src/sheets/` — 下から出るパネル（パンチ、登録、お祝い、設定など）
- `src/components/` — 切符、車窓ヘッダー、タブなど
