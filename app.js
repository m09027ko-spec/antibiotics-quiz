(() => {
  'use strict';

  const STORAGE_KEY = 'antibiotics-quiz-v1';
  const NAME_KEY = 'antibiotics-quiz-name';

  // Google Sheets連携 — Google Apps ScriptのデプロイURLをここに設定
  // 設定手順はREADMEまたはCLAUDE.mdを参照
  const SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyAfd0Ab_Ff-D_mCZNSKjmRBqLad9A72yFvw_Bq3liMYRfCWETPRuoa4pydDv48dRqs/exec';

  let allQuestions = [];
  let quizQueue = [];
  let currentIndex = 0;
  let currentMode = 'random';
  let selectedCategory = null;
  let sessionCorrect = 0;
  let sessionTotal = 0;
  let answered = false;
  let userName = '';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const screens = {
    name: $('#screen-name'),
    start: $('#screen-start'),
    quiz: $('#screen-quiz'),
    complete: $('#screen-complete'),
  };

  // --- Progress ---
  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }

  function saveProgress(p) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  }

  function markCorrect(id) {
    const p = loadProgress();
    p[id] = { correct: true, ts: Date.now() };
    saveProgress(p);
  }

  function markIncorrect(id) {
    const p = loadProgress();
    if (!p[id]?.correct) {
      p[id] = { correct: false, attempts: (p[id]?.attempts || 0) + 1, ts: Date.now() };
    }
    saveProgress(p);
  }

  function isCleared(id) {
    return loadProgress()[id]?.correct === true;
  }

  function resetProgress() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // --- Google Sheets送信 ---
  function sendToSheets(data) {
    if (!SHEETS_WEBHOOK_URL) return;
    fetch(SHEETS_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});
  }

  function reportAnswer(question, choiceIndex, isCorrect) {
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    sendToSheets({
      name: userName,
      timestamp: new Date().toLocaleString('ja-JP'),
      questionId: question.id,
      category: question.category,
      question: question.question,
      selectedAnswer: labels[choiceIndex] + ': ' + question.choices[choiceIndex],
      correctAnswer: labels[question.answer] + ': ' + question.choices[question.answer],
      result: isCorrect ? '正解' : '不正解',
    });
  }

  // --- Data ---
  function loadData() {
    allQuestions = typeof QUIZ_DATA !== 'undefined' ? QUIZ_DATA : [];
  }

  function getCategories() {
    return [...new Set(allQuestions.map((q) => q.category))];
  }

  function getUnanswered(qs) {
    return qs.filter((q) => !isCleared(q.id));
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildQueue() {
    let pool;
    if (currentMode === 'random') {
      pool = shuffle(getUnanswered(allQuestions));
    } else {
      pool = getUnanswered(allQuestions.filter((q) => q.category === selectedCategory));
    }
    return pool;
  }

  // --- Screens ---
  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  // --- Name screen ---
  function initNameScreen() {
    const input = $('#input-name');
    const btn = $('#btn-name-submit');

    // Restore saved name
    const saved = localStorage.getItem(NAME_KEY);
    if (saved) {
      input.value = saved;
      btn.disabled = false;
    }

    input.addEventListener('input', () => {
      btn.disabled = input.value.trim().length === 0;
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        btn.click();
      }
    });

    btn.addEventListener('click', () => {
      userName = input.value.trim();
      if (!userName) return;
      localStorage.setItem(NAME_KEY, userName);
      showScreen('start');
      renderStart();
    });
  }

  // --- Start ---
  function renderStart() {
    $('#start-greeting').textContent = `${userName} さん`;

    const cats = getCategories();
    const list = $('#category-list');
    list.innerHTML = '';

    cats.forEach((cat) => {
      const btn = document.createElement('button');
      const total = allQuestions.filter((q) => q.category === cat).length;
      const done = allQuestions.filter((q) => q.category === cat && isCleared(q.id)).length;
      btn.className = 'category-chip' + (selectedCategory === cat ? ' selected' : '');
      btn.textContent = `${cat}  ${done}/${total}`;
      btn.addEventListener('click', () => {
        selectedCategory = cat;
        renderStart();
      });
      list.appendChild(btn);
    });

    // Progress
    const total = allQuestions.length;
    const cleared = allQuestions.filter((q) => isCleared(q.id)).length;
    const pct = total > 0 ? Math.round((cleared / total) * 100) : 0;

    $('#progress-summary').innerHTML = `
      <div class="progress-label">
        <span class="progress-label-text">学習進捗</span>
        <span class="progress-label-count">${cleared}<span> / ${total} 問</span></span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${pct}%"></div>
      </div>
    `;

    // Start button
    const remaining = currentMode === 'random'
      ? getUnanswered(allQuestions).length
      : selectedCategory
        ? getUnanswered(allQuestions.filter((q) => q.category === selectedCategory)).length
        : 0;

    const btn = $('#btn-start');
    if (remaining === 0 && total > 0) {
      btn.disabled = true;
      btn.textContent = '全問クリア！おめでとうございます';
    } else if (currentMode === 'category' && !selectedCategory) {
      btn.disabled = true;
      btn.textContent = 'カテゴリを選んでください';
    } else {
      btn.disabled = false;
      btn.textContent = `スタート（${remaining}問）`;
    }

    // Mode slider position
    const toggle = $('.mode-toggle');
    if (toggle) {
      toggle.dataset.active = currentMode;
    }
  }

  // --- Quiz ---
  function renderQuestion() {
    if (currentIndex >= quizQueue.length) {
      showComplete();
      return;
    }

    answered = false;
    const q = quizQueue[currentIndex];

    $('#quiz-counter').textContent = `${currentIndex + 1}/${quizQueue.length}`;
    $('#quiz-category').textContent = q.category;
    $('#question-text').textContent = q.question;

    // Progress bar
    const pct = quizQueue.length > 0 ? (currentIndex / quizQueue.length) * 100 : 0;
    $('#quiz-progress-fill').style.width = pct + '%';

    const choicesEl = $('#choices');
    choicesEl.innerHTML = '';
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];

    q.choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = `<span class="choice-index">${labels[i]}</span><span>${choice}</span>`;
      btn.addEventListener('click', () => handleAnswer(i));
      choicesEl.appendChild(btn);
    });

    $('#explanation-panel').classList.add('hidden');
    $('#detail-panel').classList.add('hidden');
    $('#btn-detail').classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleAnswer(idx) {
    if (answered) return;
    answered = true;

    const q = quizQueue[currentIndex];
    const correct = idx === q.answer;
    sessionTotal++;

    if (correct) {
      sessionCorrect++;
      markCorrect(q.id);
    } else {
      markIncorrect(q.id);
      quizQueue.push(q);
    }

    // Send to Google Sheets
    reportAnswer(q, idx, correct);

    const buttons = $$('.choice-btn');
    buttons.forEach((btn, i) => {
      btn.disabled = true;
      if (i === q.answer) {
        btn.classList.add('correct');
      } else if (i === idx && !correct) {
        btn.classList.add('incorrect');
      } else {
        btn.classList.add('dimmed');
      }
    });

    const badge = $('#result-badge');
    badge.className = 'result-badge ' + (correct ? 'correct' : 'incorrect');
    badge.textContent = correct ? 'Correct — 正解' : 'Incorrect — 不正解';

    $('#explanation-text').textContent = q.explanation;

    // Detail summary
    const summaries = typeof CATEGORY_SUMMARIES !== 'undefined' ? CATEGORY_SUMMARIES : {};
    const summary = summaries[q.category];
    const detailBtn = $('#btn-detail');
    const detailPanel = $('#detail-panel');
    if (summary) {
      detailBtn.classList.remove('hidden');
      detailBtn.classList.remove('open');
      detailPanel.classList.add('hidden');
      $('#detail-text').textContent = summary;
    } else {
      detailBtn.classList.add('hidden');
      detailPanel.classList.add('hidden');
    }

    $('#explanation-panel').classList.remove('hidden');

    // Update progress bar
    const pct = quizQueue.length > 0 ? ((currentIndex + 1) / quizQueue.length) * 100 : 0;
    $('#quiz-progress-fill').style.width = pct + '%';

    setTimeout(() => {
      $('#explanation-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  function showComplete() {
    showScreen('complete');
    const pct = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0;
    const totalCleared = allQuestions.filter((q) => isCleared(q.id)).length;

    $('#complete-stats').innerHTML = `
      <div class="stat-row">
        <span class="stat-label">今回の正答率</span>
        <span class="stat-value">${sessionCorrect}/${sessionTotal}（${pct}%）</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">累計クリア</span>
        <span class="stat-value">${totalCleared} / ${allQuestions.length} 問</span>
      </div>
    `;
  }

  // --- Events ---
  function initEvents() {
    // Mode toggle
    $$('.mode-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        $$('.mode-tab').forEach((t) => t.classList.remove('selected'));
        tab.classList.add('selected');
        currentMode = tab.dataset.mode;

        const toggle = $('.mode-toggle');
        toggle.dataset.active = currentMode;

        if (currentMode === 'category') {
          $('#category-select').classList.remove('hidden');
          if (!selectedCategory && getCategories().length > 0) {
            selectedCategory = getCategories()[0];
          }
        } else {
          $('#category-select').classList.add('hidden');
          selectedCategory = null;
        }
        renderStart();
      });
    });

    $('#btn-start').addEventListener('click', () => {
      quizQueue = buildQueue();
      if (quizQueue.length === 0) return;
      currentIndex = 0;
      sessionCorrect = 0;
      sessionTotal = 0;
      showScreen('quiz');
      renderQuestion();
    });

    $('#btn-detail').addEventListener('click', () => {
      const panel = $('#detail-panel');
      const btn = $('#btn-detail');
      panel.classList.toggle('hidden');
      btn.classList.toggle('open');
      if (!panel.classList.contains('hidden')) {
        setTimeout(() => {
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    });

    $('#btn-next').addEventListener('click', () => {
      currentIndex++;
      renderQuestion();
    });

    $('#btn-home').addEventListener('click', () => {
      showScreen('start');
      renderStart();
    });

    $('#btn-reset').addEventListener('click', () => {
      if (confirm('進捗をすべてリセットしますか？')) {
        resetProgress();
        renderStart();
      }
    });

    $('#btn-retry').addEventListener('click', () => {
      quizQueue = buildQueue();
      if (quizQueue.length === 0) {
        showScreen('start');
        renderStart();
        return;
      }
      currentIndex = 0;
      sessionCorrect = 0;
      sessionTotal = 0;
      showScreen('quiz');
      renderQuestion();
    });

    $('#btn-back-home').addEventListener('click', () => {
      showScreen('start');
      renderStart();
    });
  }

  // --- Init ---
  function init() {
    loadData();
    initNameScreen();
    initEvents();
  }

  init();
})();
