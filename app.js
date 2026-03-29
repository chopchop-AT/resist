/* ========================================
   RESIST - 食欲撃退アプリ v2
   体重記録 + バッジシステム追加
   ======================================== */

(function() {
  'use strict';

  // ---- Constants ----
  const TIMER_DURATION = 15 * 60;
  const CIRCUMFERENCE = 2 * Math.PI * 90;
  const MESSAGE_INTERVAL = 10000;
  const STORAGE_KEY = 'resist_victories';
  const WEIGHT_KEY = 'resist_weights';
  const BADGES_KEY = 'resist_badges';
  const SPECIAL_KEY = 'resist_special';
  const WINS_PER_TICKET = 10; // 勝利N回でチケット1枚

  // ---- Sync (Google Apps Script) ----
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbyN7Pob4WdTngwJgLspbCbT3iumeA2qss0OmBB0u0bWP7qHt1ntLUbwnfjSjXfJrJeE/exec';
  const SYNC_QUEUE_KEY = 'resist_sync_queue';

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
    weight:  document.getElementById('screen-weight'),
    history: document.getElementById('screen-history')
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
    histWeek:           document.getElementById('hist-week'),
    heatmapContainer:   document.getElementById('heatmap-container'),
    recentWinsList:     document.getElementById('recent-wins-list'),
    badgesGrid:         document.getElementById('badges-grid'),
    modalBadge:         document.getElementById('modal-badge'),
    newBadgeIcon:       document.getElementById('new-badge-icon'),
    newBadgeName:       document.getElementById('new-badge-name'),
    newBadgeDesc:       document.getElementById('new-badge-desc'),
    btnBadgeClose:      document.getElementById('btn-badge-close'),
    weightInput:        document.getElementById('weight-input'),
    btnSaveWeight:      document.getElementById('btn-save-weight'),
    btnWeightMinus:     document.getElementById('btn-weight-minus'),
    btnWeightPlus:      document.getElementById('btn-weight-plus'),
    weightSummary:      document.getElementById('weight-summary'),
    wCurrent:           document.getElementById('w-current'),
    wDiff:              document.getElementById('w-diff'),
    wDiffCard:          document.getElementById('w-diff-card'),
    wRecords:           document.getElementById('w-records'),
    weightHistoryList:  document.getElementById('weight-history-list'),
    weightChartCanvas:  document.getElementById('weight-chart'),
    weightChartEmpty:   document.getElementById('weight-chart-empty')
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

  function getTodayStr() {
    const d = new Date();
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

  function getWeekWins() {
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    return getVictories().filter(v => new Date(v.date) >= weekAgo).length;
  }

  function getStreak() {
    const v = getVictories();
    if (v.length === 0) return 0;
    const days = [...new Set(v.map(x => getDateStr(x.date)))].sort().reverse();
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
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if (screens[name]) screens[name].classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.screen === name);
    });
    if (name === 'history') updateHistoryScreen();
    if (name === 'home') updateHomeStats();
    if (name === 'weight') updateWeightScreen();
    if (name === 'checkin') initCheckinScreen();
  }

  // ---- Home ----
  function updateHomeStats() {
    els.todayWins.textContent = getTodayWins();
    els.currentStreak.textContent = getStreak();
    els.totalWins.textContent = getTotalWins();

    // Show latest earned badge
    const earned = getEarnedBadges();
    if (earned.length > 0) {
      const latest = BADGE_DEFS.find(b => b.id === earned[earned.length - 1]);
      if (latest) {
        els.homeBadgeIcon.textContent = latest.icon;
        els.homeBadgeName.textContent = `最新バッジ：${latest.name}`;
        els.homeLatestBadge.style.display = 'block';
      }
    }

    // Update special day ticket UI
    const tickets = getAvailableTickets();
    const cycleProg = getWinsInCurrentCycle();
    document.getElementById('special-day-count').textContent = tickets;
    document.getElementById('wins-to-next').textContent = WINS_PER_TICKET - cycleProg;
    document.getElementById('special-progress-bar').style.width = (cycleProg / WINS_PER_TICKET * 100) + '%';
    const useBtn = document.getElementById('btn-use-ticket');
    useBtn.style.display = tickets > 0 ? 'block' : 'none';
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

  // ---- Weight Screen ----
  let chartCtx = null;
  let chartAnimFrame = null;

  function updateWeightScreen() {
    const weights = getWeights();
    const today = getTodayStr();
    const todayEntry = weights.find(w => getDateStr(w.date) === today);
    if (todayEntry) els.weightInput.value = todayEntry.kg;

    if (weights.length > 0) {
      const latest = weights[weights.length - 1];
      els.wCurrent.textContent = latest.kg.toFixed(1) + 'kg';
      els.wRecords.textContent = weights.length;
      els.weightSummary.style.display = 'flex';

      if (weights.length >= 2) {
        const diff = latest.kg - weights[0].kg;
        const sign = diff < 0 ? '' : '+';
        els.wDiff.textContent = sign + diff.toFixed(1) + 'kg';
        els.wDiffCard.className = 'weight-stat-card highlight-diff ' + (diff < 0 ? 'loss' : diff > 0 ? 'gain' : '');
      } else {
        els.wDiff.textContent = '--';
      }
    }

    renderWeightChart(weights);
    renderWeightHistory(weights);
  }

  function renderWeightChart(weights) {
    const canvas = els.weightChartCanvas;
    if (!canvas) return;

    if (weights.length < 2) {
      canvas.style.display = 'none';
      els.weightChartEmpty.style.display = 'flex';
      return;
    }

    canvas.style.display = 'block';
    els.weightChartEmpty.style.display = 'none';

    const dpr = window.devicePixelRatio || 1;
    const container = canvas.parentElement;
    const W = container.clientWidth - 32;
    const H = container.clientHeight - 32;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const kgs = weights.map(w => w.kg);
    const minKg = Math.min(...kgs) - 0.5;
    const maxKg = Math.max(...kgs) + 0.5;
    const pad = { top: 16, right: 12, bottom: 28, left: 36 };
    const cW = W - pad.left - pad.right;
    const cH = H - pad.top - pad.bottom;

    function xPos(i) { return pad.left + (i / (weights.length - 1)) * cW; }
    function yPos(kg) { return pad.top + (1 - (kg - minKg) / (maxKg - minKg)) * cH; }

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * cH;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
      const kg = maxKg - (i / 4) * (maxKg - minKg);
      ctx.fillStyle = 'rgba(136,146,168,0.7)';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(kg.toFixed(1), pad.left - 4, y + 3);
    }

    // Gradient fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
    grad.addColorStop(0, 'rgba(96,165,250,0.3)');
    grad.addColorStop(1, 'rgba(96,165,250,0)');

    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(kgs[0]));
    for (let i = 1; i < weights.length; i++) {
      const x0 = xPos(i-1), y0 = yPos(kgs[i-1]);
      const x1 = xPos(i),   y1 = yPos(kgs[i]);
      const cx = (x0 + x1) / 2;
      ctx.bezierCurveTo(cx, y0, cx, y1, x1, y1);
    }
    ctx.lineTo(xPos(weights.length - 1), pad.top + cH);
    ctx.lineTo(xPos(0), pad.top + cH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(kgs[0]));
    for (let i = 1; i < weights.length; i++) {
      const x0 = xPos(i-1), y0 = yPos(kgs[i-1]);
      const x1 = xPos(i),   y1 = yPos(kgs[i]);
      const cx = (x0 + x1) / 2;
      ctx.bezierCurveTo(cx, y0, cx, y1, x1, y1);
    }
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dots
    weights.forEach((w, i) => {
      const x = xPos(i), y = yPos(w.kg);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#60a5fa';
      ctx.fill();
      ctx.strokeStyle = '#0a0e1a';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // X labels (show first, last, and every ~5th)
    ctx.fillStyle = 'rgba(136,146,168,0.7)';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'center';
    weights.forEach((w, i) => {
      if (i === 0 || i === weights.length - 1 || (weights.length <= 10) || i % Math.ceil(weights.length / 5) === 0) {
        const d = new Date(w.date);
        const label = `${d.getMonth()+1}/${d.getDate()}`;
        ctx.fillText(label, xPos(i), H - pad.bottom + 14);
      }
    });
  }

  function renderWeightHistory(weights) {
    const list = els.weightHistoryList;
    if (weights.length === 0) {
      list.innerHTML = '<p class="empty-message">まだ記録がありません。<br>毎日記録して変化を確認しよう！</p>';
      return;
    }
    list.innerHTML = '';
    [...weights].reverse().forEach((w, i, arr) => {
      const d = new Date(w.date);
      const dateStr = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
      const prev = arr[i + 1];
      let diffHtml = '<span class="wh-diff same">--</span>';
      if (prev) {
        const diff = w.kg - prev.kg;
        const cls = diff < 0 ? 'loss' : diff > 0 ? 'gain' : 'same';
        const sign = diff < 0 ? '' : '+';
        diffHtml = `<span class="wh-diff ${cls}">${sign}${diff.toFixed(1)}kg</span>`;
      }
      const item = document.createElement('div');
      item.className = 'weight-history-item';
      item.innerHTML = `
        <span class="wh-date">⚖️ ${dateStr}</span>
        <span class="wh-weight">${w.kg.toFixed(1)} kg</span>
        ${diffHtml}
      `;
      list.appendChild(item);
    });
  }

  // ---- History Screen ----
  function updateHistoryScreen() {
    els.histTotal.textContent = getTotalWins();
    els.histStreak.textContent = getStreak();
    els.histWeek.textContent = getWeekWins();
    renderBadges();
    renderHeatmap();
    renderRecentWins();
  }

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

  // Weight input
  els.btnSaveWeight.addEventListener('click', () => {
    const val = parseFloat(els.weightInput.value);
    if (isNaN(val) || val < 30 || val > 300) {
      els.weightInput.style.borderBottomColor = '#ff3b5c';
      setTimeout(() => els.weightInput.style.borderBottomColor = '', 1000);
      return;
    }
    saveWeight(val);
    const newBadges = checkAndAwardBadges();
    updateWeightScreen();

    // Flash feedback
    els.btnSaveWeight.textContent = '✓ 記録しました！';
    els.btnSaveWeight.style.background = 'linear-gradient(135deg, #34d399, #10b981)';
    setTimeout(() => {
      els.btnSaveWeight.textContent = '記録する';
      els.btnSaveWeight.style.background = '';
      if (newBadges.length > 0) showBadgeModal(newBadges[0]);
    }, 1200);
  });

  els.btnWeightMinus.addEventListener('click', () => {
    const cur = parseFloat(els.weightInput.value) || 80;
    els.weightInput.value = Math.max(30, cur - 0.1).toFixed(1);
  });

  els.btnWeightPlus.addEventListener('click', () => {
    const cur = parseFloat(els.weightInput.value) || 80;
    els.weightInput.value = Math.min(300, cur + 0.1).toFixed(1);
  });

  // ---- CHECKIN SYSTEM (v3) ----
  const CHECKIN_KEY = 'resist_checkins';

  // Checkin state
  const checkinState = {
    weight: null,
    bedtime: null,
    sleepHours: null,
    sleepQuality: null,
    condition: null,
    mood: null,
    exercise: null,
    diet_base: null,
    diet_alcohol: false,
    diet_snack: false,
    stress: null
  };

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
    const checkins = getCheckins();
    if (checkins.length === 0) return 0;
    const dates = checkins.map(c => c.date).sort().reverse();
    const today = getTodayStr();
    const yesterday = getDateStr(new Date(Date.now() - 86400000));
    if (dates[0] !== today && dates[0] !== yesterday) return 0;
    let streak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
      const diff = (new Date(dates[i]) - new Date(dates[i + 1])) / 86400000;
      if (diff === 1) streak++; else break;
    }
    return streak;
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
    }

    updateCheckinGreeting();
  }

  function updateCheckinGreeting() {
    const h = new Date().getHours();
    const el = document.getElementById('checkin-greeting');
    if (h < 10) el.textContent = '☀️ おはようございます';
    else if (h < 17) el.textContent = '🌤️ こんにちは';
    else el.textContent = '🌙 こんばんは';
  }

  function resetCheckinForm() {
    // Reset state
    Object.keys(checkinState).forEach(k => {
      if (k === 'diet_alcohol' || k === 'diet_snack') checkinState[k] = false;
      else checkinState[k] = null;
    });

    // Reset inputs
    const weightInput = document.getElementById('checkin-weight-raw');
    const weightDisplay = document.getElementById('checkin-weight-display');

    if (weightInput) weightInput.value = '';
    if (weightDisplay) { weightDisplay.textContent = '-- kg'; weightDisplay.classList.remove('has-value'); }

    // Reset all emoji buttons
    document.querySelectorAll('.checkin-emoji-btn').forEach(b => b.classList.remove('selected'));
    // Reset all option buttons
    document.querySelectorAll('.checkin-option-btn').forEach(b => b.classList.remove('selected'));
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


  // Emoji rating handlers (sleepQuality, condition, mood)
  document.querySelectorAll('.checkin-emoji-row').forEach(row => {
    const field = row.dataset.field;
    row.querySelectorAll('.checkin-emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // Deselect siblings
        row.querySelectorAll('.checkin-emoji-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        checkinState[field] = parseInt(btn.dataset.value, 10);
        if (navigator.vibrate) navigator.vibrate(30);
      });
    });
  });

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
        checkinState[field] = isNaN(numVal) ? val : numVal;
        if (navigator.vibrate) navigator.vibrate(30);
      });
    });
  });

  // Toggle button handlers (複数選択)
  document.querySelectorAll('.checkin-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('selected');
      const toggleField = 'diet_' + btn.dataset.toggle;
      checkinState[toggleField] = btn.classList.contains('selected');
      if (navigator.vibrate) navigator.vibrate(30);
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

  // ---- Service Worker ----
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  // ---- Init ----
  updateHomeStats();

})();
