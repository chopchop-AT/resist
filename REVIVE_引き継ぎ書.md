# REVIVE — Personal Health OS 引き継ぎ書

> 最終更新: 2026-04-05 / app.js ~2,530行 / v8（Energy-First Architecture）

---

## 1. プロジェクトの魂（Why）

### なぜこのアプリが存在するのか

平山直樹（高校社会科教員・ミドルマネージャー）は、椎間板ヘルニアと睡眠時無呼吸症候群（SAS）を抱えている。どちらも**減量**が根本的な改善策だが、多忙な教員生活の中でストレスによる食欲の衝動と闘い続けている。

最初は「食欲の衝動が来た時に15分間耐えるためのSOSタイマー」として生まれたアプリが、対話を重ねる中で「毎日の生活全体を回復の視点でマネジメントするOS」へと進化した。

### ユーザープロファイル

| 項目 | 詳細 |
|------|------|
| 氏名 | 平山直樹 |
| 職業 | 高校社会科教員、高1（77期）所属、学習推進部 |
| 性格特性 | ENFJ（指導者型）— 人に尽くしすぎてエネルギー枯渇しやすい |
| 健康課題 | 椎間板ヘルニア（腰痛・足の痺れ）、SAS（CPAP使用）、体重管理 |
| 生活パターン | 帰宅が遅い（天満橋→南森町の通勤経路）、由香さんの手料理が理想的食事 |
| 価値観 | 家族（妻・由香、長女・千里）と教え子への献身が最優先 |

### 設計哲学

- **「我慢」ではなく「回復」**: RESISTからREVIVEへリブランドした理由。ネガティブな抵抗ではなく、ポジティブな活力の回復にフォーカス
- **テーラーメイド**: 汎用ダイエットアプリではなく、直樹さん専用に設計。通勤経路の固有名詞、由香ごはん、CPAPなどが直接UIに組み込まれている
- **自己対話の儀式**: 朝と夜に自分の状態を入力する行為そのものが、行動変容のスイッチになる
- **DRAMMAモデル**: 科学的な疲労回復理論（Detachment, Relaxation, Autonomy, Mastery, Meaning, Affiliation）を日常に落とし込む

---

## 2. 開発の軌跡（v1 → v8）

| Ver | テーマ | 主な追加機能 |
|-----|--------|-------------|
| v1 | SOSタイマー | 15分カウントダウン、リアリティメッセージ、深呼吸ガイド |
| v2 | ゲーミフィケーション | バッジシステム（13種）、体重記録、スペシャルデイチケット |
| v3 | 朝チェックイン | パーソナルOS構想の誕生。毎朝の自己対話UIを設計 |
| v4 | クラウド永続化 | GAS連携（POST書き込み）、オフライン再送キュー |
| v5 | REVIVEリブランド | DRAMMA統合、終業リチュアル（102種）、休養プラン（102種）、VASスライダー、夜チェックアウト新設、5タブ→4タブ統合 |
| v6 | スコアリング＆分析 | 自動100点エンジン（4カテゴリ）、レーダーチャート、AIリセット方程式、体重トレンド（3期間）、4時日付境界、クラウド復元（GET読み取り）、リファクタリング（2145→1917行）、頭痛トラッキング |
| v7 | 痛み相関＆カフェイン | 体重-痛みデュアルY軸グラフ、チェックアウト成功エフェクト、カフェイン管理（杯数+時間+13:40デッドライン）、スコアカード→分析タップ導線 |
| **v8** | **Energy-First Architecture** | 設計思想を「食欲との戦い」→「エネルギー管理OS」に転換。エネルギーバッテリー（認知MP可視化）、7大介入チェックリスト、夕方タイムライン、サプリトリニティトラッカー、デジタルウォール追跡、就寝時刻記録、ストレッチプロトコルガイド（7種目）、フェーズ進捗トラッカー（Phase 1-4）、スコアリング5カテゴリ化（睡眠30+栄養20+エネルギー管理20+回復15+パフォーマンス15） |

### Git履歴（最新→最古）

```
24c99b5 feat: REVIVE v8 — Energy-First Architecture overhaul
28983a6 feat: Add headache tracking + create comprehensive handover document
1f2bed4 fix: Cloud restore - overwrite-merge for weight data
ec4bb3f refactor: Remove dead code, unify streak logic, clean CSS
b4b0203 fix: GAS script + cloud restore old/new format compatibility
00a21e8 feat: Cloud data restore from Google Sheets via GAS doGet
312634e feat: Weight chart view toggle + data recovery button
6f28bb3 fix: Home layout, weight chart in analytics, midnight boundary
9d16f34 refactor: Major REVIVE v6 overhaul
7a4df77 feat: Auto daily scoring engine (4 categories)
b954aa3 feat: Daily scoring, supplement tracking
50d1171 feat: Rebrand to REVIVE with DRAMMA recovery system
d300ae5 feat: Analytics, VAS sliders, Checkout screen
776a071 feat: Google Sheets Sync (v4.0)
... (v1-v3 commits)
```

---

## 3. 現在のアーキテクチャ

### 技術スタック

- **フロントエンド**: Vanilla HTML / CSS / JavaScript（フレームワーク不使用）
- **構造パターン**: IIFE（即時実行関数式）で全体をラップ
- **PWA**: Service Worker + manifest.json でオフライン＆ホーム画面追加対応
- **グラフ描画**: Chart.js（CDN読み込み）— レーダーチャート＋体重ラインチャート
- **クラウド**: Google Apps Script（GAS）→ Google Spreadsheet
- **ホスティング**: GitHub Pages（`https://chopchop-at.github.io/resist/`）

### ファイル構成

```
resist/
├── index.html          (595行) UI構造・全画面のHTML
├── app.js              (1,917行) 全機能のロジック
├── style.css           (1,753行) ダークテーマのCSS
├── GAS_Script.js       (147行) GAS用スクリプト（Apps Scriptエディタに貼り付け）
├── sw.js               (51行) Service Worker
├── manifest.json       (18行) PWAマニフェスト
├── icon-192.png        アプリアイコン
├── .claude/launch.json ローカル開発サーバー設定
├── REVIVE_引き継ぎ書.md ← このファイル
├── RESIST_開発記録.md   歴史的記録（v1-v4）
├── RESIST_未来の進化構想.md 進化パターンA-D
├── RESIST_Claude_Code_Handover.md 旧引き継ぎ（v4時点）
└── RESIST_AI開発_引き継ぎ情報.md 旧技術接続情報
```

### データフロー

```
[ユーザー入力] → [checkinState / checkoutState] → [localStorage] → [GAS sync queue]
                                                                         ↓
                                                                   [fetch POST]
                                                                         ↓
                                                               [Google Spreadsheet]
                                                                         ↑
                                                              [クラウド復元 fetch GET]
```

### 画面構成（4タブナビゲーション）

| タブ | 画面ID | 役割 |
|------|--------|------|
| 🏠 ホーム | `screen-home` | デイリースコア、進捗、SOS、スペシャルデイ |
| ☀️ 朝 | `screen-checkin` | 朝のリカバリーチェック（11フィールド） |
| 🌙 夜 | `screen-checkout` | パフォーマンス振り返り＋リチュアル＋休養プラン |
| 📊 分析 | `screen-analytics` | 7日分析、チャート、バッジ、クラウド復元 |

＋ `screen-sos`（オーバーレイ）: SOSタイマー画面

---

## 4. 基盤情報（環境・接続）

### リポジトリ

- **GitHub**: `https://github.com/chopchop-AT/resist.git`（ユーザー: `chopchop-AT`）
- **本番URL**: `https://chopchop-at.github.io/resist/`
- **ローカルパス**: `/Users/chopchop/Library/Mobile Documents/iCloud~md~obsidian/Documents/Antigravity/10_Projects/WebApp_Prototype/resist/`

### GAS（Google Apps Script）

- **Webhook URL**: `https://script.google.com/macros/s/AKfycbyN7Pob4WdTngwJgLspbCbT3iumeA2qss0OmBB0u0bWP7qHt1ntLUbwnfjSjXfJrJeE/exec`
- **通信方式**: POST（`text/plain`形式のJSON）で書き込み、GETで全データ読み取り
- **スプレッドシートのシート構成**:

| シート名 | 列構成 |
|----------|--------|
| SOS勝利記録 | 日時, 対象, 耐えた秒数 |
| バッジ | 日時, バッジID |
| 朝チェックイン | 日付, 記録日時, 体重(kg), CPAP, 睡眠時間, 睡眠の質, 疲労度VAS, 痛みVAS, 頭痛, 夕食タイプ, 夕食時間, タグ（カンマ区切り） |
| 夜チェックアウト | 日付, 記録日時, パフォーマンスVAS, 振り返りメモ, リチュアル（カンマ区切り） |
| 休養プラン | 日付, 記録日時, プラン（カンマ区切り） |
| 体重記録 | 日時, 体重(kg) |

### ローカル開発

```bash
cd "/Users/chopchop/Library/Mobile Documents/iCloud~md~obsidian/Documents/Antigravity/10_Projects/WebApp_Prototype/resist"
python3 -m http.server 8080
# → http://localhost:8080 で確認（PCブラウザのみ。iPhoneからは不可）
```

### Service Worker

- キャッシュ名: `revive-v6`
- ファイル変更時は `sw.js` の `CACHE_NAME` をインクリメントすること

### localStorage キー一覧

| キー | 用途 | データ型 |
|------|------|----------|
| `revive_victories` | SOS勝利記録 | `[{date, craving, duration}]` |
| `revive_weights` | 体重記録 | `[{date, kg}]` |
| `revive_badges` | 獲得バッジID | `[string]` |
| `revive_special` | スペシャルデイ | `{used: [{date, note}]}` |
| `revive_checkins` | 朝チェックイン | `[{date, timestamp, weight, sleepHours, sleepQuality, cpap, vas_fatigue, vas_pain, headache, tags, dinnerType, dinnerTime}]` |
| `revive_checkouts` | 夜チェックアウト | `[{date, timestamp, vas_performance, reflection, logoutRituals}]` |
| `revive_rest_plans` | 休養プラン | `[{date, timestamp, plans}]` |
| `revive_sync_queue` | GAS送信キュー | `[{type, payload, id}]` |

> **注意**: 旧 `resist_*` キーからの自動マイグレーション処理がapp.js冒頭にあり、初回起動時に自動変換される。

---

## 5. 機能詳細と設計意図

### 朝チェックイン（screen-checkin）

毎朝、自分の体と向き合う「儀式」。11のフィールドで前日の行動と今朝の状態を記録する。

| フィールド | UI | 値 | 設計意図 |
|-----------|----|----|---------|
| 体重 | 数字3-4桁入力 | kg（自動変換: 855→85.5） | 毎日の体重管理。スマート入力で摩擦ゼロ |
| 睡眠時間 | 8ボタン（4.5h〜8h+） | 数値 | SAS患者にとって睡眠時間は最重要指標 |
| CPAP装着 | 3ボタン | 2=バッチリ, 1=途中外した, 0=つけなかった | SAS治療の遵守度。当初2択→3段階に改善 |
| 睡眠の質 | 4ボタン | great/ok/light/terrible | 主観的な睡眠品質 |
| 夕食タイプ | 3ボタン | yuka/eating_out/eating_out_alcohol | 由香ごはんが最高評価。外食＆飲酒が最低 |
| 夕食時間 | 3ボタン | before19/19to21/after21 | 遅い食事は睡眠の質を下げる |
| 健康習慣 | 5タグ（複数選択） | 朝ウォーキング/夜ストレッチ/ジャーナリング/間食なし/サプリメント | 生活習慣の実行チェックリスト |
| 疲労度VAS | スライダー 0-100 | 数値（0=絶好調, 100=枯渇） | 定量的な疲労度モニタリング |
| 痛みVAS | スライダー 0-100 | 数値（0=痛みなし, 100=激痛） | ヘルニアの痛みの定点観測 |
| 頭痛 | 3ボタン | 0=なし, 1=軽い, 2=ひどい | 体調不良のシグナル。v6で追加 |
| DRAMMA休養タグ | 16タグ（複数選択） | カテゴリ別（D/R/A/M1/M2/A2） | 前夜の回復行動を6つの心理学的視点で振り返り |

**特殊機能**: 前夜の休養プラン振り返り — 昨晩の夜チェックアウトで選んだ休養プランが翌朝のチェックイン画面に表示され、「実際にできたか」をタップで振り返れる。

### 夜チェックアウト（screen-checkout）

1日の締めくくり。パフォーマンス評価 → 振り返り → 仕事からの切り離し → 今夜の回復プラン設計、の流れ。

| セクション | 内容 |
|-----------|------|
| パフォーマンスVAS | 今日の仕事の充実度（0-100スライダー）。AIリセット方程式の分析に使用 |
| 振り返りメモ | 自由記述テキスト。気づき・感謝・明日への一言 |
| 終業リチュアル | 102種のプールから各DRAMMAカテゴリ×2=12リチュアルをランダム表示。実行したものをタップ |
| 休養プラン | 102種のプールから各DRAMMAカテゴリ×2=12プランをランダム表示。今夜実行するものをタップ |

**設計ポイント**: 通勤電車（天満橋→南森町）での操作を想定。「ここからは完全にあなたの時間です」というメッセージで仕事モードからの切り替えを促す。

### SOSモード（screen-sos）

食欲の衝動が来た時の「緊急避難所」。

- **15分タイマー**: 衝動は必ず過ぎ去ることを視覚化（赤→黄→緑のプログレスリング）
- **リアリティメッセージ**: 12種のメッセージが10秒間隔でローテーション。カロリー換算、ヘルニアへの影響、未来の自分への手紙など
- **呼吸ガイド**: 4-4-4-2秒のサイクルで自律神経を整える
- **勝利宣言**: タイマー完了後に「何に勝ったか」を記録。紙吹雪エフェクト付き

### スペシャルデイチケット

10回勝利で1枚のチケットを獲得。チケットを使って「教え子とのランチ」「家族との食事」など、罪悪感なく食事を楽しむ権利に交換する。単なる報酬ではなく「人とのつながりの中で食事を楽しむ」というポジティブな体験設計。

### 分析画面（screen-analytics）

- **デイリースコア**: 直近7日分のスコアと4カテゴリ内訳をカード表示
- **AIリセット方程式**: 前夜のDRAMMAタグと翌日の疲労度の相関を分析し、最も効果的な回復行動を提示
- **レーダーチャート**: 6つのDRAMMA軸での休養充足度を可視化
- **DRAMMAスコアボード**: 朝のタグ＋夜のリチュアル＋休養プランの統合分析（積み上げ棒グラフ）
- **体重トレンド**: Chart.jsライングラフ。1週間/1ヶ月/1年のレンジ切替タブ付き
- **ヒートマップ**: 直近28日のSOS勝利活動
- **バッジギャラリー**: 13種のバッジ一覧（獲得済み/未獲得を区別）
- **クラウド復元**: GASのGETエンドポイントからSpreadsheetの全データを読み取り、localStorageにマージ

---

## 6. スコアリングエンジン詳細（v8で5カテゴリに再設計）

`calculateDailyScore(dateStr)` — 朝チェックインが必須。未入力日はスコアなし。

> **v8設計根拠**: 健康介入スコアカード（48項目）の分析結果に基づき、「エネルギー管理」カテゴリを新設。スコアカード上位の介入（サプリ、デジタルウォール、ストレッチ、就寝時刻）を正式にスコアに反映。

### カテゴリ1: 睡眠と身体（30点満点）

| サブスコア | 満点 | ロジック |
|-----------|------|---------|
| 睡眠時間 | 7 | 8h=7, 7.5h=6, 7h=5, 6.5h=4, 6h=3, 5.5h=2, 5h=1, 4.5h-=0 |
| 睡眠の質 | 5 | great=5, ok=3, light=2, terrible=0 |
| CPAP装着 | 6 | バッチリ=6, 途中外した=3, つけなかった=0 |
| 痛みVAS | 10 | `10 × (1 - pain/100)` |
| 頭痛 | 2 | なし=2, 軽い=1, ひどい=0 |

### カテゴリ2: 栄養と習慣（20点満点）

| サブスコア | 満点 | ロジック |
|-----------|------|---------|
| 夕食タイプ | 6 | ゆかごはん=6, 外食=3, 外食&飲酒=1 |
| 夕食時間 | 3 | 19時前=3, 19-21時=2, 21時以降=1 |
| 健康習慣 | 5 | 5タグ × 1点 |
| カフェイン | 3 | 0杯=3, 1杯13時前=2, 1杯午後=1, 2杯+=0 |
| 朝散歩 | 3 | 実施=3, 未実施=0 |

### カテゴリ3: エネルギー管理（20点満点）— v8新設

| サブスコア | 満点 | ロジック |
|-----------|------|---------|
| サプリ遵守 | 8 | 朝=2, 昼=2, 夜=4（夜は睡眠修復に直結のため重み倍） |
| デジタルウォール | 4 | 完璧=4, 一部破り=2, 未遵守=0 |
| ストレッチ | 4 | 5種目以上=4, 3-4=3, 1-2=1, 0=0 |
| 就寝時刻 | 4 | 22:30前=4, 23時前=3, 0時前=1, 0時以降=0 |

### カテゴリ4: リカバリー行動（15点満点）

| サブスコア | 満点 | ロジック |
|-----------|------|---------|
| 朝のDRAMMA振り返り | 5 | 6カテゴリ中の充足数 × (5/6) |
| 終業リチュアル | 5 | 5+実行=5, 3-4=3, 1-2=1, 0=0 |
| 休養プラン | 5 | 5+選択=5, 3-4=3, 1-2=1, 0=0 |

### カテゴリ5: パフォーマンス（15点満点）

| サブスコア | 満点 | ロジック |
|-----------|------|---------|
| パフォーマンスVAS | 7 | `7 × perfVas/100` |
| 疲労度VAS | 4 | `4 × (1 - fatigue/100)` |
| SOS勝利 | 4 | 1勝=2点, 最大4点 |

**合計: 100点（上限キャップ）**

---

## 7. DRAMMAモデル運用

DRAMMAモデル（Newman, Tay & Diener, 2014）に基づく6つの心理的回復軸：

| コード | 英名 | 和名 | 朝チェックインタグ | 数 |
|--------|------|------|-------------------|---|
| D | Detachment | 心理的切り離し | スマホ断ち, 何もしない, 通知オフ | 3 |
| R | Relaxation | リラクゼーション | 半身浴, 自然な睡眠, ストレッチ | 3 |
| A | Autonomy | 自律性 | 自分時間, 早めの就寝 | 2 |
| M1 | Mastery | 習熟 | 趣味の没頭, 読書 | 2 |
| M2 | Meaning | 意味・価値 | 恩送り, 由香ごはん, 感謝 | 3 |
| A2 | Affiliation | つながり | 有意義な対話, 子どもと遊ぶ | 2 |

### リチュアルプール（102種）

`RITUAL_POOL` — 6カテゴリ × 17種 = 102種。各セッションで2つずつランダム選出（合計12リチュアル）。通勤電車の中での短い行動を想定したマイクロ・リチュアルが中心。「天満橋の景色を眺めて深呼吸する」など固有の地名も入っている。

### 休養プランプール（102種）

`REST_PLAN_POOL` — 6カテゴリ × 17種 = 102種。各セッションで2つずつランダム選出（合計12プラン）。帰宅後の夜時間に実行できる回復アクション。「38-40度のぬるめ半身浴を20分」など具体的な行動指示。

### シャッフルロジック

- `pickRandom(arr, n)`: 配列をシャッフルして先頭n個を返す
- `shuffleRituals()`: RITUAL_POOLから各カテゴリ2つ選出 → DOMに動的生成
- `shuffleRestPlans()`: REST_PLAN_POOLから各カテゴリ2つ選出 → DOMに動的生成
- 🔀ボタンで再シャッフル可能

---

## 8. GAS連携の運用手順

### GAS_Script.js を更新するとき

1. [Google Apps Script エディタ](https://script.google.com) を開く
2. 対象プロジェクトを選択
3. `GAS_Script.js` の内容をエディタにコピー＆ペースト
4. **デプロイ → 新しいデプロイ → ウェブアプリ** を選択
5. アクセス権限: 「自分のみ」or 「全員」
6. **デプロイ** → 新しいバージョン番号が発行される
7. **重要**: デプロイ後のURLがアプリの `GAS_URL` と一致していることを確認

### シートにカラムを追加する場合

`getOrCreateSheet()` は**初回作成時のみ**ヘッダーを書き込む。既にシートが存在する場合：
- **方法A**: スプレッドシート上で手動でカラムヘッダーを追加
- **方法B**: シート名を一時的に変更 → GASが新しいシートを自動作成 → 旧シートのデータを移行

### POSTデータ型定義

```javascript
// type: 'checkin'
{
  date: "2026-04-05",
  timestamp: "2026-04-05T06:30:00.000Z",
  weight: 85.5,                    // kg (null可)
  sleepHours: 6.5,                 // 数値
  sleepQuality: "great",           // great/ok/light/terrible
  cpap: 2,                         // 2=バッチリ, 1=途中外した, 0=なし
  vas_fatigue: 35,                 // 0-100
  vas_pain: 60,                    // 0-100
  headache: 0,                     // 0=なし, 1=軽い, 2=ひどい
  tags: ["朝ウォーキング", "間食なし"],
  dinnerType: "yuka",              // yuka/eating_out/eating_out_alcohol
  dinnerTime: "before19"           // before19/19to21/after21
}

// type: 'checkout'
{
  date: "2026-04-05",
  timestamp: "2026-04-05T21:00:00.000Z",
  vas_performance: 72,             // 0-100
  reflection: "今日は集中できた",
  logoutRituals: ["仕事の通知を全てオフにする", "今日学んだことを1つ思い出す"]
}

// type: 'rest'
{
  date: "2026-04-05",
  timestamp: "2026-04-05T21:00:00.000Z",
  plans: ["38-40度のぬるめ半身浴を20分", "好きな本を30分読む"]
}

// type: 'victory'
{
  date: "2026-04-05T14:23:00.000Z",
  craving: "カップラーメン",
  duration: 420                    // 秒数
}

// type: 'badge'
{
  date: "2026-04-05T14:25:00.000Z",
  badgeId: "win_5"
}

// type: 'weight'
{
  date: "2026-04-05T06:30:00.000Z",
  kg: 85.5
}
```

---

## 9. 今後のロードマップ

### 進化構想の棚卸し（v8時点）

| パターン | テーマ | 状況 |
|---------|--------|------|
| A: 睡眠・回復最適化 | 夜チェックアウト、CPAP追跡、夕食時間記録、デジタルウォール、就寝時刻 | **v8で完成** |
| B: 身体機能・ペインマネジメント | 痛みVAS、体重-痛み重ねグラフ、ストレッチプロトコル | **v8で完成** |
| C: 認知エネルギー・メンタル | エネルギーバッテリー、カフェイン管理、睡眠負債表示 | **v8で完成** |
| D: 家族共創PBL | スペシャルデイの具体的クエスト化、感謝ループ | **一部実装**（チケット制度のみ） |

### 今後の候補（優先度順の提案）

1. **スペシャルデイ・クエスト化** — チケットを「家族への還元アクション」に交換する仮想ショップ（パターンDの完成）
2. **因果チェーン分析** — 「昨夜のデジタルウォール遵守→今朝の睡眠質が20%向上」のような多変数相関インサイト
3. **気分クイックチェック** — 日中の簡易気分トラッカー（適応障害の予防モニタリング）
4. **ファイル分割** — app.jsが2,500行超。3,500行超えたらESMモジュール分割を検討
5. **プッシュ通知** — 21:30デジタルウォール開始、13:40カフェインデッドラインの通知（Service Worker + Notification API）

### 技術的負債・注意点

- **プロパティ名の混在**: `vas_fatigue`（snake_case）と `sleepHours`（camelCase）が混在しているが、localStorageの既存データとの互換性のため**変更不可**
- **GASシートのカラム追加**: 既存シートは自動更新されないため、カラム追加時は手動対応が必要
- **Service Workerキャッシュ**: ファイル変更時は `CACHE_NAME` のバージョンアップを忘れずに
- **4時日付境界**: `getTodayStr()` は `Date.now() - 4時間` で計算。深夜0-4時の入力は前日扱い

---

## 10. AI引き継ぎプロンプト

新しいClaude Codeセッションを開始する際、以下をそのまま送信してください：

```text
あなたは「REVIVE - Personal Health OS」の専属リードエンジニアです。
教員の平山直樹さん専用のパーソナル健康管理PWAアプリの開発を、前回のセッションから引き継ぎます。

まず以下のファイルを順に読み込んでください：
1. `REVIVE_引き継ぎ書.md` — プロジェクトの全体像、設計思想、現在の状態
2. `app.js` — メインロジック（約1,900行）
3. `index.html` — UI構造
4. `GAS_Script.js` — クラウド連携仕様

ローカルパス: /Users/chopchop/Library/Mobile Documents/iCloud~md~obsidian/Documents/Antigravity/10_Projects/WebApp_Prototype/resist/
GitHub: https://github.com/chopchop-AT/resist
本番: https://chopchop-at.github.io/resist/

読み込みが完了したら、現在の状態の要約と、今日何を改善するか提案してください。
```

---

*この引き継ぎ書は開発の節目ごとに更新してください。*
*旧RESIST時代のドキュメント（4ファイル）は歴史的記録として保持しています。*
