# 🤖 RESIST AI開発・引き継ぎ情報 (Context Provision)

このノートは、別のAIチャット（Claude, Gemini, ChatGPTなど）を使って「RESISTアプリの開発・アップデート」を再開する際に、AIに読ませるための**「前提条件・環境設定シート」**です。
アップデートを指示する際は、このノートをAIに渡す（または読み込ませる）ことで、スムーズに開発を再開できます。

---

## 📁 1. プロジェクト基本情報
* **プロジェクト名:** RESIST (パーソナル健康管理 PWA)
* **ローカルパス:** `/Users/chopchop/Library/Mobile Documents/iCloud~md~obsidian/Documents/Antigravity/10_Projects/WebApp_Prototype/resist/`
* **本番アプリURL (スマホ用):** `https://chopchop-at.github.io/resist/`

## 🔑 2. GitHub リポジトリ・認証情報
アプリのソースコード管理および本番環境（GitHub Pages）へのデプロイに使用する情報です。

* **GitHub リポジトリURL:** `https://github.com/chopchop-AT/resist.git`
* **GitHub ユーザーネーム:** `chopchop-AT`
* **GitHub PAT (認証トークン):** `ghp_************************************`
  *(セキュリティのため伏せ字にしています。トークンは安全な場所で別途管理してください)*
*(AIがターミナルを使って `git push` を行う際にこのトークンを使用します)*

## ☁️ 3. バックエンド連携 (Googleスプレッドシート)
アプリのデータを永続化（自動保存）するために接続しているGoogle Apps Script（GAS）の情報です。

* **GAS Web Webhook URL:**
  `https://script.google.com/macros/s/AKfycbyN7Pob4WdTngwJgLspbCbT3iumeA2qss0OmBB0u0bWP7qHt1ntLUbwnfjSjXfJrJeE/exec`
* **仕組みの詳細:** 
  `app.js` 内に組み込まれた自動同期システム(`syncToGas` 関数)が、上記のURLに対して `POST` 通信（`text/plain` 形式）でJSONデータを送信しています。通信エラー時はローカルストレージ (`resist_sync_queue`) にキャッシュされ、次回オンライン時に自動再送される仕組み（v4.0）が実装されています。

---

## 🔗 4. 関連記録へのリンク (MOC)
RESISTアプリの開発ストーリーや、今後の進化の方向性を確認したい場合は以下のノートを参照してください。

* [[RESIST_開発記録]] (アプリ誕生から現在までの詳細な機能追加の軌跡)
* [[RESIST_未来の進化構想]] (パーソナルデータに基づく4つの今後の進化プラン)

---

## 🗣️ AIに投げる「引き継ぎ用プロンプトテンプレート」
新しいAIチャットを立ち上げた際、以下の文章をそのままコピー＆ペーストするとスムーズです。

```text
あなたは「RESIST」という健康管理PWAアプリの専属開発アシスタントです。
現在、私のローカル環境の以下のパスにソースコード（HTML/CSS/JS）があります。
/Users/chopchop/Library/Mobile Documents/iCloud~md~obsidian/Documents/Antigravity/10_Projects/WebApp_Prototype/resist/

これまでの開発の前提条件は、このノート（引き継ぎ情報）に記載の通りです。
GitHubのリポジトリやGASのデプロイ環境も構築済みです。

今日は新しいアップデートを行いたいので、まず現状の `index.html` と `app.js` を読み込んで待機してください。私が依頼する機能改修を行い、完了したらGitHubを使って本番環境へデプロイ（git push）してください。
```
