# 🎧 Succeed in A2 Key Listening — 8 Practice Tests

Ứng dụng luyện thi kỹ năng nghe **Cambridge English: A2 Key (KET)** với 8 đề thi thực hành từ giáo trình *Succeed in A2 Key New 2020 Format*.
Giao diện sắc màu Lego thân thiện với học sinh 10–12 tuổi, tích hợp **Dữ Liệu Lớn Google Sheets Live Telemetry** và hồ sơ học sinh thông minh chắt lọc từ cẩm nang kiến trúc `vinschool-sat-team`.

---

## 🌟 Tính Năng Nổi Bật

- **Zero-Build, Static-First (Chi Phí 0 Đồng)**: Chạy trực tiếp 100% trên GitHub Pages, client-side hoàn toàn, không phụ thuộc server nặng.
- **Hồ Sơ Học Sinh & Live Telemetry Thông Minh**:
  - Tự động nhận diện và lưu Họ tên, Email, Mục tiêu điểm số (*Distinction, Merit, Pass*) trên trình duyệt (`localStorage`).
  - **Smart Intercept**: Nhắc nhở thông minh học sinh điền tên & email trước khi kiểm tra câu hoặc nộp bài để đảm bảo dữ liệu luôn được ghi nhận đầy đủ.
  - Tự động truyền tải ngầm mọi kết quả (số lần thử, thời gian làm câu tính bằng giây, nội dung chép chính tả, bẫy đề thi, điểm thi, từ vựng) lên **Google Sheets Live Telemetry**.
- **3 Cấp Độ Sư Phạm (3-Tier Listening)**:
  1. **🌱 Mức 1: Chép Chính Tả (Dictation)**: Luyện tai nhạy theo từng câu lẻ, so sánh từ theo màu sắc (Xanh: đúng, Đỏ: sai, Vàng: thiếu). Vòng lặp gợi ý: chỉ mở khóa 1 lần duy nhất sau 3 lần thử sai, sau đó khóa lại để tiếp tục luyện tai.
  2. **⚡ Mức 2: Luyện Phản Xạ (Socratic)**: Phá bẫy đề thi với giàn giáo Socratic 4 tầng & Sổ Bắt Bẫy Nghe Cambridge.
  3. **🎓 Mức 3: Thi Thật (Exam Mode)**: Tích hợp trình xem đề PDF Google Drive bên trái và phiếu trả lời 25 câu bên phải. Audio phát liên tục ~23 phút chuẩn phòng thi Cambridge.
- **📚 Từ Điển Lego Song Ngữ & Thesaurus**:
  - Tra cứu Anh - Việt & Việt - Anh hai chiều với tự động nhận diện ngôn ngữ.
  - Tích hợp Oxford & Datamuse Thesaurus (Từ đồng nghĩa, Từ trái nghĩa) dạng viên gạch Lego.
  - Phát âm giọng Anh (UK) & Mỹ (US) chuẩn tốc độ 0.85x và tính năng lưu vào Sổ Từ Vựng.
- **⏱️ Stopwatch Đo Lường Từng Câu**: Ghi nhận chính xác số giây học sinh dừng lại ở từng câu hỏi/câu thoại.

---

## 🚀 Trải Nghiệm Trực Tuyến

👉 **[https://mikepham358.github.io/ket-listening/](https://mikepham358.github.io/ket-listening/)**

---

## 📂 Cấu Trúc Kho Chứa (Directory Anatomy)

```text
ket-listening/
├── index.html                        # Giao diện chính SPA phong cách Lego
├── styles.css                        # CSS hoàn chỉnh (Lego Colorful Theme, Split-Screen 100dvh)
├── app.js                            # State machine, bộ điều khiển 3 cấp độ, Smart Interceptor
├── ket-tracker.js                    # Telemetry client gửi dữ liệu ngầm lên Google Sheets
├── google-apps-script-telemetry.js   # Mã nguồn Google Apps Script triển khai trên Google Sheets
├── dictionary.js                     # Từ điển Lego song ngữ Anh-Việt & Thesaurus Anh-Anh
├── audio-player.js                   # Trình phát audio thông minh (A-B loop, speed, continuous)
├── i18n.js                           # Bộ dịch song ngữ Anh - Việt
├── data/                             # Dữ liệu 8 đề thi, câu hỏi, hints, traps, transcripts
├── audio/                            # Kho audio đã cắt nhỏ theo Part & Audio Full liên tục
├── static/                           # Thư mục đối xứng byte-for-byte phục vụ chạy server cục bộ
└── scripts/                          # Script Python cắt audio và xử lý dữ liệu
```
