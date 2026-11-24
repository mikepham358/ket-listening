// ket-tracker.js - Telemetry & Client-side Analytics Engine
window.KetTracker = {
  _questionStartTime: null,
  _sessionStartTime: Date.now(),
  _totalQuestionsPracticed: 0,

  startQuestionTimer() {
    this._questionStartTime = Date.now();
  },

  getQuestionDuration() {
    if (!this._questionStartTime) return 0;
    return Math.max(1, Math.round((Date.now() - this._questionStartTime) / 1000));
  },

  // Save student progress locally
  saveStudentState(testId, state) {
    try {
      const key = `ket_listening_test_${testId}_state_v1`;
      localStorage.setItem(key, JSON.stringify(state));
      this.incrementSessionCounter();
    } catch (e) {
      console.warn("Could not save state to localStorage", e);
    }
  },

  loadStudentState(testId) {
    try {
      const key = `ket_listening_test_${testId}_state_v1`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  incrementSessionCounter() {
    let count = parseInt(localStorage.getItem('ket_global_session_counter') || '0', 10);
    count += 1;
    localStorage.setItem('ket_global_session_counter', count.toString());
    const counterEl = document.getElementById('header-session-counter');
    if (counterEl) counterEl.textContent = count.toString();
  },

  // Telemetry event logging
  logEvent(eventType, payload) {
    const event = {
      timestamp: new Date().toISOString(),
      type: eventType,
      payload: payload
    };
    console.log("[KetTracker Telemetry]", event);

    // Optional Google Apps Script Webhook
    const webhookUrl = localStorage.getItem('ket_telemetry_webhook_url');
    if (webhookUrl) {
      try {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(event)
        }).catch(() => {});
      } catch (e) {}
    }
  }
};
