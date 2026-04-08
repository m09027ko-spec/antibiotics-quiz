// ============================================================
// Google Apps Script — スプレッドシートに回答データを記録する
// ============================================================
//
// 【セットアップ手順】
//
// 1. Google スプレッドシートを新規作成する
//
// 2. 1行目（ヘッダー）に以下を入力：
//    A1: 名前
//    B1: 日時
//    C1: 問題ID
//    D1: カテゴリ
//    E1: 問題文
//    F1: 選択した回答
//    G1: 正解
//    H1: 結果
//
// 3. メニュー「拡張機能」→「Apps Script」を開く
//
// 4. 以下のコードを貼り付けて保存する
//
// 5. 「デプロイ」→「新しいデプロイ」→種類「ウェブアプリ」を選択
//    - 実行するユーザー: 自分
//    - アクセスできるユーザー: 全員
//    → デプロイURLが生成される
//
// 6. 生成されたURLを app.js の SHEETS_WEBHOOK_URL に設定する
//
// ============================================================

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.name,
    data.timestamp,
    data.questionId,
    data.category,
    data.question,
    data.selectedAnswer,
    data.correctAnswer,
    data.result
  ]);

  return ContentService.createTextOutput(
    JSON.stringify({ status: 'ok' })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService.createTextOutput('Quiz data receiver is running.');
}
