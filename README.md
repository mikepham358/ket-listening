# 🎧 KET Listening Engine — Succeed in A2 Key (8 Practice Tests)

Ứng dụng luyện thi kỹ năng nghe **Cambridge English: A2 Key (KET)** với 8 đề thi thực hành từ giáo trình *Succeed in A2 Key New 2020 Format*.

## 🌟 Tính Năng Nổi Bật

Chắt lọc từ triết lý kiến trúc ứng dụng **Vinschool Digital SAT Bluebook App Engine**:
- **Zero-Build, Static-First**: Chạy trực tiếp 100% trên GitHub Pages, không phát sinh chi phí máy chủ.
- **3 Cấp Độ Sư Phạm (3-Tier Listening)**:
  1. **Beginner**: Luyện tai nhạy & chép chính tả (Dictation & Cloze Gap-Fill).
  2. **Intermediate**: Phá bẫy đề thi với giàn giáo Socratic 4 tầng & Sổ bắt bẫy Cambridge.
  3. **Exam Mode**: Làm bài thực chiến 100% như sách gốc với Split-Screen & Answer Sheet.
- **Audio Cắt Sẵn 40 Parts**: Toàn bộ file audio 3 giờ đã được cắt nhỏ thành từng Part độc lập với chất lượng cao.
- **Stopwatch Từng Câu**: Đo lường tốc độ phản xạ và thời gian dừng lại ở từng câu hỏi.

## 🚀 Truy Cập Trực Tuyến

👉 **[https://mikepham358.github.io/ket-listening/](https://mikepham358.github.io/ket-listening/)**

## 📂 Cấu Trúc Thư Mục

```text
ket-listening/
├── index.html            # Giao diện chính SPA
├── styles.css            # Định kiểu Obsidian Dark & Material 3
├── app.js                # State machine & bộ điều khiển 3 cấp độ
├── audio-player.js       # Trình phát audio thông minh (A-B loop, speed)
├── ket-tracker.js        # Telemetry & stopwatch
├── i18n.js               # Song ngữ Anh - Việt
├── data/                 # Dữ liệu 8 đề thi, câu hỏi, hints, traps
├── audio/                # 40 audio tracks đã cắt nhỏ theo Part
└── scripts/              # Mã nguồn mở xử lý dữ liệu và chia cắt audio
```
