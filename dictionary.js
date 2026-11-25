// dictionary.js — Từ điển Anh - Việt thông minh phong cách Lego cho học sinh 10-12 tuổi
// Tích hợp: Phiên âm IPA, Audio phát âm giọng Anh / Mỹ, Dịch nghĩa tiếng Việt & Câu ví dụ thực tế

window.KetDictionary = {
  currentWordData: null,
  cache: {},

  init() {
    this.createModal();
    this.attachGlobalListeners();
  },

  createModal() {
    if (document.getElementById('lego-dict-modal')) return;

    const modalHtml = `
      <div id="lego-dict-modal" class="lego-modal-overlay" style="display:none;">
        <div class="lego-modal-card">
          <!-- Lego Header with Toy Brick Studs -->
          <div class="lego-modal-header">
            <div class="lego-studs-bar">
              <span class="lego-stud red"></span>
              <span class="lego-stud yellow"></span>
              <span class="lego-stud green"></span>
              <span class="lego-stud blue"></span>
            </div>
            <div class="lego-modal-title-row">
              <span style="font-size: 1.4rem;">📚 Từ Điển Lego Anh - Việt</span>
              <button class="lego-close-btn" onclick="KetDictionary.closeModal()">✕</button>
            </div>
            <div class="lego-search-box-row">
              <input type="text" id="lego-dict-search-input" placeholder="🔍 Gõ từ tiếng Anh cần tra..." />
              <button class="lego-btn-yellow" onclick="KetDictionary.searchFromInput()">Tra từ 🚀</button>
            </div>
          </div>

          <!-- Dictionary Body Content -->
          <div id="lego-dict-body" class="lego-modal-body">
            <div style="text-align:center; padding: 2rem; color: #64748b;">
              <span style="font-size:2.5rem;">🧸</span>
              <p style="margin-top:0.5rem; font-weight:600;">Hãy gõ một từ hoặc nhấp đúp (double-click) vào bất kỳ từ nào để tra ngay!</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Enter key inside search box
    document.getElementById('lego-dict-search-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.searchFromInput();
      }
    });
  },

  attachGlobalListeners() {
    // Double click to look up word anywhere on page
    document.addEventListener('dblclick', (e) => {
      const selection = window.getSelection().toString().trim();
      const cleanWord = selection.replace(/[^a-zA-Z]/g, '');
      if (cleanWord && cleanWord.length >= 2) {
        this.openModal(cleanWord);
      }
    });
  },

  searchFromInput() {
    const input = document.getElementById('lego-dict-search-input');
    if (!input) return;
    const word = input.value.trim().replace(/[^a-zA-Z\s]/g, '');
    if (word) {
      this.openModal(word);
    }
  },

  async openModal(word) {
    const modal = document.getElementById('lego-dict-modal');
    const body = document.getElementById('lego-dict-body');
    const input = document.getElementById('lego-dict-search-input');
    if (!modal || !body) return;

    modal.style.display = 'flex';
    if (input) input.value = word;

    // Loading State
    body.innerHTML = `
      <div style="text-align:center; padding: 3rem 1rem;">
        <div class="lego-loading-spinner"></div>
        <p style="margin-top:1rem; font-weight:600; color:#2563eb;">Đang tra cứu từ "${word}"...</p>
      </div>
    `;

    try {
      const data = await this.fetchWordData(word.toLowerCase());
      this.renderWordData(data);
    } catch (err) {
      body.innerHTML = `
        <div style="text-align:center; padding: 2rem; color: #ef4444;">
          <span style="font-size:2rem;">😿</span>
          <p style="margin-top:0.5rem; font-weight:700;">Chưa tìm thấy từ "${word}"</p>
          <p style="font-size:0.85rem; color:#64748b;">Bạn kiểm tra lại chính tả hoặc thử tìm dạng nguyên mẫu của từ xem sao nhé!</p>
        </div>
      `;
    }
  },

  closeModal() {
    const modal = document.getElementById('lego-dict-modal');
    if (modal) modal.style.display = 'none';
  },

  async fetchWordData(word) {
    if (this.cache[word]) return this.cache[word];

    let ipa = '';
    let ukAudio = '';
    let usAudio = '';
    let enDefinitions = [];
    let enExamples = [];

    // 1. Fetch from Free Dictionary API (IPA + Native Audio)
    try {
      const freeDictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      if (freeDictRes.ok) {
        const dictJson = await freeDictRes.json();
        if (Array.isArray(dictJson) && dictJson.length > 0) {
          const entry = dictJson[0];
          ipa = entry.phonetic || '';

          if (entry.phonetics && entry.phonetics.length > 0) {
            entry.phonetics.forEach(p => {
              if (!ipa && p.text) ipa = p.text;
              if (p.audio) {
                if (p.audio.includes('-uk') || p.audio.includes('uk')) ukAudio = p.audio;
                else if (p.audio.includes('-us') || p.audio.includes('us')) usAudio = p.audio;
                else if (!usAudio) usAudio = p.audio;
              }
            });
          }

          if (entry.meanings) {
            entry.meanings.forEach(m => {
              m.definitions?.forEach(d => {
                if (d.definition && enDefinitions.length < 3) enDefinitions.push({ pos: m.partOfSpeech, def: d.definition });
                if (d.example && enExamples.length < 2) enExamples.push(d.example);
              });
            });
          }
        }
      }
    } catch (e) {
      console.warn('FreeDict API fallback', e);
    }

    // 2. Fetch Vietnamese meaning via Google Dict client
    let viMeanings = [];
    let viWordType = '';
    try {
      const viRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&dt=bd&q=${encodeURIComponent(word)}`);
      if (viRes.ok) {
        const viJson = await viRes.json();
        // viJson[0][0][0] is direct translation
        if (viJson[0] && viJson[0][0] && viJson[0][0][0]) {
          viMeanings.push(viJson[0][0][0]);
        }
        // viJson[1] is parts of speech breakdown
        if (viJson[1] && Array.isArray(viJson[1])) {
          viJson[1].forEach(item => {
            const pos = item[0];
            const terms = item[1];
            if (terms && Array.isArray(terms)) {
              terms.slice(0, 3).forEach(t => {
                if (!viMeanings.includes(t)) viMeanings.push(t);
              });
            }
          });
        }
      }
    } catch (e) {
      console.warn('Vietnamese translation API fallback', e);
    }

    const result = {
      word,
      ipa: ipa || '/.../',
      ukAudio,
      usAudio,
      viMeanings: viMeanings.length > 0 ? viMeanings : ['Chưa có bản dịch'],
      enDefinitions,
      enExamples
    };

    this.cache[word] = result;
    return result;
  },

  renderWordData(data) {
    const body = document.getElementById('lego-dict-body');
    if (!body) return;

    this.currentWordData = data;

    const meaningsHtml = data.viMeanings.map(m => `
      <span class="lego-tag-meaning">⭐ ${m}</span>
    `).join(' ');

    let examplesHtml = '';
    if (data.enExamples.length > 0) {
      examplesHtml = `
        <div class="lego-dict-section">
          <div class="lego-dict-section-title">💬 Ví dụ minh họa:</div>
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            ${data.enExamples.map(ex => `
              <div class="lego-example-box">
                <span style="color:#1d4ed8; font-weight:600;">“</span>${ex}<span style="color:#1d4ed8; font-weight:600;">”</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    body.innerHTML = `
      <div class="lego-word-header-card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div>
            <h2 class="lego-word-title">${data.word}</h2>
            <span class="lego-ipa-badge">${data.ipa}</span>
          </div>

          <!-- Dual Pronunciation Audio Buttons -->
          <div style="display:flex; gap:0.5rem;">
            <button class="lego-btn-audio uk" onclick="KetDictionary.speak('uk')" title="Phát âm giọng Anh (UK)">
              🇬🇧 UK Audio
            </button>
            <button class="lego-btn-audio us" onclick="KetDictionary.speak('us')" title="Phát âm giọng Mỹ (US)">
              🇺🇸 US Audio
            </button>
          </div>
        </div>

        <div style="margin-top: 1rem;">
          <div class="lego-dict-section-title">🇻🇳 Nghĩa Tiếng Việt:</div>
          <div style="display:flex; flex-wrap:wrap; gap:0.4rem; margin-top:0.35rem;">
            ${meaningsHtml}
          </div>
        </div>

        ${examplesHtml}
      </div>
    `;
  },

  speak(accent = 'us') {
    if (!this.currentWordData) return;
    const word = this.currentWordData.word;
    const audioUrl = accent === 'uk' ? this.currentWordData.ukAudio : this.currentWordData.usAudio;

    // If human MP3 audio URL exists, play it
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(e => {
        this.fallbackSpeechSynthesis(word, accent);
      });
    } else {
      // Native SpeechSynthesis fallback
      this.fallbackSpeechSynthesis(word, accent);
    }
  },

  fallbackSpeechSynthesis(word, accent) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }
};

window.addEventListener('DOMContentLoaded', () => {
  window.KetDictionary.init();
});
