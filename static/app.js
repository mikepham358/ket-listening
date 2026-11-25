// app.js — Succeed in A2 Key Listening (Lego Colorful Theme, Zero-Transcript Dictation & Live Telemetry)
window.App = {
  currentTestId: 1,
  currentMode: 'beginner', // Mặc định mở Beginner cho học sinh
  currentQuestionIndex: 0,
  currentSentenceIndex: 0,
  testData: null,
  attempts: {}, // { qId: attemptCount }
  userAnswers: {}, // { qId: selectedOption or text }
  sentenceAnswers: {}, // { `${qId}_${sIdx}`: text }
  sentenceSolved: {}, // { `${qId}_${sIdx}`: boolean }
  sentenceAttempts: {}, // { `${qId}_${sIdx}`: failCount }
  lastHintConsumed: {}, // { `${qId}_${sIdx}`: boolean }
  socraticHintsRevealed: {}, // { qId: tierNumber }
  examTimerInterval: null,
  examSecondsRemaining: 30 * 60, // 30 mins
  _profileModalPendingAction: null,
  
  // Bảng phân bổ trang PDF chính thức cho cả 8 đề thi (Succeed in A2 Key)
  TEST_PAGES_MAP: {
    1: { p1: 22, p2: 23, p3: 24, p4: 25, p5: 25, start: 22, end: 25 },
    2: { p1: 34, p2: 35, p3: 36, p4: 37, p5: 37, start: 34, end: 37 },
    3: { p1: 46, p2: 47, p3: 48, p4: 49, p5: 49, start: 46, end: 49 },
    4: { p1: 58, p2: 59, p3: 60, p4: 61, p5: 61, start: 58, end: 61 },
    5: { p1: 70, p2: 71, p3: 72, p4: 73, p5: 73, start: 70, end: 73 },
    6: { p1: 82, p2: 83, p3: 84, p4: 85, p5: 85, start: 82, end: 85 },
    7: { p1: 94, p2: 95, p3: 96, p4: 97, p5: 97, start: 94, end: 97 },
    8: { p1: 106, p2: 107, p3: 108, p4: 109, p5: 109, start: 106, end: 109 }
  },
  currentExamPdfPage: 22,
  currentExamPdfTestId: 1,
  
  async init() {
    window.KetAudioPlayer.init();
    if (window.I18N) window.I18N.setLang(window.I18N.currentLang);
    
    // Bind global keybindings
    window.addEventListener('keydown', (e) => this.handleKeydown(e));
    
    // Setup Student Profile & Telemetry Onboarding
    this.initStudentProfile();

    // Load Test 1 by default
    await this.loadTest(this.currentTestId);
    
    // Setup UI event listeners
    this.setupListeners();
  },

  async loadTest(testId) {
    this.currentTestId = testId;
    this.currentQuestionIndex = 0;
    this.currentSentenceIndex = 0;
    this.attempts = {};
    this.userAnswers = {};
    this.sentenceAnswers = {};
    this.sentenceSolved = {};
    this.sentenceAttempts = {};
    this.lastHintConsumed = {};
    this.socraticHintsRevealed = {};

    this.currentExamPdfTestId = testId;
    const cfg = this.TEST_PAGES_MAP[testId] || { p1: 22, p2: 23, p3: 24, p4: 25, p5: 25, start: 22, end: 25 };
    this.currentExamPdfPage = cfg.start;

    try {
      const res = await fetch(`data/test_${testId}.json`);
      if (res.ok) {
        this.testData = await res.json();
      } else {
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

  /* ==========================================================================
     Hồ Sơ Học Sinh & Live Telemetry Smart Interceptor
     ========================================================================== */
  initStudentProfile() {
    // Setup target selector chips
    const targetGrid = document.getElementById('profile-target-selector');
    if (targetGrid) {
      targetGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.lego-target-card');
        if (!btn) return;
        targetGrid.querySelectorAll('.lego-target-card').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    }

    this.updateHeaderProfileBadge();

    // Check if user has entered profile; if not, gently prompt after 700ms
    if (window.KetTracker && !window.KetTracker.hasProfile()) {
      setTimeout(() => {
        if (!window.KetTracker.hasProfile()) {
          this.openStudentProfileModal({ autoPrompt: true });
        }
      }, 700);
    }
  },

  updateHeaderProfileBadge() {
    const prof = window.KetTracker ? window.KetTracker.getProfile() : null;
    const btnProfile = document.getElementById('btn-student-profile');
    const nameEl = document.getElementById('header-student-name');
    if (!btnProfile || !nameEl) return;

    if (window.KetTracker && window.KetTracker.hasProfile() && prof && prof.student_name) {
      btnProfile.classList.remove('unregistered');
      const shortTarget = (prof.target_score || 'Distinction').split(' ')[0];
      nameEl.textContent = `${prof.student_name.trim()} · ${shortTarget} ✏️`;
      btnProfile.title = `Học sinh: ${prof.student_name} (${prof.student_email || 'Chưa có email'}) · Bấm để đổi thông tin`;
    } else {
      btnProfile.classList.add('unregistered');
      nameEl.textContent = 'Nhập Tên Học Sinh ✍️';
      btnProfile.title = 'Nhập họ tên & email để lưu kết quả và đồng bộ lên Google Sheets Live Telemetry';
    }
  },

  openStudentProfileModal(opts = {}) {
    this._profileModalPendingAction = opts.pendingAction || null;
    const modal = document.getElementById('modal-student-profile');
    if (!modal) return;

    const prof = window.KetTracker ? window.KetTracker.getProfile() : {};
    const inputName = document.getElementById('input-student-name');
    const inputEmail = document.getElementById('input-student-email');
    if (inputName) inputName.value = prof.student_name || '';
    if (inputEmail) inputEmail.value = prof.student_email || '';

    // Set target card
    const targetGrid = document.getElementById('profile-target-selector');
    if (targetGrid) {
      targetGrid.querySelectorAll('.lego-target-card').forEach(btn => {
        const val = btn.getAttribute('data-target');
        btn.classList.toggle('active', val === prof.target_score || (!prof.target_score && val.includes('Distinction')));
      });
    }

    // Hide previous error messages
    const errName = document.getElementById('error-student-name');
    const errEmail = document.getElementById('error-student-email');
    if (errName) errName.style.display = 'none';
    if (errEmail) errEmail.style.display = 'none';

    modal.style.display = 'flex';
    setTimeout(() => {
      if (inputName) inputName.focus();
    }, 150);
  },

  closeStudentProfileModal() {
    const modal = document.getElementById('modal-student-profile');
    if (modal) modal.style.display = 'none';
    this._profileModalPendingAction = null;
  },

  skipOrCloseProfileModal() {
    const modal = document.getElementById('modal-student-profile');
    if (modal) modal.style.display = 'none';
    this._profileModalPendingAction = null;
  },

  saveStudentProfileFromForm() {
    const inputName = document.getElementById('input-student-name');
    const inputEmail = document.getElementById('input-student-email');
    const errName = document.getElementById('error-student-name');
    const errEmail = document.getElementById('error-student-email');

    const name = inputName ? inputName.value.trim() : '';
    const email = inputEmail ? inputEmail.value.trim() : '';

    let hasError = false;
    if (!name || name.length < 2) {
      if (errName) errName.style.display = 'block';
      if (inputName) inputName.focus();
      hasError = true;
    } else {
      if (errName) errName.style.display = 'none';
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      if (errEmail) errEmail.style.display = 'block';
      if (!hasError && inputEmail) inputEmail.focus();
      hasError = true;
    } else {
      if (errEmail) errEmail.style.display = 'none';
    }

    if (hasError) return;

    // Get selected target
    const activeTargetBtn = document.querySelector('#profile-target-selector .lego-target-card.active');
    const targetScore = activeTargetBtn ? activeTargetBtn.getAttribute('data-target') : 'Distinction (140-150)';

    if (window.KetTracker) {
      window.KetTracker.setProfile({
        student_name: name,
        student_email: email,
        target_score: targetScore
      });

      // Send Telemetry Session Start
      window.KetTracker.track('SESSION_START', {
        student_name: name,
        student_email: email,
        target_score: targetScore,
        test_id: `Practice Test ${this.currentTestId}`,
        mode: this.currentMode
      }, {
        result: 'ĐĂNG KÝ HỌC SINH THÀNH CÔNG'
      });
    }

    this.updateHeaderProfileBadge();
    const modal = document.getElementById('modal-student-profile');
    if (modal) modal.style.display = 'none';

    // Execute pending action if any
    if (this._profileModalPendingAction && typeof this._profileModalPendingAction === 'function') {
      const pending = this._profileModalPendingAction;
      this._profileModalPendingAction = null;
      pending();
    }
  },

  requireStudentProfile(action) {
    if (window.KetTracker && window.KetTracker.hasProfile()) {
      action();
    } else {
      this.openStudentProfileModal({
        requiredForAction: true,
        pendingAction: action
      });
    }
  },

  promptCustomWebhook() {
    const cur = window.KetTracker ? window.KetTracker.getWebhookUrl() : '';
    const url = prompt("Nhập URL Google Apps Script Webhook của bạn (dạng https://script.google.com/macros/s/.../exec):\n\n(Để trống nếu muốn quay lại Webhook mặc định của hệ thống)", cur);
    if (url !== null) {
      if (window.KetTracker) {
        window.KetTracker.setWebhookUrl(url);
      }
      alert("✅ Đã cập nhật Webhook URL thành công!");
    }
  },

  setMode(mode) {
    this.currentMode = mode;
    this.currentSentenceIndex = 0;
    document.querySelectorAll('.tier-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-mode') === mode);
    });
    this.renderWorkspace();
  },

  renderWorkspace() {
    if (!this.testData || !this.testData.questions) return;
    
    const q = this.testData.questions[this.currentQuestionIndex];
    if (!q) return;

    if (window.KetTracker) window.KetTracker.startQuestionTimer();

    // Auto load audio
    if (this.currentMode === 'exam') {
      const fullAudio = this.testData?.audio_full || `audio/test_${this.currentTestId}/full.mp3`;
      window.KetAudioPlayer.loadTrack(fullAudio, 0, null, true);
    } else if (this.currentMode === 'beginner' && q.dictation_sentences && q.dictation_sentences[this.currentSentenceIndex]) {
      const s = q.dictation_sentences[this.currentSentenceIndex];
      window.KetAudioPlayer.loadTrack(s.audio_file);
    } else if (this.currentMode === 'intermediate') {
      if (q.audio_question) {
        window.KetAudioPlayer.loadTrack(q.audio_question);
      } else if (q.audio_file) {
        window.KetAudioPlayer.loadTrack(q.audio_file);
      }
    } else if (q.audio_question) {
      window.KetAudioPlayer.loadTrack(q.audio_question);
    } else if (q.audio_file) {
      window.KetAudioPlayer.loadTrack(q.audio_file);
    }

    this.renderLeftPane(q);

    if (this.currentMode === 'beginner') {
      this.renderBeginnerWorkspace(q);
    } else if (this.currentMode === 'intermediate') {
      this.renderIntermediateWorkspace(q);
    } else if (this.currentMode === 'exam') {
      this.renderExamWorkspace(q);
    }
  },

  /* ==========================================================================
     Left Pane: Audio Controls & Context (ZERO TRANSCRIPT AT BEGINNER)
     ========================================================================== */
  renderLeftPane(q) {
    const pane = document.getElementById('pane-left');
    if (!pane) return;

    if (this.currentMode === 'exam') {
      const testId = this.currentTestId || 1;
      const cfg = this.TEST_PAGES_MAP[testId] || { p1: 22, p2: 23, p3: 24, p4: 25, p5: 25, start: 22, end: 25 };
      const existingFrame = document.getElementById('exam-pdf-frame');
      const frameTestId = existingFrame ? parseInt(existingFrame.getAttribute('data-test-id') || '0', 10) : null;

      if (existingFrame && frameTestId === testId) {
        this.updateExamPdfNavUI(q ? q.part : null);
        return;
      }

      this.currentExamPdfTestId = testId;
      if (!this.currentExamPdfPage || this.currentExamPdfPage < cfg.start || this.currentExamPdfPage > cfg.end) {
        this.currentExamPdfPage = (q && q.pdf_page) ? q.pdf_page : cfg.start;
      }

      pane.innerHTML = `
        <div class="lego-card lego-pdf-card">
          <div class="lego-pdf-header-row">
            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
              <span class="part-badge" id="exam-pdf-page-indicator">📖 Test ${testId} · Trang ${this.currentExamPdfPage}</span>
              <span class="badge-session">Cambridge A2 Key</span>
            </div>
            <div style="display:flex; gap:0.4rem; align-items:center;">
              <a id="exam-pdf-ext-link" href="https://drive.google.com/file/d/1OVNzYe_ZYOm9xVlfBB9nISHOuLF4_joT/view?usp=drive_open#page=${this.currentExamPdfPage}" target="_blank" rel="noopener" class="lego-btn-secondary" style="text-decoration:none; font-size:0.8rem; padding:0.3rem 0.65rem;" title="Mở file PDF trong tab mới">
                Mở tab mới ↗️
              </a>
              <button class="lego-btn-secondary" onclick="App.reloadExamPdf()" style="font-size:0.8rem; padding:0.3rem 0.65rem;" title="Tải lại PDF">
                🔄 Tải lại
              </button>
            </div>
          </div>

          <!-- LEGO PDF Navigation Dock for Practice Test ${testId} -->
          <div class="lego-pdf-nav-row">
            <button id="btn-pdf-prev" class="lego-pdf-part-btn" onclick="App.prevExamPdfPage()" ${this.currentExamPdfPage <= cfg.start ? 'disabled' : ''} title="Trang trước">
              ◀️ Trước
            </button>
            <button class="lego-pdf-part-btn ${this.currentExamPdfPage === cfg.p1 ? 'active' : ''}" data-page="${cfg.p1}" data-part="1" onclick="App.setExamPdfPage(${cfg.p1}, 1)">
              Part 1 (p.${cfg.p1})
            </button>
            <button class="lego-pdf-part-btn ${this.currentExamPdfPage === cfg.p2 ? 'active' : ''}" data-page="${cfg.p2}" data-part="2" onclick="App.setExamPdfPage(${cfg.p2}, 2)">
              Part 2 (p.${cfg.p2})
            </button>
            <button class="lego-pdf-part-btn ${this.currentExamPdfPage === cfg.p3 ? 'active' : ''}" data-page="${cfg.p3}" data-part="3" onclick="App.setExamPdfPage(${cfg.p3}, 3)">
              Part 3 (p.${cfg.p3})
            </button>
            <button class="lego-pdf-part-btn ${this.currentExamPdfPage === cfg.p4 ? 'active' : ''}" data-page="${cfg.p4}" data-part="4" onclick="App.setExamPdfPage(${cfg.p4}, 4)">
              Part 4 (p.${cfg.p4})
            </button>
            <button class="lego-pdf-part-btn ${this.currentExamPdfPage === cfg.p5 ? 'active' : ''}" data-page="${cfg.p5}" data-part="5" onclick="App.setExamPdfPage(${cfg.p5}, 5)">
              Part 5 (p.${cfg.p5})
            </button>
            <button id="btn-pdf-next" class="lego-pdf-part-btn" onclick="App.nextExamPdfPage()" ${this.currentExamPdfPage >= cfg.end ? 'disabled' : ''} title="Trang sau">
              Sau ▶️
            </button>
          </div>

          <!-- Google Drive PDF Viewer Embed (SUCCEED in A2 Key 2020) -->
          <div class="lego-pdf-viewer-wrap">
            <iframe 
              id="exam-pdf-frame" 
              data-test-id="${testId}"
              src="https://drive.google.com/file/d/1OVNzYe_ZYOm9xVlfBB9nISHOuLF4_joT/preview#page=${this.currentExamPdfPage}" 
              width="100%" 
              height="100%" 
              allow="autoplay"
              loading="lazy"
              title="Đề thi SUCCEED in A2 Key New 2020 Format - Test ${testId}"
            ></iframe>
          </div>
        </div>
      `;
      this.updateExamPdfNavUI(q ? q.part : 1);
      return;
    } else if (this.currentMode === 'beginner') {
      // BEGINNER: ZERO TRANSCRIPT! CHỈ HIỆN ĐIỀU KHIỂN ÂM THANH CÂU THOẠI LẺ
      const sentences = q.dictation_sentences || [];
      const curSent = sentences[this.currentSentenceIndex] || null;
      const speakerName = curSent?.speaker === 'F' ? '👩 Người Nữ' : (curSent?.speaker === 'M' ? '👨 Người Nam' : '🗣️ Người Nói');

      pane.innerHTML = `
        <div class="lego-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
            <span class="part-badge">Part ${q.part} (Câu ${q.q_number})</span>
            <span class="stopwatch-badge">🌱 Mức 1: Chép Chính Tả</span>
          </div>

          <h4 style="color:var(--lego-blue); font-size:1.1rem; margin-bottom:0.75rem;">
            🎯 Bối Cảnh Câu Hỏi:
          </h4>
          <p style="font-size: 1rem; color: var(--text-primary); font-weight:700; margin-bottom: 1.25rem;">
            ${q.prompt}
          </p>

          <!-- Current Sentence Player Box -->
          <div style="background: #f0fdf4; border: 2px solid #bbf7d0; border-bottom: 4px solid #86efac; border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
              <span class="speaker-avatar-badge">${speakerName}</span>
              <span style="font-size:0.85rem; font-weight:800; color:#15803d;">
                Câu thoại ${this.currentSentenceIndex + 1} / ${sentences.length || 1}
              </span>
            </div>

            <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.75rem;">
              <button class="lego-btn-green" onclick="App.replayCurrentSentence()" style="font-size:0.88rem; padding:0.5rem 0.9rem;">
                ▶️ Nghe câu này (Space/R)
              </button>
              <button class="lego-btn-orange" onclick="App.playSentenceSlow()" style="font-size:0.88rem; padding:0.5rem 0.9rem;">
                🐢 0.8x Chậm
              </button>
            </div>

            ${q.audio_question ? `
              <div style="border-top:1px dashed #86efac; padding-top:0.75rem; margin-top:0.5rem;">
                <button class="lego-btn-secondary" onclick="window.KetAudioPlayer.loadTrack('${q.audio_question}'); window.KetAudioPlayer.play();" style="font-size:0.82rem; padding:0.4rem 0.8rem; width:100%;">
                  🎧 Nghe cả đoạn hội thoại (Full Context)
                </button>
              </div>
            ` : ''}
          </div>

          <!-- ZERO-TRANSCRIPT SECURITY LOCK -->
          <div style="background: #fffbeb; border: 2px dashed #fcd34d; border-radius: var(--radius-md); padding: 1.15rem; text-align:center;">
            <div style="font-size:1.8rem; margin-bottom:0.35rem;">🔒</div>
            <h5 style="color:#b45309; font-size:0.95rem; font-weight:800; margin-bottom:0.35rem;">Transcript Được Giấu Kín</h5>
            <p style="font-size:0.85rem; color:#78350f; font-weight:600; line-height:1.5;">
              Hãy lắng nghe bằng đôi tai và gõ vào ô bên phải. Hệ thống sẽ so khớp từng từ cho bạn!
            </p>
            <div style="margin-top:0.75rem; font-size:0.8rem; color:#92400e; font-weight:700;">
              💡 Mẹo: Nhấp đúp vào bất kỳ từ nào để mở <strong>Từ Điển Lego</strong> tra cứu!
            </div>
          </div>
        </div>
      `;
    } else {
      // INTERMEDIATE: SOCRATIC GUIDANCE
      pane.innerHTML = `
        <div class="lego-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
            <span class="part-badge">Part ${q.part} (Câu ${q.q_number})</span>
            <span class="stopwatch-badge">⚡ Mức 2: Socratic</span>
          </div>
          <h4 style="color:var(--lego-blue); font-size:1.1rem; margin-bottom:0.5rem;">🎯 Mục Tiêu Luyện Nghe</h4>
          <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
            Nhận diện bẫy đánh lạc hướng (Distractors) và từ đồng nghĩa (Paraphrasing) mà người nói sử dụng trong bài nghe Cambridge.
          </p>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom:1.25rem;">
            <button class="lego-btn-secondary" onclick="window.KetAudioPlayer.replay5s()" style="font-size: 0.85rem;">⏮️ Nghe lại 5s</button>
            <button class="lego-btn-secondary" onclick="window.KetAudioPlayer.setSpeed(0.85)" style="font-size: 0.85rem;">🐢 Nghe Chậm (0.85x)</button>
            <button class="lego-btn-secondary" onclick="window.KetAudioPlayer.setSpeed(1.0)" style="font-size: 0.85rem;">⚡ Tốc Độ Thường (1.0x)</button>
          </div>
          ${this.renderTranscriptCard(q)}
        </div>
      `;
    }
  },

  renderTranscriptCard(q) {
    const revealed = this.socraticHintsRevealed[q.id] >= 3;
    if (!revealed) {
      return `
        <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: var(--radius-md); padding: 1.25rem; text-align: center; color: var(--text-muted); font-size: 0.9rem; font-weight:600;">
          🔒 Audioscript sẽ được mở khóa sau khi bạn hoàn thành 3 lần thử hoặc trả lời đúng.
        </div>
      `;
    }
    return `
      <div style="background: #eff6ff; border: 2px solid #bfdbfe; border-radius: var(--radius-md); padding: 1.25rem; font-size: 0.95rem;">
        <h4 style="color: var(--lego-blue); margin-bottom: 0.5rem; font-weight:800;">📜 Audioscript Trích Đoạn:</h4>
        <p style="white-space: pre-line; color: var(--text-secondary); line-height: 1.6; font-weight:600;">${q.transcript}</p>
      </div>
    `;
  },

  /* ==========================================================================
     Mức 1: Beginner — Zero-Transcript Dictation Station
     ========================================================================== */
  renderBeginnerWorkspace(q) {
    const pane = document.getElementById('pane-right');
    if (!pane) return;

    const sentences = q.dictation_sentences || [
      { id: "s1", speaker: "Speaker", text: q.prompt, word_count: 5, audio_file: q.audio_question || q.audio_file }
    ];

    const curSent = sentences[this.currentSentenceIndex] || sentences[0];
    const sKey = `${q.id}_${this.currentSentenceIndex}`;
    const savedText = this.sentenceAnswers[sKey] || '';
    const isSolved = this.sentenceSolved[sKey] || false;
    const attempts = this.sentenceAttempts[sKey] || 0;
    const isUnlocked = attempts >= 3;

    // Sentence Switcher Tabs
    const sentenceTabsHtml = sentences.map((s, idx) => {
      const activeClass = idx === this.currentSentenceIndex ? 'lego-btn-green' : 'lego-btn-secondary';
      const checkMark = this.sentenceSolved[`${q.id}_${idx}`] ? ' ✅' : '';
      return `
        <button class="${activeClass}" onclick="App.switchSentence(${idx})" style="font-size:0.85rem; padding:0.4rem 0.8rem;">
          🧱 Câu ${idx + 1}${checkMark}
        </button>
      `;
    }).join(' ');

    // Visual Word Mask (e.g. [ 9 từ ] _  _  _  _  _  _  _  _  _)
    const cleanWords = curSent.text.trim().split(/\s+/);
    const maskText = cleanWords.map(() => '___').join('  ');

    pane.innerHTML = `
      <div class="question-header">
        <span class="part-badge" style="background:#dcfce7; color:#15803d; border-color:#86efac;">
          🎧 Trạm Chép Chính Tả (Dictation)
        </span>
        <span class="stopwatch-badge">
          Câu ${this.currentQuestionIndex + 1} / ${this.testData.questions.length}
        </span>
      </div>

      <div class="dictation-sentence-card active-sentence">
        <!-- Sentence Navigation Tabs -->
        <div style="display:flex; gap:0.45rem; flex-wrap:wrap; margin-bottom:1rem; align-items:center;">
          <span style="font-size:0.88rem; font-weight:800; color:var(--text-secondary); margin-right:0.25rem;">Chọn câu:</span>
          ${sentenceTabsHtml}
        </div>

        <!-- Visual Masking (No Transcript!) -->
        <div style="margin-bottom:0.75rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
            <span style="font-size:0.85rem; font-weight:800; color:#64748b;">ĐỘ DÀI CÂU THOẠI:</span>
            <span style="background:#e2e8f0; color:#334155; font-weight:800; font-size:0.82rem; padding:0.15rem 0.6rem; border-radius:12px;">
              ${cleanWords.length} từ
            </span>
          </div>
          <div class="word-mask-placeholder">
            ${maskText}
          </div>
        </div>

        <!-- Dictation Input Field -->
        <div style="margin-bottom:1rem;">
          <input 
            type="text" 
            id="dictation-input-${sKey}" 
            class="dictation-input-field" 
            value="${savedText}" 
            placeholder="✍️ Gõ lại những từ bạn nghe được vào đây..." 
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
          />
        </div>

        <!-- Diff & Feedback Container -->
        <div id="dictation-diff-${sKey}" class="dict-diff-result" style="display:${isSolved || savedText ? 'block' : 'none'};"></div>

        <!-- Action Buttons & Conditional 3-Attempt Gate (1-Time Use with Loop) -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-top:1.25rem;">
          <div style="display:flex; gap:0.45rem; align-items:center; flex-wrap:wrap;">
            ${isUnlocked ? `
              <button class="lego-btn-yellow" onclick="App.giveLetterHint()" title="Kích hoạt 1 lần duy nhất: gợi ý chữ cái đầu cho cả câu">
                💡 Gợi ý chữ cái đầu (1 lần)
              </button>
              <button class="lego-btn-orange" onclick="App.revealNextWord()" title="Kích hoạt 1 lần duy nhất: mở 1 từ kế tiếp">
                🔤 Mở 1 từ kế tiếp (1 lần)
              </button>
            ` : `
              <button class="lego-btn-locked" onclick="App.notifyHintLocked(${attempts})" title="Chỉ kích hoạt 1 lần sau khi thử sai 3 lần">
                🔒 Gợi ý chữ cái (${attempts}/3)
              </button>
              <button class="lego-btn-locked" onclick="App.notifyHintLocked(${attempts})" title="Chỉ kích hoạt 1 lần sau khi thử sai 3 lần">
                🔒 Mở 1 từ (${attempts}/3)
              </button>
            `}
          </div>
          <div>
            <button class="lego-btn-green" onclick="App.checkSentenceDictation()">
              Kiểm tra chính tả ⏎
            </button>
          </div>
        </div>

        ${!isUnlocked && attempts > 0 ? `
          <div style="margin-top:0.6rem; font-size:0.82rem; font-weight:700; color:#b45309;">
            💪 Bạn đã thử ${attempts}/3 lần. Thử thêm ${3 - attempts} lần nữa để mở khóa 1 lần trợ giúp tiếp theo!
          </div>
        ` : ''}
        ${!isUnlocked && attempts === 0 && this.lastHintConsumed[sKey] ? `
          <div style="margin-top:0.6rem; font-size:0.82rem; font-weight:700; color:#0369a1; background:#e0f2fe; padding:0.4rem 0.75rem; border-radius:8px; border:1.5px solid #bae6fd;">
            🎯 Bạn vừa dùng 1 lần trợ giúp! Nút trợ giúp đã khóa lại (0/3). Hãy nghe lại bằng đôi tai và thử sai 3 lần để mở khóa lần tiếp theo nhé!
          </div>
        ` : ''}
        ${isUnlocked ? `
          <div style="margin-top:0.6rem; font-size:0.82rem; font-weight:800; color:#15803d; background:#dcfce7; padding:0.45rem 0.75rem; border-radius:8px; border:1.5px solid #86efac;">
            🎉 Bạn đã thử sai đủ 3 lần! Đã mở khóa <strong>1 lần trợ giúp duy nhất</strong> (chọn 1 trong 2 nút ở trên). Sau khi dùng, nút sẽ tự động khóa lại để bạn tiếp tục tự luyện nghe!
          </div>
        ` : ''}
      </div>

      <!-- Bottom Question Navigation -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.5rem;">
        <button class="lego-btn-secondary" onclick="App.prevQuestion()">
          ⬅️ Câu hỏi trước
        </button>
        <span style="font-size:0.88rem; font-weight:700; color:var(--text-muted);">
          Phím tắt: Space (Nghe lại) · Enter (Kiểm tra)
        </span>
        <button class="lego-btn-blue" onclick="App.nextQuestion()">
          Câu hỏi tiếp ➡️
        </button>
      </div>
    `;

    // Focus input field and place cursor at end
    const inputEl = document.getElementById(`dictation-input-${sKey}`);
    if (inputEl) {
      inputEl.focus();
      const valLen = inputEl.value.length;
      inputEl.setSelectionRange(valLen, valLen);
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.checkSentenceDictation();
        }
      });
    }

    if (savedText) {
      this.renderDiffFeedback(savedText, curSent.text, sKey);
    }
  },

  switchSentence(idx) {
    this.currentSentenceIndex = idx;
    this.renderWorkspace();
  },

  replayCurrentSentence() {
    const q = this.testData.questions[this.currentQuestionIndex];
    if (!q) return;
    const sentences = q.dictation_sentences || [];
    const curSent = sentences[this.currentSentenceIndex];
    if (curSent && curSent.audio_file) {
      window.KetAudioPlayer.loadTrack(curSent.audio_file);
      window.KetAudioPlayer.setSpeed(1.0);
      window.KetAudioPlayer.play();
    }
  },

  playSentenceSlow() {
    const q = this.testData.questions[this.currentQuestionIndex];
    if (!q) return;
    const sentences = q.dictation_sentences || [];
    const curSent = sentences[this.currentSentenceIndex];
    if (curSent && curSent.audio_file) {
      window.KetAudioPlayer.loadTrack(curSent.audio_file);
      window.KetAudioPlayer.setSpeed(0.8);
      window.KetAudioPlayer.play();
    }
  },

  checkSentenceDictation() {
    // Smart Intercept: Yêu cầu học sinh nhập tên & email trước khi kiểm tra
    if (window.KetTracker && !window.KetTracker.hasProfile()) {
      return this.requireStudentProfile(() => this.checkSentenceDictation());
    }

    const q = this.testData.questions[this.currentQuestionIndex];
    if (!q) return;
    const sentences = q.dictation_sentences || [];
    const curSent = sentences[this.currentSentenceIndex];
    if (!curSent) return;

    const sKey = `${q.id}_${this.currentSentenceIndex}`;
    const inputEl = document.getElementById(`dictation-input-${sKey}`);
    if (!inputEl) return;

    const typedText = inputEl.value.trim();
    if (!typedText) {
      inputEl.focus();
      return;
    }

    this.sentenceAnswers[sKey] = typedText;
    const targetText = curSent.text;

    const isMatch = this.renderDiffFeedback(typedText, targetText, sKey);
    const duration = window.KetTracker ? window.KetTracker.getQuestionDuration(`${q.id}_${this.currentSentenceIndex}`) : 0;
    const currentAttempt = (this.sentenceAttempts[sKey] || 0) + 1;

    // Truyền dữ liệu lớn về Google Sheets Live Telemetry
    if (window.KetTracker) {
      window.KetTracker.track('DICTATION_CHECK', {
        question_id: q.id,
        sentence_index: this.currentSentenceIndex + 1,
        total_sentences: sentences.length,
        typed_text: typedText,
        target_text: targetText,
        is_match: isMatch,
        attempt: currentAttempt
      }, {
        question_number: `Câu ${q.q_number || q.id} (Thoại ${this.currentSentenceIndex + 1}/${sentences.length})`,
        result: isMatch ? `ĐÚNG (Lần ${currentAttempt})` : `CHƯA ĐÚNG (Lần ${currentAttempt})`,
        duration: duration
      });
    }

    if (isMatch) {
      this.sentenceSolved[sKey] = true;
      if (window.KetTracker) window.KetTracker.incrementSessionCounter();

      // Auto move to next sentence if available
      if (this.currentSentenceIndex < sentences.length - 1) {
        setTimeout(() => {
          this.switchSentence(this.currentSentenceIndex + 1);
        }, 1200);
      }
    } else {
      this.sentenceAttempts[sKey] = currentAttempt;
      this.renderBeginnerWorkspace(q);
    }
  },

  renderDiffFeedback(typed, target, sKey) {
    const diffEl = document.getElementById(`dictation-diff-${sKey}`);
    if (!diffEl) return false;

    diffEl.style.display = 'block';

    const clean = (s) => s.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"]/g, '').toLowerCase().trim();
    const typedTokens = typed.split(/\s+/);
    const targetTokens = target.split(/\s+/);

    let diffHtml = '';
    let matchCount = 0;

    targetTokens.forEach((targetWord, idx) => {
      const userWord = typedTokens[idx] || '';
      if (clean(userWord) === clean(targetWord)) {
        diffHtml += `<span class="diff-correct">${userWord}</span> `;
        matchCount++;
      } else if (userWord) {
        diffHtml += `<span class="diff-wrong" title="Từ gốc: ${targetWord}">${userWord}</span> `;
      } else {
        diffHtml += `<span class="diff-missing">[thiếu]</span> `;
      }
    });

    const is100Percent = matchCount === targetTokens.length && typedTokens.length === targetTokens.length;

    let banner = '';
    if (is100Percent) {
      banner = `
        <div style="color:#15803d; font-weight:800; margin-bottom:0.6rem; display:flex; align-items:center; gap:0.4rem;">
          <span style="font-size:1.4rem;">🌟</span> Xuất sắc! Bạn đã chép chính xác 100% câu thoại!
        </div>
      `;
    } else {
      banner = `
        <div style="color:#b45309; font-weight:800; margin-bottom:0.6rem; display:flex; align-items:center; gap:0.4rem;">
          <span>🔍</span> Kết quả so sánh từ (Xanh: Đúng · Đỏ: Chưa chuẩn · Vàng: Nghe thiếu):
        </div>
      `;
    }

    diffEl.innerHTML = banner + `<div>${diffHtml}</div>`;
    return is100Percent;
  },

  giveLetterHint() {
    const q = this.testData.questions[this.currentQuestionIndex];
    if (!q) return;
    const sKey = `${q.id}_${this.currentSentenceIndex}`;
    const attempts = this.sentenceAttempts[sKey] || 0;
    if (attempts < 3) {
      this.notifyHintLocked(attempts);
      return;
    }
    const sentences = q.dictation_sentences || [];
    const curSent = sentences[this.currentSentenceIndex];
    if (!curSent) return;

    const inputEl = document.getElementById(`dictation-input-${sKey}`);
    if (!inputEl) return;

    const words = curSent.text.split(/\s+/);
    const hints = words.map(w => {
      const first = w.charAt(0);
      return first + '_'.repeat(Math.max(1, w.length - 1));
    });

    const hintText = hints.join(' ');
    inputEl.value = hintText;
    this.sentenceAnswers[sKey] = hintText;

    if (window.KetTracker) {
      window.KetTracker.track('HINT_USED', {
        question_id: q.id,
        sentence_index: this.currentSentenceIndex + 1,
        hint_type: 'letter_first',
        attempts_before: attempts
      }, {
        question_number: `Câu ${q.q_number || q.id} (Thoại ${this.currentSentenceIndex + 1})`,
        result: 'DÙNG GỢI Ý CHỮ CÁI (1 LẦN)'
      });
    }

    // Reset số lần thử sai về 0 để tạo vòng lặp: dùng 1 lần xong phải thử sai tiếp 3 lần!
    this.sentenceAttempts[sKey] = 0;
    this.lastHintConsumed[sKey] = true;

    // Tự động render lại để khóa nút ngay lập tức
    this.renderBeginnerWorkspace(q);
  },

  revealNextWord() {
    const q = this.testData.questions[this.currentQuestionIndex];
    if (!q) return;
    const sKey = `${q.id}_${this.currentSentenceIndex}`;
    const attempts = this.sentenceAttempts[sKey] || 0;
    if (attempts < 3) {
      this.notifyHintLocked(attempts);
      return;
    }
    const sentences = q.dictation_sentences || [];
    const curSent = sentences[this.currentSentenceIndex];
    if (!curSent) return;

    const inputEl = document.getElementById(`dictation-input-${sKey}`);
    if (!inputEl) return;

    const currentWords = inputEl.value.trim() ? inputEl.value.trim().split(/\s+/) : [];
    const targetWords = curSent.text.split(/\s+/);

    let nextIdx = 0;
    while (nextIdx < targetWords.length && nextIdx < currentWords.length && currentWords[nextIdx].toLowerCase().replace(/[.,!?;:'"]/g, '') === targetWords[nextIdx].toLowerCase().replace(/[.,!?;:'"]/g, '')) {
      nextIdx++;
    }

    if (nextIdx < targetWords.length) {
      currentWords[nextIdx] = targetWords[nextIdx];
      const newText = currentWords.join(' ');
      inputEl.value = newText;
      this.sentenceAnswers[sKey] = newText;
    }

    if (window.KetTracker) {
      window.KetTracker.track('HINT_USED', {
        question_id: q.id,
        sentence_index: this.currentSentenceIndex + 1,
        hint_type: 'next_word',
        revealed_word: targetWords[nextIdx] || '',
        attempts_before: attempts
      }, {
        question_number: `Câu ${q.q_number || q.id} (Thoại ${this.currentSentenceIndex + 1})`,
        result: 'DÙNG MỞ 1 TỪ (1 LẦN)'
      });
    }

    // Reset số lần thử sai về 0 để tạo vòng lặp: dùng 1 lần xong phải thử sai tiếp 3 lần!
    this.sentenceAttempts[sKey] = 0;
    this.lastHintConsumed[sKey] = true;

    // Tự động render lại để khóa nút ngay lập tức
    this.renderBeginnerWorkspace(q);
  },

  notifyHintLocked(attempts) {
    const remaining = Math.max(0, 3 - attempts);
    alert(`🔒 Quyền trợ giúp đang bị khóa!\n\nBạn cần tự nghe và thử gõ thêm ${remaining} lần nữa (đã thử: ${attempts}/3 lần) để kích hoạt 1 lần trợ giúp tiếp theo nhé!\n\nSau khi dùng 1 lần, nút sẽ lại khóa để bạn tiếp tục tự luyện tai nghe! 💪`);
  },

  /* ==========================================================================
     Mức 2: Intermediate (Socratic Scaffold)
     ========================================================================== */
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
      const savedVal = this.userAnswers[q.id] || '';
      optionsHtml = `
        <div style="margin: 1.25rem 0;">
          <input type="text" id="gap-fill-input" class="dictation-input-field" value="${savedVal}" placeholder="✍️ Gõ câu trả lời của bạn..." oninput="App.recordTextAnswer('${q.id}', this.value)" />
        </div>
      `;
    }

    // Socratic Hint Cards
    let hintsHtml = '';
    const revealedLevel = this.socraticHintsRevealed[q.id] || 0;
    if (revealedLevel >= 1 && q.tier1_hint) {
      hintsHtml += `
        <div class="hint-tier-box hint-tier-1">
          <h4 style="color:#b45309; font-weight:800; margin-bottom:0.35rem;">💡 Tầng 1: Bối Cảnh & Từ Khóa</h4>
          <p style="font-size:0.95rem; color:#78350f;">${q.tier1_hint}</p>
        </div>
      `;
    }
    if (revealedLevel >= 2 && q.tier2_hint) {
      hintsHtml += `
        <div class="hint-tier-box hint-tier-2">
          <h4 style="color:#c2410c; font-weight:800; margin-bottom:0.35rem;">⚠️ Tầng 2: Bẫy Đề Thi & Phương Án Nhiễu</h4>
          <p style="font-size:0.95rem; color:#7c2d12;">${q.tier2_hint}</p>
        </div>
      `;
    }
    if (revealedLevel >= 3 && q.tier3_hint) {
      hintsHtml += `
        <div class="hint-tier-box hint-tier-3">
          <h4 style="color:#15803d; font-weight:800; margin-bottom:0.35rem;">🎯 Tầng 3: Lời Giải Chi Tiết</h4>
          <p style="font-size:0.95rem; color:#14532d;">${q.tier3_hint}</p>
        </div>
      `;
    }

    pane.innerHTML = `
      <div class="question-header">
        <span class="part-badge">Part ${q.part} · Trắc Nghiệm</span>
        <span class="stopwatch-badge">Câu ${this.currentQuestionIndex + 1} / ${this.testData.questions.length}</span>
      </div>

      <div class="lego-card">
        <h3 class="question-prompt">${q.prompt}</h3>
        <div style="margin-bottom: 1.25rem;">
          ${optionsHtml}
        </div>

        <div id="answer-feedback" style="margin-bottom: 1rem;"></div>

        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <button class="lego-btn-secondary" onclick="App.prevQuestion()">⬅️ Câu trước</button>
          </div>
          <div>
            <button class="lego-btn-blue" onclick="App.checkIntermediateAnswer()">Kiểm tra đáp án ⏎</button>
            <button class="lego-btn-secondary" onclick="App.nextQuestion()" style="margin-left: 0.5rem;">Câu tiếp ➡️</button>
          </div>
        </div>
      </div>

      <div id="hints-container">
        ${hintsHtml}
      </div>
    `;
  },

  selectOption(qId, key) {
    this.userAnswers[qId] = key;
    this.renderIntermediateWorkspace(this.testData.questions[this.currentQuestionIndex]);
  },

  recordTextAnswer(qId, val) {
    this.userAnswers[qId] = val.trim();
  },

  checkIntermediateAnswer() {
    // Smart Intercept: Yêu cầu học sinh nhập tên & email trước khi kiểm tra
    if (window.KetTracker && !window.KetTracker.hasProfile()) {
      return this.requireStudentProfile(() => this.checkIntermediateAnswer());
    }

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
    const duration = window.KetTracker ? window.KetTracker.getQuestionDuration(q.id) : 0;

    // Send Live Telemetry
    if (window.KetTracker) {
      window.KetTracker.track('INTERMEDIATE_CHECK', {
        question_id: q.id,
        user_answer: ans,
        correct_answer: q.correct_answer || q.acceptable_answers[0],
        attempt: currentAttempts,
        is_correct: isCorrect
      }, {
        question_number: `Câu ${q.q_number || q.id}`,
        result: isCorrect ? `ĐÚNG (Lần ${currentAttempts})` : `CHƯA ĐÚNG (Lần ${currentAttempts})`,
        duration: duration
      });
    }

    if (isCorrect) {
      this.socraticHintsRevealed[q.id] = 3;
      if (window.KetTracker) window.KetTracker.incrementSessionCounter();
      const feedback = document.getElementById('answer-feedback');
      if (feedback) {
        feedback.innerHTML = `<div style="color:var(--lego-green); font-weight:800; font-size:1.05rem;">🎉 Chính xác! Đáp án hoàn toàn đúng!</div>`;
      }
      this.renderWorkspace();
    } else {
      this.socraticHintsRevealed[q.id] = Math.min(3, currentAttempts);
      this.openTrapGateModal(q);
      this.renderWorkspace();
    }
  },

  openTrapGateModal(q) {
    const modal = document.getElementById('modal-trap-gate');
    if (modal) {
      modal.style.display = 'flex';
      const title = document.getElementById('trap-gate-question-title');
      if (title) title.textContent = `Câu ${q.q_number}: ${q.prompt}`;
    }
  },

  closeTrapGateModal() {
    const modal = document.getElementById('modal-trap-gate');
    if (modal) modal.style.display = 'none';
  },

  submitTrapLog(trapType) {
    const q = this.testData.questions[this.currentQuestionIndex];
    if (window.KetTracker) {
      window.KetTracker.track('TRAP_LOGGED', {
        question_id: q.id,
        trap_selected: trapType,
        duration_sec: window.KetTracker.getQuestionDuration()
      }, {
        question_number: `Câu ${q.q_number || q.id}`,
        result: `BẪY ĐỀ: ${trapType}`
      });
    }
    this.closeTrapGateModal();
  },

  /* ==========================================================================
     Mức 3: Exam Mode Workspace (Phiếu Trả Lời 25 Câu Theo Từng Part)
     ========================================================================== */
  renderExamWorkspace(q) {
    const pane = document.getElementById('pane-right');
    if (!pane) return;

    const testId = this.currentTestId || 1;
    const cfg = this.TEST_PAGES_MAP[testId] || { p1: 22, p2: 23, p3: 24, p4: 25, p5: 25, start: 22, end: 25 };

    const partsDef = [
      { part: 1, title: 'Part 1: Nghe 5 đoạn ngắn & chọn tranh/đáp án (Q1 - Q5)', page: cfg.p1, questions: [] },
      { part: 2, title: 'Part 2: Nghe và điền thông tin/tin nhắn (Q6 - Q10)', page: cfg.p2, questions: [] },
      { part: 3, title: 'Part 3: Nghe hội thoại dài & chọn A, B, C (Q11 - Q15)', page: cfg.p3, questions: [] },
      { part: 4, title: 'Part 4: Nghe 5 tình huống độc lập & chọn đáp án (Q16 - Q20)', page: cfg.p4, questions: [] },
      { part: 5, title: 'Part 5: Nghe và nối thông tin phù hợp (Q21 - Q25)', page: cfg.p5, questions: [] }
    ];

    (this.testData.questions || []).forEach(item => {
      const pIdx = (item.part >= 1 && item.part <= 5) ? item.part - 1 : 0;
      partsDef[pIdx].questions.push(item);
    });

    const sectionsHtml = partsDef.map(pDef => {
      const qCards = pDef.questions.map(item => {
        const ans = this.userAnswers[item.id] || '';
        return `
          <div class="exam-question-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
              <strong style="color:var(--lego-blue);">Q${item.q_number}</strong>
              <span style="font-size:0.78rem; font-weight:800; color:#64748b;">${item.type === 'multiple_choice' ? 'Trắc nghiệm' : 'Điền từ'}</span>
            </div>
            ${item.type === 'multiple_choice' ? `
              <div style="display:flex; gap:0.4rem;">
                ${['A', 'B', 'C'].map(opt => `
                  <button class="audio-btn ${ans === opt ? 'selected' : ''}" style="width:34px; height:34px; font-size:0.85rem; ${ans === opt ? 'background:var(--lego-blue); color:#fff; border-color:var(--lego-blue-shadow);' : ''}" onclick="App.recordExamAnswer(${item.id}, '${opt}')">
                    ${opt}
                  </button>
                `).join('')}
              </div>
            ` : `
              <input type="text" class="dictation-input-field" style="padding:0.4rem 0.6rem; font-size:0.9rem;" value="${ans}" placeholder="Đáp án..." onchange="App.recordExamAnswer(${item.id}, this.value)" />
            `}
          </div>
        `;
      }).join('');

      return `
        <div class="exam-part-header-row">
          <div style="display:flex; align-items:center; gap:0.4rem;">
            <span>${pDef.title}</span>
          </div>
          <button class="lego-btn-pill-pdf" onclick="App.setExamPdfPage(${pDef.page}, ${pDef.part})" title="Mở trang đề thi Part ${pDef.part}">
            📄 Xem đề trang ${pDef.page} ↗
          </button>
        </div>
        <div class="exam-grid-container" style="margin-bottom:0.75rem;">
          ${qCards}
        </div>
      `;
    }).join('');

    pane.innerHTML = `
      <div class="question-header">
        <span class="part-badge" style="background:#fee2e2; color:#b91c1c; border-color:#fca5a5;">
          🎓 Chế Độ Thi Thử (Cambridge Exam Simulation)
        </span>
        <span class="stopwatch-badge" style="background:#fef3c7; color:#b45309;">
          ⏱️ 30:00
        </span>
      </div>

      <!-- Exam Continuous Audio Status Banner -->
      <div class="exam-audio-banner">
        <div style="display:flex; align-items:center; gap:0.65rem;">
          <span style="font-size:1.45rem;">🎧</span>
          <div>
            <div style="font-weight:800; font-size:0.92rem; color:#1e40af;">
              Audio Toàn Bài Thi Test ${this.currentTestId} (Phát liên tục Part 1 ➔ Part 5)
            </div>
            <div style="font-size:0.8rem; color:#475569; font-weight:600;">
              Chuẩn phòng thi thật Cambridge: ~23 phút cho cả 5 phần · Không bị ngắt quãng
            </div>
          </div>
        </div>
        <button class="lego-btn-green" style="font-size:0.85rem; padding:0.4rem 0.9rem; display:inline-flex; align-items:center; gap:0.35rem;" onclick="window.KetAudioPlayer.togglePlay()">
          <span>▶️ / ⏸️</span> <span>Nghe bài thi</span>
        </button>
      </div>

      <div class="lego-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
          <h3 style="color:var(--lego-blue); font-size:1.15rem; font-weight:800; margin:0;">
            Phiếu Làm Bài 25 Câu (Answer Sheet) · Test ${this.currentTestId}
          </h3>
          <span style="font-size:0.85rem; color:#64748b; font-weight:700;">
            Trang đề Listening: ${cfg.start} - ${cfg.end}
          </span>
        </div>
        ${sectionsHtml}
        <div style="margin-top:1.5rem; text-align:right;">
          <button class="lego-btn-green" style="font-size:1.05rem; padding:0.75rem 1.75rem;" onclick="App.submitExamTest()">
            Nộp Bài Thi (Finish) 🚀
          </button>
        </div>
      </div>
    `;
  },

  setExamPdfPage(pageNum, partNum) {
    const testId = this.currentTestId || 1;
    const cfg = this.TEST_PAGES_MAP[testId] || { p1: 22, p2: 23, p3: 24, p4: 25, p5: 25, start: 22, end: 25 };
    if (pageNum < cfg.start) pageNum = cfg.start;
    if (pageNum > cfg.end) pageNum = cfg.end;

    this.currentExamPdfPage = pageNum;

    const frame = document.getElementById('exam-pdf-frame');
    if (frame) {
      const targetSrc = `https://drive.google.com/file/d/1OVNzYe_ZYOm9xVlfBB9nISHOuLF4_joT/preview#page=${pageNum}`;
      if (!frame.src.includes(`#page=${pageNum}`)) {
        frame.src = targetSrc;
      }
    }

    this.updateExamPdfNavUI(partNum);
  },

  prevExamPdfPage() {
    this.setExamPdfPage(this.currentExamPdfPage - 1);
  },

  nextExamPdfPage() {
    this.setExamPdfPage(this.currentExamPdfPage + 1);
  },

  updateExamPdfNavUI(specifiedPart) {
    const testId = this.currentTestId || 1;
    const cfg = this.TEST_PAGES_MAP[testId] || { p1: 22, p2: 23, p3: 24, p4: 25, p5: 25, start: 22, end: 25 };

    let part = specifiedPart;
    if (!part) {
      if (this.currentExamPdfPage === cfg.p1) part = 1;
      else if (this.currentExamPdfPage === cfg.p2) part = 2;
      else if (this.currentExamPdfPage === cfg.p3) part = 3;
      else if (this.currentExamPdfPage === cfg.p4 || this.currentExamPdfPage === cfg.p5) {
        part = (cfg.p4 === cfg.p5) ? 4 : (this.currentExamPdfPage === cfg.p4 ? 4 : 5);
      } else {
        part = 1;
      }
    }

    const badge = document.getElementById('exam-pdf-page-indicator');
    if (badge) {
      const partDisplay = (typeof part === 'number') ? `Part ${part}` : part;
      badge.textContent = `📖 Test ${testId} · Trang ${this.currentExamPdfPage} (${partDisplay})`;
    }

    const extLink = document.getElementById('exam-pdf-ext-link');
    if (extLink) {
      extLink.href = `https://drive.google.com/file/d/1OVNzYe_ZYOm9xVlfBB9nISHOuLF4_joT/view?usp=drive_open#page=${this.currentExamPdfPage}`;
    }

    document.querySelectorAll('.lego-pdf-part-btn[data-page]').forEach(btn => {
      const p = parseInt(btn.getAttribute('data-page'), 10);
      const btnPart = parseInt(btn.getAttribute('data-part') || '0', 10);
      let isMatch = false;
      if (specifiedPart) {
        isMatch = (btnPart === specifiedPart);
      } else {
        if (p === this.currentExamPdfPage) {
          if (cfg.p4 === cfg.p5 && p === cfg.p4) {
            isMatch = (btnPart === (part === 5 ? 5 : 4));
          } else {
            isMatch = true;
          }
        }
      }

      if (isMatch) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const prevBtn = document.getElementById('btn-pdf-prev');
    if (prevBtn) prevBtn.disabled = this.currentExamPdfPage <= cfg.start;

    const nextBtn = document.getElementById('btn-pdf-next');
    if (nextBtn) nextBtn.disabled = this.currentExamPdfPage >= cfg.end;
  },

  reloadExamPdf() {
    const frame = document.getElementById('exam-pdf-frame');
    if (frame) {
      const page = this.currentExamPdfPage || 22;
      frame.src = `https://drive.google.com/file/d/1OVNzYe_ZYOm9xVlfBB9nISHOuLF4_joT/preview?t=${Date.now()}#page=${page}`;
    }
  },

  recordExamAnswer(qId, val) {
    this.userAnswers[qId] = val;
    if (window.KetTracker) {
      window.KetTracker.track('EXAM_ANSWER', {
        question_id: qId,
        chosen_option: val
      }, {
        question_number: `Câu ${qId}`,
        result: `CHỌN: ${val}`
      });
    }
    this.renderExamWorkspace(this.testData.questions[this.currentQuestionIndex]);
  },

  submitExamTest() {
    // Smart Intercept: Yêu cầu học sinh nhập tên & email trước khi nộp bài
    if (window.KetTracker && !window.KetTracker.hasProfile()) {
      return this.requireStudentProfile(() => this.submitExamTest());
    }

    let score = 0;
    const total = (this.testData && this.testData.questions) ? this.testData.questions.length : 25;
    const breakdown = [];

    this.testData.questions.forEach(q => {
      const ans = this.userAnswers[q.id];
      const isRight = Boolean(ans && q.acceptable_answers.some(a => a.toLowerCase() === ans.toLowerCase()));
      if (isRight) score++;
      breakdown.push({
        q_id: q.id,
        user_ans: ans || '',
        is_correct: isRight
      });
    });

    let grade = "Pass (Level A2)";
    if (score >= 23) grade = "Pass with Distinction (Level B1)";
    else if (score >= 20) grade = "Pass with Merit (Level A2)";
    else if (score >= 14) grade = "Level A1";
    else grade = "Fail (Cố gắng luyện tập thêm nhé!)";

    const percentage = Math.round((score / total) * 100);
    const prof = window.KetTracker ? window.KetTracker.getProfile() : {};

    // Truyền dữ liệu lớn về Google Sheets Live Telemetry
    if (window.KetTracker) {
      window.KetTracker.track('EXAM_SUBMIT', {
        score: score,
        total: total,
        percentage: percentage,
        grade: grade,
        breakdown: breakdown
      }, {
        question_number: `Tổng kết Test ${this.currentTestId}`,
        result: `NỘP BÀI: ${score}/${total} (${percentage}%) - ${grade}`
      });
      window.KetTracker.incrementSessionCounter();
    }

    alert(`🏁 KẾT QUẢ BÀI THI TEST ${this.currentTestId}:\n\n` +
          `👤 Học sinh: ${prof.student_name || 'Học sinh'}\n` +
          `📧 Email: ${prof.student_email || 'Chưa có email'}\n` +
          `📊 Điểm số: ${score} / ${total} (${percentage}%)\n` +
          `🎖️ Xếp loại: ${grade}\n\n` +
          `✅ Toàn bộ kết quả đã được gửi tự động lên Google Sheets Live Telemetry cho Thầy Cô!`);
  },

  prevQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.currentSentenceIndex = 0;
      this.renderWorkspace();
    }
  },

  nextQuestion() {
    if (this.currentQuestionIndex < this.testData.questions.length - 1) {
      this.currentQuestionIndex++;
      this.currentSentenceIndex = 0;
      this.renderWorkspace();
    }
  },

  handleKeydown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space' || e.code === 'KeyR') {
      e.preventDefault();
      if (this.currentMode === 'beginner') {
        this.replayCurrentSentence();
      } else {
        window.KetAudioPlayer.togglePlay();
      }
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
