// app.js - Trình điều khiển chính cho KET Listening App
window.App = {
  currentTestId: 1,
  currentMode: 'intermediate', // 'beginner' | 'intermediate' | 'exam'
  currentQuestionIndex: 0,
  testData: null,
  attempts: {}, // { qId: attemptCount }
  userAnswers: {}, // { qId: selectedOption or text }
  socraticHintsRevealed: {}, // { qId: tierNumber }
  examTimerInterval: null,
  examSecondsRemaining: 30 * 60, // 30 mins
  
  async init() {
    window.KetAudioPlayer.init();
    window.I18N.setLang(window.I18N.currentLang);
    
    // Bind global keybindings
    window.addEventListener('keydown', (e) => this.handleKeydown(e));
    
    // Load Test 1 by default
    await this.loadTest(this.currentTestId);
    
    // Setup UI event listeners
    this.setupListeners();
  },

  async loadTest(testId) {
    this.currentTestId = testId;
    this.currentQuestionIndex = 0;
    this.attempts = {};
    this.userAnswers = {};
    this.socraticHintsRevealed = {};

    try {
      const res = await fetch(`data/test_${testId}.json`);
      if (res.ok) {
        this.testData = await res.json();
      } else {
        // Fallback or alert
        console.warn(`Could not load test_${testId}.json`);
      }
    } catch (e) {
      console.error(e);
    }

    this.renderWorkspace();
  },

  setupListeners() {
    // Mode Switcher Tabs
    document.querySelectorAll('.tier-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const mode = e.currentTarget.getAttribute('data-mode');
        this.setMode(mode);
      });
    });

    // Test Selector
    const testSelect = document.getElementById('select-active-test');
    if (testSelect) {
      testSelect.addEventListener('change', (e) => {
        this.loadTest(parseInt(e.target.value, 10));
      });
    }

    // Audio Toolbar Buttons
    document.getElementById('audio-play-btn')?.addEventListener('click', () => window.KetAudioPlayer.togglePlay());
    document.getElementById('audio-replay-btn')?.addEventListener('click', () => window.KetAudioPlayer.replay5s());
    document.getElementById('audio-forward-btn')?.addEventListener('click', () => window.KetAudioPlayer.skip5s());
    document.getElementById('audio-speed-btn')?.addEventListener('click', () => window.KetAudioPlayer.cycleSpeed());
    
    const progBar = document.getElementById('audio-progress-bar');
    if (progBar) {
      progBar.addEventListener('input', (e) => {
        window.KetAudioPlayer.seek(parseFloat(e.target.value));
      });
    }
  },

  setMode(mode) {
    this.currentMode = mode;
    document.querySelectorAll('.tier-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-mode') === mode);
    });
    this.renderWorkspace();
  },

  renderWorkspace() {
    if (!this.testData || !this.testData.questions) return;
    
    const q = this.testData.questions[this.currentQuestionIndex];
    if (!q) return;

    window.KetTracker.startQuestionTimer();

    // Auto load audio for this part
    if (q.audio_file) {
      window.KetAudioPlayer.loadTrack(q.audio_file);
    }

    // Update Left Pane
    this.renderLeftPane(q);

    // Update Right Pane based on mode
    if (this.currentMode === 'beginner') {
      this.renderBeginnerWorkspace(q);
    } else if (this.currentMode === 'intermediate') {
      this.renderIntermediateWorkspace(q);
    } else if (this.currentMode === 'exam') {
      this.renderExamWorkspace(q);
    }
  },

  renderLeftPane(q) {
    const pane = document.getElementById('pane-left');
    if (!pane) return;

    if (this.currentMode === 'exam') {
      // PDF & Exam Instructions view
      pane.innerHTML = `
        <div style="padding: 1rem; color: var(--text-secondary);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
            <span class="part-badge">📖 Trang Sách Gốc: ${q.pdf_page}</span>
            <span class="badge-session">Cambridge A2 Key</span>
          </div>
          <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.5rem; text-align:center;">
            <h3 style="color:var(--text-primary); margin-bottom: 0.5rem;">Succeed in A2 Key — Test ${this.currentTestId}</h3>
            <p style="font-size:0.9rem; margin-bottom: 1rem;">Phần thi này đối chiếu với Trang <strong>${q.pdf_page}</strong> trong sách giáo trình.</p>
            <div style="padding: 1rem; background: rgba(0,0,0,0.3); border-radius: var(--radius-md); font-family: var(--font-mono); font-size: 0.85rem; color: #38bdf8;">
              Audio Part ${q.part}: Đang phát trực tiếp từ track cắt chuẩn
            </div>
          </div>
        </div>
      `;
    } else {
      // Socratic / Learning View
      pane.innerHTML = `
        <div style="padding: 1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
            <span class="part-badge">Part ${q.part} (Câu ${q.q_number})</span>
            <span class="stopwatch-badge">⏱️ Đang làm câu này</span>
          </div>
          <div class="cloze-box">
            <h4 style="color:var(--accent-blue); margin-bottom:0.5rem;">🎯 Mục Tiêu Luyện Nghe</h4>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">
              ${this.currentMode === 'beginner' 
                ? 'Luyện tập nghe từng cụm từ và chép chính tả chính xác để rèn phản xạ nhận diện âm thanh Cambridge.' 
                : 'Nhận diện bẫy đánh lạc hướng (Distractors) và từ đồng nghĩa (Paraphrasing) mà người nói sử dụng.'}
            </p>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button class="btn-secondary" onclick="window.KetAudioPlayer.replay5s()" style="font-size: 0.8rem;">⏮️ Nghe lại 5s</button>
              <button class="btn-secondary" onclick="window.KetAudioPlayer.setSpeed(0.85)" style="font-size: 0.8rem;">🐢 Nghe Chậm (0.85x)</button>
              <button class="btn-secondary" onclick="window.KetAudioPlayer.setSpeed(1.0)" style="font-size: 0.8rem;">⚡ Tốc Độ Thường (1.0x)</button>
            </div>
          </div>
          ${this.renderTranscriptCard(q)}
        </div>
      `;
    }
  },

  renderTranscriptCard(q) {
    const revealed = this.socraticHintsRevealed[q.id] >= 3 || this.currentMode === 'beginner';
    if (!revealed) {
      return `
        <div style="background: rgba(255,255,255,0.03); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          🔒 Audioscript sẽ được mở khóa sau khi bạn hoàn thành 3 lần thử hoặc trả lời đúng.
        </div>
      `;
    }
    return `
      <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem; font-size: 0.9rem;">
        <h4 style="color: var(--accent-green); margin-bottom: 0.5rem;">📜 Audioscript Trích Đoạn:</h4>
        <p style="white-space: pre-line; color: var(--text-secondary); line-height: 1.6;">${q.transcript}</p>
      </div>
    `;
  },

  renderBeginnerWorkspace(q) {
    const pane = document.getElementById('pane-right');
    if (!pane) return;

    const cloze = q.dictation_cloze || { text: q.prompt, blanks: [] };
    // Replace [word] with input fields
    let renderedText = cloze.text.replace(/\[(.*?)\]/g, (match, p1) => {
      return `<input type="text" class="cloze-input" data-answer="${p1}" placeholder="___" />`;
    });

    pane.innerHTML = `
      <div class="question-header">
        <span class="part-badge">🎧 Chế Độ Dictation</span>
        <span class="stopwatch-badge">${this.currentQuestionIndex + 1} / ${this.testData.questions.length}</span>
      </div>
      <h3 class="question-prompt">${q.prompt}</h3>
      <div class="cloze-box">
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;" data-i18n="dictation_instruction">
          ${window.I18N.t('dictation_instruction')}
        </p>
        <div style="font-size: 1.05rem; line-height: 2; color: var(--text-primary);">
          ${renderedText}
        </div>
      </div>

      <div id="dictation-feedback" style="min-height: 40px; margin-bottom: 1rem;"></div>

      <div class="action-bar">
        <div>
          <button class="btn-secondary" onclick="App.prevQuestion()">⬅️ Câu trước</button>
          <button class="btn-secondary" onclick="App.revealLetterHint()" style="margin-left: 0.5rem;">💡 Gợi ý chữ cái</button>
        </div>
        <div>
          <button class="btn-primary" onclick="App.checkDictationAnswer()">Kiểm tra chính tả ⏎</button>
          <button class="btn-secondary" onclick="App.nextQuestion()" style="margin-left: 0.5rem;">Câu tiếp ➡️</button>
        </div>
      </div>
    `;
  },

  renderIntermediateWorkspace(q) {
    const pane = document.getElementById('pane-right');
    if (!pane) return;

    let optionsHtml = '';
    if (q.options) {
      optionsHtml = Object.entries(q.options).map(([key, val]) => {
        const isSelected = this.userAnswers[q.id] === key;
        return `
          <div class="option-item ${isSelected ? 'selected' : ''}" onclick="App.selectOption('${q.id}', '${key}')">
            <span class="option-key">${key}</span>
            <span class="option-val">${val}</span>
          </div>
        `;
      }).join('');
    } else {
      // Gap-fill input
      optionsHtml = `
        <div style="margin: 1.5rem 0;">
          <input type="text" id="gap-fill-input" class="cloze-input" style="width: 280px; text-align: left; padding: 0.6rem 1rem;" placeholder="Nhập câu trả lời..." value="${this.userAnswers[q.id] || ''}" />
        </div>
      `;
    }

    // Socratic hints markup
    const hintLevel = this.socraticHintsRevealed[q.id] || 0;
    let hintsHtml = '';
    if (hintLevel >= 1 && q.tier1_hint) {
      hintsHtml += `<div class="hint-card hint-tier1"><strong>💡 Tầng 1 (Bối cảnh & Từ khóa):</strong> ${q.tier1_hint}</div>`;
    }
    if (hintLevel >= 2 && q.tier2_hint) {
      hintsHtml += `<div class="hint-card hint-tier2"><strong>🔍 Tầng 2 (Bẫy đề thi):</strong> ${q.tier2_hint}</div>`;
    }
    if (hintLevel >= 3 && q.tier3_hint) {
      hintsHtml += `<div class="hint-card hint-tier3"><strong>📖 Tầng 3 (Lời giải chi tiết):</strong> ${q.tier3_hint}</div>`;
    }

    pane.innerHTML = `
      <div class="question-header">
        <span class="part-badge">Part ${q.part}</span>
        <span class="stopwatch-badge">Câu ${this.currentQuestionIndex + 1} / ${this.testData.questions.length}</span>
      </div>
      <h3 class="question-prompt">${q.prompt}</h3>
      <div class="options-list">${optionsHtml}</div>
      <div class="socratic-container">${hintsHtml}</div>
      <div id="answer-feedback" style="margin-top: 1rem;"></div>

      <div class="action-bar">
        <button class="btn-secondary" onclick="App.prevQuestion()">⬅️ Câu trước</button>
        <div>
          <button class="btn-primary" onclick="App.checkIntermediateAnswer()">Kiểm tra đáp án ⏎</button>
          <button class="btn-secondary" onclick="App.nextQuestion()" style="margin-left: 0.5rem;">Câu tiếp ➡️</button>
        </div>
      </div>
    `;
  },

  renderExamWorkspace(q) {
    const pane = document.getElementById('pane-right');
    if (!pane) return;

    // Full 25 question grid on right
    let sheetRows = this.testData.questions.map((item, idx) => {
      const isCurrent = idx === this.currentQuestionIndex;
      const ans = this.userAnswers[item.id] || '';
      return `
        <div style="display:flex; align-items:center; justify-content:space-between; padding: 0.6rem 0.8rem; background: ${isCurrent ? 'rgba(59,130,246,0.1)' : 'var(--bg-card)'}; border: 1px solid ${isCurrent ? 'var(--accent-blue)' : 'var(--border-subtle)'}; border-radius: var(--radius-sm); margin-bottom: 0.4rem; cursor:pointer;" onclick="App.jumpToQuestion(${idx})">
          <span style="font-weight:600; font-size:0.85rem;">Q${item.q_number} (Part ${item.part})</span>
          <span style="font-family:var(--font-mono); font-size:0.85rem; color: #38bdf8;">${ans ? ans : '—'}</span>
        </div>
      `;
    }).join('');

    pane.innerHTML = `
      <div class="question-header">
        <span class="part-badge">Phiếu Làm Bài Trực Tuyến</span>
        <span class="stopwatch-badge">⏱️ 30:00</span>
      </div>
      <h3 style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 1rem;">Chọn câu để điền câu trả lời:</h3>
      <div style="max-height: calc(100vh - 280px); overflow-y: auto;">
        ${sheetRows}
      </div>
      <div class="action-bar">
        <button class="btn-secondary" onclick="App.prevQuestion()">⬅️ Trước</button>
        <button class="btn-primary" onclick="App.submitExamTest()">Nộp Bài Thi (Finish) 🚀</button>
        <button class="btn-secondary" onclick="App.nextQuestion()">Tiếp ➡️</button>
      </div>
    `;
  },

  selectOption(qId, key) {
    this.userAnswers[qId] = key;
    this.renderWorkspace();
  },

  checkDictationAnswer() {
    const inputs = document.querySelectorAll('.cloze-input');
    let allCorrect = true;
    inputs.forEach(input => {
      const expected = input.getAttribute('data-answer').trim().toLowerCase();
      const val = input.value.trim().toLowerCase();
      if (val === expected || val.replace(/[.,£]/g, '') === expected.replace(/[.,£]/g, '')) {
        input.classList.add('correct');
        input.classList.remove('incorrect');
      } else {
        input.classList.add('incorrect');
        input.classList.remove('correct');
        allCorrect = false;
      }
    });

    const feedback = document.getElementById('dictation-feedback');
    if (feedback) {
      if (allCorrect) {
        feedback.innerHTML = `<span style="color:var(--accent-green); font-weight:600;">${window.I18N.t('correct_msg')}</span>`;
      } else {
        feedback.innerHTML = `<span style="color:var(--accent-red); font-size:0.9rem;">${window.I18N.t('incorrect_msg')}</span>`;
      }
    }
  },

  checkIntermediateAnswer() {
    const q = this.testData.questions[this.currentQuestionIndex];
    if (!q) return;

    let ans = this.userAnswers[q.id];
    if (!ans) {
      const input = document.getElementById('gap-fill-input');
      if (input) ans = input.value.trim();
    }
    if (!ans) return;

    const currentAttempts = (this.attempts[q.id] || 0) + 1;
    this.attempts[q.id] = currentAttempts;

    const isCorrect = q.acceptable_answers.some(a => a.toLowerCase() === ans.toLowerCase());

    if (isCorrect) {
      this.socraticHintsRevealed[q.id] = 3;
      const feedback = document.getElementById('answer-feedback');
      if (feedback) {
        feedback.innerHTML = `<div style="color:var(--accent-green); font-weight:600;">${window.I18N.t('correct_msg')}</div>`;
      }
      this.renderWorkspace();
    } else {
      // Reveal hints progressively
      this.socraticHintsRevealed[q.id] = Math.min(3, currentAttempts);
      this.openTrapGateModal(q);
      this.renderWorkspace();
    }
  },

  openTrapGateModal(q) {
    const modal = document.getElementById('modal-trap-gate');
    if (modal) {
      modal.classList.add('open');
      const title = document.getElementById('trap-gate-question-title');
      if (title) title.textContent = `Câu ${q.q_number}: ${q.prompt}`;
    }
  },

  closeTrapGateModal() {
    const modal = document.getElementById('modal-trap-gate');
    if (modal) modal.classList.remove('open');
  },

  submitTrapLog(trapType) {
    const q = this.testData.questions[this.currentQuestionIndex];
    window.KetTracker.logEvent('TRAP_LOGGED', {
      question_id: q.id,
      trap_selected: trapType,
      duration_sec: window.KetTracker.getQuestionDuration()
    });
    this.closeTrapGateModal();
  },

  revealLetterHint() {
    const inputs = document.querySelectorAll('.cloze-input');
    inputs.forEach(input => {
      const expected = input.getAttribute('data-answer');
      if (expected && !input.value) {
        input.value = expected.charAt(0);
      }
    });
  },

  prevQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.renderWorkspace();
    }
  },

  nextQuestion() {
    if (this.currentQuestionIndex < this.testData.questions.length - 1) {
      this.currentQuestionIndex++;
      this.renderWorkspace();
    }
  },

  jumpToQuestion(idx) {
    this.currentQuestionIndex = idx;
    this.renderWorkspace();
  },

  submitExamTest() {
    let score = 0;
    this.testData.questions.forEach(q => {
      const ans = this.userAnswers[q.id];
      if (ans && q.acceptable_answers.some(a => a.toLowerCase() === ans.toLowerCase())) {
        score++;
      }
    });

    let grade = "Pass (Level A2)";
    if (score >= 23) grade = "Pass with Distinction (Level B1)";
    else if (score >= 20) grade = "Pass with Merit (Level A2)";
    else if (score >= 14) grade = "Level A1";
    else grade = "Fail (Try Again)";

    alert(`🏁 Kết quả bài thi Test ${this.currentTestId}:\n- Điểm số: ${score} / 25\n- Đánh giá: ${grade}`);
  },

  handleKeydown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space') {
      e.preventDefault();
      window.KetAudioPlayer.togglePlay();
    } else if (e.code === 'KeyZ') {
      document.body.classList.toggle('zen-mode');
    } else if (e.code === 'ArrowLeft') {
      window.KetAudioPlayer.replay5s();
    } else if (e.code === 'ArrowRight') {
      window.KetAudioPlayer.skip5s();
    }
  }
};

window.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});
