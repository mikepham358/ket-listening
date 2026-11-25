// dictionary.js — Module Từ Điển Lego Anh - Việt & Việt - Anh tích hợp Thesaurus Anh - Anh
// Dành riêng cho học sinh 10-12 tuổi ôn luyện KET / A2 Key
// Tính năng:
// 1. Tra cứu song ngữ Anh - Việt và Việt - Anh với tự động nhận diện ngôn ngữ
// 2. Tích hợp Thesaurus Anh - Anh: Từ đồng nghĩa (Synonyms) & Từ trái nghĩa (Antonyms) dạng Lego Brick Pills
// 3. Click bất kỳ từ đồng nghĩa/trái nghĩa/từ tương đương nào để lập tức tra cứu từ đó
// 4. Phiên âm IPA chuẩn quốc tế + Phát âm giọng Anh (UK) & Mỹ (US) tốc độ phù hợp lứa tuổi (0.85x)
// 5. Câu ví dụ minh họa trực quan, thực tế cấp độ Cambridge KET

window.KetDictionary = {
  currentWordData: null,
  searchMode: 'auto', // 'auto' | 'en-vi' | 'vi-en'
  cache: {},

  init() {
    this.createModal();
    this.attachGlobalListeners();
  },

  createModal() {
    if (document.getElementById('lego-dict-modal')) return;

    const modalHtml = `
      <div id="lego-dict-modal" class="lego-modal-overlay" style="display:none;" onclick="KetDictionary.handleOverlayClick(event)">
        <div class="lego-modal-card lego-dict-card" onclick="event.stopPropagation()">
          <!-- Lego Studs Header -->
          <div class="lego-modal-header">
            <div class="lego-studs-bar">
              <span class="lego-stud red"></span>
              <span class="lego-stud yellow"></span>
              <span class="lego-stud green"></span>
              <span class="lego-stud blue"></span>
            </div>

            <div class="lego-modal-title-row">
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span style="font-size: 1.35rem;">📚</span>
                <span style="font-size: 1.25rem; font-weight:800; color:var(--lego-blue);">Từ Điển Lego & Thesaurus</span>
              </div>
              <button class="lego-close-btn" onclick="KetDictionary.closeModal()" title="Đóng (Phím Esc)">✕</button>
            </div>

            <!-- Mode Selector Tabs -->
            <div class="lego-dict-mode-tabs">
              <button id="lego-mode-auto" class="lego-dict-mode-btn active" onclick="KetDictionary.setSearchMode('auto')">
                ⚡ Tự động (Auto)
              </button>
              <button id="lego-mode-envi" class="lego-dict-mode-btn" onclick="KetDictionary.setSearchMode('en-vi')">
                🇬🇧 ➔ 🇻🇳 Anh - Việt
              </button>
              <button id="lego-mode-vien" class="lego-dict-mode-btn" onclick="KetDictionary.setSearchMode('vi-en')">
                🇻🇳 ➔ 🇬🇧 Việt - Anh
              </button>
            </div>

            <!-- Search Bar Row -->
            <div class="lego-search-box-row">
              <div class="lego-search-input-wrap">
                <input type="text" id="lego-dict-search-input" placeholder="🔍 Gõ từ tiếng Anh hoặc tiếng Việt..." autocomplete="off" />
                <button id="lego-dict-clear-btn" class="lego-dict-clear-btn" onclick="KetDictionary.clearInput()" style="display:none;">✕</button>
              </div>
              <button class="lego-btn-yellow" onclick="KetDictionary.searchFromInput()">Tra từ 🚀</button>
            </div>

            <!-- KET Quick Recommendation Chips -->
            <div class="lego-chip-row">
              <span style="font-size:0.75rem; font-weight:800; color:#64748b; align-self:center;">Gợi ý KET:</span>
              <button class="lego-chip" onclick="KetDictionary.openModal('airport')">airport</button>
              <button class="lego-chip" onclick="KetDictionary.openModal('meal')">meal</button>
              <button class="lego-chip" onclick="KetDictionary.openModal('flight')">flight</button>
              <button class="lego-chip" onclick="KetDictionary.openModal('happy')">happy</button>
              <button class="lego-chip" onclick="KetDictionary.openModal('fast')">fast</button>
              <button class="lego-chip" onclick="KetDictionary.openModal('sân bay')">sân bay</button>
              <button class="lego-chip" onclick="KetDictionary.openModal('bữa ăn')">bữa ăn</button>
              <button class="lego-chip" onclick="KetDictionary.openModal('chuyến bay')">chuyến bay</button>
            </div>
          </div>

          <!-- Dictionary Body Content -->
          <div id="lego-dict-body" class="lego-modal-body">
            <!-- Default Welcome State -->
            <div class="lego-dict-welcome-box">
              <div style="font-size:2.8rem; margin-bottom:0.5rem;">🧩</div>
              <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-primary); margin-bottom:0.4rem;">
                Chào mừng bạn đến với Từ Điển & Thesaurus Lego!
              </h3>
              <p style="font-size:0.9rem; color:#64748b; max-width:440px; margin:0 auto 1rem auto; line-height:1.5;">
                Gõ từ tiếng Anh hoặc tiếng Việt vào ô tìm kiếm, hoặc <strong>nhấp đúp chuột (double-click)</strong> vào bất kỳ từ nào trên trang để tra ngay nhé!
              </p>
              <div class="lego-thesaurus-features-summary">
                <div class="lego-feat-item">🔊 <strong>Phát âm UK / US:</strong> Nghe giọng chuẩn bản xứ</div>
                <div class="lego-feat-item">🟢 <strong>Thesaurus:</strong> Khám phá Từ đồng nghĩa & Trái nghĩa</div>
                <div class="lego-feat-item">🔄 <strong>Tra chéo 2 chiều:</strong> Anh - Việt ⇄ Việt - Anh</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Enter key inside search box
    const searchInput = document.getElementById('lego-dict-search-input');
    const clearBtn = document.getElementById('lego-dict-clear-btn');

    searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.searchFromInput();
      }
    });

    searchInput?.addEventListener('input', (e) => {
      if (clearBtn) {
        clearBtn.style.display = searchInput.value ? 'inline-flex' : 'none';
      }
    });
  },

  attachGlobalListeners() {
    // Double click to look up word anywhere on page
    document.addEventListener('dblclick', (e) => {
      // Don't trigger if double clicking inside input or buttons
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('#lego-dict-modal')) {
        return;
      }
      const selection = window.getSelection().toString().trim();
      // Clean word preserving accents and basic letters
      const cleanWord = selection.replace(/[.,!?;:()[\]{}"'\n\r\t]/g, '').trim();
      if (cleanWord && cleanWord.length >= 2 && cleanWord.length <= 40) {
        this.openModal(cleanWord);
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
  },

  handleOverlayClick(e) {
    if (e.target.id === 'lego-dict-modal') {
      this.closeModal();
    }
  },

  clearInput() {
    const input = document.getElementById('lego-dict-search-input');
    const clearBtn = document.getElementById('lego-dict-clear-btn');
    if (input) {
      input.value = '';
      input.focus();
    }
    if (clearBtn) clearBtn.style.display = 'none';
  },

  setSearchMode(mode) {
    this.searchMode = mode;
    const autoBtn = document.getElementById('lego-mode-auto');
    const enviBtn = document.getElementById('lego-mode-envi');
    const vienBtn = document.getElementById('lego-mode-vien');
    const input = document.getElementById('lego-dict-search-input');

    if (autoBtn) autoBtn.classList.toggle('active', mode === 'auto');
    if (enviBtn) enviBtn.classList.toggle('active', mode === 'en-vi');
    if (vienBtn) vienBtn.classList.toggle('active', mode === 'vi-en');

    if (input) {
      if (mode === 'en-vi') {
        input.placeholder = '🔍 Gõ từ tiếng Anh (vd: airport, quick, meal)...';
      } else if (mode === 'vi-en') {
        input.placeholder = '🔍 Gõ từ tiếng Việt (vd: sân bay, thức ăn, vui vẻ)...';
      } else {
        input.placeholder = '🔍 Gõ từ tiếng Anh hoặc tiếng Việt...';
      }
      input.focus();
    }
  },

  searchFromInput() {
    const input = document.getElementById('lego-dict-search-input');
    if (!input) return;
    const query = input.value.trim().replace(/[.,!?;:()[\]{}"']/g, '').trim();
    if (query) {
      this.openModal(query);
    }
  },

  async openModal(query = '', forcedMode = null) {
    const modal = document.getElementById('lego-dict-modal');
    const body = document.getElementById('lego-dict-body');
    const input = document.getElementById('lego-dict-search-input');
    const clearBtn = document.getElementById('lego-dict-clear-btn');
    if (!modal || !body) return;

    modal.style.display = 'flex';

    if (!query) {
      if (input) {
        input.focus();
        if (input.value) input.select();
      }
      return;
    }

    if (input) {
      input.value = query;
      if (clearBtn) clearBtn.style.display = 'inline-flex';
    }

    // Determine direction: Vietnamese -> English OR English -> Vietnamese
    let direction = 'en-vi';
    if (forcedMode) {
      direction = forcedMode;
    } else if (this.searchMode === 'vi-en') {
      direction = 'vi-en';
    } else if (this.searchMode === 'en-vi') {
      direction = 'en-vi';
    } else {
      // Auto-detect: check Vietnamese diacritics
      const viPattern = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
      direction = viPattern.test(query) ? 'vi-en' : 'en-vi';
    }

    // Loading State
    body.innerHTML = `
      <div style="text-align:center; padding: 3.5rem 1rem;">
        <div class="lego-loading-spinner"></div>
        <p style="margin-top:1rem; font-weight:700; color:var(--lego-blue); font-size:1.05rem;">
          Đang tra cứu ${direction === 'vi-en' ? 'Việt - Anh' : 'Anh - Việt'} cho "${query}"...
        </p>
        <p style="font-size:0.82rem; color:#94a3b8; margin-top:0.35rem;">
          Đang tải phiên âm IPA, audio và từ đồng nghĩa Thesaurus...
        </p>
      </div>
    `;

    try {
      if (direction === 'vi-en') {
        const viData = await this.fetchViToEnData(query);
        this.renderViToEnData(viData);
      } else {
        const enData = await this.fetchEnWordData(query.toLowerCase());
        this.renderEnWordData(enData);
      }
    } catch (err) {
      console.error('Dictionary search error:', err);
      body.innerHTML = `
        <div style="text-align:center; padding: 2.5rem 1rem; color: #ef4444;">
          <span style="font-size:2.4rem;">😿</span>
          <p style="margin-top:0.75rem; font-weight:800; font-size:1.1rem;">Chưa tìm thấy từ "${query}"</p>
          <p style="font-size:0.88rem; color:#64748b; margin-top:0.35rem;">
            Bạn thử kiểm tra lại chính tả hoặc chuyển chế độ Anh - Việt / Việt - Anh ở trên nhé!
          </p>
          <div style="margin-top:1rem;">
            <button class="lego-btn-yellow" onclick="KetDictionary.clearInput()">Thử lại 🔄</button>
          </div>
        </div>
      `;
    }
  },

  closeModal() {
    const modal = document.getElementById('lego-dict-modal');
    if (modal) modal.style.display = 'none';
  },

  // 1. Fetch Vietnamese to English Data
  async fetchViToEnData(viQuery) {
    const cacheKey = 'vi_' + viQuery.toLowerCase();
    if (this.cache[cacheKey]) return this.cache[cacheKey];

    const viUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=en&dt=t&dt=bd&q=${encodeURIComponent(viQuery)}`;
    const res = await fetch(viUrl);
    if (!res.ok) throw new Error('Failed to translate Vietnamese');

    const json = await res.json();
    const primaryEn = (json[0]?.[0]?.[0] || '').trim().toLowerCase();
    if (!primaryEn) throw new Error('No English translation found');

    const alternatives = [];
    if (json[1] && Array.isArray(json[1])) {
      json[1].forEach(posItem => {
        const words = posItem[1];
        if (Array.isArray(words)) {
          words.forEach(w => {
            const cleanW = w.trim().toLowerCase();
            if (cleanW !== primaryEn && !alternatives.includes(cleanW) && cleanW.length > 1) {
              alternatives.push(cleanW);
            }
          });
        }
      });
    }

    // Now chain-fetch the complete English profile for primaryEn!
    const enData = await this.fetchEnWordData(primaryEn);

    const result = {
      isViSearch: true,
      viQuery,
      primaryEn,
      alternatives: alternatives.slice(0, 6),
      enData
    };

    this.cache[cacheKey] = result;
    return result;
  },

  // 2. Fetch Full English Word Profile (FreeDict + GoogleTranslate + Datamuse Thesaurus)
  async fetchEnWordData(word) {
    const cacheKey = 'en_' + word.toLowerCase();
    if (this.cache[cacheKey]) return this.cache[cacheKey];

    // Concurrently fetch FreeDict, GoogleTranslate rich features, and Datamuse Synonyms & Antonyms
    const [freeDictRes, gTranslateRes, synRes, antRes] = await Promise.allSettled([
      fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`).then(r => r.ok ? r.json() : null),
      fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&dt=bd&dt=ss&dt=md&dt=ex&q=${encodeURIComponent(word)}`).then(r => r.ok ? r.json() : null),
      fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=10`).then(r => r.ok ? r.json() : []),
      fetch(`https://api.datamuse.com/words?rel_ant=${encodeURIComponent(word)}&max=10`).then(r => r.ok ? r.json() : [])
    ]);

    let ipa = '';
    let ukAudio = '';
    let usAudio = '';
    let partOfSpeech = '';
    let enDefinitions = [];
    let enExamples = [];
    const freeSynonyms = [];
    const freeAntonyms = [];

    // Process FreeDictionaryAPI
    if (freeDictRes.status === 'fulfilled' && Array.isArray(freeDictRes.value) && freeDictRes.value.length > 0) {
      const entry = freeDictRes.value[0];
      ipa = entry.phonetic || '';

      if (entry.phonetics && Array.isArray(entry.phonetics)) {
        entry.phonetics.forEach(p => {
          if (!ipa && p.text) ipa = p.text;
          if (p.audio) {
            if (p.audio.includes('-uk') || p.audio.includes('uk.')) ukAudio = p.audio;
            else if (p.audio.includes('-us') || p.audio.includes('us.')) usAudio = p.audio;
            else if (!usAudio) usAudio = p.audio;
          }
        });
      }

      if (entry.meanings && Array.isArray(entry.meanings)) {
        entry.meanings.forEach(m => {
          if (!partOfSpeech && m.partOfSpeech) partOfSpeech = m.partOfSpeech;
          (m.synonyms || []).forEach(s => freeSynonyms.push(s.toLowerCase()));
          (m.antonyms || []).forEach(a => freeAntonyms.push(a.toLowerCase()));

          (m.definitions || []).forEach(d => {
            if (d.definition && enDefinitions.length < 2) {
              enDefinitions.push(d.definition);
            }
            if (d.example && enExamples.length < 2) {
              enExamples.push(d.example);
            }
            (d.synonyms || []).forEach(s => freeSynonyms.push(s.toLowerCase()));
            (d.antonyms || []).forEach(a => freeAntonyms.push(a.toLowerCase()));
          });
        });
      }
    }

    // Process Google Translate for Vietnamese meanings, Oxford synonyms, definitions, examples
    let viMeanings = [];
    const googleSynonyms = [];
    if (gTranslateRes.status === 'fulfilled' && gTranslateRes.value) {
      const gVal = gTranslateRes.value;

      // Direct meaning
      if (gVal[0]?.[0]?.[0]) {
        viMeanings.push(gVal[0][0][0]);
      }

      // POS breakdowns in Vietnamese
      if (gVal[1] && Array.isArray(gVal[1])) {
        gVal[1].forEach(item => {
          if (!partOfSpeech && item[0]) partOfSpeech = item[0];
          if (item[1] && Array.isArray(item[1])) {
            item[1].slice(0, 3).forEach(t => {
              if (!viMeanings.includes(t)) viMeanings.push(t);
            });
          }
        });
      }

      // Synonyms from Oxford via Google Translate (index 11)
      if (gVal[11] && Array.isArray(gVal[11])) {
        gVal[11].forEach(group => {
          if (group[1] && Array.isArray(group[1])) {
            group[1].forEach(sg => {
              if (Array.isArray(sg[0])) {
                sg[0].forEach(w => {
                  if (typeof w === 'string') googleSynonyms.push(w.toLowerCase());
                });
              }
            });
          }
        });
      }

      // English definitions from Google Translate (index 12)
      if (gVal[12] && Array.isArray(gVal[12]) && enDefinitions.length === 0) {
        gVal[12].forEach(group => {
          if (group[1] && Array.isArray(group[1])) {
            group[1].forEach(d => {
              if (d[0] && enDefinitions.length < 2) enDefinitions.push(d[0]);
            });
          }
        });
      }

      // Example sentence from Google Translate (index 13)
      if (gVal[13] && Array.isArray(gVal[13]) && enExamples.length === 0) {
        gVal[13].forEach(exItem => {
          if (exItem[0] && typeof exItem[0] === 'string' && enExamples.length < 2) {
            const cleanEx = exItem[0].replace(/<[^>]*>/g, '');
            enExamples.push(cleanEx);
          }
        });
      }
    }

    // Merge & Dedup Synonyms (Oxford + Datamuse + FreeDict)
    const synSet = new Set(googleSynonyms);
    if (synRes.status === 'fulfilled' && Array.isArray(synRes.value)) {
      synRes.value.forEach(x => {
        if (x.word) synSet.add(x.word.toLowerCase());
      });
    }
    freeSynonyms.forEach(s => synSet.add(s));
    synSet.delete(word.toLowerCase());

    // Clean synonyms: keep words with reasonable length and no strange symbols
    const finalSynonyms = Array.from(synSet)
      .filter(w => w.length >= 2 && w.length <= 18 && !w.includes('/') && !w.includes('('))
      .slice(0, 8);

    // Merge & Dedup Antonyms (Datamuse + FreeDict)
    const antSet = new Set();
    if (antRes.status === 'fulfilled' && Array.isArray(antRes.value)) {
      antRes.value.forEach(x => {
        if (x.word) antSet.add(x.word.toLowerCase());
      });
    }
    freeAntonyms.forEach(a => antSet.add(a));
    antSet.delete(word.toLowerCase());

    const finalAntonyms = Array.from(antSet)
      .filter(w => w.length >= 2 && w.length <= 18 && !w.includes('/') && !w.includes('('))
      .slice(0, 8);

    // Kid-friendly example fallback if none found
    if (enExamples.length === 0) {
      if (word === 'airport') enExamples = ["What time shall we drive to the airport?"];
      else if (word === 'meal') enExamples = ["We had a delicious meal at the restaurant."];
      else if (word === 'plane' || word === 'flight') enExamples = ["The plane leaves at one o'clock."];
      else if (word === 'fast' || word === 'quick') enExamples = ["Cheetahs can run very fast."];
      else if (word === 'happy') enExamples = ["She was very happy to see her best friend."];
      else enExamples = [`This is an example sentence with the word "${word}".`];
    }

    const result = {
      word,
      ipa: ipa || '/.../',
      partOfSpeech: partOfSpeech ? partOfSpeech.toLowerCase() : '',
      ukAudio,
      usAudio,
      viMeanings: viMeanings.length > 0 ? viMeanings : ['Chưa có bản dịch'],
      synonyms: finalSynonyms,
      antonyms: finalAntonyms,
      enDefinitions: enDefinitions.slice(0, 2),
      enExamples: enExamples.slice(0, 2)
    };

    this.cache[cacheKey] = result;
    return result;
  },

  // 3. Render Vietnamese to English Search View
  renderViToEnData(viData) {
    const bannerHtml = `
      <div class="lego-vi-banner">
        <div class="lego-vi-banner-title">
          🇻🇳 Tiếng Việt: <strong>"${viData.viQuery}"</strong> ➔ 🇬🇧 Tiếng Anh: <span style="color:#0055bf; font-size:1.15rem; font-weight:900;">${viData.primaryEn}</span>
        </div>
        ${viData.alternatives.length > 0 ? `
          <div class="lego-vi-alts">
            <span style="font-size:0.8rem; font-weight:700; color:#475569;">🔤 Các từ tương đương khác:</span>
            ${viData.alternatives.map(alt => `
              <button class="lego-thesaurus-pill alt" onclick="KetDictionary.openModal('${alt}', 'en-vi')" title="Tra từ '${alt}'">
                🔹 ${alt}
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    this.renderEnWordData(viData.enData, bannerHtml);
  },

  // 4. Render English Word Card + Thesaurus
  renderEnWordData(data, viBannerHtml = '') {
    const body = document.getElementById('lego-dict-body');
    if (!body) return;

    this.currentWordData = data;

    // Vietnamese Meaning Tags
    const meaningsHtml = data.viMeanings.map(m => `
      <span class="lego-tag-meaning">⭐ ${m}</span>
    `).join(' ');

    // Thesaurus Grid (Synonyms & Antonyms)
    let thesaurusHtml = '';
    const hasSyns = data.synonyms && data.synonyms.length > 0;
    const hasAnts = data.antonyms && data.antonyms.length > 0;

    if (hasSyns || hasAnts) {
      thesaurusHtml = `
        <div class="lego-dict-section">
          <div class="lego-dict-section-title" style="color:#0f766e;">
            📚 Thesaurus Anh - Anh (Kho Từ Đồng Nghĩa & Trái Nghĩa)
          </div>
          <div class="lego-thesaurus-grid">
            <!-- Synonyms Box -->
            <div class="lego-thesaurus-box syn-box">
              <div class="lego-thesaurus-col-header" style="color:#15803d;">
                <span>🟢 Từ đồng nghĩa (Synonyms)</span>
                <span class="lego-badge-count">${data.synonyms.length}</span>
              </div>
              <div class="lego-thesaurus-pills">
                ${hasSyns ? data.synonyms.map(s => `
                  <button class="lego-thesaurus-pill syn" onclick="KetDictionary.openModal('${s}', 'en-vi')" title="Tra từ '${s}'">
                    🔗 ${s}
                  </button>
                `).join('') : '<span style="font-size:0.82rem; color:#94a3b8; font-style:italic;">Chưa có từ đồng nghĩa phổ biến</span>'}
              </div>
            </div>

            <!-- Antonyms Box -->
            <div class="lego-thesaurus-box ant-box">
              <div class="lego-thesaurus-col-header" style="color:#b91c1c;">
                <span>🔴 Từ trái nghĩa (Antonyms)</span>
                <span class="lego-badge-count">${data.antonyms.length}</span>
              </div>
              <div class="lego-thesaurus-pills">
                ${hasAnts ? data.antonyms.map(a => `
                  <button class="lego-thesaurus-pill ant" onclick="KetDictionary.openModal('${a}', 'en-vi')" title="Tra từ '${a}'">
                    ⚡ ${a}
                  </button>
                `).join('') : '<span style="font-size:0.82rem; color:#94a3b8; font-style:italic;">Chưa có từ trái nghĩa phổ biến</span>'}
              </div>
            </div>
          </div>
          <p class="lego-thesaurus-tip">💡 Mẹo Lego: Nhấp vào bất kỳ từ nào ở trên để mở ngay từ điển cho từ đó!</p>
        </div>
      `;
    }

    // Example Sentences
    let examplesHtml = '';
    if (data.enExamples && data.enExamples.length > 0) {
      examplesHtml = `
        <div class="lego-dict-section">
          <div class="lego-dict-section-title">💬 Câu ví dụ minh họa:</div>
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            ${data.enExamples.map(ex => `
              <div class="lego-example-box">
                <span style="color:#0055bf; font-weight:800; font-size:1.1rem; margin-right:0.25rem;">“</span>${ex}<span style="color:#0055bf; font-weight:800; font-size:1.1rem; margin-left:0.25rem;">”</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // English Definition (if available)
    let defHtml = '';
    if (data.enDefinitions && data.enDefinitions.length > 0) {
      defHtml = `
        <div class="lego-dict-section" style="margin-top:1rem;">
          <div class="lego-dict-section-title">📖 Định nghĩa tiếng Anh:</div>
          <div style="font-size:0.9rem; color:#334155; line-height:1.45; background:#f1f5f9; padding:0.6rem 0.85rem; border-radius:8px; border-left:3px solid #64748b;">
            ${data.enDefinitions[0]}
          </div>
        </div>
      `;
    }

    body.innerHTML = `
      ${viBannerHtml}

      <div class="lego-word-header-card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;">
          <div>
            <div style="display:flex; align-items:baseline; gap:0.5rem; flex-wrap:wrap;">
              <h2 class="lego-word-title">${data.word}</h2>
              ${data.partOfSpeech ? `<span class="lego-pos-badge">[${data.partOfSpeech}]</span>` : ''}
            </div>
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

        <!-- Vietnamese Meanings -->
        <div style="margin-top: 1rem;">
          <div class="lego-dict-section-title">🇻🇳 Nghĩa Tiếng Việt:</div>
          <div style="display:flex; flex-wrap:wrap; gap:0.4rem; margin-top:0.35rem;">
            ${meaningsHtml}
          </div>
        </div>

        ${thesaurusHtml}
        ${examplesHtml}
        ${defHtml}
      </div>
    `;
  },

  // 5. Native High-Quality Pronunciation via SpeechSynthesis
  speak(accent = 'us') {
    if (!this.currentWordData) return;
    const word = this.currentWordData.word;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
      utterance.rate = 0.85; // Kid-friendly tempo for A2 Key students
      const voices = window.speechSynthesis.getVoices();
      const targetLang = accent === 'uk' ? 'en-GB' : 'en-US';
      const voice = voices.find(v => v.lang === targetLang) || voices.find(v => v.lang.startsWith(targetLang.slice(0, 2)));
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    }
  }
};

window.addEventListener('DOMContentLoaded', () => {
  window.KetDictionary.init();
});
