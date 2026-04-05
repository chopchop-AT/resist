/* ========================================
   REVIVE - Personal Health OS v5
   回復と活力を取り戻すパーソナルHealth OS
   ======================================== */

(function() {
  'use strict';

  // ---- Constants ----
  const TIMER_DURATION = 15 * 60;
  const CIRCUMFERENCE = 2 * Math.PI * 90;
  const MESSAGE_INTERVAL = 10000;
  // Storage key migration: resist_* → revive_* (preserves existing data)
  function migrateKey(oldKey, newKey) {
    if (!localStorage.getItem(newKey) && localStorage.getItem(oldKey)) {
      localStorage.setItem(newKey, localStorage.getItem(oldKey));
    }
  }
  migrateKey('resist_victories', 'revive_victories');
  migrateKey('resist_weights', 'revive_weights');
  migrateKey('resist_badges', 'revive_badges');
  migrateKey('resist_special', 'revive_special');
  migrateKey('resist_checkins', 'revive_checkins');
  migrateKey('resist_checkouts', 'revive_checkouts');
  migrateKey('resist_sync_queue', 'revive_sync_queue');

  const STORAGE_KEY = 'revive_victories';
  const WEIGHT_KEY = 'revive_weights';
  const BADGES_KEY = 'revive_badges';
  const SPECIAL_KEY = 'revive_special';
  const WINS_PER_TICKET = 10; // 勝利N回でチケット1枚

  // ---- Sync (Google Apps Script) ----
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbyN7Pob4WdTngwJgLspbCbT3iumeA2qss0OmBB0u0bWP7qHt1ntLUbwnfjSjXfJrJeE/exec';
  const SYNC_QUEUE_KEY = 'revive_sync_queue';

  function syncToGas(type, payload) {
    const item = { type, payload, id: Date.now() + Math.random() };
    let queue = [];
    try { queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY)) || []; } catch(e) {}
    queue.push(item);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    flushSyncQueue();
  }

  async function flushSyncQueue() {
    if (!navigator.onLine) return;
    let queue = [];
    try { queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY)) || []; } catch(e) {}
    if (queue.length === 0) return;

    const item = queue[0];
    try {
      await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ type: item.type, payload: item.payload })
      });
      queue.shift();
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
      if (queue.length > 0) flushSyncQueue();
    } catch (err) {
      console.error('GAS Sync failed:', err);
    }
  }

  window.addEventListener('online', flushSyncQueue);
  setTimeout(flushSyncQueue, 2000);

  // ---- Badge Definitions ----
  const BADGE_DEFS = [
    { id: 'first_win',    icon: '🌱', name: '最初の一歩',      desc: '初めて食欲に勝った！',         cond: (v,s,w) => v >= 1 },
    { id: 'win_5',        icon: '⚡', name: '5回勝利',         desc: '合計5回の勝利を達成',           cond: (v,s,w) => v >= 5 },
    { id: 'win_10',       icon: '🔟', name: '10回勝利',        desc: '合計10回の勝利を達成',          cond: (v,s,w) => v >= 10 },
    { id: 'win_30',       icon: '🏆', name: '30回勝利',        desc: '合計30回の勝利を達成',          cond: (v,s,w) => v >= 30 },
    { id: 'win_100',      icon: '💯', name: '100回勝利',       desc: '圧倒的な意志の強さ！',          cond: (v,s,w) => v >= 100 },
    { id: 'streak_3',     icon: '🔥', name: '3日連続',         desc: '3日連続で食欲に勝利',           cond: (v,s,w) => s >= 3 },
    { id: 'streak_7',     icon: '🌟', name: '1週間連続',       desc: '7日連続！素晴らしい習慣！',     cond: (v,s,w) => s >= 7 },
    { id: 'streak_14',    icon: '🚀', name: '2週間連続',       desc: '14日連続！あなたは本物だ！',    cond: (v,s,w) => s >= 14 },
    { id: 'streak_30',    icon: '👑', name: '1ヶ月連続',       desc: '30日連続！王者の称号！',        cond: (v,s,w) => s >= 30 },
    { id: 'weight_start', icon: '📊', name: '記録スタート',    desc: '体重の記録を開始した',          cond: (v,s,w) => w >= 1 },
    { id: 'weight_7',     icon: '📅', name: '7日記録',         desc: '体重を7日連続で記録',           cond: (v,s,w) => w >= 7 },
    { id: 'weight_loss',  icon: '⚖️', name: '減量達成',        desc: '記録開始時より体重が減った！',  cond: (v,s,w,wd) => wd < 0 },
  ];

  // ---- Reality Check Messages ----
  const REALITY_MESSAGES = [
    { icon: '💀', text: 'そのカップラーメン1杯 ≒ 400kcal。\n消費するにはジョギング50分が必要です。' },
    { icon: '🔥', text: 'ヘルニアの痛み、今以上に悪化させたいですか？\n体重が1kg増えるたび、腰への負担は3kg増えます。' },
    { icon: '😴', text: 'CPAPなしで眠れる朝を想像してください。\n体重を落とせば、それが現実になります。' },
    { icon: '🦶', text: 'あなたの足のしびれ。\n体重が減れば、椎間板への圧迫が減り、改善の可能性があります。' },
    { icon: '⚡', text: 'この衝動は15分で消えます。\nでもハンバーガーのカロリーは、体に何時間も残り続けます。' },
    { icon: '🏥', text: '医者に「痩せてください」と言われた時のことを思い出してください。\nあなたの体は今、助けを求めています。' },
    { icon: '💪', text: 'ここで我慢できたら、明日の自分は今日の自分に感謝します。\n未来の自分を助けるのは、今この瞬間のあなたです。' },
    { icon: '🎯', text: '「食べたい」は脳のバグです。\n本当にお腹が空いているわけではありません。\n感情と空腹を区別しましょう。' },
    { icon: '⏰', text: 'フライドチキン1ピース ≒ 250kcal。\nそのたった10分の快楽のために、\nあなたの健康を犠牲にする価値はありますか？' },
    { icon: '🌅', text: '体が軽くなった未来を想像してください。\n階段を軽々と上がれる。腰の痛みが和らぐ。\nCPAPが要らなくなる。それは可能です。' },
    { icon: '🧠', text: '食欲の衝動は波のようなもの。\n必ずピークがあり、必ず引いていきます。\nこの波を乗り越えるだけでいい。' },
    { icon: '📊', text: '体重が5%減るだけで、\n睡眠時無呼吸の症状は大幅に改善します。\nたった数kgの差が人生を変えます。' }
  ];

  const BREATHING_PHASES = [
    { text: '吸って…', duration: 4000 },
    { text: '止めて…', duration: 4000 },
    { text: '吐いて…', duration: 4000 },
    { text: '…',      duration: 2000 }
  ];

  // ---- Logout Ritual Pool (DRAMMA) — 100 rituals ----
  const RITUAL_POOL = {
    D: [
      { icon: '📵', text: '仕事の通知を全てオフにする' },
      { icon: '💻', text: '仕事アプリ・メールを閉じる' },
      { icon: '🎧', text: 'お気に入りの音楽を1曲聴く' },
      { icon: '🚶', text: '帰り道で少し遠回りする' },
      { icon: '📱', text: 'SNSを5分だけ封印する' },
      { icon: '🧘', text: '1分間、目を閉じて呼吸に集中' },
      { icon: '🪟', text: '空や景色を30秒間ぼーっと眺める' },
      { icon: '📝', text: '明日のToDoを書き出して頭を空にする' },
      { icon: '🚪', text: '「今日の仕事は終わり」と口に出す' },
      { icon: '🔇', text: 'イヤホンを外して環境音に集中する' },
      { icon: '🌉', text: '天満橋の景色を眺めて深呼吸する' },
      { icon: '🧳', text: 'カバンを閉じて「仕事完了」の儀式をする' },
      { icon: '🎶', text: '帰り道専用のプレイリストを再生する' },
      { icon: '☁️', text: '雲の形を30秒間観察する' },
      { icon: '🚃', text: '電車の揺れに身を任せて何も考えない' },
      { icon: '🌆', text: '夕暮れの色の変化を味わう' },
      { icon: '💨', text: '3回深く息を吐いて仕事を手放す' }
    ],
    R: [
      { icon: '🫁', text: '深呼吸を3回ゆっくりする' },
      { icon: '🤲', text: '手のひらをグーパーして力を抜く' },
      { icon: '💆', text: '首・肩を軽く回す' },
      { icon: '🛀', text: '帰ったらぬるめのシャワーを浴びる' },
      { icon: '☕', text: 'ノンカフェインの温かい飲み物を想像する' },
      { icon: '🦶', text: '靴を脱いだら足の指を広げる' },
      { icon: '😌', text: '電車の中で全身の力を抜いてみる' },
      { icon: '🌬️', text: '4-7-8呼吸法を1セットやる' },
      { icon: '👐', text: '手首をぶらぶらさせて脱力する' },
      { icon: '🧖', text: '帰宅後に半身浴する予定を立てる' },
      { icon: '👁️', text: '目を閉じて眼球を優しく回す' },
      { icon: '🤷', text: '肩を耳まで上げてストンと落とす×3回' },
      { icon: '🫠', text: '座ったまま全身をゆるめるボディスキャン' },
      { icon: '👃', text: '好きな香りを思い出してリラックスする' },
      { icon: '🌊', text: '波の音を想像しながら呼吸を整える' },
      { icon: '😮‍💨', text: 'ため息を「意図的に」3回つく' },
      { icon: '🖐️', text: '指を1本ずつゆっくり曲げ伸ばしする' }
    ],
    A: [
      { icon: '🎯', text: '今夜やりたいことを1つ決める' },
      { icon: '📖', text: '読みたい本のページを開く準備をする' },
      { icon: '🎮', text: '今夜の「自分時間」を宣言する' },
      { icon: '🛒', text: '帰り道で自分だけのちょっとした寄り道' },
      { icon: '📺', text: '見たかった動画を1本選んでおく' },
      { icon: '🗓️', text: '明日の「ごほうびタイム」を決める' },
      { icon: '🎵', text: '今の気分に合うプレイリストを選ぶ' },
      { icon: '🍵', text: '今夜飲む飲み物を自分で選ぶ' },
      { icon: '📱', text: '今夜のスマホ使用時間を自分で決める' },
      { icon: '🌙', text: '就寝時間を自分で設定する' },
      { icon: '🛤️', text: '帰り道のルートを自分で選ぶ' },
      { icon: '🍽️', text: '今夜食べたいおかずを1品リクエストする' },
      { icon: '🧴', text: '今夜使うボディケアアイテムを決める' },
      { icon: '📓', text: '今夜書く日記のテーマを決める' },
      { icon: '⏰', text: '明朝のアラーム時刻を自分で調整する' },
      { icon: '🪴', text: '今夜の「小さな楽しみ」を1つ決める' },
      { icon: '🎒', text: '明日の準備を今夜中にやると決める' }
    ],
    M1: [
      { icon: '📚', text: '今日学んだことを1つ思い出す' },
      { icon: '💡', text: '今日の「小さな工夫」を振り返る' },
      { icon: '🏅', text: '今日うまくいったことを1つ思い出す' },
      { icon: '🧠', text: '新しく知った言葉や概念を反芻する' },
      { icon: '📊', text: '今日の自分の成長を数値で振り返る' },
      { icon: '✍️', text: '明日試したいアイデアを1つメモする' },
      { icon: '🎓', text: '今日教えた中で一番良かった授業を思い出す' },
      { icon: '🔧', text: '今日改善できた業務プロセスを確認する' },
      { icon: '📐', text: '今日取り組んだ課題の進捗を整理する' },
      { icon: '🌱', text: '1ヶ月前の自分と今の自分を比べてみる' },
      { icon: '🗣️', text: '今日の授業で生徒の反応が良かった場面を振り返る' },
      { icon: '⚙️', text: '今日発見した時短テクニックを記憶する' },
      { icon: '📈', text: '今週の自分の成長ポイントを1つ挙げる' },
      { icon: '🔍', text: '今日「なぜ？」と思ったことを1つ覚えておく' },
      { icon: '🎯', text: '明日の授業で試す新しいアプローチを考える' },
      { icon: '📋', text: '今日の業務で効率化できた点を振り返る' },
      { icon: '💪', text: '今日の自分の頑張りを具体的に1つ認める' }
    ],
    M2: [
      { icon: '🙏', text: '今日感謝できることを1つ思い浮かべる' },
      { icon: '💌', text: '誰かの役に立てた瞬間を思い出す' },
      { icon: '🌟', text: '今日の仕事が誰の未来につながるか想像する' },
      { icon: '🎁', text: '帰宅後に家族にできる小さな親切を考える' },
      { icon: '📸', text: '今日一番心に残った場面を思い返す' },
      { icon: '🤝', text: '今日「ありがとう」と言えた回数を数える' },
      { icon: '🕊️', text: '明日、誰かのためにできることを1つ考える' },
      { icon: '🌈', text: '今日の良かった出来事を3つ思い出す' },
      { icon: '📖', text: '自分の仕事の「意味」を一言で表現してみる' },
      { icon: '💫', text: '教え子たちの成長を思い浮かべる' },
      { icon: '🏫', text: '自分が教師になった理由を思い出す' },
      { icon: '🌻', text: '今日の小さな幸せを1つ数える' },
      { icon: '✨', text: '家族の笑顔を思い浮かべる' },
      { icon: '🫶', text: '今日自分が誰かに与えた影響を想像する' },
      { icon: '🕰️', text: '5年後の教え子の姿を想像してみる' },
      { icon: '🌍', text: '自分の存在が誰かの支えになっていることを認める' },
      { icon: '📜', text: '今日の仕事で一番誇れることを1つ選ぶ' }
    ],
    A2: [
      { icon: '👋', text: '家族に「ただいま」のメッセージを送る' },
      { icon: '💬', text: '今日話して楽しかった人を思い出す' },
      { icon: '📞', text: '久しぶりに連絡したい人を思い浮かべる' },
      { icon: '🍲', text: '今夜の食卓での話題を1つ考える' },
      { icon: '🤗', text: '帰ったら最初に家族に声をかける' },
      { icon: '😊', text: '今日職場で笑い合った瞬間を思い出す' },
      { icon: '✉️', text: '感謝のメッセージを1つ送る（送らなくてもOK）' },
      { icon: '🏠', text: '家族の今日の様子を聞く質問を用意する' },
      { icon: '👨‍👩‍👧', text: '週末の家族プランを考える' },
      { icon: '🎉', text: '教え子や同僚の良いニュースを思い出す' },
      { icon: '🫂', text: '帰宅したらハグする' },
      { icon: '🍳', text: '由香さんのご飯を楽しみにしていると伝える' },
      { icon: '📷', text: '今日の出来事を1つ家族に話す準備をする' },
      { icon: '🎲', text: '帰宅後に子どもと遊ぶ内容を考える' },
      { icon: '👂', text: '家族の話を「最後まで聞く」と決める' },
      { icon: '💐', text: '帰り道で家族へのお土産を考える' },
      { icon: '🤙', text: '同僚に「お疲れ様」を丁寧に言う' }
    ]
  };

  // ---- Rest Plan Pool (DRAMMA) — 102 plans ----
  const REST_PLAN_POOL = {
    D: [
      { icon: '📵', text: '21時以降はスマホを別の部屋に置く' },
      { icon: '🧘', text: '10分間のマインドフルネス瞑想' },
      { icon: '🌿', text: '何もしない「ニクセン」の時間を15分つくる' },
      { icon: '🔕', text: '全デバイスの通知をオフにして過ごす' },
      { icon: '🪟', text: '窓の外をぼんやり眺める時間をつくる' },
      { icon: '🫧', text: 'お風呂で仕事のことを考えないチャレンジ' },
      { icon: '🕯️', text: '間接照明だけで過ごす時間をつくる' },
      { icon: '🌌', text: 'ベランダで夜空を5分間眺める' },
      { icon: '📺', text: 'テレビを消して静かに過ごす30分' },
      { icon: '🎐', text: '自然音BGMを流してデジタルデトックス' },
      { icon: '📦', text: '仕事カバンをクローゼットにしまう儀式' },
      { icon: '🧹', text: '机の上を片付けて「リセット」する' },
      { icon: '🌑', text: '部屋を暗くして目を休める' },
      { icon: '☕', text: 'ハーブティーを淹れる「だけ」に集中する' },
      { icon: '🧊', text: '冷たいタオルで顔を拭いて切り替える' },
      { icon: '📓', text: '頭の中のモヤモヤを紙に書き出して手放す' },
      { icon: '🌬️', text: 'ボックス呼吸法（4-4-4-4）を5分間' }
    ],
    R: [
      { icon: '🛀', text: '38-40度のぬるめ半身浴を20分' },
      { icon: '🧘', text: '寝る前のストレッチ10分' },
      { icon: '💆', text: 'セルフヘッドマッサージ5分' },
      { icon: '🦶', text: 'フォームローラーで足裏をほぐす' },
      { icon: '🫁', text: '4-7-8呼吸法を5セット' },
      { icon: '🧖', text: 'ホットアイマスクで目の疲れをケア' },
      { icon: '🤲', text: '手湯（ハンドバス）で末端を温める' },
      { icon: '🌡️', text: '湯たんぽで腰を温める' },
      { icon: '😴', text: '漸進的筋弛緩法（PMR）を実施する' },
      { icon: '🫠', text: 'ボディスキャン瞑想で全身をゆるめる' },
      { icon: '👣', text: 'つま先からゆっくり脱力するリラクゼーション' },
      { icon: '🎵', text: 'リラクゼーション音楽を聴きながら横になる' },
      { icon: '🌸', text: 'アロマオイルで首筋をマッサージ' },
      { icon: '🤸', text: '猫のポーズ・牛のポーズを5回ずつ' },
      { icon: '🧣', text: 'ホットタオルで肩と首を温める' },
      { icon: '🦴', text: '腰痛ケアのためのゆるストレッチ' },
      { icon: '🫗', text: '白湯をゆっくり飲みながらリラックス' }
    ],
    A: [
      { icon: '📖', text: '好きな本を30分読む' },
      { icon: '🎮', text: '自分だけの趣味時間を30分確保する' },
      { icon: '🎵', text: '好きな音楽アルバムを1枚通して聴く' },
      { icon: '📓', text: '今夜の過ごし方を自分で「設計」する' },
      { icon: '🧩', text: 'パズルやクロスワードに没頭する' },
      { icon: '🍵', text: '自分で選んだ飲み物をゆっくり味わう' },
      { icon: '🛋️', text: '「何もしなくていい時間」を自分に許可する' },
      { icon: '🖊️', text: '好きなことを好きなだけ書く自由ノートタイム' },
      { icon: '🎨', text: '色鉛筆やペンで自由に落書きする' },
      { icon: '📺', text: '以前から気になっていた動画を1本観る' },
      { icon: '🌙', text: '今夜は○時に寝ると自分で決めて守る' },
      { icon: '🧴', text: '丁寧なスキンケアの時間を自分に贈る' },
      { icon: '🗺️', text: '行きたい場所を調べて空想旅行する' },
      { icon: '👕', text: '明日着る服を自分で選んで準備する' },
      { icon: '🎧', text: 'Podcastの好きなエピソードを選んで聴く' },
      { icon: '🧺', text: '自分のペースで小さな家事を1つだけやる' },
      { icon: '🌜', text: '今夜の「自分ルール」を1つ決める' }
    ],
    M1: [
      { icon: '📚', text: '興味のある分野の記事を1本読む' },
      { icon: '🎓', text: '明日の授業の新しいアプローチを考える' },
      { icon: '📝', text: '今日の気づきを3行で日記に書く' },
      { icon: '🧠', text: '教育に関する新しい理論を1つ調べる' },
      { icon: '🎯', text: '1週間の目標を振り返って進捗確認する' },
      { icon: '💻', text: '新しいスキルの練習を15分する' },
      { icon: '📋', text: '明日の授業プランを1つブラッシュアップ' },
      { icon: '🎨', text: '新しい教材アイデアをスケッチする' },
      { icon: '📊', text: '今月の自分の成長を振り返る' },
      { icon: '🗂️', text: '学んだことを整理してノートにまとめる' },
      { icon: '🎙️', text: '教育系Podcastを1エピソード聴く' },
      { icon: '📐', text: '明日使えるワークシートを1つ改良する' },
      { icon: '🔬', text: '生徒の反応パターンを分析してメモする' },
      { icon: '✏️', text: '今日の授業の改善点を1つ書き出す' },
      { icon: '🌐', text: '他校の優れた実践事例を1つ調べる' },
      { icon: '📖', text: '教育書を10ページ読む' },
      { icon: '🤔', text: '最近の「うまくいった教え方」を言語化する' }
    ],
    M2: [
      { icon: '🙏', text: '今日の感謝を3つ書き出す' },
      { icon: '💌', text: '家族への感謝の手紙を心の中で書く' },
      { icon: '📸', text: '今日の良かった瞬間を写真で記録する' },
      { icon: '🌟', text: '自分の仕事が生徒の人生にどう影響するか想像する' },
      { icon: '🎁', text: '明日誰かにできる小さな親切を計画する' },
      { icon: '📜', text: '自分の「人生のミッション」を思い出す' },
      { icon: '🕊️', text: '今日の自分を「よくやった」と認める' },
      { icon: '🌱', text: '教え子の成長エピソードを思い出して味わう' },
      { icon: '✨', text: '今週の「意味があった」出来事を振り返る' },
      { icon: '🤝', text: '困っている同僚を助けた経験を思い出す' },
      { icon: '🏠', text: '家族と過ごせる時間のありがたさを感じる' },
      { icon: '📝', text: '「なぜ教師を続けるのか」を3行で書く' },
      { icon: '🌈', text: '今日のポジティブな出来事だけを思い出す' },
      { icon: '🫶', text: '由香さんへの感謝を具体的に思い浮かべる' },
      { icon: '💪', text: '自分の価値観に沿った行動を1つ思い出す' },
      { icon: '🌻', text: '生徒からもらった嬉しい言葉を思い出す' },
      { icon: '🎗️', text: '社会に貢献できている自分を認める' }
    ],
    A2: [
      { icon: '🗣️', text: '由香さんと今日の出来事を15分話す' },
      { icon: '👨‍👩‍👧', text: '子どもと一緒に遊ぶ時間を20分つくる' },
      { icon: '🍲', text: '家族と食卓を囲んでゆっくり食事する' },
      { icon: '📞', text: '両親や兄弟に5分だけ電話する' },
      { icon: '📷', text: '家族の写真を一緒に見返す' },
      { icon: '🎲', text: '家族でボードゲームやカードゲームをする' },
      { icon: '🤗', text: '家族にハグする（3秒以上）' },
      { icon: '📖', text: '子どもに絵本を読み聞かせる' },
      { icon: '🚶', text: '家族と近所を散歩する' },
      { icon: '✉️', text: '友人や同僚に感謝のLINEを送る' },
      { icon: '🎵', text: '家族と一緒に好きな音楽を聴く' },
      { icon: '🍳', text: '由香さんの料理を手伝う' },
      { icon: '👂', text: '家族の話を遮らず最後まで聴く' },
      { icon: '😊', text: '今日あった面白い話を家族にシェアする' },
      { icon: '🧸', text: '子どもの「今日の一番」を聞いてあげる' },
      { icon: '💬', text: '職場の仲間に明日かける言葉を考える' },
      { icon: '🌙', text: '家族に「おやすみ」を丁寧に言う' }
    ]
  };

  const DRAMMA_LABELS = {
    D: 'Detachment', R: 'Relaxation', A: 'Autonomy',
    M1: 'Mastery', M2: 'Meaning', A2: 'Affiliation'
  };

  const DRAMMA_DESCS = {
    D: '心理的切り離し', R: 'リラクゼーション', A: '自律性',
    M1: '習熟', M2: '意味・価値', A2: 'つながり'
  };

  // ---- State ----
  let timerInterval = null;
  let messageInterval = null;
  let breathingTimeout = null;
  let remainingSeconds = TIMER_DURATION;
  let timerStartTime = null;
  let currentMessageIndex = 0;

  // ---- DOM ----
  const screens = {
    home:    document.getElementById('screen-home'),
    sos:     document.getElementById('screen-sos'),
    checkin: document.getElementById('screen-checkin'),
    checkout: document.getElementById('screen-checkout'),
    analytics: document.getElementById('screen-analytics')
  };

  const els = {
    sosBtn:             document.getElementById('btn-sos'),
    backSos:            document.getElementById('btn-back-sos'),
    btnVictory:         document.getElementById('btn-victory'),
    timerMinutes:       document.getElementById('timer-minutes'),
    timerSeconds:       document.getElementById('timer-seconds'),
    timerProgress:      document.getElementById('timer-progress'),
    realityBox:         document.getElementById('reality-box'),
    realityMessage:     document.getElementById('reality-message'),
    breathingText:      document.getElementById('breathing-text'),
    modalCraving:       document.getElementById('modal-craving'),
    customCravingInput: document.getElementById('custom-craving-input'),
    btnCustomCraving:   document.getElementById('btn-custom-craving'),
    victoryEffect:      document.getElementById('victory-effect'),
    victoryDetail:      document.getElementById('victory-detail'),
    victoryStreakMsg:    document.getElementById('victory-streak-msg'),
    btnVictoryClose:    document.getElementById('btn-victory-close'),
    todayWins:          document.getElementById('today-wins'),
    currentStreak:      document.getElementById('current-streak'),
    totalWins:          document.getElementById('total-wins'),
    homeLatestBadge:    document.getElementById('home-latest-badge'),
    homeBadgeIcon:      document.getElementById('home-badge-icon'),
    homeBadgeName:      document.getElementById('home-badge-name'),
    histTotal:          document.getElementById('hist-total'),
    histStreak:         document.getElementById('hist-streak'),
    heatmapContainer:   document.getElementById('heatmap-container'),
    recentWinsList:     document.getElementById('recent-wins-list'),
    badgesGrid:         document.getElementById('badges-grid'),
    modalBadge:         document.getElementById('modal-badge'),
    newBadgeIcon:       document.getElementById('new-badge-icon'),
    newBadgeName:       document.getElementById('new-badge-name'),
    newBadgeDesc:       document.getElementById('new-badge-desc'),
    btnBadgeClose:      document.getElementById('btn-badge-close'),
  };

  // ---- Victory Data ----
  function getVictories() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  }

  function saveVictory(craving, durationSec) {
    const v = getVictories();
    const entry = { date: new Date().toISOString(), craving, duration: durationSec };
    v.push(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
    syncToGas('victory', entry);
  }

  // REVIVE日: 午前4時を1日の切り替え時刻とする
  // 0:00〜3:59の入力は前日として扱う
  function getTodayStr() {
    const d = new Date(Date.now() - 4 * 60 * 60 * 1000);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function getDateStr(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function getTodayWins() {
    const today = getTodayStr();
    return getVictories().filter(v => getDateStr(v.date) === today).length;
  }

  function getTotalWins() { return getVictories().length; }


  // 汎用ストリーク計算（日付文字列の配列から連続日数を算出）
  function calcStreak(dateStrings) {
    if (dateStrings.length === 0) return 0;
    const days = [...new Set(dateStrings)].sort().reverse();
    const today = getTodayStr();
    const yesterday = getDateStr(new Date(Date.now() - 86400000));
    if (days[0] !== today && days[0] !== yesterday) return 0;
    let streak = 1;
    for (let i = 0; i < days.length - 1; i++) {
      const diff = (new Date(days[i]) - new Date(days[i+1])) / 86400000;
      if (diff === 1) streak++; else break;
    }
    return streak;
  }

  function getStreak() {
    return calcStreak(getVictories().map(v => getDateStr(v.date)));
  }

  function getWinsPerDay(days) {
    const v = getVictories();
    const map = {};
    for (let i = 0; i < days; i++) {
      map[getDateStr(new Date(Date.now() - i * 86400000))] = 0;
    }
    v.forEach(x => { const ds = getDateStr(x.date); if (ds in map) map[ds]++; });
    return map;
  }

  // ---- Special Day Data ----
  function getSpecialDays() {
    try { return JSON.parse(localStorage.getItem(SPECIAL_KEY)) || { used: [] }; } catch { return { used: [] }; }
  }

  function getAvailableTickets() {
    const total = getTotalWins();
    const used = getSpecialDays().used.length;
    return Math.floor(total / WINS_PER_TICKET) - used;
  }

  function getWinsInCurrentCycle() {
    const total = getTotalWins();
    return total % WINS_PER_TICKET;
  }

  function useTicket(note) {
    const data = getSpecialDays();
    data.used.push({ date: new Date().toISOString(), note });
    localStorage.setItem(SPECIAL_KEY, JSON.stringify(data));
  }

  // ---- Weight Data ----
  function getWeights() {
    try { return JSON.parse(localStorage.getItem(WEIGHT_KEY)) || []; } catch { return []; }
  }

  function saveWeight(kg) {
    const w = getWeights();
    const today = getTodayStr();
    const existing = w.findIndex(x => getDateStr(x.date) === today);
    const entry = { date: new Date().toISOString(), kg };
    if (existing >= 0) w[existing] = entry; else w.push(entry);
    w.sort((a, b) => a.date.localeCompare(b.date));
    localStorage.setItem(WEIGHT_KEY, JSON.stringify(w));
    return w;
  }

  function getWeightDiff() {
    const w = getWeights();
    if (w.length < 2) return null;
    return w[w.length - 1].kg - w[0].kg;
  }

  // ---- Badge Data ----
  function getEarnedBadges() {
    try { return JSON.parse(localStorage.getItem(BADGES_KEY)) || []; } catch { return []; }
  }

  function checkAndAwardBadges() {
    const total = getTotalWins();
    const streak = getStreak();
    const weights = getWeights();
    const wCount = weights.length;
    const wDiff = getWeightDiff();
    const earned = getEarnedBadges();
    const newBadges = [];

    BADGE_DEFS.forEach(badge => {
      if (earned.includes(badge.id)) return;
      if (badge.cond(total, streak, wCount, wDiff)) {
        earned.push(badge.id);
        newBadges.push(badge);
        syncToGas('badge', { date: new Date().toISOString(), badgeId: badge.id });
      }
    });

    if (newBadges.length > 0) {
      localStorage.setItem(BADGES_KEY, JSON.stringify(earned));
    }
    return newBadges;
  }

  // ---- Navigation ----
  function showScreen(name) {
    Object.values(screens).forEach(s => { if (s) s.classList.remove('active'); });
    if (screens[name]) screens[name].classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.screen === name);
    });
    if (name === 'home') updateHomeStats();
    if (name === 'checkin') initCheckinScreen();
    if (name === 'checkout') initCheckoutScreen();
    if (name === 'analytics') updateAnalyticsScreen();
  }

  // ---- Home ----
  function updateHomeStats() {
    els.todayWins.textContent = getTodayWins();
    els.currentStreak.textContent = getStreak();
    els.totalWins.textContent = getTotalWins();

    // Daily score on home
    const today = getTodayStr();
    const score = calculateDailyScore(today);
    const scoreEl = document.getElementById('home-score-total');
    if (score && scoreEl) {
      scoreEl.textContent = score.total;
      scoreEl.className = 'home-score-total ' + (score.total >= 70 ? 'score-high' : score.total >= 40 ? 'score-mid' : 'score-low');
      document.getElementById('home-cat-sleep').textContent = score.sleep.score + '/' + score.sleep.max;
      document.getElementById('home-cat-lifestyle').textContent = score.lifestyle.score + '/' + score.lifestyle.max;
      const energyEl = document.getElementById('home-cat-energy');
      if (energyEl && score.energy) energyEl.textContent = score.energy.score + '/' + score.energy.max;
      document.getElementById('home-cat-recovery').textContent = score.recovery.score + '/' + score.recovery.max;
      document.getElementById('home-cat-perf').textContent = score.performance.score + '/' + score.performance.max;
    }

    // Progress indicators
    const progCheckin = document.getElementById('home-prog-checkin');
    const progCheckout = document.getElementById('home-prog-checkout');
    const progRest = document.getElementById('home-prog-rest');
    if (progCheckin) progCheckin.className = 'home-progress-item' + (getTodayCheckin() ? ' done' : '');
    if (progCheckout) progCheckout.className = 'home-progress-item' + (getTodayCheckout() ? ' done' : '');
    if (progRest) progRest.className = 'home-progress-item' + (getTodayRest() ? ' done' : '');

    // Show latest earned badge
    const earned = getEarnedBadges();
    if (earned.length > 0) {
      const latest = BADGE_DEFS.find(b => b.id === earned[earned.length - 1]);
      if (latest && els.homeLatestBadge) {
        els.homeBadgeIcon.textContent = latest.icon;
        els.homeBadgeName.textContent = `最新バッジ：${latest.name}`;
        els.homeLatestBadge.style.display = 'block';
      }
    }

    // Caffeine deadline alert (show between 10:00-13:40)
    const caffeineAlert = document.getElementById('caffeine-alert');
    if (caffeineAlert) {
      const now = new Date();
      const h = now.getHours(), m = now.getMinutes();
      const minuteOfDay = h * 60 + m;
      caffeineAlert.style.display = (minuteOfDay >= 600 && minuteOfDay <= 820) ? 'block' : 'none';
    }

    // Energy Battery
    updateBattery();

    // 7 Key Interventions Checklist
    updateInterventions();

    // Evening Timeline
    updateTimeline();

    // Update special day ticket UI
    const tickets = getAvailableTickets();
    const cycleProg = getWinsInCurrentCycle();
    document.getElementById('special-day-count').textContent = tickets;
    document.getElementById('wins-to-next').textContent = WINS_PER_TICKET - cycleProg;
    document.getElementById('special-progress-bar').style.width = (cycleProg / WINS_PER_TICKET * 100) + '%';
    const useBtn = document.getElementById('btn-use-ticket');
    useBtn.style.display = tickets > 0 ? 'block' : 'none';
  }

  // ---- Energy Battery ----
  function updateBattery() {
    const pctEl = document.getElementById('battery-pct');
    const labelEl = document.getElementById('battery-label');
    const fillEl = document.getElementById('battery-bar-fill');
    const debtEl = document.getElementById('battery-debt');
    if (!pctEl) return;

    const checkin = getTodayCheckin();
    if (!checkin) {
      pctEl.textContent = '--';
      pctEl.className = 'battery-pct';
      labelEl.textContent = '朝チェックインでエネルギーを算出';
      fillEl.style.width = '0%';
      fillEl.className = 'battery-bar-fill';
      if (debtEl) debtEl.style.display = 'none';
      return;
    }

    // Base charge from sleep + CPAP + pain
    const sleepH = parseFloat(checkin.sleepHours) || 6;
    const sleepCharge = Math.min(30, Math.max(0, (sleepH - 4) * 10)); // 4h=0, 7h=30
    const cpapCharge = checkin.cpap === 2 ? 20 : checkin.cpap === 1 ? 10 : 0;
    const qualityMap = { 'great': 15, 'ok': 10, 'light': 5, 'terrible': 0 };
    const qualityCharge = qualityMap[checkin.sleepQuality] ?? 8;
    const painDrain = Math.round((checkin.vas_pain ?? 50) * 0.15); // 0-15 drain
    const fatigueDrain = Math.round((checkin.vas_fatigue ?? 50) * 0.1); // 0-10 drain

    let morningCharge = Math.min(100, sleepCharge + cpapCharge + qualityCharge - painDrain - fatigueDrain);
    morningCharge = Math.max(5, morningCharge); // Floor at 5%

    // Time-based depletion
    const now = new Date();
    const h = now.getHours();
    let depletion = 0;
    if (h >= 6 && h < 12) depletion = (h - 6) * 5;
    else if (h >= 12 && h < 17) depletion = 30 + (h - 12) * 7;
    else if (h >= 17) depletion = 65 + (h - 17) * 3;

    // Recovery events boost
    let boost = 0;
    const checkout = getTodayCheckout();
    if (checkin.dinnerType === 'yuka') boost += 8;
    if (checkout && checkout.digitalWall === 2) boost += 5;
    if (checkout && checkout.stretchCount >= 5) boost += 5;
    if (checkin.supplement_morning && checkin.supplement_noon && checkin.supplement_evening) boost += 3;

    const battery = Math.max(0, Math.min(100, morningCharge - depletion + boost));
    const level = battery >= 70 ? 'high' : battery >= 40 ? 'mid' : 'low';

    pctEl.textContent = battery;
    pctEl.className = 'battery-pct ' + level;
    fillEl.style.width = battery + '%';
    fillEl.className = 'battery-bar-fill ' + level;

    if (battery >= 70) labelEl.textContent = 'エネルギー充分 — 今日も全力で';
    else if (battery >= 40) labelEl.textContent = '省エネモード推奨 — 優先順位を絞ろう';
    else labelEl.textContent = 'エネルギー警告 — 回復アクションを最優先に';

    // Sleep debt (last 7 days)
    if (debtEl) {
      const checkins = getCheckins().slice(-7);
      if (checkins.length >= 3) {
        let debt = 0;
        checkins.forEach(c => { debt += 7 - (parseFloat(c.sleepHours) || 6); });
        if (debt > 0) {
          debtEl.style.display = 'block';
          debtEl.textContent = `💤 睡眠負債: -${debt.toFixed(1)}時間（直近${checkins.length}日）`;
        } else {
          debtEl.style.display = 'none';
        }
      } else {
        debtEl.style.display = 'none';
      }
    }
  }

  // ---- 7 Key Interventions Checklist ----
  function updateInterventions() {
    const today = getTodayStr();
    const checkin = getTodayCheckin();
    const checkout = getTodayCheckout();
    const rest = getTodayRest();
    let doneCount = 0;

    function setIV(id, status, text) {
      const el = document.getElementById(id);
      const statusEl = document.getElementById(id + '-status');
      if (!el || !statusEl) return;
      el.className = 'intervention-item ' + status;
      statusEl.textContent = text;
      if (status === 'done') doneCount++;
    }

    // 1. Sleep 7h
    if (checkin && checkin.sleepHours) {
      const h = parseFloat(checkin.sleepHours);
      if (h >= 7) setIV('iv-sleep', 'done', `${h}h`);
      else setIV('iv-sleep', 'fail', `${h}h`);
    } else { setIV('iv-sleep', 'pending', '未記録'); }

    // 2. CPAP
    if (checkin && checkin.cpap != null) {
      if (checkin.cpap === 2) setIV('iv-cpap', 'done', 'バッチリ');
      else if (checkin.cpap === 1) setIV('iv-cpap', 'fail', '途中外し');
      else setIV('iv-cpap', 'fail', '未装着');
    } else { setIV('iv-cpap', 'pending', '未記録'); }

    // 3. Yuka's meals
    if (checkin && checkin.dinnerType) {
      if (checkin.dinnerType === 'yuka') setIV('iv-yuka', 'done', 'ゆかごはん');
      else setIV('iv-yuka', 'fail', '外食');
    } else { setIV('iv-yuka', 'pending', '今夜'); }

    // 4. Supplements (tracked via checkin)
    if (checkin && checkin.supplement_morning != null) {
      const m = checkin.supplement_morning;
      const n = checkin.supplement_noon;
      const e = checkin.supplement_evening;
      if (m && n && e) setIV('iv-suppl', 'done', '完全遵守');
      else {
        const parts = [m ? '朝' : '', n ? '昼' : '', e ? '夜' : ''].filter(Boolean);
        setIV('iv-suppl', 'fail', parts.join('+') + 'のみ');
      }
    } else { setIV('iv-suppl', 'pending', '未記録'); }

    // 5. Digital Wall (tracked via checkout)
    if (checkout && checkout.digitalWall != null) {
      if (checkout.digitalWall === 2) setIV('iv-wall', 'done', '完璧');
      else if (checkout.digitalWall === 1) setIV('iv-wall', 'fail', '一部破り');
      else setIV('iv-wall', 'fail', '未遵守');
    } else {
      const h = new Date().getHours();
      setIV('iv-wall', 'pending', h < 21 ? '21:30から' : '未記録');
    }

    // 6. Stretch (tracked via checkout)
    if (checkout && checkout.stretchCount != null) {
      if (checkout.stretchCount >= 5) setIV('iv-stretch', 'done', `${checkout.stretchCount}/7`);
      else if (checkout.stretchCount > 0) setIV('iv-stretch', 'fail', `${checkout.stretchCount}/7`);
      else setIV('iv-stretch', 'fail', '未実施');
    } else { setIV('iv-stretch', 'pending', '入浴後'); }

    // 7. Morning walk
    if (checkin && (checkin.tags || []).includes('朝ウォーキング')) {
      setIV('iv-walk', 'done', '完了');
    } else if (checkin) {
      setIV('iv-walk', 'fail', '未実施');
    } else { setIV('iv-walk', 'pending', '--'); }

    const countEl = document.getElementById('interventions-count');
    if (countEl) {
      countEl.textContent = `${doneCount}/7`;
      countEl.style.color = doneCount >= 7 ? 'var(--accent-green)' : doneCount >= 4 ? 'var(--accent-gold)' : 'var(--accent-red)';
    }
  }

  // ---- Evening Timeline ----
  function updateTimeline() {
    const card = document.getElementById('timeline-card');
    const list = document.getElementById('timeline-list');
    if (!card || !list) return;

    const now = new Date();
    const h = now.getHours(), m = now.getMinutes();
    const minuteOfDay = h * 60 + m;

    // Only show timeline after 17:00
    if (minuteOfDay < 1020) { card.style.display = 'none'; return; }
    card.style.display = 'block';

    const milestones = [
      { time: 1170, label: '退勤・帰宅開始', icon: '🚶' },
      { time: 1230, label: 'ゆかごはん', icon: '🍲' },
      { time: 1290, label: 'デジタルウォール開始', icon: '📵' },
      { time: 1320, label: 'ストレッチタイム', icon: '🧘' },
      { time: 1350, label: '就寝目標', icon: '😴' }
    ];

    list.innerHTML = '';
    milestones.forEach(ms => {
      if (ms.time < minuteOfDay - 30) return; // Skip long-past items
      const item = document.createElement('div');
      const diff = ms.time - minuteOfDay;
      const isPast = diff < 0;
      const isActive = diff >= 0 && diff <= 30;
      item.className = 'timeline-item' + (isPast ? ' past' : '') + (isActive ? ' active' : '');
      const timeH = Math.floor(ms.time / 60), timeM = ms.time % 60;
      const timeStr = `${timeH}:${String(timeM).padStart(2, '0')}`;
      let countdown = '';
      if (diff > 0) {
        const dh = Math.floor(diff / 60), dm = diff % 60;
        countdown = dh > 0 ? `あと${dh}h${dm}m` : `あと${dm}分`;
      } else if (isActive) {
        countdown = '今！';
      }
      item.innerHTML = `<span class="timeline-time">${timeStr}</span><span>${ms.icon} ${ms.label}</span><span class="timeline-countdown">${countdown}</span>`;
      list.appendChild(item);
    });
  }

  // ---- SOS Mode ----
  function startSOS() {
    showScreen('sos');
    remainingSeconds = TIMER_DURATION;
    timerStartTime = Date.now();
    currentMessageIndex = Math.floor(Math.random() * REALITY_MESSAGES.length);
    updateTimerDisplay();
    showRealityMessage();
    startBreathing();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
      remainingSeconds = Math.max(0, TIMER_DURATION - elapsed);
      updateTimerDisplay();
      if (remainingSeconds <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        onVictoryClick();
      }
    }, 1000);

    messageInterval = setInterval(() => {
      currentMessageIndex = (currentMessageIndex + 1) % REALITY_MESSAGES.length;
      showRealityMessage();
    }, MESSAGE_INTERVAL);
  }

  function stopSOS() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (messageInterval) { clearInterval(messageInterval); messageInterval = null; }
    if (breathingTimeout) { clearTimeout(breathingTimeout); breathingTimeout = null; }
  }

  function updateTimerDisplay() {
    const min = Math.floor(remainingSeconds / 60);
    const sec = remainingSeconds % 60;
    els.timerMinutes.textContent = String(min).padStart(2, '0');
    els.timerSeconds.textContent = String(sec).padStart(2, '0');
    const progress = remainingSeconds / TIMER_DURATION;
    els.timerProgress.style.strokeDasharray = CIRCUMFERENCE;
    els.timerProgress.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
    if (remainingSeconds < 60) els.timerProgress.style.stroke = '#34d399';
    else if (remainingSeconds < 300) els.timerProgress.style.stroke = '#fbbf24';
    else els.timerProgress.style.stroke = '#ff3b5c';
  }

  function showRealityMessage() {
    const msg = REALITY_MESSAGES[currentMessageIndex];
    els.realityBox.querySelector('.reality-icon').textContent = msg.icon;
    els.realityMessage.textContent = msg.text;
    els.realityBox.style.animation = 'none';
    void els.realityBox.offsetHeight;
    els.realityBox.style.animation = 'realityFadeIn 0.6s ease';
  }

  function startBreathing() {
    let phaseIndex = 0;
    function nextPhase() {
      const phase = BREATHING_PHASES[phaseIndex];
      els.breathingText.textContent = phase.text;
      phaseIndex = (phaseIndex + 1) % BREATHING_PHASES.length;
      breathingTimeout = setTimeout(nextPhase, phase.duration);
    }
    nextPhase();
  }

  // ---- Victory Flow ----
  function onVictoryClick() { els.modalCraving.classList.add('active'); }

  function recordVictory(craving) {
    const elapsed = TIMER_DURATION - remainingSeconds;
    stopSOS();
    saveVictory(craving, elapsed);
    els.modalCraving.classList.remove('active');
    els.customCravingInput.value = '';

    const emoji = getCravingEmoji(craving);
    els.victoryDetail.textContent = `${emoji} ${craving}に勝った！`;
    const streak = getStreak();
    els.victoryStreakMsg.textContent = streak > 1 ? `🔥 ${streak}日連続勝利中！` : '✨ 最初の一歩！続けていこう！';

    els.victoryEffect.classList.add('active');
    spawnConfetti();
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);

    // Check badges
    const newBadges = checkAndAwardBadges();
    if (newBadges.length > 0) {
      setTimeout(() => {
        els.victoryEffect.classList.remove('active');
        showBadgeModal(newBadges[0]);
      }, 2500);
    }
  }

  function showBadgeModal(badge) {
    els.newBadgeIcon.textContent = badge.icon;
    els.newBadgeName.textContent = badge.name;
    els.newBadgeDesc.textContent = badge.desc;
    els.modalBadge.classList.add('active');
    spawnConfetti();
  }

  function getCravingEmoji(craving) {
    const map = {
      'カップラーメン':'🍜','ハンバーガー':'🍔','フライドチキン':'🍗',
      'スナック菓子':'🍿','甘いもの':'🍰','ラーメン':'🍜',
      '揚げ物':'🍟','炭酸飲料':'🥤'
    };
    return map[craving] || '🍽️';
  }

  function spawnConfetti() {
    const colors = ['#ff3b5c','#fbbf24','#34d399','#60a5fa','#a78bfa','#fb7185'];
    for (let i = 0; i < 40; i++) {
      const el = document.createElement('div');
      el.className = 'confetti';
      el.style.left = Math.random() * 100 + 'vw';
      el.style.top = '-10px';
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.animationDelay = Math.random() * 0.8 + 's';
      el.style.animationDuration = (1 + Math.random()) + 's';
      el.style.width = (5 + Math.random() * 8) + 'px';
      el.style.height = (5 + Math.random() * 8) + 'px';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2500);
    }
  }

  // 体重画面の関数群は削除済み（朝チェックイン＋分析画面に統合）

  function renderBadges() {
    const earned = getEarnedBadges();
    els.badgesGrid.innerHTML = '';
    BADGE_DEFS.forEach(badge => {
      const isEarned = earned.includes(badge.id);
      const item = document.createElement('div');
      item.className = 'badge-item ' + (isEarned ? 'earned' : 'locked');
      item.innerHTML = `
        <span class="badge-item-icon">${badge.icon}</span>
        <div class="badge-item-name">${badge.name}</div>
        <div class="badge-item-cond">${badge.cond.toString().includes('wDiff') ? '減量達成' : badge.desc}</div>
      `;
      els.badgesGrid.appendChild(item);
    });
  }

  function renderHeatmap() {
    const winsPerDay = getWinsPerDay(35);
    const days = Object.entries(winsPerDay).sort((a,b) => a[0].localeCompare(b[0]));
    const maxWins = Math.max(1, ...days.map(d => d[1]));
    const today = getTodayStr();
    els.heatmapContainer.innerHTML = '';
    days.slice(-28).forEach(([dateStr, wins]) => {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell' + (dateStr === today ? ' today' : '');
      if (wins > 0) cell.style.opacity = 0.2 + (wins / maxWins) * 0.8;
      cell.title = `${dateStr}: ${wins}勝`;
      els.heatmapContainer.appendChild(cell);
    });
  }

  function renderRecentWins() {
    const victories = getVictories().slice(-20).reverse();
    if (victories.length === 0) {
      els.recentWinsList.innerHTML = '<p class="empty-message">まだ勝利記録がありません。<br>SOSボタンで最初の戦いに挑もう！</p>';
      return;
    }
    els.recentWinsList.innerHTML = '';
    victories.forEach(v => {
      const d = new Date(v.date);
      const timeStr = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      const dMin = Math.floor(v.duration / 60), dSec = v.duration % 60;
      const durStr = dMin > 0 ? `${dMin}分${dSec}秒で勝利` : `${dSec}秒で勝利`;
      const item = document.createElement('div');
      item.className = 'win-item';
      item.innerHTML = `
        <span class="win-emoji">${getCravingEmoji(v.craving)}</span>
        <div class="win-info">
          <div class="win-craving">${escapeHtml(v.craving)}に勝利！</div>
          <div class="win-time">${timeStr}</div>
        </div>
        <span class="win-duration">${durStr}</span>
      `;
      els.recentWinsList.appendChild(item);
    });
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ---- Event Listeners ----
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => { if (btn.dataset.screen) showScreen(btn.dataset.screen); });
  });

  // Home score card → analytics navigation
  const homeScoreCard = document.getElementById('home-score-card');
  if (homeScoreCard) {
    homeScoreCard.addEventListener('click', () => showScreen('analytics'));
  }

  els.sosBtn.addEventListener('click', startSOS);
  els.backSos.addEventListener('click', () => { stopSOS(); showScreen('home'); });
  els.btnVictory.addEventListener('click', onVictoryClick);

  document.querySelectorAll('.craving-btn:not(.custom-submit)').forEach(btn => {
    btn.addEventListener('click', () => recordVictory(btn.dataset.craving));
  });

  els.btnCustomCraving.addEventListener('click', () => {
    const val = els.customCravingInput.value.trim();
    if (val) recordVictory(val);
  });

  els.customCravingInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const val = els.customCravingInput.value.trim(); if (val) recordVictory(val); }
  });

  els.btnVictoryClose.addEventListener('click', () => {
    els.victoryEffect.classList.remove('active');
    showScreen('home');
  });

  els.btnBadgeClose.addEventListener('click', () => {
    els.modalBadge.classList.remove('active');
    showScreen('home');
  });

  // Special Day Ticket
  document.getElementById('btn-use-ticket').addEventListener('click', () => {
    document.getElementById('modal-special').classList.add('active');
    document.getElementById('special-note-input').value = '';
  });

  document.getElementById('btn-special-cancel').addEventListener('click', () => {
    document.getElementById('modal-special').classList.remove('active');
  });

  document.getElementById('btn-special-confirm').addEventListener('click', () => {
    const note = document.getElementById('special-note-input').value.trim();
    if (!note) {
      document.getElementById('special-note-input').style.borderColor = '#ff3b5c';
      setTimeout(() => document.getElementById('special-note-input').style.borderColor = '', 1000);
      return;
    }
    useTicket(note);
    document.getElementById('modal-special').classList.remove('active');
    document.getElementById('special-effect-note').textContent = `🎫 ${note}`;
    document.getElementById('special-effect').classList.add('active');
    spawnConfetti();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 300]);
    updateHomeStats();
  });

  document.getElementById('btn-special-effect-close').addEventListener('click', () => {
    document.getElementById('special-effect').classList.remove('active');
    showScreen('home');
  });


  // ---- CHECKIN SYSTEM (v4) ----
  const CHECKIN_KEY = 'revive_checkins';
  const CHECKOUT_KEY = 'revive_checkouts';

  // Checkin state
  const checkinState = {
    weight: null, cpap: null, sleepHours: null, sleepQuality: null,
    vas_fatigue: 50, vas_pain: 50, headache: null, tags: [],
    dinnerType: null, dinnerTime: null, caffeine: null, caffeineLastTime: null,
    supplement_morning: false, supplement_noon: false, supplement_evening: false
  };

  const checkoutState = {
    vas_performance: 50, reflection: null, logoutRituals: [],
    digitalWall: null, bedtime: null, stretchCount: 0
  };

  function getCheckouts() {
    try { return JSON.parse(localStorage.getItem(CHECKOUT_KEY)) || []; } catch { return []; }
  }
  function saveCheckouts(data) {
    localStorage.setItem(CHECKOUT_KEY, JSON.stringify(data));
  }
  function getTodayCheckout() {
    return getCheckouts().find(c => c.date === getTodayStr()) || null;
  }

  function getCheckins() {
    try { return JSON.parse(localStorage.getItem(CHECKIN_KEY)) || []; } catch { return []; }
  }

  function getTodayCheckin() {
    const today = getTodayStr();
    return getCheckins().find(c => c.date === today) || null;
  }

  function saveCheckin(data) {
    const checkins = getCheckins();
    const today = getTodayStr();
    const existing = checkins.findIndex(c => c.date === today);
    const entry = { date: today, timestamp: new Date().toISOString(), ...data };
    if (existing >= 0) checkins[existing] = entry; else checkins.push(entry);
    checkins.sort((a, b) => a.date.localeCompare(b.date));
    localStorage.setItem(CHECKIN_KEY, JSON.stringify(checkins));
    syncToGas('checkin', entry);

    // Also save weight to weight system for chart compatibility
    if (data.weight) {
      saveWeight(data.weight);
    }
    return entry;
  }

  function getCheckinStreak() {
    return calcStreak(getCheckins().map(c => c.date));
  }

  function getCheckoutStreak() {
    return calcStreak(getCheckouts().map(c => c.date));
  }

  // Smart weight input: 855 → 85.5, 1023 → 102.3
  function parseSmartWeight(raw) {
    const s = String(raw).trim();
    if (s.length < 3 || s.length > 4) return null;
    const num = parseInt(s, 10);
    if (isNaN(num)) return null;
    const kg = num / 10;
    if (kg < 30 || kg > 300) return null;
    return kg;
  }

  function initCheckinScreen() {
    const today = getTodayCheckin();
    const doneMsg = document.getElementById('checkin-done-message');
    const form = document.getElementById('checkin-form');

    if (today) {
      doneMsg.style.display = 'block';
      form.style.display = 'none';
    } else {
      doneMsg.style.display = 'none';
      form.style.display = 'block';
      resetCheckinForm();
      showLastNightReview();
    }

    updateCheckinGreeting();
  }

  function showLastNightReview() {
    const reviewSection = document.getElementById('last-night-review');
    const plansList = document.getElementById('last-night-plans-list');
    if (!reviewSection || !plansList) return;

    // Get yesterday's rest plans
    const yesterday = getDateStr(new Date(Date.now() - 86400000));
    const lastRest = getRestRecords().find(r => r.date === yesterday);

    if (!lastRest || !lastRest.plans || lastRest.plans.length === 0) {
      reviewSection.style.display = 'none';
      return;
    }

    reviewSection.style.display = 'block';
    plansList.innerHTML = '';
    lastRest.plans.forEach(plan => {
      const btn = document.createElement('button');
      btn.className = 'checkin-tag-btn';
      btn.dataset.tag = 'rest_done_' + plan;
      btn.textContent = '✅ ' + plan;
      btn.addEventListener('click', () => {
        btn.classList.toggle('selected');
        const tag = btn.dataset.tag;
        if (btn.classList.contains('selected')) {
          if (!checkinState.tags.includes(tag)) checkinState.tags.push(tag);
        } else {
          checkinState.tags = checkinState.tags.filter(t => t !== tag);
        }
        if (navigator.vibrate) navigator.vibrate(20);
      });
      plansList.appendChild(btn);
    });
  }

  function updateCheckinGreeting() {
    const h = new Date().getHours();
    const el = document.getElementById('checkin-greeting');
    if (h < 10) el.textContent = '☀️ おはようございます';
    else if (h < 17) el.textContent = '🌤️ こんにちは';
    else el.textContent = '🌙 こんばんは';
  }

  function resetCheckinForm() {
    checkinState.weight = null; checkinState.cpap = null; checkinState.sleepHours = null;
    checkinState.sleepQuality = null; checkinState.dinnerType = null; checkinState.dinnerTime = null;
    checkinState.vas_fatigue = 50; checkinState.vas_pain = 50; checkinState.headache = null;
    checkinState.caffeine = null; checkinState.caffeineLastTime = null;
    checkinState.supplement_morning = false; checkinState.supplement_noon = false; checkinState.supplement_evening = false;
    checkinState.tags = [];
    const caffeineTimeGroup = document.getElementById('caffeine-time-group');
    if (caffeineTimeGroup) caffeineTimeGroup.style.display = 'none';
    document.querySelectorAll('.suppl-check-btn').forEach(b => b.classList.remove('taken'));
    
    const weightInput = document.getElementById('checkin-weight-raw');
    const weightDisplay = document.getElementById('checkin-weight-display');
    if (weightInput) weightInput.value = '';
    if (weightDisplay) { weightDisplay.textContent = '-- kg'; weightDisplay.classList.remove('has-value'); }

    document.querySelectorAll('#screen-checkin .checkin-option-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.checkin-tag-btn').forEach(b => b.classList.remove('selected'));
    const vf = document.getElementById('vas-fatigue'); if(vf) vf.value = 50;
    const vp = document.getElementById('vas-pain'); if(vp) vp.value = 50;
    const vfv = document.getElementById('vas-fatigue-val'); if(vfv) vfv.textContent = '50';
    const vpv = document.getElementById('vas-pain-val'); if(vpv) vpv.textContent = '50';
  }

  function initCheckoutScreen() {
    const today = getTodayCheckout();
    const doneMsg = document.getElementById('checkout-done-message');
    const form = document.getElementById('checkout-form');
    if (today) {
      if(doneMsg) doneMsg.style.display = 'block';
      if(form) form.style.display = 'none';
    } else {
      if(doneMsg) doneMsg.style.display = 'none';
      if(form) form.style.display = 'block';
      resetCheckoutForm();
      shuffleRituals();
      shuffleRestPlans();
    }
  }

  // ---- Ritual Shuffle (12 rituals: 2 per DRAMMA category) ----
  function pickRandom(arr, n) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }

  function shuffleRituals() {
    const grid = document.getElementById('logout-ritual-grid');
    if (!grid) return;
    grid.innerHTML = '';
    checkoutState.logoutRituals = [];

    const categories = ['D', 'R', 'A', 'M1', 'M2', 'A2'];
    categories.forEach(cat => {
      const picked = pickRandom(RITUAL_POOL[cat], 2);
      picked.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'logout-ritual-btn';
        btn.dataset.ritual = item.text;
        btn.dataset.dramma = cat;
        btn.innerHTML = `${item.icon} ${item.text}<div class="ritual-dramma-tag">${DRAMMA_LABELS[cat]}</div>`;
        btn.addEventListener('click', () => {
          btn.classList.toggle('selected');
          const ritual = btn.dataset.ritual;
          if (btn.classList.contains('selected')) {
            if (!checkoutState.logoutRituals.includes(ritual)) checkoutState.logoutRituals.push(ritual);
          } else {
            checkoutState.logoutRituals = checkoutState.logoutRituals.filter(r => r !== ritual);
          }
          if (navigator.vibrate) navigator.vibrate(20);
        });
        grid.appendChild(btn);
      });
    });
  }

  // ---- Rest Screen (休養入力) ----
  const REST_KEY = 'revive_rest_plans';
  const restState = { selectedPlans: [] };

  function getRestRecords() {
    try { return JSON.parse(localStorage.getItem(REST_KEY)) || []; } catch { return []; }
  }

  function getTodayRest() {
    return getRestRecords().find(r => r.date === getTodayStr()) || null;
  }


  function shuffleRestPlans() {
    const grid = document.getElementById('rest-plan-grid');
    if (!grid) return;
    grid.innerHTML = '';
    restState.selectedPlans = [];

    const categories = ['D', 'R', 'A', 'M1', 'M2', 'A2'];
    categories.forEach(cat => {
      // Category header
      const header = document.createElement('div');
      header.style.cssText = 'font-size:0.7rem; font-weight:700; color:var(--accent-blue); margin-top:8px; margin-bottom:2px;';
      header.textContent = `${DRAMMA_LABELS[cat]} — ${DRAMMA_DESCS[cat]}`;
      grid.appendChild(header);

      const picked = pickRandom(REST_PLAN_POOL[cat], 2);
      const subGrid = document.createElement('div');
      subGrid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:4px;';

      picked.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'logout-ritual-btn';
        btn.dataset.plan = item.text;
        btn.dataset.dramma = cat;
        btn.innerHTML = `${item.icon} ${item.text}`;
        btn.addEventListener('click', () => {
          btn.classList.toggle('selected');
          const plan = btn.dataset.plan;
          if (btn.classList.contains('selected')) {
            if (!restState.selectedPlans.includes(plan)) restState.selectedPlans.push(plan);
          } else {
            restState.selectedPlans = restState.selectedPlans.filter(p => p !== plan);
          }
          if (navigator.vibrate) navigator.vibrate(20);
        });
        subGrid.appendChild(btn);
      });
      grid.appendChild(subGrid);
    });
  }

  function resetCheckoutForm() {
    checkoutState.vas_performance = 50; checkoutState.reflection = null; checkoutState.logoutRituals = [];
    checkoutState.digitalWall = null; checkoutState.bedtime = null; checkoutState.stretchCount = 0;
    const vp = document.getElementById('vas-performance'); if(vp) vp.value = 50;
    const vpv = document.getElementById('vas-performance-val'); if(vpv) vpv.textContent = '50';
    const ref = document.getElementById('checkout-reflection'); if(ref) ref.value = '';
    document.querySelectorAll('.logout-ritual-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('#screen-checkout .checkin-option-btn').forEach(b => b.classList.remove('selected'));
  }

  // Weight smart input handler
  const checkinWeightRaw = document.getElementById('checkin-weight-raw');
  const checkinWeightDisplay = document.getElementById('checkin-weight-display');

  if (checkinWeightRaw) {
    checkinWeightRaw.addEventListener('input', () => {
      const val = checkinWeightRaw.value;
      const kg = parseSmartWeight(val);
      if (kg !== null) {
        checkinWeightDisplay.textContent = kg.toFixed(1) + ' kg';
        checkinWeightDisplay.classList.add('has-value');
        checkinState.weight = kg;
      } else {
        checkinWeightDisplay.textContent = '-- kg';
        checkinWeightDisplay.classList.remove('has-value');
        checkinState.weight = null;
      }
    });
  }


  // Option button handlers
  document.querySelectorAll('.checkin-option-group').forEach(group => {
    const field = group.dataset.field;
    if (!field) return;
    group.querySelectorAll('.checkin-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.checkin-option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        let val = btn.dataset.value;
        const numVal = parseFloat(val);
        // Route to correct state object
        if (field in checkinState) {
          checkinState[field] = isNaN(numVal) ? val : numVal;
        }
        if (field in checkoutState) {
          checkoutState[field] = isNaN(numVal) ? val : numVal;
        }
        if (navigator.vibrate) navigator.vibrate(30);

        // Caffeine: show/hide time selector based on cups
        if (field === 'caffeine') {
          const caffeineTimeGroup = document.getElementById('caffeine-time-group');
          if (caffeineTimeGroup) {
            caffeineTimeGroup.style.display = (numVal > 0) ? 'block' : 'none';
            if (numVal === 0) {
              checkinState.caffeineLastTime = null;
              caffeineTimeGroup.querySelectorAll('.checkin-option-btn').forEach(b => b.classList.remove('selected'));
            }
          }
        }
      });
    });
  });

  // Tag Add
  document.querySelectorAll('.checkin-tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('selected');
      const tag = btn.dataset.tag;
      if (btn.classList.contains('selected')) {
        if (!checkinState.tags.includes(tag)) checkinState.tags.push(tag);
      } else {
        checkinState.tags = checkinState.tags.filter(t => t !== tag);
      }
      if (navigator.vibrate) navigator.vibrate(20);
    });
  });

  // Supplement check buttons
  document.querySelectorAll('.suppl-check-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('taken');
      const suppl = btn.dataset.suppl;
      const isTaken = btn.classList.contains('taken');
      // Map each button to a supplement slot
      if (suppl.startsWith('morning_')) checkinState.supplement_morning = document.querySelectorAll('.suppl-check-btn[data-suppl^="morning_"].taken').length === 2;
      if (suppl.startsWith('noon_')) checkinState.supplement_noon = btn.classList.contains('taken');
      if (suppl.startsWith('evening_')) checkinState.supplement_evening = document.querySelectorAll('.suppl-check-btn[data-suppl^="evening_"].taken').length === 3;
      if (navigator.vibrate) navigator.vibrate(20);
    });
  });

  // Stretch protocol buttons
  document.querySelectorAll('.stretch-item-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('done');
      const count = document.querySelectorAll('.stretch-item-btn.done').length;
      checkoutState.stretchCount = count;
      const progressEl = document.getElementById('stretch-progress');
      if (progressEl) progressEl.textContent = `完了: ${count}/7` + (count >= 7 ? ' 🎉' : '');
      if (navigator.vibrate) navigator.vibrate(20);
    });
  });

  // Reflection textarea
  const reflectionTextarea = document.getElementById('checkout-reflection');
  if (reflectionTextarea) {
    reflectionTextarea.addEventListener('input', () => {
      checkoutState.reflection = reflectionTextarea.value || null;
    });
  }

  // Shuffle button
  const btnShuffle = document.getElementById('btn-shuffle-rituals');
  if (btnShuffle) {
    btnShuffle.addEventListener('click', () => {
      shuffleRituals();
      if (navigator.vibrate) navigator.vibrate(30);
    });
  }

  // VAS Sliders
  document.querySelectorAll('.vas-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      const valEl = document.getElementById(e.target.id + '-val');
      if(valEl) valEl.textContent = val;
      if (e.target.id === 'vas-fatigue') checkinState.vas_fatigue = val;
      if (e.target.id === 'vas-pain') checkinState.vas_pain = val;
      if (e.target.id === 'vas-performance') checkoutState.vas_performance = val;
    });
  });

  // Redo button
  const btnCheckinRedo = document.getElementById('btn-checkin-redo');
  if (btnCheckinRedo) {
    btnCheckinRedo.addEventListener('click', () => {
      document.getElementById('checkin-done-message').style.display = 'none';
      document.getElementById('checkin-form').style.display = 'block';
      resetCheckinForm();
    });
  }

  // Save button
  const btnCheckinSave = document.getElementById('btn-checkin-save');
  if (btnCheckinSave) {
    btnCheckinSave.addEventListener('click', () => {
      // Validate: at least weight is required
      if (checkinState.weight === null) {
        const weightInput = document.getElementById('checkin-weight-raw');
        weightInput.style.borderBottomColor = '#ff3b5c';
        weightInput.focus();
        setTimeout(() => weightInput.style.borderBottomColor = '', 1500);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        return;
      }

      // Save the checkin
      const data = { ...checkinState };
      saveCheckin(data);

      // Check badges
      const newBadges = checkAndAwardBadges();

      // Show success effect
      const streak = getCheckinStreak();
      const effectStreak = document.getElementById('checkin-effect-streak');
      if (streak > 1) {
        effectStreak.textContent = '🔥 ' + streak + '日連続チェックイン！';
      } else {
        effectStreak.textContent = '✨ 最初のチェックイン！';
      }

      const effectDetail = document.getElementById('checkin-effect-detail');
      effectDetail.textContent = data.weight.toFixed(1) + 'kg — 今日も自分と向き合えた！';

      document.getElementById('checkin-effect').classList.add('active');
      spawnConfetti();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);

      // Update home stats
      updateHomeStats();
    });
  }

  // Checkin effect close
  const btnCheckinEffectClose = document.getElementById('btn-checkin-effect-close');
  if (btnCheckinEffectClose) {
    btnCheckinEffectClose.addEventListener('click', () => {
      document.getElementById('checkin-effect').classList.remove('active');
      showScreen('home');
    });
  }

  // Save Checkout
  const btnCheckoutSave = document.getElementById('btn-checkout-save');
  if (btnCheckoutSave) {
    btnCheckoutSave.addEventListener('click', () => {
      // Save checkout
      const outs = getCheckouts();
      const entry = { date: getTodayStr(), timestamp: new Date().toISOString(), ...checkoutState };
      const idx = outs.findIndex(c => c.date === entry.date);
      if (idx >= 0) outs[idx] = entry; else outs.push(entry);
      saveCheckouts(outs);
      syncToGas('checkout', entry);

      // Save rest plans (integrated into checkout)
      const records = getRestRecords();
      const restEntry = { date: getTodayStr(), timestamp: new Date().toISOString(), plans: [...restState.selectedPlans] };
      const rIdx = records.findIndex(r => r.date === restEntry.date);
      if (rIdx >= 0) records[rIdx] = restEntry; else records.push(restEntry);
      localStorage.setItem(REST_KEY, JSON.stringify(records));
      syncToGas('rest', restEntry);

      // Show success effect
      const ritualCount = checkoutState.logoutRituals.length;
      const planCount = restState.selectedPlans.length;
      const effectDetail = document.getElementById('checkout-effect-detail');
      if (effectDetail) {
        const parts = [];
        if (ritualCount > 0) parts.push(`${ritualCount}つのリチュアル`);
        if (planCount > 0) parts.push(`${planCount}つの休養プラン`);
        effectDetail.textContent = parts.length > 0
          ? `${parts.join(' + ')} — ゆっくり休みましょう`
          : '今日もお疲れ様でした。ゆっくり休みましょう';
      }
      const checkoutStreak = getCheckoutStreak();
      const effectStreak = document.getElementById('checkout-effect-streak');
      if (effectStreak) {
        effectStreak.textContent = checkoutStreak > 1
          ? `🌙 ${checkoutStreak}日連続チェックアウト！`
          : '✨ 今日の振り返り完了！';
      }

      const checkoutEffectEl = document.getElementById('checkout-effect');
      if (checkoutEffectEl) checkoutEffectEl.classList.add('active');
      spawnConfetti();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);

      updateHomeStats();
    });
  }

  // Checkout effect close
  const btnCheckoutEffectClose = document.getElementById('btn-checkout-effect-close');
  if (btnCheckoutEffectClose) {
    btnCheckoutEffectClose.addEventListener('click', () => {
      document.getElementById('checkout-effect').classList.remove('active');
      initCheckoutScreen();
      showScreen('home');
    });
  }

  const btnCheckoutRedo = document.getElementById('btn-checkout-redo');
  if (btnCheckoutRedo) {
    btnCheckoutRedo.addEventListener('click', () => {
      document.getElementById('checkout-done-message').style.display = 'none';
      document.getElementById('checkout-form').style.display = 'block';
    });
  }

  // ---- REST SCREEN EVENT HANDLERS ----
  // (Rest save/redo removed — now handled by checkout save)

  const btnShuffleRest = document.getElementById('btn-shuffle-rest');
  if (btnShuffleRest) {
    btnShuffleRest.addEventListener('click', () => {
      shuffleRestPlans();
      if (navigator.vibrate) navigator.vibrate(30);
    });
  }

  // ---- DAILY SCORING ENGINE ----
  function calculateDailyScore(dateStr) {
    const checkin = getCheckins().find(c => c.date === dateStr);
    const checkout = getCheckouts().find(c => c.date === dateStr);
    const rest = getRestRecords().find(r => r.date === dateStr);

    if (!checkin) return null;

    const tags = checkin.tags || [];

    // --- Cat 1: 睡眠と身体 (30点) ---
    const sleepHoursMap = { '8': 7, '7.5': 6, '7': 5, '6.5': 4, '6': 3, '5.5': 2, '5': 1, '4.5': 0 };
    const sleepHoursScore = sleepHoursMap[String(checkin.sleepHours)] ?? 3;
    const sleepQualityMap = { 'great': 5, 'ok': 3, 'light': 2, 'terrible': 0 };
    const sleepQualityScore = sleepQualityMap[checkin.sleepQuality] ?? 2;
    const cpapMap = { 2: 6, 1: 3, 0: 0 };
    const cpapScore = cpapMap[checkin.cpap] ?? 0;
    const painScore = Math.round(10 * (1 - (checkin.vas_pain ?? 50) / 100));
    const headacheMap = { 0: 2, 1: 1, 2: 0 };
    const headacheScore = headacheMap[checkin.headache] ?? 1;
    const sleepTotal = sleepHoursScore + sleepQualityScore + cpapScore + painScore + headacheScore;

    // --- Cat 2: 栄養と習慣 (20点) ---
    const dinnerTypeMap = { 'yuka': 6, 'eating_out': 3, 'eating_out_alcohol': 1 };
    const dinnerTypeScore = dinnerTypeMap[checkin.dinnerType] ?? 3;
    const dinnerTimeMap = { 'before19': 3, '19to21': 2, 'after21': 1 };
    const dinnerTimeScore = dinnerTimeMap[checkin.dinnerTime] ?? 2;
    const healthTags = ['朝ウォーキング', '夜ストレッチ', 'ジャーナリング', '間食なし', 'サプリメント'];
    let healthHabitScore = 0;
    healthTags.forEach(ht => { if (tags.includes(ht)) healthHabitScore += 1; });
    // Caffeine (3点)
    let caffeineScore = 1;
    const caffeine = checkin.caffeine;
    if (caffeine != null) {
      if (caffeine === 0) caffeineScore = 3;
      else if (caffeine === 1) {
        const ct = checkin.caffeineLastTime;
        caffeineScore = ct === 'before13' ? 2 : 1;
      }
      else caffeineScore = 0;
    }
    // Morning walk (3点)
    const walkScore = tags.includes('朝ウォーキング') ? 3 : 0;
    const lifestyleTotal = dinnerTypeScore + dinnerTimeScore + healthHabitScore + caffeineScore + walkScore;

    // --- Cat 3: エネルギー管理 (20点) ---
    // Supplements (8点)
    let supplScore = 0;
    if (checkin.supplement_morning) supplScore += 2;
    if (checkin.supplement_noon) supplScore += 2;
    if (checkin.supplement_evening) supplScore += 4; // Evening most critical
    // Digital Wall (4点)
    const wallMap = { 2: 4, 1: 2, 0: 0 };
    const wallScore = checkout ? (wallMap[checkout.digitalWall] ?? 0) : 0;
    // Stretch (4点)
    let stretchScore = 0;
    if (checkout && checkout.stretchCount != null) {
      if (checkout.stretchCount >= 5) stretchScore = 4;
      else if (checkout.stretchCount >= 3) stretchScore = 3;
      else if (checkout.stretchCount >= 1) stretchScore = 1;
    }
    // Bedtime (4点)
    const bedtimeMap = { 'before22': 4, '22to2230': 4, '2230to23': 3, '23to0': 1, 'after0': 0 };
    const bedtimeScore = checkout ? (bedtimeMap[checkout.bedtime] ?? 0) : 0;
    const energyTotal = supplScore + wallScore + stretchScore + bedtimeScore;

    // --- Cat 4: リカバリー行動 (15点) ---
    const drammaTagMap = {
      D: ['スマホ断ち', '何もしない', '通知オフ'],
      R: ['半身浴', '自然な睡眠', 'ストレッチ'],
      A: ['自分時間', '早めの就寝'],
      M1: ['趣味の没頭', '読書'],
      M2: ['恩送り', '由香ごはん', '感謝'],
      A2: ['有意義な対話', '子どもと遊ぶ']
    };
    let drammaCatsFilled = 0;
    Object.values(drammaTagMap).forEach(catTags => {
      if (catTags.some(t => tags.includes(t))) drammaCatsFilled++;
    });
    const morningDrammaScore = Math.round(drammaCatsFilled * (5 / 6));

    const ritualCount = checkout ? (checkout.logoutRituals || []).length : 0;
    let ritualScore = 0;
    if (ritualCount >= 5) ritualScore = 5;
    else if (ritualCount >= 3) ritualScore = 3;
    else if (ritualCount >= 1) ritualScore = 1;

    const planCount = rest ? (rest.plans || []).length : 0;
    let planScore = 0;
    if (planCount >= 5) planScore = 5;
    else if (planCount >= 3) planScore = 3;
    else if (planCount >= 1) planScore = 1;

    const recoveryTotal = morningDrammaScore + ritualScore + planScore;

    // --- Cat 5: パフォーマンス (15点) ---
    const perfVas = checkout ? (checkout.vas_performance ?? 50) : 50;
    const perfScore = Math.round(7 * perfVas / 100);
    const fatigueScore = Math.round(4 * (1 - (checkin.vas_fatigue ?? 50) / 100));
    const todayVictories = getVictories().filter(v => getDateStr(v.date) === dateStr).length;
    const sosScore = Math.min(4, todayVictories * 2);
    const performanceTotal = perfScore + fatigueScore + sosScore;

    const total = sleepTotal + lifestyleTotal + energyTotal + recoveryTotal + performanceTotal;

    return {
      total: Math.min(100, total),
      sleep: { score: sleepTotal, max: 30 },
      lifestyle: { score: lifestyleTotal, max: 20 },
      energy: { score: energyTotal, max: 20 },
      recovery: { score: recoveryTotal, max: 15 },
      performance: { score: performanceTotal, max: 15 }
    };
  }

  function renderDailyScores() {
    const container = document.getElementById('daily-scores-container');
    if (!container) return;
    container.innerHTML = '';

    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(getDateStr(new Date(Date.now() - i * 86400000)));
    }

    let hasAny = false;
    dates.forEach(dateStr => {
      const result = calculateDailyScore(dateStr);
      if (!result) return;
      hasAny = true;

      const d = new Date(dateStr);
      const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      const dayName = dayNames[d.getDay()];

      const scoreClass = result.total >= 70 ? 'score-high' : result.total >= 40 ? 'score-mid' : 'score-low';

      const cats = [
        { label: '睡眠と身体', score: result.sleep.score, max: result.sleep.max, color: 'var(--accent-blue)' },
        { label: '栄養と習慣', score: result.lifestyle.score, max: result.lifestyle.max, color: 'var(--accent-green)' },
        { label: 'エネルギー管理', score: result.energy ? result.energy.score : 0, max: result.energy ? result.energy.max : 20, color: '#f97316' },
        { label: 'リカバリー', score: result.recovery.score, max: result.recovery.max, color: '#a78bfa' },
        { label: 'パフォーマンス', score: result.performance.score, max: result.performance.max, color: 'var(--accent-gold)' }
      ];

      const barsHtml = cats.map(c => {
        const pct = Math.round((c.score / c.max) * 100);
        return `<div class="score-cat">
          <span class="score-cat-label">${c.label}</span>
          <div class="score-cat-bar-bg"><div class="score-cat-bar" style="width:${pct}%; background:${c.color}"></div></div>
          <span class="score-cat-val">${c.score}/${c.max}</span>
        </div>`;
      }).join('');

      const card = document.createElement('div');
      card.className = 'score-card';
      card.innerHTML = `
        <div class="score-card-header">
          <span class="score-card-date">${dateLabel}(${dayName})</span>
          <span><span class="score-card-total ${scoreClass}">${result.total}</span><span class="score-card-unit"> /100</span></span>
        </div>
        <div class="score-breakdown">${barsHtml}</div>
      `;
      container.appendChild(card);
    });

    if (!hasAny) {
      container.innerHTML = '<div class="score-empty">朝のチェックインを記録するとスコアが表示されます</div>';
    }
  }

  // ---- ANALYTICS SCREEN ----
  let radarChartInstance = null;

  let weightChartInstance = null;
  let weightPainChartInstance = null;

  function updateAnalyticsScreen() {
    document.getElementById('hist-total').textContent = getTotalWins();
    document.getElementById('hist-streak').textContent = getStreak();
    renderDailyScores();
    renderBadges();
    renderHeatmap();
    drawRadarChart();
    renderDramma();
    renderAnalyticsWeightChart();
    renderWeightPainChart();
    generateBestResetFormula();
    updatePhaseProgress();
  }

  let currentWeightRange = 7;

  function renderAnalyticsWeightChart(rangeDays) {
    if (rangeDays) currentWeightRange = rangeDays;
    const canvas = document.getElementById('analytics-weight-chart');
    const emptyMsg = document.getElementById('analytics-weight-empty');
    const summaryEl = document.getElementById('weight-analytics-summary');
    if (!canvas) return;

    const allWeights = getWeights();
    const cutoff = new Date(Date.now() - currentWeightRange * 86400000);
    const weights = allWeights.filter(w => new Date(w.date) >= cutoff);

    // Summary
    if (summaryEl) {
      if (weights.length > 0) {
        const latest = weights[weights.length - 1];
        let diffHtml = '';
        if (weights.length >= 2) {
          const diff = latest.kg - weights[0].kg;
          const sign = diff < 0 ? '' : '+';
          const cls = diff < 0 ? 'color:var(--accent-green)' : diff > 0 ? 'color:var(--accent-red)' : '';
          diffHtml = `<div class="weight-stat-card" style="flex:1;background:var(--bg-card);border-radius:var(--radius-md);padding:10px;text-align:center;border:1px solid rgba(255,255,255,0.05)"><span style="font-size:1.1rem;font-weight:800;${cls}">${sign}${diff.toFixed(1)}kg</span><span style="display:block;font-size:0.65rem;color:var(--text-secondary);margin-top:2px">増減</span></div>`;
        }
        summaryEl.innerHTML = `<div class="weight-stat-card" style="flex:1;background:var(--bg-card);border-radius:var(--radius-md);padding:10px;text-align:center;border:1px solid rgba(255,255,255,0.05)"><span style="font-size:1.1rem;font-weight:800">${latest.kg.toFixed(1)}kg</span><span style="display:block;font-size:0.65rem;color:var(--text-secondary);margin-top:2px">最新</span></div>${diffHtml}<div class="weight-stat-card" style="flex:1;background:var(--bg-card);border-radius:var(--radius-md);padding:10px;text-align:center;border:1px solid rgba(255,255,255,0.05)"><span style="font-size:1.1rem;font-weight:800">${weights.length}</span><span style="display:block;font-size:0.65rem;color:var(--text-secondary);margin-top:2px">記録数</span></div>`;
      } else {
        summaryEl.innerHTML = '';
      }
    }

    if (weights.length < 2) {
      canvas.style.display = 'none';
      if (emptyMsg) emptyMsg.style.display = 'flex';
      return;
    }

    canvas.style.display = 'block';
    if (emptyMsg) emptyMsg.style.display = 'none';

    const labels = weights.map(w => { const d = new Date(w.date); return `${d.getMonth()+1}/${d.getDate()}`; });
    const data = weights.map(w => w.kg);

    if (weightChartInstance) weightChartInstance.destroy();
    weightChartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: '体重 (kg)',
          data,
          borderColor: '#60a5fa',
          backgroundColor: 'rgba(96,165,250,0.1)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#60a5fa',
          pointBorderColor: '#0a0e1a',
          pointBorderWidth: 2,
          pointRadius: 4,
          borderWidth: 2.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#8892a8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#8892a8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  function drawRadarChart() {
    const ctx = document.getElementById('rest-radar-chart');
    if (!ctx) return;
    
    const checkins = getCheckins().slice(-7);
    const tagCounts = {};
    checkins.forEach(c => { (c.tags || []).forEach(t => tagCounts[t] = (tagCounts[t] || 0) + 1); });

    let scores = [
      (tagCounts['半身浴']||0) + (tagCounts['自然な睡眠']||0) + (tagCounts['ストレッチ']||0),
      (tagCounts['スマホ断ち']||0) + (tagCounts['何もしない']||0) + (tagCounts['通知オフ']||0),
      (tagCounts['自分時間']||0) + (tagCounts['早めの就寝']||0),
      (tagCounts['趣味の没頭']||0) + (tagCounts['読書']||0),
      (tagCounts['有意義な対話']||0) + (tagCounts['子どもと遊ぶ']||0),
      (tagCounts['恩送り']||0) + (tagCounts['由香ごはん']||0) + (tagCounts['感謝']||0)
    ];
    scores = scores.map(s => Math.min(100, Math.round((s / 7) * 100)));

    if (radarChartInstance) radarChartInstance.destroy();
    radarChartInstance = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['D:切り離し', 'R:リラクゼーション', 'A:自律性', 'M:習熟', 'A:つながり', 'M:意味'],
        datasets: [{
          label: '休養充足度 (%)',
          data: scores,
          backgroundColor: 'rgba(52, 211, 153, 0.2)',
          borderColor: '#34d399',
          pointBackgroundColor: '#fbbf24',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#fbbf24',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        scales: {
          r: {
            angleLines: { color: 'rgba(255,255,255,0.1)' },
            grid: { color: 'rgba(255,255,255,0.1)' },
            pointLabels: { color: '#8892a8', font: { size: 10, family: 'Inter' } },
            ticks: { display: false, min: 0, max: 100 }
          }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  function renderDramma() {
    const checkins = getCheckins().slice(-7);
    const checkouts = getCheckouts().slice(-7);
    const rests = getRestRecords().slice(-7);

    // Morning tag counts mapped to DRAMMA
    const morningDrammaMap = {
      D: ['スマホ断ち', '何もしない', '通知オフ'],
      R: ['半身浴', '自然な睡眠', 'ストレッチ'],
      A: ['自分時間', '早めの就寝'],
      M1: ['趣味の没頭', '読書'],
      M2: ['恩送り', '由香ごはん', '感謝'],
      A2: ['有意義な対話', '子どもと遊ぶ']
    };

    const morningDrammaCounts = {};
    checkins.forEach(c => {
      (c.tags || []).forEach(tag => {
        Object.keys(morningDrammaMap).forEach(cat => {
          if (morningDrammaMap[cat].includes(tag)) {
            morningDrammaCounts[cat] = (morningDrammaCounts[cat] || 0) + 1;
          }
        });
      });
    });

    // Evening ritual counts mapped to DRAMMA
    const eveningDrammaCounts = {};
    checkouts.forEach(c => {
      (c.logoutRituals || []).forEach(ritualText => {
        Object.keys(RITUAL_POOL).forEach(cat => {
          if (RITUAL_POOL[cat].some(r => r.text === ritualText)) {
            eveningDrammaCounts[cat] = (eveningDrammaCounts[cat] || 0) + 1;
          }
        });
      });
    });

    // Rest plan counts mapped to DRAMMA
    rests.forEach(r => {
      (r.plans || []).forEach(planText => {
        Object.keys(REST_PLAN_POOL).forEach(cat => {
          if (REST_PLAN_POOL[cat].some(p => p.text === planText)) {
            eveningDrammaCounts[cat] = (eveningDrammaCounts[cat] || 0) + 1;
          }
        });
      });
    });

    const drammaConfig = [
      { id: 'D', label: 'Detachment', desc: '心理的切り離し' },
      { id: 'R', label: 'Relaxation', desc: 'リラクゼーション' },
      { id: 'A', label: 'Autonomy', desc: '自律性（自己決定）' },
      { id: 'M1', label: 'Mastery', desc: '習熟（スキルアップ）' },
      { id: 'M2', label: 'Meaning', desc: '意味（価値）' },
      { id: 'A2', label: 'Affiliation', desc: 'つながり' }
    ];

    const container = document.getElementById('dramma-bars-container');
    if (!container) return;

    container.innerHTML = `
      <div class="dramma-legend">
        <span><span class="dramma-legend-dot" style="background:var(--accent-blue)"></span>朝の振り返り</span>
        <span><span class="dramma-legend-dot" style="background:var(--accent-green)"></span>夜のリチュアル＆休養</span>
      </div>
    `;

    drammaConfig.forEach(d => {
      let morningScore = morningDrammaCounts[d.id] || 0;
      let eveningScore = eveningDrammaCounts[d.id] || 0;

      let totalScore = morningScore + eveningScore;
      let totalPct = Math.min(100, Math.round((totalScore / 7) * 100));
      let morningPct = totalScore > 0 ? Math.round((morningScore / totalScore) * totalPct) : 0;
      let eveningPct = totalPct - morningPct;

      const item = document.createElement('div');
      item.className = 'dramma-item';
      item.innerHTML = `
        <div class="dramma-header">
          <span>${d.id}: ${d.label}</span>
          <span>${totalPct}%</span>
        </div>
        <div class="dramma-desc">${d.desc}</div>
        <div class="dramma-bar-bg">
          <span class="dramma-bar-fill-morning" style="width:${morningPct}%"></span><span class="dramma-bar-fill-evening" style="width:${eveningPct}%"></span>
        </div>
      `;
      container.appendChild(item);
    });
  }

  function generateBestResetFormula() {
    const el = document.getElementById('ai-formula');
    if(!el) return;
    const checkins = getCheckins();
    if (checkins.length < 3) {
      el.textContent = '最適なリセット方程式を見つけるため、まずは3日分データを蓄積しましょう！';
      return;
    }

    let tagStats = {};
    checkins.forEach(c => {
      (c.tags || []).forEach(t => {
        if (!tagStats[t]) tagStats[t] = { sumFatigue: 0, count: 0 };
        tagStats[t].sumFatigue += (c.vas_fatigue || 50);
        tagStats[t].count++;
      });
    });

    let bestTag = null;
    let minAvg = Number.MAX_VALUE;
    
    Object.keys(tagStats).forEach(t => {
      if (tagStats[t].count >= 2) {
        let avg = tagStats[t].sumFatigue / tagStats[t].count;
        if (avg < minAvg) { minAvg = avg; bestTag = t; }
      }
    });

    if (bestTag) {
      const effect = Math.round(100 - minAvg); 
      el.innerHTML = `直樹さんが前夜に<strong style="color:var(--accent-gold)">「${bestTag}」</strong>を行動した翌日は、疲労回復度が非常に高い水準（${effect}点）です！<br><span style="font-size:0.85rem; color:var(--text-secondary)">※「${bestTag}」が直樹さん専用の最強リセット方程式です。</span>`;
    } else {
      el.textContent = 'データ収集中... 翌朝の疲労と行動パターンの相関を分析しています。';
    }
  }

  // ---- Phase Progress ----
  function updatePhaseProgress() {
    const bar = document.getElementById('phase2-bar');
    const desc = document.getElementById('phase2-desc');
    if (!bar) return;

    const weights = getWeights();
    const checkins = getCheckins();
    // Phase 2 progress: based on weight trend (84→80 target) + days tracked
    let progress = 0;
    if (weights.length > 0) {
      const latest = weights[weights.length - 1].kg;
      // Weight component: 84→80 = 0→50%
      const weightProgress = Math.min(50, Math.max(0, (84 - latest) / 4 * 50));
      // Days tracked component: 90 days = 50%
      const daysSinceStart = Math.floor((Date.now() - new Date('2026-02-01').getTime()) / 86400000);
      const daysProgress = Math.min(50, (daysSinceStart / 180) * 50);
      progress = Math.round(weightProgress + daysProgress);
    }
    bar.style.width = Math.min(100, progress) + '%';
    if (desc && weights.length > 0) {
      const latest = weights[weights.length - 1].kg;
      desc.textContent = `現在 ${latest.toFixed(1)}kg → 目標 80kg | 記録${checkins.length}日目`;
    }
  }

  // ---- Weight-Pain Correlation Chart ----
  let currentWpRange = 7;

  function renderWeightPainChart(rangeDays) {
    if (rangeDays) currentWpRange = rangeDays;
    const canvas = document.getElementById('weight-pain-chart');
    const emptyMsg = document.getElementById('weight-pain-empty');
    const insightEl = document.getElementById('weight-pain-insight');
    if (!canvas) return;

    const allWeights = getWeights();
    const allCheckins = getCheckins();
    const cutoff = new Date(Date.now() - currentWpRange * 86400000);

    // Build date-keyed maps
    const weightByDate = {};
    allWeights.forEach(w => {
      const ds = getDateStr(w.date);
      if (new Date(w.date) >= cutoff) weightByDate[ds] = w.kg;
    });
    const painByDate = {};
    allCheckins.forEach(c => {
      if (new Date(c.date) >= cutoff && c.vas_pain != null) painByDate[c.date] = c.vas_pain;
    });

    // Find dates with both weight AND pain data
    const allDates = [...new Set([...Object.keys(weightByDate), ...Object.keys(painByDate)])].sort();
    const pairedDates = allDates.filter(d => weightByDate[d] != null && painByDate[d] != null);

    if (pairedDates.length < 2) {
      canvas.style.display = 'none';
      if (emptyMsg) emptyMsg.style.display = 'flex';
      if (insightEl) insightEl.textContent = '';
      return;
    }

    canvas.style.display = 'block';
    if (emptyMsg) emptyMsg.style.display = 'none';

    const labels = pairedDates.map(d => { const dt = new Date(d); return `${dt.getMonth()+1}/${dt.getDate()}`; });
    const weightData = pairedDates.map(d => weightByDate[d]);
    const painData = pairedDates.map(d => painByDate[d]);

    if (weightPainChartInstance) weightPainChartInstance.destroy();
    weightPainChartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '体重 (kg)',
            data: weightData,
            borderColor: '#60a5fa',
            backgroundColor: 'rgba(96,165,250,0.08)',
            fill: false,
            tension: 0.3,
            pointBackgroundColor: '#60a5fa',
            pointBorderColor: '#0a0e1a',
            pointBorderWidth: 2,
            pointRadius: 4,
            borderWidth: 2.5,
            yAxisID: 'y'
          },
          {
            label: '痛み (VAS)',
            data: painData,
            borderColor: '#ff3b5c',
            backgroundColor: 'rgba(255,59,92,0.08)',
            fill: false,
            tension: 0.3,
            pointBackgroundColor: '#ff3b5c',
            pointBorderColor: '#0a0e1a',
            pointBorderWidth: 2,
            pointRadius: 4,
            borderWidth: 2.5,
            borderDash: [6, 3],
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { ticks: { color: '#8892a8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: {
            type: 'linear',
            position: 'left',
            ticks: { color: '#60a5fa', font: { size: 9 } },
            grid: { color: 'rgba(255,255,255,0.05)' },
            title: { display: true, text: 'kg', color: '#60a5fa', font: { size: 10 } }
          },
          y1: {
            type: 'linear',
            position: 'right',
            min: 0,
            max: 100,
            ticks: { color: '#ff3b5c', font: { size: 9 } },
            grid: { drawOnChartArea: false },
            title: { display: true, text: '痛み', color: '#ff3b5c', font: { size: 10 } }
          }
        },
        plugins: {
          legend: {
            labels: { color: '#8892a8', font: { size: 10 }, usePointStyle: true, pointStyleWidth: 12 }
          }
        }
      }
    });

    // Insight: simple correlation message
    if (insightEl && pairedDates.length >= 3) {
      const firstW = weightData[0], lastW = weightData[weightData.length - 1];
      const firstP = painData[0], lastP = painData[painData.length - 1];
      const wDiff = lastW - firstW;
      const pDiff = lastP - firstP;
      if (wDiff < -0.3 && pDiff < -3) {
        insightEl.innerHTML = `<span style="color:var(--accent-green)">体重 ${Math.abs(wDiff).toFixed(1)}kg減 → 痛み ${Math.abs(pDiff).toFixed(0)}pt改善！減量の効果が出ています</span>`;
      } else if (wDiff > 0.3 && pDiff > 3) {
        insightEl.innerHTML = `<span style="color:var(--accent-red)">体重増と痛み悪化が連動しています。減量が鍵です</span>`;
      } else {
        insightEl.textContent = `${pairedDates.length}日分のデータを分析中。継続記録で相関が見えてきます`;
      }
    } else if (insightEl) {
      insightEl.textContent = '';
    }
  }

  // ---- Weight Range Tabs ----
  document.querySelectorAll('.weight-range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Determine which tab group this belongs to
      const isWpTab = btn.dataset.wpRange != null;
      const parent = btn.closest('.weight-range-tabs');
      if (parent) parent.querySelectorAll('.weight-range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (isWpTab) {
        renderWeightPainChart(parseInt(btn.dataset.wpRange, 10));
      } else {
        renderAnalyticsWeightChart(parseInt(btn.dataset.range, 10));
      }
    });
  });

  // ---- Cloud Data Restore (GAS → localStorage) ----
  // 旧形式(Victories/Checkin/Badges)と新形式(SOS勝利記録/朝チェックイン/バッジ)の両方に対応
  const btnCloudRestore = document.getElementById('btn-cloud-restore');
  if (btnCloudRestore) {
    btnCloudRestore.addEventListener('click', async () => {
      const resultEl = document.getElementById('recovery-result');
      if (resultEl) {
        resultEl.style.display = 'block';
        resultEl.textContent = '☁️ クラウドからデータを取得中...';
        resultEl.style.color = 'var(--accent-blue)';
      }
      btnCloudRestore.disabled = true;

      try {
        const res = await fetch(GAS_URL);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        let stats = { victories: 0, weights: 0, checkins: 0, checkouts: 0, badges: 0 };

        // --- Victories (旧: Victories / 新: SOS勝利記録) ---
        const vicSheet = data['SOS勝利記録'] || data['Victories'] || [];
        if (vicSheet.length > 0) {
          const existing = getVictories();
          const existingSet = new Set(existing.map(v => v.date));
          const newVics = [];
          const seen = new Set();
          vicSheet.forEach(v => {
            const ts = v['日時'] || v['Timestamp'] || v.timestamp;
            if (!ts) return;
            const tsStr = new Date(ts).toISOString();
            if (seen.has(tsStr)) return;
            seen.add(tsStr);
            const entry = {
              date: tsStr,
              craving: v['対象'] || v['Craving'] || v.craving || '',
              duration: parseInt(v['耐えた秒数'] || v['Duration(s)'] || v.duration) || 0
            };
            if (!existingSet.has(entry.date)) newVics.push(entry);
          });
          if (newVics.length > 0) {
            const merged = [...existing, ...newVics].sort((a, b) => a.date.localeCompare(b.date));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            stats.victories = newVics.length;
          }
        }

        // --- Checkin + Weight (旧: Checkin / 新: 朝チェックイン) ---
        // 両方のシートからデータを統合
        const ciSheetNew = data['朝チェックイン'] || [];
        const ciSheetOld = data['Checkin'] || [];
        const ciSheet = [...ciSheetNew, ...ciSheetOld];
        if (ciSheet.length > 0) {
          const existingW = getWeights();
          const weightMap = {};
          existingW.forEach(w => { weightMap[getDateStr(w.date)] = w; });
          const existingC = getCheckins();
          const existingCDates = new Set(existingC.map(c => c.date));
          const newCheckins = [];
          const seenDates = new Set();

          ciSheet.forEach(c => {
            const ts = c['記録日時'] || c['Timestamp'] || c.timestamp;
            const dateRaw = c['日付'] || c['Date'] || c.date || ts;
            if (!dateRaw) return;
            const dateStr = getDateStr(new Date(dateRaw));
            if (seenDates.has(dateStr)) return;
            seenDates.add(dateStr);

            // Weight — 上書きマージ（クラウドのデータで既存を更新）
            const kg = parseFloat(c['体重(kg)'] || c['Weight'] || c.weight);
            if (kg && kg > 30 && kg < 300) {
              weightMap[dateStr] = { date: new Date(ts || dateRaw).toISOString(), kg };
            }

            // Checkin record
            if (!existingCDates.has(dateStr)) {
              const sleepH = parseFloat(c['睡眠時間'] || c['SleepHours'] || c.sleepHours);
              const sleepQ = c['睡眠の質'] || c['SleepQuality'] || c.sleepQuality || null;
              const cpapRaw = c['CPAP'];
              const cpap = cpapRaw != null && cpapRaw !== '' ? parseInt(cpapRaw) : null;
              const fatigue = c['疲労度VAS'] != null && c['疲労度VAS'] !== '' ? parseInt(c['疲労度VAS']) : 50;
              const pain = c['痛みVAS'] != null && c['痛みVAS'] !== '' ? parseInt(c['痛みVAS']) : 50;
              const tagsRaw = c['タグ（カンマ区切り）'] || '';
              const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(t => t) : [];
              const dinnerType = c['夕食タイプ'] || c['DietBase'] || c.dinnerType || null;
              const dinnerTime = c['夕食時間'] || c.dinnerTime || null;

              const headacheRaw = c['頭痛'];
              const headache = headacheRaw != null && headacheRaw !== '' ? parseInt(headacheRaw) : null;

              const entry = {
                date: dateStr,
                timestamp: ts ? new Date(ts).toISOString() : new Date(dateRaw).toISOString(),
                weight: kg || null,
                sleepHours: sleepH || null,
                sleepQuality: sleepQ,
                cpap: cpap,
                vas_fatigue: fatigue,
                vas_pain: pain,
                headache: headache,
                tags: tags,
                dinnerType: dinnerType,
                dinnerTime: dinnerTime,
                caffeine: c['カフェイン杯数'] != null && c['カフェイン杯数'] !== '' ? parseInt(c['カフェイン杯数']) : null,
                caffeineLastTime: c['最終カフェイン時間'] || null
              };
              newCheckins.push(entry);
            }
          });

          // 体重: マップから配列に戻して保存（既存+クラウドの全データ）
          const allWeights = Object.values(weightMap).sort((a, b) => a.date.localeCompare(b.date));
          localStorage.setItem(WEIGHT_KEY, JSON.stringify(allWeights));
          stats.weights = allWeights.length - existingW.length;
          if (stats.weights < 0) stats.weights = 0;

          if (newCheckins.length > 0) {
            const merged = [...existingC, ...newCheckins].sort((a, b) => a.date.localeCompare(b.date));
            localStorage.setItem(CHECKIN_KEY, JSON.stringify(merged));
            stats.checkins = newCheckins.length;
          }
        }

        // --- Checkout (新: 夜チェックアウト) ---
        const coSheet = data['夜チェックアウト'] || [];
        if (coSheet.length > 0) {
          const existingCo = getCheckouts();
          const existingCoDates = new Set(existingCo.map(c => c.date));
          const newCheckouts = [];
          coSheet.forEach(c => {
            const dateStr = c['日付'] || '';
            if (!dateStr || existingCoDates.has(dateStr)) return;
            newCheckouts.push({
              date: dateStr,
              timestamp: c['記録日時'] || '',
              vas_performance: parseInt(c['パフォーマンスVAS']) || 50,
              reflection: c['振り返りメモ'] || null,
              logoutRituals: (c['リチュアル（カンマ区切り）'] || '').split(',').filter(t => t.trim())
            });
          });
          if (newCheckouts.length > 0) {
            const merged = [...existingCo, ...newCheckouts].sort((a, b) => a.date.localeCompare(b.date));
            saveCheckouts(merged);
            stats.checkouts = newCheckouts.length;
          }
        }

        // --- Badges (旧: Badges / 新: バッジ) ---
        const badgeSheet = data['バッジ'] || data['Badges'] || [];
        if (badgeSheet.length > 0) {
          const existing = getEarnedBadges();
          const existingSet = new Set(existing);
          const newBadgeIds = [];
          badgeSheet.forEach(b => {
            const id = b['バッジID'] || b['BadgeID'] || b.badgeId;
            if (id && !existingSet.has(id)) { newBadgeIds.push(id); existingSet.add(id); }
          });
          if (newBadgeIds.length > 0) {
            localStorage.setItem(BADGES_KEY, JSON.stringify([...existing, ...newBadgeIds]));
            stats.badges = newBadgeIds.length;
          }
        }

        const total = stats.victories + stats.weights + stats.checkins + stats.checkouts + stats.badges;
        if (resultEl) {
          if (total > 0) {
            resultEl.innerHTML = `✅ 復元完了！<br>勝利: ${stats.victories}件 / 体重: ${stats.weights}件 / 朝: ${stats.checkins}件 / 夜: ${stats.checkouts}件 / バッジ: ${stats.badges}件`;
            resultEl.style.color = 'var(--accent-green)';
            setTimeout(() => { updateAnalyticsScreen(); updateHomeStats(); }, 500);
          } else {
            resultEl.textContent = 'すべてのクラウドデータは復元済みです';
            resultEl.style.color = 'var(--text-secondary)';
          }
        }
      } catch (err) {
        if (resultEl) {
          resultEl.textContent = '❌ 復元に失敗しました: ' + err.message;
          resultEl.style.color = 'var(--accent-red)';
        }
      }
      btnCloudRestore.disabled = false;
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    });
  }

  // ---- Service Worker ----
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  // ---- Init ----
  updateHomeStats();

})();
