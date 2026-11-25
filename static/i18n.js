// i18n.js - Song ngữ Anh - Việt cho Succeed in A2 Key Listening Engine
window.I18N = {
  currentLang: localStorage.getItem('ket_listening_lang') || 'vi',

  dict: {
    vi: {
      app_title: "Succeed in A2 Key Listening",
      subtitle: "Luyện Kỹ Năng Nghe A2 Key Chuẩn Cambridge",
      student_profile: "Hồ sơ học sinh",
      enter_name: "Nhập Tên Học Sinh ✍️",
      mode_beginner: "Mức 1: Beginner",
      mode_beginner_desc: "Luyện tai nhạy & chép chính tả (Dictation & Cloze)",
      mode_intermediate: "Mức 2: Intermediate",
      mode_intermediate_desc: "Phá bẫy đề thi với giàn giáo Socratic (4 Tầng)",
      mode_exam: "Mức 3: Exam Mode",
      mode_exam_desc: "Làm bài thi thực chiến 100% như sách gốc",
      select_test: "Chọn Bài Thi:",
      practice_part: "Phần:",
      question: "Câu",
      of: "trên",
      play: "Phát",
      pause: "Tạm dừng",
      replay_5s: "Tua lại 5s",
      skip_5s: "Tua tới 5s",
      speed: "Tốc độ",
      loop_ab: "Lặp đoạn A-B",
      check_answer: "Kiểm tra đáp án",
      next_question: "Câu tiếp theo",
      prev_question: "Câu trước",
      submit_test: "Nộp bài thi",
      tier1_btn: "💡 Gợi ý Tầng 1: Từ khóa & Bối cảnh",
      tier2_btn: "🔍 Gợi ý Tầng 2: Vùng âm thanh & Bẫy",
      tier3_btn: "📖 Lời giải chi tiết Tầng 3",
      trap_gate_title: "⚠️ Sổ Bắt Bẫy Nghe Cambridge",
      trap_gate_desc: "Bạn vừa chọn chưa đúng. Hãy xác định bẫy đề thi mình vừa gặp trước khi tiếp tục:",
      dictation_instruction: "🎧 Hãy nghe đoạn audio ngắn dưới đây và điền từ/cụm từ còn thiếu vào ô trống:",
      reveal_hint: "Gợi ý chữ cái",
      show_transcript: "Hiện Transcript",
      hide_transcript: "Ẩn Transcript",
      correct_msg: "🎉 Chính xác! Bạn đã nghe và chọn đúng.",
      incorrect_msg: "Chưa chính xác. Hãy nghe lại với gợi ý bên dưới:",
      distinction: "Đạt Xuất Sắc (Pass with Distinction - CEFR B1)",
      merit: "Đạt Giỏi (Pass with Merit - CEFR A2)",
      pass: "Đạt (Pass - CEFR A2)",
      level_a1: "Đạt Cấp Độ A1 (Council of Europe Level A1)",
      fail: "Chưa Đạt (Thử sức lại)",
      export_excel: "Xuất Bảng Điểm Excel (.xlsx)",
      zen_mode: "Chế độ Zen (Z)",
      score: "Điểm số",
      accuracy: "Độ chính xác"
    },
    en: {
      app_title: "Succeed in A2 Key Listening",
      subtitle: "Cambridge A2 Key Listening Practice App",
      student_profile: "Student Profile",
      enter_name: "Enter Student Name ✍️",
      mode_beginner: "Tier 1: Beginner",
      mode_beginner_desc: "Ear training, Dictation & Cloze Gap-Fill",
      mode_intermediate: "Tier 2: Intermediate",
      mode_intermediate_desc: "Deconstruct traps with 4-Tier Socratic hints",
      mode_exam: "Tier 3: Exam Mode",
      mode_exam_desc: "Full Real Exam Simulation (Like Book)",
      select_test: "Select Practice Test:",
      practice_part: "Part:",
      question: "Question",
      of: "of",
      play: "Play",
      pause: "Pause",
      replay_5s: "Replay 5s",
      skip_5s: "Forward 5s",
      speed: "Speed",
      loop_ab: "A-B Looping",
      check_answer: "Check Answer",
      next_question: "Next Question",
      prev_question: "Previous Question",
      submit_test: "Submit Test",
      tier1_btn: "💡 Tier 1 Hint: Keywords & Focus",
      tier2_btn: "🔍 Tier 2 Hint: Distractor Breakdown",
      tier3_btn: "📖 Tier 3 Detailed Solution",
      trap_gate_title: "⚠️ Listening Trap Gate",
      trap_gate_desc: "That wasn't quite right. Classify the trap you encountered before proceeding:",
      dictation_instruction: "🎧 Listen to the snippet and fill in the missing words:",
      reveal_hint: "Reveal Letter",
      show_transcript: "Show Transcript",
      hide_transcript: "Hide Transcript",
      correct_msg: "🎉 Correct! Great listening skill.",
      incorrect_msg: "Not quite. Replay the segment with the hint below:",
      distinction: "Pass with Distinction (CEFR B1)",
      merit: "Pass with Merit (CEFR A2)",
      pass: "Pass (CEFR A2)",
      level_a1: "Level A1",
      fail: "Fail (Try Again)",
      export_excel: "Export Excel Report (.xlsx)",
      zen_mode: "Zen Mode (Z)",
      score: "Score",
      accuracy: "Accuracy"
    }
  },

  t(key) {
    const lang = this.currentLang;
    return (this.dict[lang] && this.dict[lang][key]) || (this.dict['vi'][key]) || key;
  },

  setLang(lang) {
    this.currentLang = lang;
    localStorage.setItem('ket_listening_lang', lang);
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      if (k) el.textContent = this.t(k);
    });
  }
};
