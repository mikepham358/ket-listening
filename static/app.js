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
    this.currentQuestionStep = 1;
    this.attempts = {};
    this.userAnswers = {};
    this.sentenceAnswers = {};
    this.sentenceSolved = {};
    this.sentenceAttempts = {};
    this.lastHintConsumed = {};
    this.socraticHintsRevealed = {};
    this.thinkingAnswers = {};
    this.paraphraseAnswers = {};
    this.expandedOptionBreakdowns = {};
    this.transcriptRevealedM1 = {};

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
    document.getElementById('audio-play-btn')?.addEventListener('click', () => {
      if (window.KetTracker && !window.KetTracker.hasProfile()) {
        return this.requireStudentProfile(() => window.KetAudioPlayer.togglePlay());
      }
      window.KetAudioPlayer.togglePlay();
    });
    document.getElementById('audio-replay-btn')?.addEventListener('click', () => {
      if (window.KetTracker && !window.KetTracker.hasProfile()) {
        return this.requireStudentProfile(() => window.KetAudioPlayer.replay5s());
      }
      window.KetAudioPlayer.replay5s();
    });
    document.getElementById('audio-forward-btn')?.addEventListener('click', () => {
      if (window.KetTracker && !window.KetTracker.hasProfile()) {
        return this.requireStudentProfile(() => window.KetAudioPlayer.skip5s());
      }
      window.KetAudioPlayer.skip5s();
    });
    document.getElementById('audio-speed-btn')?.addEventListener('click', () => window.KetAudioPlayer.cycleSpeed());
    
    const progBar = document.getElementById('audio-progress-bar');
    if (progBar) {
      progBar.addEventListener('input', (e) => {
        window.KetAudioPlayer.seek(parseFloat(e.target.value));
      });
    }

    // Intercept backdrop clicks on student profile modal
    const profileModal = document.getElementById('modal-student-profile');
    if (profileModal) {
      profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) {
          if (window.KetTracker && !window.KetTracker.hasProfile()) {
            alert("⚠️ Bạn bắt buộc phải điền đầy đủ Thông Tin Học Sinh trước khi bắt đầu thực hành nhé!");
            document.getElementById('input-student-name')?.focus();
          } else {
            this.closeStudentProfileModal();
          }
        }
      });
    }
  },

  /* ==========================================================================
     Thông Tin Học Sinh & Bắt Buộc Onboarding Trước Khi Thực Hành
     ========================================================================== */
  initStudentProfile() {
    // Check URL query param for quick reset in tests or classroom: ?reset_profile=1
    if (window.location.search.includes('reset_profile=1')) {
      try {
        localStorage.removeItem('ket_student_profile_v1');
      } catch (e) {}
      window.history.replaceState({}, document.title, window.location.pathname);
    }

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

    // BẮT BUỘC: Nếu chưa có thông tin học sinh, mở modal ngay lập tức và chặn thực hành
    if (window.KetTracker && !window.KetTracker.hasProfile()) {
      setTimeout(() => {
        if (!window.KetTracker.hasProfile()) {
          this.openStudentProfileModal({ required: true });
        }
      }, 150);
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
      btnProfile.title = `Học sinh: ${prof.student_name} (${prof.student_email || 'Chưa có email'}) · Bấm để sửa Thông Tin Học Sinh`;
    } else {
      btnProfile.classList.add('unregistered');
      nameEl.textContent = 'Thông Tin Học Sinh ✍️';
      btnProfile.title = 'Bắt buộc nhập Thông Tin Học Sinh trước khi thực hành';
    }
  },

  openStudentProfileModal(opts = {}) {
    this._profileModalPendingAction = opts.pendingAction || null;
    const modal = document.getElementById('modal-student-profile');
    if (!modal) return;

    const hasProfile = window.KetTracker ? window.KetTracker.hasProfile() : false;
    const closeBtn = document.getElementById('modal-profile-close-btn');
    if (closeBtn) {
      // Ẩn nút đóng ✕ nếu học sinh chưa điền thông tin (bắt buộc)
      closeBtn.style.display = hasProfile ? 'inline-flex' : 'none';
    }

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

    // Show or hide change student reset link
    const resetLink = document.getElementById('profile-reset-link');
    if (resetLink) {
      resetLink.style.display = hasProfile ? 'block' : 'none';
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

  clearStudentProfile() {
    if (confirm("Bạn có chắc chắn muốn xóa thông tin học sinh hiện tại để đổi sang học sinh mới không?")) {
      try {
        localStorage.removeItem('ket_student_profile_v1');
      } catch (e) {}
      this.updateHeaderProfileBadge();
      const inputName = document.getElementById('input-student-name');
      const inputEmail = document.getElementById('input-student-email');
      if (inputName) inputName.value = '';
      if (inputEmail) inputEmail.value = '';
      this.openStudentProfileModal({ required: true });
    }
  },

  closeStudentProfileModal() {
    if (window.KetTracker && !window.KetTracker.hasProfile()) {
      alert("⚠️ Bạn bắt buộc phải điền đầy đủ Thông Tin Học Sinh trước khi bắt đầu thực hành nhé!");
      const inputName = document.getElementById('input-student-name');
      if (inputName) inputName.focus();
      return;
    }
    const modal = document.getElementById('modal-student-profile');
    if (modal) modal.style.display = 'none';
    this._profileModalPendingAction = null;
  },

  skipOrCloseProfileModal() {
    this.closeStudentProfileModal();
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
      if (typeof action === 'function') action();
      return true;
    }
    this.openStudentProfileModal({
      requiredForAction: true,
      pendingAction: action
    });
    return false;
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

  switchMode(mode) {
    this.setMode(mode);
  },

  formatTranscriptHtml(transcript) {
    if (!transcript) {
      return '<div style="color:#64748b; font-style:italic; font-size:0.85rem; padding:0.5rem;">Đang chuẩn bị transcript trích đoạn...</div>';
    }
    const lines = transcript.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    return lines.map(line => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0 && colonIdx < 15) {
        const rawSpeaker = line.slice(0, colonIdx).trim();
        const text = line.slice(colonIdx + 1).trim();
        const spLower = rawSpeaker.toLowerCase();
        let badgeClass = 'narrator';
        let label = `🗣️ ${rawSpeaker}`;
        if (rawSpeaker === 'F' || spLower.includes('woman') || spLower.includes('girl')) {
          badgeClass = 'female';
          label = '👩 Nữ (F)';
        } else if (rawSpeaker === 'M' || spLower.includes('man') || spLower.includes('boy')) {
          badgeClass = 'male';
          label = '👨 Nam (M)';
        }
        return `
          <div class="transcript-line">
            <span class="speaker-badge ${badgeClass}">${label}</span>
            <span class="transcript-text">${text}</span>
          </div>
        `;
      }
      return `
        <div class="transcript-line">
          <span class="transcript-text" style="width:100%;">${line}</span>
        </div>
      `;
    }).join('');
  },

  currentQuestionStep: 1, // 1: Làm bài thi, 2: Bẫy & Transcript, 3: Paraphrasing & Phân tích
  showAllQuestionsGrid: false,
  expandedOptionBreakdowns: {},
  thinkingAnswers: {},
  paraphraseAnswers: {},

  setQuestionStep(step) {
    this.currentQuestionStep = parseInt(step, 10) || 1;
    this.renderWorkspace();
  },

  toggleAllQuestionsGrid() {
    this.showAllQuestionsGrid = !this.showAllQuestionsGrid;
    this.renderWorkspace();
  },

  jumpToQuestionIndex(idx) {
    if (!this.testData || !this.testData.questions) return;
    idx = parseInt(idx, 10);
    if (!isNaN(idx) && idx >= 0 && idx < this.testData.questions.length) {
      this.currentQuestionIndex = idx;
      this.currentSentenceIndex = 0;
      this.currentQuestionStep = 1;
      this.renderWorkspace();
    }
  },

  jumpToPart(partNum) {
    if (!this.testData || !this.testData.questions) return;
    partNum = parseInt(partNum, 10);
    const idx = this.testData.questions.findIndex(q => q.part === partNum);
    if (idx !== -1) {
      this.jumpToQuestionIndex(idx);
    }
  },

  selectExamOption(qId, key) {
    if (window.KetTracker && !window.KetTracker.hasProfile()) {
      return this.requireStudentProfile(() => this.selectExamOption(qId, key));
    }
    this.userAnswers[qId] = key;
    const q = this.testData.questions[this.currentQuestionIndex];
    const isCorrect = (q && q.correct_answer) ? (key.toUpperCase() === q.correct_answer.toUpperCase()) : false;

    if (window.KetTracker) {
      window.KetTracker.track('EXAM_STEP1_ANSWER', {
        question_id: qId,
        chosen: key,
        correct_answer: q ? q.correct_answer : '',
        is_correct: isCorrect
      }, {
        question_number: `Câu ${q ? q.q_number : qId} (Part ${q ? q.part : 1})`,
        result: isCorrect ? `ĐÚNG (${key})` : `CHỌN (${key})`
      });
      if (isCorrect) window.KetTracker.incrementSessionCounter();
    }
    this.renderWorkspace();
  },

  submitClozeOption(qId) {
    const inputEl = document.getElementById(`cloze-input-${qId}`);
    if (!inputEl) return;
    const val = inputEl.value.trim();
    if (!val) {
      inputEl.focus();
      return;
    }
    this.selectExamOption(qId, val);
  },

  renderWorkspace() {
    if (!this.testData || !this.testData.questions) return;
    
    const q = this.testData.questions[this.currentQuestionIndex];
    if (!q) return;

    if (window.KetTracker) window.KetTracker.startQuestionTimer();

    // Auto load audio cho câu hỏi hiện tại
    const qAudio = q.audio_question || q.audio_file;
    if (qAudio) {
      window.KetAudioPlayer.loadTrack(qAudio);
    }

    // Phần tay trái: Luôn luôn hiển thị PDF Viewer
    this.renderLeftPane(q);

    // Phần tay phải: Flow luyện tập nghe 3 bước
    this.renderUnifiedWorkspace(q);
  },

  /* ==========================================================================
     Left Pane: LUÔN LUÔN HIỂN THỊ PDF VIEWER (SUCCEED IN A2 KEY)
     ========================================================================== */
  renderLeftPane(q) {
    const pane = document.getElementById('pane-left');
    if (!pane) return;

    const testId = this.currentTestId || 1;
    const cfg = this.TEST_PAGES_MAP[testId] || { p1: 22, p2: 23, p3: 24, p4: 25, p5: 25, start: 22, end: 25 };
    const targetPage = (q && q.pdf_page) ? q.pdf_page : cfg.start;
    this.currentExamPdfPage = targetPage;
    this.currentExamPdfTestId = testId;

    const existingFrame = document.getElementById('exam-pdf-frame');
    const frameTestId = existingFrame ? parseInt(existingFrame.getAttribute('data-test-id') || '0', 10) : null;
    const framePage = existingFrame ? parseInt(existingFrame.getAttribute('data-page') || '0', 10) : null;

    if (existingFrame && frameTestId === testId) {
      const pageIndicator = document.getElementById('exam-pdf-page-indicator');
      if (pageIndicator) {
        pageIndicator.textContent = `📖 Test ${testId} · Trang ${targetPage} (Part ${q ? q.part : 1})`;
      }
      const extLink = document.getElementById('exam-pdf-ext-link');
      if (extLink) {
        extLink.href = `https://drive.google.com/file/d/1OVNzYe_ZYOm9xVlfBB9nISHOuLF4_joT/view?usp=drive_open#page=${targetPage}`;
      }
      if (framePage !== targetPage) {
        existingFrame.setAttribute('data-page', targetPage);
        existingFrame.src = `https://drive.google.com/file/d/1OVNzYe_ZYOm9xVlfBB9nISHOuLF4_joT/preview#page=${targetPage}`;
      }
      return;
    }

    pane.innerHTML = `
      <div class="lego-card lego-pdf-card" style="height:100%; display:flex; flex-direction:column; padding:0.6rem;">
        <div class="lego-pdf-header-row" style="margin-bottom:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
            <span class="part-badge" id="exam-pdf-page-indicator">📖 Test ${testId} · Trang ${targetPage} (Part ${q ? q.part : 1})</span>
            <span class="badge-session">Cambridge A2 Key PDF</span>
          </div>
          <div style="display:flex; gap:0.4rem; align-items:center;">
            <a id="exam-pdf-ext-link" href="https://drive.google.com/file/d/1OVNzYe_ZYOm9xVlfBB9nISHOuLF4_joT/view?usp=drive_open#page=${targetPage}" target="_blank" rel="noopener" class="lego-btn-secondary" style="text-decoration:none; font-size:0.8rem; padding:0.3rem 0.65rem;" title="Mở file PDF trong tab mới">
              Mở tab mới ↗️
            </a>
            <button class="lego-btn-secondary" onclick="App.reloadExamPdf()" style="font-size:0.8rem; padding:0.3rem 0.65rem;" title="Tải lại PDF">
              🔄 Tải lại
            </button>
          </div>
        </div>

        <!-- Google Drive PDF Viewer Embed -->
        <div class="lego-pdf-viewer-wrap" style="flex:1; min-height:480px;">
          <iframe 
            id="exam-pdf-frame" 
            data-test-id="${testId}"
            data-page="${targetPage}"
            src="https://drive.google.com/file/d/1OVNzYe_ZYOm9xVlfBB9nISHOuLF4_joT/preview#page=${targetPage}" 
            width="100%" 
            height="100%" 
            allow="autoplay"
            loading="lazy"
            title="Đề thi SUCCEED in A2 Key New 2020 Format - Test ${testId}"
          ></iframe>
        </div>
      </div>
    `;
  },

  /* ==========================================================================
     Right Pane: FLOW LUYỆN TẬP NGHE TOÀN DIỆN (3 BƯỚC)
     ========================================================================== */
  renderUnifiedWorkspace(q) {
    const pane = document.getElementById('pane-right');
    if (!pane) return;

    const qKey = `${q.test_id || 1}_${q.id}`;
    const tData = window.ThinkingEngine ? window.ThinkingEngine.getThinkingData(q) : null;
    const tAnswers = this.thinkingAnswers[qKey] || { trap_choice: null, comp_choice: null, trap_solved: false, comp_solved: false };
    const pAnswers = this.paraphraseAnswers[qKey] || { syn_choice: null, ant_choice: null, final_choice: null, syn_solved: false, ant_solved: false, final_solved: false };
    const expanded = this.expandedOptionBreakdowns[qKey] || {};

    const chosenAnswer = this.userAnswers[q.id];
    const step2Completed = tAnswers.trap_solved && tAnswers.comp_solved;
    const step3Completed = pAnswers.syn_solved && pAnswers.ant_solved;

    // --- BƯỚC 1: OPTIONS HTML ---
    const rawOptions = q.options || { "A": "Phương án A", "B": "Phương án B", "C": "Phương án C" };
    const isFillIn = (q.part === 2 || q.part === 5);
    let step1InputHtml = '';
    if (isFillIn) {
      step1InputHtml = `
        <div style="margin-top:1rem; background:#f8fafc; border:1.5px solid #cbd5e1; border-radius:8px; padding:1rem;">
          <label style="display:block; font-weight:800; font-size:0.92rem; color:#1e293b; margin-bottom:0.4rem;">
            ✍️ Nhập từ hoặc số cần điền cho Câu ${q.q_number}:
          </label>
          <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
            <input 
              type="text" 
              id="cloze-input-${q.id}" 
              class="lego-input" 
              placeholder="Nhập câu trả lời..." 
              value="${chosenAnswer || ''}"
              style="font-size:1.05rem; padding:0.6rem 0.85rem; max-width:320px; border:2px solid #cbd5e1; border-radius:8px;"
              onkeydown="if(event.key === 'Enter') App.submitClozeOption('${q.id}')"
            />
            <button class="lego-btn-blue" onclick="App.submitClozeOption('${q.id}')">
              Ghi Nhận ✍️
            </button>
          </div>
        </div>
      `;
    } else {
      step1InputHtml = `
        <div class="exam-options-grid">
          ${Object.entries(rawOptions).map(([key, label]) => {
            const isSelected = chosenAnswer && (chosenAnswer.toUpperCase() === key.toUpperCase());
            return `
              <button class="lego-exam-opt-btn ${isSelected ? 'selected' : ''}" onclick="App.selectExamOption('${q.id}', '${key}')">
                <span class="exam-opt-circle">${key}</span>
                <span class="exam-opt-label">${label}</span>
                ${isSelected ? '<span style="margin-left:auto; font-size:1.1rem;">✅</span>' : ''}
              </button>
            `;
          }).join('')}
        </div>
      `;
    }

    // --- BƯỚC 2: TRAP & COMPREHENSION HTML ---
    const trapQ = tData?.tier1_thinking?.trap_question;
    const compQ = tData?.tier1_thinking?.comprehension_question;

    const trapOptionsHtml = trapQ?.options.map(opt => {
      const isSelected = tAnswers.trap_choice === opt.id;
      let stateClass = '';
      if (isSelected) stateClass = opt.is_correct ? 'correct' : 'incorrect';
      return `
        <button class="lego-thinking-opt-btn ${stateClass}" onclick="App.selectTrapAnswer('${qKey}', '${opt.id}')">
          <span class="opt-badge">${opt.id}</span>
          <span class="opt-text">${opt.text}</span>
          ${isSelected && opt.is_correct ? '<span class="status-icon">✅</span>' : (isSelected ? '<span class="status-icon">❌</span>' : '')}
        </button>
      `;
    }).join('') || '';

    const compOptionsHtml = compQ?.options.map(opt => {
      const isSelected = tAnswers.comp_choice === opt.id;
      let stateClass = '';
      if (isSelected) stateClass = opt.is_correct ? 'correct' : 'incorrect';
      return `
        <button class="lego-thinking-opt-btn ${stateClass}" onclick="App.selectCompAnswer('${qKey}', '${opt.id}')">
          <span class="opt-badge">${opt.id}</span>
          <span class="opt-text">${opt.text}</span>
          ${isSelected && opt.is_correct ? '<span class="status-icon">✅</span>' : (isSelected ? '<span class="status-icon">❌</span>' : '')}
        </button>
      `;
    }).join('') || '';

    // --- BƯỚC 3: PARAPHRASING & DECONSTRUCTION HTML ---
    const vocabList = tData?.tier2_paraphrase?.vocab_bank || [];
    const vocabCardsHtml = vocabList.map(v => {
      const relBadge = v.relation === 'synonym' 
        ? '<span class="lego-rel-badge syn">🟢 Đồng nghĩa</span>' 
        : (v.relation === 'antonym' ? '<span class="lego-rel-badge ant">🔴 Trái nghĩa</span>' : '<span class="lego-rel-badge col">⭐ Cụm từ</span>');
      const safePhrase = (v.phrase || '').replace(/'/g, "\\'");
      return `
        <div class="lego-vocab-chip-card">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.25rem;">
            <span style="font-weight:800; font-size:0.9rem; color:var(--lego-blue);">${v.phrase}</span>
            ${relBadge}
          </div>
          <div style="font-size:0.8rem; color:#334155; margin-bottom:0.35rem;">
            👉 <strong>${v.meaning}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed #e2e8f0; padding-top:0.3rem;">
            <span style="font-size:0.74rem; color:#64748b; font-style:italic;">Khớp: ${v.target}</span>
            <button class="lego-chip" onclick="KetDictionary.openModal('${safePhrase}')" style="font-size:0.72rem; padding:0.1rem 0.45rem;" title="Mở Dictionary tra IPA & ghi chép nghĩa">
              📚 Tra từ
            </button>
          </div>
        </div>
      `;
    }).join('');

    const synQ = tData?.tier2_paraphrase?.synonym_quiz;
    const antQ = tData?.tier2_paraphrase?.antonym_quiz;
    const optBreakdown = tData?.tier2_paraphrase?.options_breakdown || {};

    const synOptsHtml = synQ?.options.map(opt => {
      const isSelected = pAnswers.syn_choice === opt.id;
      let stateClass = '';
      if (isSelected) stateClass = opt.is_correct ? 'correct' : 'incorrect';
      return `
        <button class="lego-thinking-opt-btn ${stateClass}" onclick="App.selectSynonymQuiz('${qKey}', '${opt.id}')">
          <span class="opt-badge">${opt.id}</span>
          <span class="opt-text">${opt.text}</span>
          ${isSelected && opt.is_correct ? '<span class="status-icon">✅</span>' : (isSelected ? '<span class="status-icon">❌</span>' : '')}
        </button>
      `;
    }).join('') || '';

    const antOptsHtml = antQ?.options.map(opt => {
      const isSelected = pAnswers.ant_choice === opt.id;
      let stateClass = '';
      if (isSelected) stateClass = opt.is_correct ? 'correct' : 'incorrect';
      return `
        <button class="lego-thinking-opt-btn ${stateClass}" onclick="App.selectAntonymQuiz('${qKey}', '${opt.id}')">
          <span class="opt-badge">${opt.id}</span>
          <span class="opt-text">${opt.text}</span>
          ${isSelected && opt.is_correct ? '<span class="status-icon">✅</span>' : (isSelected ? '<span class="status-icon">❌</span>' : '')}
        </button>
      `;
    }).join('') || '';

    const optionCardsHtml = Object.entries(rawOptions).map(([key, label]) => {
      const info = optBreakdown[key] || { status: 'Phân tích', why: 'Đang cập nhật', evidence: '' };
      const isCorrectOpt = (key === q.correct_answer);
      const isOpen = expanded[key] !== false;
      return `
        <div class="lego-deconstruct-card ${isCorrectOpt ? 'is-correct' : 'is-distractor'}">
          <div class="deconstruct-header" onclick="App.toggleOptionBreakdown('${qKey}', '${key}')">
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span class="opt-key-circle ${isCorrectOpt ? 'correct' : 'distractor'}">${key}</span>
              <span style="font-weight:800; font-size:0.92rem; color:#1e293b;">${label}</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.4rem;">
              <span class="deconstruct-badge ${isCorrectOpt ? 'correct' : 'distractor'}">${info.status}</span>
              <span style="font-size:0.8rem; color:#94a3b8;">${isOpen ? '▲' : '▼'}</span>
            </div>
          </div>
          ${isOpen ? `
            <div class="deconstruct-body">
              <div class="deconstruct-why">
                <strong>💡 Tại sao ${isCorrectOpt ? 'ĐÚNG' : 'SAI'}:</strong> ${info.why}
              </div>
              ${info.evidence ? `
                <div class="deconstruct-evidence">
                  <strong>📜 Dẫn chứng audio:</strong> “${info.evidence}”
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // --- STEP CONTENT SWITCHER ---
    let stepContentHtml = '';

    if (this.currentQuestionStep === 1) {
      stepContentHtml = `
        <div class="lego-card" style="border-top: 4px solid var(--lego-blue);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <h3 style="font-size:1.15rem; font-weight:900; color:var(--lego-blue); margin:0;">
              🎓 Bước 1: Làm Bài Thi & Chọn Đáp Án
            </h3>
            <span class="badge-session">Exam Simulation</span>
          </div>

          <div style="font-size:1.02rem; font-weight:700; color:var(--text-primary); line-height:1.45; margin-bottom:0.85rem; background:#f8fafc; padding:0.75rem 0.9rem; border-radius:8px; border:1px solid #e2e8f0;">
            🎯 ${q.prompt}
          </div>

          <div style="font-size:0.88rem; color:#475569; margin-bottom:0.6rem; display:flex; align-items:center; gap:0.4rem;">
            <span>👉</span> Quan sát <strong>trang PDF ở bên trái</strong>, lắng nghe audio và chọn đáp án:
          </div>

          ${step1InputHtml}

          ${chosenAnswer ? `
            <div style="background:#eff6ff; border:1.5px solid #93c5fd; border-radius:8px; padding:0.85rem; margin-top:1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
              <div>
                <span style="font-weight:800; color:#1d4ed8; font-size:0.95rem;">
                  ✅ Bạn đã chọn: <strong>${chosenAnswer}</strong>
                </span>
                <div style="font-size:0.82rem; color:#475569; margin-top:0.2rem;">
                  Hãy chuyển sang Bước 2 để đọc transcript và khám phá các bẫy đề thi Cambridge!
                </div>
              </div>
              <button class="lego-btn-orange" onclick="App.setQuestionStep(2)" style="font-size:0.9rem; padding:0.55rem 1rem;">
                Tiếp Tục: Bước 2 (Bẫy & Transcript) ➡️
              </button>
            </div>
          ` : `
            <div style="display:flex; justify-content:flex-end; margin-top:1rem;">
              <button class="lego-btn-secondary" onclick="App.setQuestionStep(2)" style="font-size:0.85rem;">
                Chuyển Sang Bước 2 (Bẫy & Transcript) ➡️
              </button>
            </div>
          `}
        </div>
      `;
    } else if (this.currentQuestionStep === 2) {
      stepContentHtml = `
        <div class="lego-card" style="border-top: 4px solid #16a34a;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <h3 style="font-size:1.15rem; font-weight:900; color:#15803d; margin:0;">
              🌱 Bước 2: Bóc Tách Bẫy & Phân Tích Transcript
            </h3>
            <span class="stopwatch-badge" style="background:#dcfce7; color:#15803d; border-color:#86efac;">
              Critical Thinking
            </span>
          </div>

          <!-- Transcript Box (Hiển thị trực tiếp cho học sinh phân tích) -->
          <div class="lego-transcript-box">
            <div class="lego-transcript-header">
              <span style="font-size:0.88rem; font-weight:800; color:#1e40af; display:flex; align-items:center; gap:0.35rem;">
                <span>📜</span> Transcript Phân Tích (Audioscript):
              </span>
              <span style="font-size:0.72rem; color:#0369a1; font-weight:800; background:#e0f2fe; padding:0.15rem 0.5rem; border-radius:999px; border:1px solid #bae6fd;">
                Đọc & đối chiếu lời thoại
              </span>
            </div>
            <div class="lego-transcript-lines">
              ${this.formatTranscriptHtml(q.transcript)}
            </div>
          </div>

          <!-- Clues Box -->
          <div class="lego-thinking-clues-box" style="margin-bottom:1rem;">
            <div style="margin-bottom:0.5rem;">
              <div style="font-weight:800; font-size:0.84rem; color:#b45309; margin-bottom:0.2rem;">💡 Gợi Ý Bối Cảnh:</div>
              <div style="font-size:0.85rem; color:#78350f; line-height:1.4;">${q.tier1_hint || 'Lắng nghe các mốc thông tin và phản ứng của người nói.'}</div>
            </div>
            <div>
              <div style="font-weight:800; font-size:0.84rem; color:#c2410c; margin-bottom:0.2rem;">⚠️ Cảnh Báo Bẫy Đề Thi:</div>
              <div style="font-size:0.85rem; color:#7c2d12; line-height:1.4;">${q.tier2_hint || 'Chú ý các từ chuyển ý hoặc các phương án bị từ chối.'}</div>
            </div>
          </div>

          <!-- Trap Question -->
          <div class="lego-thinking-card ${tAnswers.trap_solved ? 'card-solved' : ''}">
            <div class="thinking-card-header">
              <span class="thinking-step-pill">❓ Câu hỏi tư duy 1</span>
              <span class="thinking-title">Nhận Diện Bẫy Đề Thi</span>
              ${tAnswers.trap_solved ? '<span class="badge-solved">✅ Đã Vượt Qua</span>' : '<span class="badge-pending">🎯 Cần Hoàn Thành</span>'}
            </div>
            <p class="thinking-prompt">${trapQ?.prompt || 'Người nói đã sử dụng bẫy đề thi nào?'}</p>
            <div class="thinking-options-grid">
              ${trapOptionsHtml}
            </div>
            ${tAnswers.trap_choice ? `
              <div class="thinking-explanation-box ${tAnswers.trap_solved ? 'expl-correct' : 'expl-wrong'}">
                ${tAnswers.trap_solved ? `
                  <div style="font-weight:800; color:#15803d; margin-bottom:0.25rem;">🎉 Hoàn toàn chính xác!</div>
                  <div>${trapQ?.explanation}</div>
                ` : `
                  <div style="font-weight:800; color:#b91c1c; margin-bottom:0.25rem;">💡 Chưa chính xác rồi!</div>
                  <div>Hãy nhìn kỹ transcript ở trên: Chú ý xem người nói có thay đổi ý định hoặc nhắc các mốc thời gian nhiễu không nhé!</div>
                `}
              </div>
            ` : ''}
          </div>

          <!-- Comprehension Question -->
          <div class="lego-thinking-card ${tAnswers.comp_solved ? 'card-solved' : ''}" style="margin-top:1rem;">
            <div class="thinking-card-header">
              <span class="thinking-step-pill" style="background:#e0f2fe; color:#0369a1; border-color:#bae6fd;">❓ Câu hỏi tư duy 2</span>
              <span class="thinking-title">Hiểu Sâu Transcript</span>
              ${tAnswers.comp_solved ? '<span class="badge-solved">✅ Đã Vượt Qua</span>' : '<span class="badge-pending">🎯 Cần Hoàn Thành</span>'}
            </div>
            <p class="thinking-prompt">${compQ?.prompt || 'Hiểu sâu chi tiết then chốt trong transcript:'}</p>
            <div class="thinking-options-grid">
              ${compOptionsHtml}
            </div>
            ${tAnswers.comp_choice ? `
              <div class="thinking-explanation-box ${tAnswers.comp_solved ? 'expl-correct' : 'expl-wrong'}">
                ${tAnswers.comp_solved ? `
                  <div style="font-weight:800; color:#15803d; margin-bottom:0.25rem;">🎉 Lập luận rất chuẩn!</div>
                  <div>${compQ?.explanation}</div>
                ` : `
                  <div style="font-weight:800; color:#b91c1c; margin-bottom:0.25rem;">💡 Hãy thử lại nhé!</div>
                  <div>Hãy đọc lại từng dòng thoại trong hộp Transcript phía trên để tìm căn cứ chính xác.</div>
                `}
              </div>
            ` : ''}
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.25rem; border-top:1px dashed #cbd5e1; padding-top:1rem;">
            <button class="lego-btn-secondary" onclick="App.setQuestionStep(1)">
              ⬅️ Quay Lại Bước 1
            </button>
            <button class="lego-btn-orange" onclick="App.setQuestionStep(3)">
              Tiếp Tục: Bước 3 (Paraphrasing) ➡️
            </button>
          </div>
        </div>
      `;
    } else {
      // BƯỚC 3: PARAPHRASING & GIẢI MÃ
      stepContentHtml = `
        <div class="lego-card" style="border-top: 4px solid #ea580c;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <h3 style="font-size:1.15rem; font-weight:900; color:#c2410c; margin:0;">
              ⚡ Bước 3: Paraphrasing & Phân Tích Phương Án
            </h3>
            <span class="stopwatch-badge" style="background:#ffedd5; color:#c2410c; border-color:#fed7aa;">
              Vocab & Deconstruction
            </span>
          </div>

          <!-- Vocab Bank -->
          <div style="margin-bottom:1rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <h4 style="color:#0f766e; font-size:0.95rem; font-weight:900; margin:0;">
                📚 Kho Từ Vựng & Cụm Paraphrase Cốt Lõi:
              </h4>
              <span style="font-size:0.74rem; color:#64748b; font-weight:700;">Nhấn 'Tra từ' để tra từ điển & ghi chú</span>
            </div>
            <div class="lego-vocab-bank-list" style="max-height:200px;">
              ${vocabCardsHtml}
            </div>
          </div>

          <!-- Synonym Challenge -->
          <div class="lego-thinking-card" style="margin-bottom:1rem;">
            <div class="thinking-card-header">
              <span class="thinking-step-pill" style="background:#dcfce7; color:#15803d; border-color:#86efac;">🟢 Thử Thách 1</span>
              <span class="thinking-title">Từ Đồng Nghĩa (Synonym Paraphrase)</span>
              ${pAnswers.syn_solved ? '<span class="badge-solved">✅ Hoàn Thành</span>' : '<span class="badge-pending">🎯 Cần Làm</span>'}
            </div>
            <p class="thinking-prompt">${synQ?.prompt || 'Tìm từ đồng nghĩa trong bài nghe:'}</p>
            <div class="thinking-options-grid">
              ${synOptsHtml}
            </div>
            ${pAnswers.syn_choice ? `
              <div class="thinking-explanation-box ${pAnswers.syn_solved ? 'expl-correct' : 'expl-wrong'}">
                ${pAnswers.syn_solved ? `
                  <div style="font-weight:800; color:#15803d; margin-bottom:0.25rem;">🎉 Chuẩn xác!</div>
                  <div>${synQ?.explanation}</div>
                ` : `
                  <div style="font-weight:800; color:#b91c1c; margin-bottom:0.25rem;">💡 Chưa khớp rồi!</div>
                  <div>Hãy xem lại các từ ở Kho Từ Vựng phía trên để chọn cụm đồng nghĩa phù hợp nhất.</div>
                `}
              </div>
            ` : ''}
          </div>

          <!-- Antonym Challenge -->
          <div class="lego-thinking-card" style="margin-bottom:1rem;">
            <div class="thinking-card-header">
              <span class="thinking-step-pill" style="background:#fee2e2; color:#b91c1c; border-color:#fca5a5;">🔴 Thử Thách 2</span>
              <span class="thinking-title">Từ Trái Nghĩa (Antonym Contrast)</span>
              ${pAnswers.ant_solved ? '<span class="badge-solved">✅ Hoàn Thành</span>' : '<span class="badge-pending">🎯 Cần Làm</span>'}
            </div>
            <p class="thinking-prompt">${antQ?.prompt || 'Nhận diện từ trái nghĩa / tương phản:'}</p>
            <div class="thinking-options-grid">
              ${antOptsHtml}
            </div>
            ${pAnswers.ant_choice ? `
              <div class="thinking-explanation-box ${pAnswers.ant_solved ? 'expl-correct' : 'expl-wrong'}">
                ${pAnswers.ant_solved ? `
                  <div style="font-weight:800; color:#15803d; margin-bottom:0.25rem;">🎉 Rất tốt!</div>
                  <div>${antQ?.explanation}</div>
                ` : `
                  <div style="font-weight:800; color:#b91c1c; margin-bottom:0.25rem;">💡 Thử lại nhé!</div>
                  <div>Tìm từ mang ý nghĩa đối lập với hành động trong câu hỏi.</div>
                `}
              </div>
            ` : ''}
          </div>

          <!-- Option Deconstruction Cards -->
          <div style="margin-bottom:1.25rem;">
            <div style="margin-bottom:0.6rem;">
              <h4 style="color:#1e40af; font-size:1.02rem; font-weight:900; margin:0 0 0.2rem 0;">
                🔍 Giải Mã · Tại Sao Từng Lựa Chọn Lại Đúng / Sai?
              </h4>
              <p style="font-size:0.83rem; color:#64748b; margin:0;">
                Bóc tách chi tiết từng phương án kèm dẫn chứng transcript trích xuất từ audio:
              </p>
            </div>
            <div class="lego-deconstruct-list">
              ${optionCardsHtml}
            </div>
          </div>

          <!-- Completion Box -->
          <div class="thinking-summary-success" style="margin-top:1.5rem;">
            <div style="font-size:1.8rem; margin-bottom:0.3rem;">🏆</div>
            <h4 style="font-size:1.1rem; font-weight:800; color:#15803d; margin-bottom:0.3rem;">
              Xuất sắc! Bạn đã hoàn thành toàn diện 3 bước của Câu ${q.q_number}!
            </h4>
            <p style="font-size:0.88rem; color:#166534; margin-bottom:0.85rem;">
              Bạn đã chọn đáp án, bóc tách bẫy transcript và nắm trọn từ vựng paraphrasing.
            </p>
            <div style="display:flex; justify-content:center; gap:0.6rem; flex-wrap:wrap;">
              <button class="lego-btn-secondary" onclick="App.setQuestionStep(1)">
                🔄 Xem Lại Bước 1
              </button>
              <button class="lego-btn-orange" onclick="App.nextQuestion()">
                Chuyển Sang Câu ${q.q_number + 1 <= this.testData.questions.length ? q.q_number + 1 : 1} ⏭️
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // --- BUILD SMART PART & QUESTION NAVIGATOR ---
    const partTitles = {
      1: "Part 1 (Q1 - 5) · Tranh & Trắc nghiệm",
      2: "Part 2 (Q6 - 10) · Điền từ / Tin nhắn",
      3: "Part 3 (Q11 - 15) · Hội thoại 3 lựa chọn",
      4: "Part 4 (Q16 - 20) · 5 đoạn ngắn độc lập",
      5: "Part 5 (Q21 - 25) · Nối thông tin"
    };

    const partsDef = [
      { part: 1, range: 'Q1-5', title: 'Part 1 (1-5)' },
      { part: 2, range: 'Q6-10', title: 'Part 2 (6-10)' },
      { part: 3, range: 'Q11-15', title: 'Part 3 (11-15)' },
      { part: 4, range: 'Q16-20', title: 'Part 4 (16-20)' },
      { part: 5, range: 'Q21-25', title: 'Part 5 (21-25)' }
    ];

    let qSelectOptionsHtml = '';
    for (let pNum = 1; pNum <= 5; pNum++) {
      const pQuestions = (this.testData.questions || []).filter(item => item.part === pNum);
      if (pQuestions.length > 0) {
        qSelectOptionsHtml += `<optgroup label="${partTitles[pNum] || 'Part ' + pNum}">`;
        pQuestions.forEach(item => {
          const qIdx = this.testData.questions.findIndex(x => x.id === item.id);
          const isSelected = (qIdx === this.currentQuestionIndex);
          const ans = this.userAnswers[item.id];
          const statusText = ans ? `✅ (${ans})` : '⚪';
          qSelectOptionsHtml += `
            <option value="${qIdx}" ${isSelected ? 'selected' : ''}>
              Câu ${item.q_number} ${statusText} · Trang ${item.pdf_page || 22}
            </option>
          `;
        });
        qSelectOptionsHtml += `</optgroup>`;
      }
    }

    const partPillsHtml = partsDef.map(p => `
      <button class="smart-part-btn ${q.part === p.part ? 'active' : ''}" onclick="App.jumpToPart(${p.part})" title="${partTitles[p.part]}">
        ${p.title}
      </button>
    `).join('');

    const currentPartQuestions = (this.testData.questions || []).filter(item => item.part === q.part);
    const qPillsHtml = currentPartQuestions.map(item => {
      const isCur = (item.id === q.id);
      const itemAns = this.userAnswers[item.id];
      const qIdx = this.testData.questions.findIndex(x => x.id === item.id);
      return `
        <button class="smart-q-btn ${isCur ? 'active' : ''} ${itemAns ? 'answered' : ''}" 
                onclick="App.jumpToQuestionIndex(${qIdx})" 
                title="Câu ${item.q_number} ${itemAns ? '(Đã làm: ' + itemAns + ')' : '(Chưa làm)'}">
          <span>Q${item.q_number}</span>
          ${itemAns ? '<span style="font-size:0.65rem; color:#16a34a;">✓</span>' : ''}
        </button>
      `;
    }).join('');

    let allQuestionsGridHtml = '';
    if (this.showAllQuestionsGrid) {
      allQuestionsGridHtml = `
        <div class="smart-all-q-grid-panel">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.45rem;">
            <strong style="font-size:0.85rem; color:#1e293b;">🗺️ Bản Đồ 25 Câu Hỏi (Chọn nhanh câu bất kỳ):</strong>
            <button class="lego-chip" style="font-size:0.75rem; padding:0.15rem 0.45rem;" onclick="App.toggleAllQuestionsGrid()">Đóng ✕</button>
          </div>
          <div class="smart-all-q-rows">
            ${partsDef.map(p => {
              const pQs = (this.testData.questions || []).filter(item => item.part === p.part);
              return `
                <div class="smart-grid-part-row">
                  <span class="smart-grid-part-label">${p.title}:</span>
                  <div class="smart-grid-part-btns">
                    ${pQs.map(item => {
                      const isCur = (item.id === q.id);
                      const itemAns = this.userAnswers[item.id];
                      const qIdx = this.testData.questions.findIndex(x => x.id === item.id);
                      return `
                        <button class="smart-q-btn ${isCur ? 'active' : ''} ${itemAns ? 'answered' : ''}" 
                                onclick="App.jumpToQuestionIndex(${qIdx})" 
                                title="Câu ${item.q_number} ${itemAns ? '(Đã làm: ' + itemAns + ')' : '(Chưa làm)'}">
                          <span>Q${item.q_number}</span>
                          ${itemAns ? '<span style="font-size:0.65rem; color:#16a34a;">✓</span>' : ''}
                        </button>
                      `;
                    }).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // --- RENDER FULL RIGHT PANE ---
    pane.innerHTML = `
      <!-- Header Card with Smart Question & Part Navigation & Stepper -->
      <div class="flow-header-card">
        <!-- Row 1: Smart Selectors & Actions -->
        <div class="smart-nav-row">
          <div class="smart-nav-selectors">
            <!-- Part Select -->
            <div class="smart-nav-picker">
              <label class="smart-nav-label">📂 Phần:</label>
              <select class="smart-select-pill" onchange="App.jumpToPart(parseInt(this.value, 10))">
                <option value="1" ${q.part === 1 ? 'selected' : ''}>Part 1 (Q1-5)</option>
                <option value="2" ${q.part === 2 ? 'selected' : ''}>Part 2 (Q6-10)</option>
                <option value="3" ${q.part === 3 ? 'selected' : ''}>Part 3 (Q11-15)</option>
                <option value="4" ${q.part === 4 ? 'selected' : ''}>Part 4 (Q16-20)</option>
                <option value="5" ${q.part === 5 ? 'selected' : ''}>Part 5 (Q21-25)</option>
              </select>
            </div>

            <!-- Question Select -->
            <div class="smart-nav-picker">
              <label class="smart-nav-label">🎯 Câu:</label>
              <select class="smart-select-pill" onchange="App.jumpToQuestionIndex(parseInt(this.value, 10))">
                ${qSelectOptionsHtml}
              </select>
            </div>

            <!-- PDF Page Badge -->
            <span class="smart-pdf-badge" title="Đang mở trang ${q.pdf_page || 22} trên PDF viewer bên trái">
              📄 Trang ${q.pdf_page || 22}
            </span>
          </div>

          <!-- Controls: Prev / Next / Toggle 25 Questions -->
          <div style="display:flex; gap:0.35rem; align-items:center;">
            <button class="lego-chip ${this.showAllQuestionsGrid ? 'active' : ''}" onclick="App.toggleAllQuestionsGrid()" title="Mở danh sách 25 câu hỏi" style="font-size:0.78rem; padding:0.3rem 0.6rem;">
              🗺️ 25 Câu
            </button>
            <button class="lego-btn-secondary" onclick="App.prevQuestion()" style="font-size:0.82rem; padding:0.3rem 0.65rem;" ${this.currentQuestionIndex === 0 ? 'disabled' : ''}>
              ⬅️ Trước
            </button>
            <button class="lego-btn-secondary" onclick="App.nextQuestion()" style="font-size:0.82rem; padding:0.3rem 0.65rem;" ${this.currentQuestionIndex === this.testData.questions.length - 1 ? 'disabled' : ''}>
              Sau ➡️
            </button>
          </div>
        </div>

        <!-- Row 2: Part Pills & Current Part Question Pills Quick-Strip -->
        <div class="smart-quick-strip">
          <div class="smart-parts-pills">
            ${partPillsHtml}
          </div>
          <div class="smart-questions-pills">
            ${qPillsHtml}
          </div>
        </div>

        <!-- Expandable All 25 Questions Grid Panel (if opened) -->
        ${allQuestionsGridHtml}

        <!-- Stepper Navigation Pills -->
        <div class="flow-stepper-row">
          <button class="flow-step-pill ${this.currentQuestionStep === 1 ? 'active' : ''} ${chosenAnswer ? 'completed' : ''}" onclick="App.setQuestionStep(1)">
            <span>1️⃣ 🎓</span> Bước 1: Làm Bài Thi
          </button>
          <button class="flow-step-pill ${this.currentQuestionStep === 2 ? 'active' : ''} ${step2Completed ? 'completed' : ''}" onclick="App.setQuestionStep(2)">
            <span>2️⃣ 🌱</span> Bước 2: Bẫy & Transcript
          </button>
          <button class="flow-step-pill ${this.currentQuestionStep === 3 ? 'active' : ''} ${step3Completed ? 'completed' : ''}" onclick="App.setQuestionStep(3)">
            <span>3️⃣ ⚡</span> Bước 3: Paraphrasing
          </button>
        </div>
      </div>

      <!-- Question Audio Player Box -->
      <div class="lego-thinking-audio-box">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.55rem; flex-wrap:wrap; gap:0.4rem;">
          <div style="display:flex; align-items:center; gap:0.4rem;">
            <span style="font-size:0.88rem; font-weight:900; color:#15803d;">
              🎧 Audio Câu Hỏi ${q.q_number} (Đoạn Cắt Độc Lập)
            </span>
            <span style="font-size:0.75rem; color:#64748b; font-weight:700;">(Space để Nghe/Dừng)</span>
          </div>
          <span style="font-size:0.75rem; font-weight:700; color:#0369a1; background:#e0f2fe; padding:0.15rem 0.5rem; border-radius:999px;">
            Nhìn đề thi PDF bên trái
          </span>
        </div>
        <div style="display:flex; gap:0.45rem; flex-wrap:wrap; align-items:center;">
          <button class="lego-btn-green" onclick="window.KetAudioPlayer.togglePlay()" style="font-size:0.85rem; padding:0.42rem 0.85rem;">
            ▶️ / ⏸️ Nghe Câu Hỏi
          </button>
          <button class="lego-btn-secondary" onclick="window.KetAudioPlayer.replay5s()" style="font-size:0.85rem; padding:0.42rem 0.85rem;">
            ⏮️ Tua lại 5s
          </button>
          <button class="lego-btn-orange" onclick="window.KetAudioPlayer.setSpeed(0.85)" style="font-size:0.85rem; padding:0.42rem 0.85rem;">
            🐢 0.85x Chậm
          </button>
          <button class="lego-btn-secondary" onclick="window.KetAudioPlayer.setSpeed(1.0)" style="font-size:0.85rem; padding:0.42rem 0.85rem;">
            ⚡ 1.0x Thường
          </button>
          <button class="lego-chip" onclick="KetDictionary.openModal()" style="font-size:0.75rem; padding:0.2rem 0.55rem; margin-left:auto;">
            📚 Dictionary
          </button>
        </div>
      </div>

      <!-- Active Step Content -->
      ${stepContentHtml}
    `;
  },

  renderBeginnerWorkspace(q) {
    this.renderUnifiedWorkspace(q);
  },

  renderIntermediateWorkspace(q) {
    this.renderUnifiedWorkspace(q);
  },

  renderExamWorkspace(q) {
    this.renderUnifiedWorkspace(q);
  },

  switchSentence(idx) {
    this.currentSentenceIndex = idx;
    this.renderWorkspace();
  },

  replayCurrentSentence() {
    if (window.KetTracker && !window.KetTracker.hasProfile()) {
      return this.requireStudentProfile(() => this.replayCurrentSentence());
    }
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
    if (window.KetTracker && !window.KetTracker.hasProfile()) {
      return this.requireStudentProfile(() => this.playSentenceSlow());
    }
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
    if (window.KetTracker && !window.KetTracker.hasProfile()) {
      return this.requireStudentProfile(() => this.giveLetterHint());
    }
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
    if (window.KetTracker && !window.KetTracker.hasProfile()) {
      return this.requireStudentProfile(() => this.revealNextWord());
    }
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

  selectTrapAnswer(qKey, choiceId) {
    if (window.KetTracker && !window.KetTracker.hasProfile()) {
      return this.requireStudentProfile(() => this.selectTrapAnswer(qKey, choiceId));
    }
    const q = this.testData.questions[this.currentQuestionIndex];
    if (!q) return;
    const tData = window.ThinkingEngine.getThinkingData(q);
    const trapQ = tData?.tier1_thinking?.trap_question;
    const opt = trapQ?.options.find(o => o.id === choiceId);
    if (!opt) return;

    if (!this.thinkingAnswers[qKey]) {
      this.thinkingAnswers[qKey] = { trap_choice: null, comp_choice: null, trap_solved: false, comp_solved: false };
    }
    this.thinkingAnswers[qKey].trap_choice = choiceId;
    if (opt.is_correct) {
      this.thinkingAnswers[qKey].trap_solved = true;
      if (window.KetTracker) window.KetTracker.incrementSessionCounter();
      this.checkThinkingAllSolved(qKey, q);
    }
    this.renderWorkspace();
  },

  selectCompAnswer(qKey, choiceId) {
    if (window.KetTracker && !window.KetTracker.hasProfile()) {
      return this.requireStudentProfile(() => this.selectCompAnswer(qKey, choiceId));
    }
    const q = this.testData.questions[this.currentQuestionIndex];
    if (!q) return;
    const tData = window.ThinkingEngine.getThinkingData(q);
    const compQ = tData?.tier1_thinking?.comprehension_question;
    const opt = compQ?.options.find(o => o.id === choiceId);
    if (!opt) return;

    if (!this.thinkingAnswers[qKey]) {
      this.thinkingAnswers[qKey] = { trap_choice: null, comp_choice: null, trap_solved: false, comp_solved: false };
    }
    this.thinkingAnswers[qKey].comp_choice = choiceId;
    if (opt.is_correct) {
      this.thinkingAnswers[qKey].comp_solved = true;
      if (window.KetTracker) window.KetTracker.incrementSessionCounter();
      this.checkThinkingAllSolved(qKey, q);
    }
    this.renderWorkspace();
  },

  checkThinkingAllSolved(qKey, q) {
    const a = this.thinkingAnswers[qKey];
    if (a && a.trap_solved && a.comp_solved) {
      if (window.KetTracker) {
        window.KetTracker.track('THINKING_COMPLETED', {
          question_id: q.id,
          q_number: q.q_number,
          part: q.part,
          trap_choice: a.trap_choice,
          comp_choice: a.comp_choice
        }, {
          result: `TƯ DUY HOÀN THÀNH: Câu ${q.q_number} (Part ${q.part})`
        });
      }
    }
  },

  selectSynonymQuiz(qKey, choiceId) {
    if (window.KetTracker && !window.KetTracker.hasProfile()) {
      return this.requireStudentProfile(() => this.selectSynonymQuiz(qKey, choiceId));
    }
    const q = this.testData.questions[this.currentQuestionIndex];
    if (!q) return;
    const tData = window.ThinkingEngine.getThinkingData(q);
    const synQ = tData?.tier2_paraphrase?.synonym_quiz;
    const opt = synQ?.options.find(o => o.id === choiceId);
    if (!opt) return;

    if (!this.paraphraseAnswers[qKey]) {
      this.paraphraseAnswers[qKey] = { syn_choice: null, ant_choice: null, final_choice: null, syn_solved: false, ant_solved: false, final_solved: false };
    }
    this.paraphraseAnswers[qKey].syn_choice = choiceId;
    if (opt.is_correct) {
      this.paraphraseAnswers[qKey].syn_solved = true;
      if (window.KetTracker) window.KetTracker.incrementSessionCounter();
    }
    this.renderWorkspace();
  },

  selectAntonymQuiz(qKey, choiceId) {
    if (window.KetTracker && !window.KetTracker.hasProfile()) {
      return this.requireStudentProfile(() => this.selectAntonymQuiz(qKey, choiceId));
    }
    const q = this.testData.questions[this.currentQuestionIndex];
    if (!q) return;
    const tData = window.ThinkingEngine.getThinkingData(q);
    const antQ = tData?.tier2_paraphrase?.antonym_quiz;
    const opt = antQ?.options.find(o => o.id === choiceId);
    if (!opt) return;

    if (!this.paraphraseAnswers[qKey]) {
      this.paraphraseAnswers[qKey] = { syn_choice: null, ant_choice: null, final_choice: null, syn_solved: false, ant_solved: false, final_solved: false };
    }
    this.paraphraseAnswers[qKey].ant_choice = choiceId;
    if (opt.is_correct) {
      this.paraphraseAnswers[qKey].ant_solved = true;
      if (window.KetTracker) window.KetTracker.incrementSessionCounter();
    }
    this.renderWorkspace();
  },

  toggleOptionBreakdown(qKey, key) {
    if (!this.expandedOptionBreakdowns[qKey]) {
      this.expandedOptionBreakdowns[qKey] = { A: true, B: true, C: true };
    }
    this.expandedOptionBreakdowns[qKey][key] = !this.expandedOptionBreakdowns[qKey][key];
    this.renderWorkspace();
  },

  selectParaphraseFinalAnswer(qKey, key) {
    if (window.KetTracker && !window.KetTracker.hasProfile()) {
      return this.requireStudentProfile(() => this.selectParaphraseFinalAnswer(qKey, key));
    }
    const q = this.testData.questions[this.currentQuestionIndex];
    if (!q) return;

    if (!this.paraphraseAnswers[qKey]) {
      this.paraphraseAnswers[qKey] = { syn_choice: null, ant_choice: null, final_choice: null, syn_solved: false, ant_solved: false, final_solved: false };
    }
    this.paraphraseAnswers[qKey].final_choice = key;
    const isCorrect = (key === q.correct_answer);
    if (isCorrect) {
      this.paraphraseAnswers[qKey].final_solved = true;
      if (window.KetTracker) {
        window.KetTracker.incrementSessionCounter();
        window.KetTracker.track('PARAPHRASE_COMPLETED', {
          question_id: q.id,
          q_number: q.q_number,
          part: q.part,
          final_choice: key
        }, {
          result: `PARAPHRASE HOÀN THÀNH: Câu ${q.q_number} (Đáp án ${key})`
        });
      }
    }
    this.renderWorkspace();
  },

  toggleTranscriptM1(qKey) {
    this.transcriptRevealedM1[qKey] = !this.transcriptRevealedM1[qKey];
    this.renderWorkspace();
  },

  selectOption(qId, key) {
    if (window.KetTracker && !window.KetTracker.hasProfile()) {
      return this.requireStudentProfile(() => this.selectOption(qId, key));
    }
    this.userAnswers[qId] = key;
    this.renderWorkspace();
  },

  recordTextAnswer(qId, val) {
    if (window.KetTracker && !window.KetTracker.hasProfile()) {
      return this.requireStudentProfile(() => this.recordTextAnswer(qId, val));
    }
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
    if (window.KetTracker && !window.KetTracker.hasProfile()) {
      return this.requireStudentProfile(() => this.recordExamAnswer(qId, val));
    }
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
      this.currentQuestionStep = 1;
      this.renderWorkspace();
    }
  },

  nextQuestion() {
    if (this.currentQuestionIndex < this.testData.questions.length - 1) {
      this.currentQuestionIndex++;
      this.currentSentenceIndex = 0;
      this.currentQuestionStep = 1;
      this.renderWorkspace();
    }
  },

  handleKeydown(e) {
    if (e.code === 'Escape') {
      const modal = document.getElementById('modal-student-profile');
      if (modal && modal.style.display !== 'none') {
        if (window.KetTracker && !window.KetTracker.hasProfile()) {
          e.preventDefault();
          alert("⚠️ Bạn bắt buộc phải điền đầy đủ Thông Tin Học Sinh trước khi bắt đầu thực hành nhé!");
          document.getElementById('input-student-name')?.focus();
          return;
        }
      }
    }

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Digit1') {
      this.setQuestionStep(1);
      return;
    } else if (e.code === 'Digit2') {
      this.setQuestionStep(2);
      return;
    } else if (e.code === 'Digit3') {
      this.setQuestionStep(3);
      return;
    }

    if (e.code === 'Space' || e.code === 'KeyR' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      if (window.KetTracker && !window.KetTracker.hasProfile()) {
        e.preventDefault();
        return this.requireStudentProfile();
      }
    }

    if (e.code === 'Space' || e.code === 'KeyR') {
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
