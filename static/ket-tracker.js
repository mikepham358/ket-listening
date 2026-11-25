/**
 * =========================================================================
 * SUCCEED IN A2 KEY LISTENING - REAL-TIME TELEMETRY & BIG DATA ENGINE
 * Thư viện đo lường và truyền tải dữ liệu học tập ngầm về Google Sheets
 * Tác giả: Thầy Mike Pham & Antigravity AI
 * =========================================================================
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.KetTracker = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // Webhook Google Apps Script chính thức đã triển khai (kết nối trực tiếp tới Google Sheets Live Telemetry)
  const DEFAULT_TELEMETRY_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzuwe-xj_kYwx3jSYav_8fMb2O6M5ysAIWeVeKCaKA2KiKCEr2mkEdILTtMBLkWZ9FG/exec";
  const TARGET_SHEET_ID = "1xHRZSOdA_5KtqWrOPxJjgPy4WK08l4XNgfoFg4yPA_U";
  const TARGET_SHEET_URL = "https://docs.google.com/spreadsheets/d/1xHRZSOdA_5KtqWrOPxJjgPy4WK08l4XNgfoFg4yPA_U/edit";
  const STORAGE_KEY_WEBHOOK = "ket_telemetry_webhook_url";
  const STORAGE_KEY_SESSION = "ket_telemetry_session_id";
  const STORAGE_KEY_PROFILE = "ket_student_profile_v1";
  const STORAGE_KEY_COUNTER = "ket_global_session_counter";

  // Tạo hoặc lấy Session ID cố định cho phiên tab hiện tại
  function getSessionId() {
    let sid = null;
    try {
      sid = sessionStorage.getItem(STORAGE_KEY_SESSION);
      if (!sid) {
        sid = "KET_" + Date.now().toString(36).toUpperCase() + "_" + Math.random().toString(36).substring(2, 6).toUpperCase();
        sessionStorage.setItem(STORAGE_KEY_SESSION, sid);
      }
    } catch (e) {
      sid = "KET_SESSION_" + Date.now();
    }
    return sid;
  }

  function getWebhookUrl() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_WEBHOOK);
      // Nâng cấp tự động nếu localStorage lưu URL cũ
      if (stored && stored.includes("AKfycbx9XhNqKw2Hf4qrtdQkBFB9hFlyyZoaySrSTPX_Y1DkN-Mr1EA_CvMPl7lXZw-tUkfr")) {
        localStorage.setItem(STORAGE_KEY_WEBHOOK, DEFAULT_TELEMETRY_WEBHOOK_URL);
        return DEFAULT_TELEMETRY_WEBHOOK_URL;
      }
      return stored || DEFAULT_TELEMETRY_WEBHOOK_URL;
    } catch (e) {
      return DEFAULT_TELEMETRY_WEBHOOK_URL;
    }
  }

  function setWebhookUrl(url) {
    try {
      if (url && typeof url === "string") {
        localStorage.setItem(STORAGE_KEY_WEBHOOK, url.trim());
      } else {
        localStorage.removeItem(STORAGE_KEY_WEBHOOK);
      }
    } catch (e) {}
  }

  // Quản lý Hồ Sơ Học Sinh (Student Profile)
  function getProfile() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {}
    return {
      student_name: "",
      student_email: "",
      target_score: "Distinction (140-150)"
    };
  }

  function setProfile(profile) {
    try {
      const current = getProfile();
      const updated = Object.assign({}, current, profile, {
        updated_at: new Date().toISOString()
      });
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.warn("Could not save student profile", e);
      return profile;
    }
  }

  function hasProfile() {
    const prof = getProfile();
    return Boolean(
      prof &&
      prof.student_name &&
      prof.student_name.trim().length >= 2 &&
      prof.student_email &&
      prof.student_email.includes("@")
    );
  }

  function getDeviceInfo() {
    try {
      const ua = navigator.userAgent || "";
      let os = "Desktop";
      if (/iPad|iPhone|iPod/.test(ua)) os = "iOS";
      else if (/Android/.test(ua)) os = "Android";
      else if (/Macintosh|Mac OS X/.test(ua)) os = "macOS";
      else if (/Windows NT/.test(ua)) os = "Windows";

      let browser = "Browser";
      if (/Chrome|CriOS/.test(ua) && !/Edg/.test(ua)) browser = "Chrome";
      else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
      else if (/Firefox/.test(ua)) browser = "Firefox";
      else if (/Edg/.test(ua)) browser = "Edge";

      return `${os} • ${browser}`;
    } catch (e) {
      return "Web Client";
    }
  }

  // Đồng hồ bấm giờ từng câu hỏi / câu thoại (Per-Question Stopwatch Engine)
  const questionTimers = {};
  let currentActiveQuestionId = null;

  function startQuestionTimer(qid) {
    if (!qid) qid = "active_item";
    currentActiveQuestionId = String(qid);
    questionTimers[currentActiveQuestionId] = {
      start: Date.now(),
      lastAttempt: Date.now()
    };
  }

  function getQuestionDuration(qid) {
    const id = String(qid || currentActiveQuestionId || "active_item");
    if (!questionTimers[id]) return 0;
    const now = Date.now();
    const elapsed = Math.max(1, Math.round((now - (questionTimers[id].lastAttempt || questionTimers[id].start)) / 1000));
    questionTimers[id].lastAttempt = now;
    return elapsed;
  }

  /**
   * Truyền tải sự kiện Telemetry về Google Sheets ngầm (Silent, Non-blocking, Failsafe)
   */
  function track(eventType, details = {}, extra = {}) {
    const webhookUrl = getWebhookUrl();
    const profile = getProfile();
    const app = window.App || {};

    let durationSeconds = 0;
    if (typeof extra.duration === "number" && extra.duration > 0) {
      durationSeconds = Math.round(extra.duration);
    } else {
      durationSeconds = getQuestionDuration(extra.qid || currentActiveQuestionId);
    }

    const testId = extra.test_id || (app.activeTest ? `Practice Test ${app.activeTest.id}` : "Practice Test 1");
    let modeText = "Mức 1: Chép Chính Tả";
    if (app.currentMode === "intermediate") modeText = "Mức 2: Luyện Phản Xạ";
    else if (app.currentMode === "exam") modeText = "Mức 3: Thi Thật";
    if (extra.mode) modeText = extra.mode;

    const payload = {
      sheet_id: TARGET_SHEET_ID,
      session_id: getSessionId(),
      timestamp: new Date().toISOString(),
      student_name: profile.student_name ? profile.student_name.trim() : "Khách (Chưa nhập tên)",
      student_email: profile.student_email ? profile.student_email.trim() : "Chưa có email",
      target_score: profile.target_score || "Distinction (140-150)",
      test_id: testId,
      mode: modeText,
      question_number: extra.question_number || (app.currentQuestionIndex !== undefined ? `Câu ${app.currentQuestionIndex + 1}` : ""),
      event_type: eventType,
      result: extra.result || "",
      details: typeof details === "object" ? JSON.stringify(details) : String(details),
      duration_seconds: durationSeconds,
      device: getDeviceInfo()
    };

    console.log("[KetTracker Telemetry]", eventType, payload);

    if (!webhookUrl) return false;

    try {
      const blob = new Blob([JSON.stringify(payload)], { type: "text/plain;charset=UTF-8" });
      if (navigator.sendBeacon) {
        return navigator.sendBeacon(webhookUrl, blob);
      } else {
        fetch(webhookUrl, {
          method: "POST",
          mode: "no-cors",
          body: blob
        }).catch(() => {});
        return true;
      }
    } catch (err) {
      console.warn("Telemetry transmission error:", err);
      return false;
    }
  }

  /**
   * Gửi tín hiệu kiểm tra Ping đến Google Apps Script Webhook
   */
  async function testPing(customUrl) {
    const url = customUrl || getWebhookUrl();
    if (!url) {
      return { success: false, message: "Chưa cấu hình URL Webhook Google Apps Script!" };
    }

    const profile = getProfile();
    const payload = {
      sheet_id: TARGET_SHEET_ID,
      session_id: getSessionId(),
      timestamp: new Date().toISOString(),
      student_name: profile.student_name || "Thầy Mike Pham (Admin Test)",
      student_email: profile.student_email || "mikepham358@gmail.com",
      target_score: profile.target_score || "Distinction (140-150)",
      test_id: "System Check",
      mode: "Ping Verification",
      question_number: "Ping #1",
      event_type: "SYSTEM_PING",
      result: "CONNECTED ✅",
      details: JSON.stringify({ message: "Test telemetry ping to Google Sheet successfully verified!" }),
      duration_seconds: 0,
      device: getDeviceInfo()
    };

    try {
      const blob = new Blob([JSON.stringify(payload)], { type: "text/plain;charset=UTF-8" });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, blob);
      } else {
        await fetch(url, {
          method: "POST",
          mode: "no-cors",
          body: blob
        });
      }
      return {
        success: true,
        message: "✅ Đã gửi tín hiệu Test thành công! Vui lòng kiểm tra dòng mới nhất trên Google Sheets Live Telemetry."
      };
    } catch (e) {
      return {
        success: false,
        message: "❌ Không thể kết nối tới Webhook: " + (e.message || String(e))
      };
    }
  }

  // Tăng bộ đếm câu hoàn thành
  function incrementSessionCounter() {
    let count = parseInt(localStorage.getItem(STORAGE_KEY_COUNTER) || '0', 10);
    count += 1;
    localStorage.setItem(STORAGE_KEY_COUNTER, count.toString());
    const counterEl = document.getElementById('header-session-counter');
    if (counterEl) counterEl.textContent = `⭐ ${count} câu`;
  }

  function getSessionCounter() {
    return parseInt(localStorage.getItem(STORAGE_KEY_COUNTER) || '0', 10);
  }

  // Tự động gửi PAGE_VIEW khi trang tải xong
  if (typeof window !== "undefined") {
    window.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => {
        track("PAGE_VIEW", {
          url: window.location.href,
          referrer: document.referrer || "Direct"
        }, {
          result: "TRUY CẬP ỨNG DỤNG"
        });
      }, 1000);
    });
  }

  return {
    track: track,
    testPing: testPing,
    getProfile: getProfile,
    setProfile: setProfile,
    hasProfile: hasProfile,
    getWebhookUrl: getWebhookUrl,
    setWebhookUrl: setWebhookUrl,
    getSessionId: getSessionId,
    startQuestionTimer: startQuestionTimer,
    getQuestionDuration: getQuestionDuration,
    incrementSessionCounter: incrementSessionCounter,
    getSessionCounter: getSessionCounter,
    TARGET_SHEET_ID: TARGET_SHEET_ID,
    TARGET_SHEET_URL: TARGET_SHEET_URL
  };
}));
