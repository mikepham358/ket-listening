// app.js — KET Listening Engine (Lego Colorful Theme & Zero-Transcript Dictation)
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
  socraticHintsRevealed: {}, // { qId: tierNumber }
  examTimerInterval: null,
  examSecondsRemaining: 30 * 60, // 30 mins
  
  async init() {
    window.KetAudioPlayer.init();
    if (window.I18N) window.I18N.setLang(window.I18N.currentLang);
    
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
    this.currentSentenceIndex = 0;
    this.attempts = {};
    this.userAnswers = {};
    this.sentenceAnswers = {};
    this.sentenceSolved = {};
    this.sentenceAttempts = {};
    this.socraticHintsRevealed = {};

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
      const existingFrame = document.getElementById('exam-pdf-frame');
      if (existingFrame) {
        // Cập nhật số trang gợi ý mà không reload iframe để giữ nguyên vị trí cuộn & phóng to của học sinh
        const pageBadge = document.getElementById('exam-pdf-page-indicator');
        if (pageBadge && q.pdf_page) {
          pageBadge.textContent = `📖 Trang gợi ý: ${q.pdf_page}`;
        }
        return;
      }

      pane.innerHTML = `
        <div class="lego-card lego-pdf-card">
          <div class="lego-pdf-header-row">
            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
              <span class="part-badge" id="exam-pdf-page-indicator">📖 Trang gợi ý: ${q.pdf_page || 'Đề thi'}</span>
              <span class="badge-session">Cambridge A2 Key</span>
            </div>
            <div style="display:flex; gap:0.4rem; align-items:center;">
              <a href="https://drive.google.com/file/d/1OVNzYe_ZYOm9xVlfBB9nISHOuLF4_joT/view?usp=drive_open" target="_blank" rel="noopener" class="lego-btn-secondary" style="text-decoration:none; font-size:0.8rem; padding:0.3rem 0.65rem;" title="Mở file PDF trong tab mới">
                Mở tab mới ↗️
              </a>
              <button class="lego-btn-secondary" onclick="App.reloadExamPdf()" style="font-size:0.8rem; padding:0.3rem 0.65rem;" title="Tải lại PDF">
                🔄 Tải lại
              </button>
            </div>
          </div>

          <!-- Google Drive PDF Viewer Embed (SUCCEED in A2 Key 2020) -->
          <div class="lego-pdf-viewer-wrap">
            <iframe 
              id="exam-pdf-frame" 
              src="https://drive.google.com/file/d/1OVNzYe_ZYOm9xVlfBB9nISHOuLF4_joT/preview" 
              width="100%" 
              height="100%" 
              allow="autoplay"
              loading="lazy"
              title="Đề thi SUCCEED in A2 Key New 2020 Format"
            ></iframe>
          </div>
        </div>
      `;
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

        <!-- Action Buttons & Conditional 3-Attempt Gate -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-top:1.25rem;">
          <div style="display:flex; gap:0.45rem; align-items:center; flex-wrap:wrap;">
            ${isUnlocked ? `
              <button class="lego-btn-yellow" onclick="App.giveLetterHint()">
                💡 Gợi ý chữ cái đầu
              </button>
              <button class="lego-btn-orange" onclick="App.revealNextWord()">
                🔤 Mở 1 từ kế tiếp
              </button>
            ` : `
              <button class="lego-btn-locked" onclick="App.notifyHintLocked(${attempts})" title="Chỉ kích hoạt sau khi thử sai 3 lần">
                🔒 Gợi ý chữ cái (${attempts}/3)
              </button>
              <button class="lego-btn-locked" onclick="App.notifyHintLocked(${attempts})" title="Chỉ kích hoạt sau khi thử sai 3 lần">
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
            💪 Bạn đã thử ${attempts}/3 lần. Thử thêm ${3 - attempts} lần nữa để mở khóa trợ giúp (Gợi ý chữ cái & Mở từ)!
          </div>
        ` : ''}
        ${isUnlocked ? `
          <div style="margin-top:0.6rem; font-size:0.82rem; font-weight:800; color:#15803d;">
            🎉 Bạn đã thử đủ 3 lần! Nút Gợi ý chữ cái và Mở từ đã được mở khóa!
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

    // Focus input field
    const inputEl = document.getElementById(`dictation-input-${sKey}`);
    if (inputEl) {
      inputEl.focus();
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
    if (isMatch) {
      this.sentenceSolved[sKey] = true;
      // Auto move to next sentence if available
      if (this.currentSentenceIndex < sentences.length - 1) {
        setTimeout(() => {
          this.switchSentence(this.currentSentenceIndex + 1);
        }, 1200);
      }
    } else {
      this.sentenceAttempts[sKey] = (this.sentenceAttempts[sKey] || 0) + 1;
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

    inputEl.value = hints.join(' ');
    inputEl.focus();
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

    const currentWords = inputEl.value.trim().split(/\s+/);
    const targetWords = curSent.text.split(/\s+/);

    let nextIdx = 0;
    while (nextIdx < targetWords.length && nextIdx < currentWords.length && currentWords[nextIdx].toLowerCase() === targetWords[nextIdx].toLowerCase()) {
      nextIdx++;
    }

    if (nextIdx < targetWords.length) {
      currentWords[nextIdx] = targetWords[nextIdx];
      inputEl.value = currentWords.join(' ');
      inputEl.focus();
    }
  },

  notifyHintLocked(attempts) {
    const remaining = Math.max(0, 3 - attempts);
    alert(`🔒 Quyền trợ giúp đang bị khóa!\n\nBạn cần tự nghe và thử gõ thêm ${remaining} lần nữa (đã thử sai: ${attempts}/3 lần) để kích hoạt nút Gợi ý chữ cái & Mở từ nhé!\n\nHãy tập trung luyện đôi tai của mình trước nào! 💪`);
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
      window.KetTracker.logEvent('TRAP_LOGGED', {
        question_id: q.id,
        trap_selected: trapType,
        duration_sec: window.KetTracker.getQuestionDuration()
      });
    }
    this.closeTrapGateModal();
  },

  /* ==========================================================================
     Mức 3: Exam Mode Workspace (Phiếu Trả Lời 25 Câu)
     ========================================================================== */
  renderExamWorkspace(q) {
    const pane = document.getElementById('pane-right');
    if (!pane) return;

    const gridHtml = this.testData.questions.map((item, idx) => {
      const ans = this.userAnswers[item.id] || '';
      return `
        <div class="exam-question-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
            <strong style="color:var(--lego-blue);">Q${item.q_number} (Part ${item.part})</strong>
            <span style="font-size:0.8rem; font-weight:800; color:#64748b;">${item.type === 'multiple_choice' ? 'Trắc nghiệm' : 'Điền từ'}</span>
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
        <h3 style="color:var(--lego-blue); font-size:1.15rem; font-weight:800; margin-bottom:1rem;">
          Phiếu Làm Bài 25 Câu (Answer Sheet)
        </h3>
        <div class="exam-grid-container">
          ${gridHtml}
        </div>
        <div style="margin-top:1.5rem; text-align:right;">
          <button class="lego-btn-green" style="font-size:1.05rem; padding:0.75rem 1.75rem;" onclick="App.submitExamTest()">
            Nộp Bài Thi (Finish) 🚀
          </button>
        </div>
      </div>
    `;
  },

  reloadExamPdf() {
    const frame = document.getElementById('exam-pdf-frame');
    if (frame) {
      frame.src = "https://drive.google.com/file/d/1OVNzYe_ZYOm9xVlfBB9nISHOuLF4_joT/preview?t=" + Date.now();
    }
  },

  recordExamAnswer(qId, val) {
    this.userAnswers[qId] = val;
    this.renderExamWorkspace(this.testData.questions[this.currentQuestionIndex]);
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
    else grade = "Fail (Cố gắng luyện tập thêm nhé!)";

    alert(`🏁 Kết quả bài thi Test ${this.currentTestId}:\n- Điểm số: ${score} / 25\n- Đánh giá: ${grade}`);
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
