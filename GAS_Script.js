// =============================================
// REVIVE Health OS — Google Apps Script
// スプレッドシート連携（書き込み＋読み取り）
// =============================================

// --- 書き込み (POST) ---
function doPost(e) {
  try {
    var json = JSON.parse(e.postData.contents);
    var type = json.type;
    var payload = json.payload;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (type === 'victory') {
      var sheet = getOrCreateSheet(ss, 'SOS勝利記録', ['日時', '対象', '耐えた秒数']);
      sheet.appendRow([
        payload.date || new Date().toISOString(),
        payload.craving || '',
        payload.duration || 0
      ]);
    }

    else if (type === 'badge') {
      var sheet = getOrCreateSheet(ss, 'バッジ', ['日時', 'バッジID']);
      sheet.appendRow([
        payload.date || new Date().toISOString(),
        payload.badgeId || ''
      ]);
    }

    else if (type === 'checkin') {
      var sheet = getOrCreateSheet(ss, '朝チェックイン', [
        '日付', '記録日時', '体重(kg)',
        'CPAP', '睡眠時間', '睡眠の質',
        '疲労度VAS', '痛みVAS', '頭痛',
        '夕食タイプ', '夕食時間',
        'タグ（カンマ区切り）'
      ]);
      sheet.appendRow([
        payload.date || '',
        payload.timestamp || new Date().toISOString(),
        payload.weight || '',
        payload.cpap != null ? payload.cpap : '',
        payload.sleepHours || '',
        payload.sleepQuality || '',
        payload.vas_fatigue != null ? payload.vas_fatigue : '',
        payload.vas_pain != null ? payload.vas_pain : '',
        payload.headache != null ? payload.headache : '',
        payload.dinnerType || '',
        payload.dinnerTime || '',
        (payload.tags || []).join(',')
      ]);
    }

    else if (type === 'checkout') {
      var sheet = getOrCreateSheet(ss, '夜チェックアウト', [
        '日付', '記録日時',
        'パフォーマンスVAS', '振り返りメモ',
        'リチュアル（カンマ区切り）'
      ]);
      sheet.appendRow([
        payload.date || '',
        payload.timestamp || new Date().toISOString(),
        payload.vas_performance != null ? payload.vas_performance : '',
        payload.reflection || '',
        (payload.logoutRituals || []).join(',')
      ]);
    }

    else if (type === 'rest') {
      var sheet = getOrCreateSheet(ss, '休養プラン', [
        '日付', '記録日時',
        'プラン（カンマ区切り）'
      ]);
      sheet.appendRow([
        payload.date || '',
        payload.timestamp || new Date().toISOString(),
        (payload.plans || []).join(',')
      ]);
    }

    else if (type === 'weight') {
      var sheet = getOrCreateSheet(ss, '体重記録', ['日時', '体重(kg)']);
      sheet.appendRow([
        payload.date || new Date().toISOString(),
        payload.kg || ''
      ]);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- 読み取り (GET) ---
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var result = {};

    var sheets = ss.getSheets();
    sheets.forEach(function(sheet) {
      var sheetName = sheet.getName();
      var data = sheet.getDataRange().getValues();
      if (data.length > 1) {
        var headers = data[0];
        var rows = [];
        for (var i = 1; i < data.length; i++) {
          var row = {};
          for (var j = 0; j < headers.length; j++) {
            row[headers[j]] = data[i][j];
          }
          rows.push(row);
        }
        result[sheetName] = rows;
      }
    });

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- ヘルパー: シートを取得or作成 ---
function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    // ヘッダー行を太字に
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}
