# 抗菌薬クイズ王

初期研修医向けの抗菌薬学習Webアプリ。1問ずつ出題され、解き続ける形式。

## 構成

- `index.html` — メインページ
- `style.css` — スタイル（モバイル対応）
- `app.js` — クイズエンジン（進捗管理はlocalStorage）
- `data/questions.js` — 問題データ（QUIZ_DATA配列）
- `resources/` — 元となるPDF資料
- `server.rb` — ローカルサーバー（`ruby server.rb` でポート3000）
- `google-apps-script.js` — Google Sheets連携用のGASコード（スプレッドシートに貼る）

## 問題のフォーマット

`data/questions.js` の `QUIZ_DATA` 配列に追加する。

```js
{
  id: "category_001",        // カテゴリ略称_連番。重複不可
  category: "カテゴリ名",
  question: "問題文",
  choices: ["A", "B", "C", "D"],
  answer: 0,                 // 正解のindex（0始まり）
  explanation: "解説文"
}
```

解説は詳しく書く。正解の理由だけでなく、不正解選択肢がなぜ違うか、関連する臨床知識、用量・半減期なども含める。

## 仕様

- 起動時に名前を入力（localStorageに保存）
- 正解した問題は再出題されない（localStorageで記録）
- 不正解の問題は同セッション中に再度出題される
- ランダムモードとカテゴリ別モードを選択可能
- 回答のたびにGoogle Sheetsに送信（名前・日時・問題・正誤）

## Google Sheets連携

1. スプレッドシートを作成
2. Apps Scriptに `google-apps-script.js` の内容を貼り付け
3. ウェブアプリとしてデプロイしてURLを取得
4. `app.js` の `SHEETS_WEBHOOK_URL` にURLを設定

## デザインルール

- 絵文字は使わない。アイコンが必要な場合はSVGを使う
- 洗練されたシンプルなUIを維持する

## 開発

- サーバー不要でもJSファイル埋め込みのため`file://`で動作しない
- `ruby server.rb` でポート3000で起動
- GitHub Pagesでのホスティングを予定
