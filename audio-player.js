// audio-player.js - Trình phát âm thanh thông minh chuyên dụng cho KET Listening
window.KetAudioPlayer = {
  audio: new Audio(),
  isPlaying: false,
  loopA: null,
  loopB: null,
  isLooping: false,
  segmentStart: null,
  segmentEnd: null,

  init() {
    this.audio.preload = "auto";
    
    this.audio.addEventListener("timeupdate", () => this.onTimeUpdate());
    this.audio.addEventListener("ended", () => this.onEnded());
    this.audio.addEventListener("play", () => {
      this.isPlaying = true;
      this.updatePlayState();
    });
    this.audio.addEventListener("pause", () => {
      this.isPlaying = false;
      this.updatePlayState();
    });
  },

  loadTrack(src, startSec = 0, endSec = null, keepCurrentTimeIfSame = false) {
    const isSame = this.audio.src.endsWith(src);
    if (!isSame) {
      this.audio.src = src;
      this.audio.currentTime = startSec || 0;
    } else if (!keepCurrentTimeIfSame) {
      this.audio.currentTime = startSec || 0;
    }
    this.segmentStart = startSec;
    this.segmentEnd = endSec;
    
    this.updateTimeDisplay();
  },

  play() {
    this.audio.play().catch(e => console.log("Play interrupted", e));
  },

  pause() {
    this.audio.pause();
  },

  togglePlay() {
    if (this.audio.paused) {
      this.play();
    } else {
      this.pause();
    }
  },

  replay5s() {
    this.audio.currentTime = Math.max(0, this.audio.currentTime - 5);
  },

  skip5s() {
    this.audio.currentTime = Math.min(this.audio.duration || 0, this.audio.currentTime + 5);
  },

  setSpeed(speed) {
    this.audio.playbackRate = speed;
    const speedLabel = document.getElementById("audio-speed-btn");
    if (speedLabel) speedLabel.textContent = `${speed}x`;
  },

  cycleSpeed() {
    const speeds = [0.75, 0.9, 1.0, 1.1, 1.25];
    const current = this.audio.playbackRate || 1.0;
    const nextIdx = (speeds.indexOf(current) + 1) % speeds.length;
    this.setSpeed(speeds[nextIdx]);
  },

  setLoopA() {
    this.loopA = this.audio.currentTime;
    this.isLooping = true;
    console.log(`[AudioPlayer] Set Loop A at ${this.loopA.toFixed(2)}s`);
  },

  setLoopB() {
    this.loopB = this.audio.currentTime;
    this.isLooping = true;
    console.log(`[AudioPlayer] Set Loop B at ${this.loopB.toFixed(2)}s`);
  },

  clearLoop() {
    this.loopA = null;
    this.loopB = null;
    this.isLooping = false;
  },

  onTimeUpdate() {
    const curr = this.audio.currentTime;
    const dur = this.audio.duration || 0;

    // Check A-B loop
    if (this.isLooping && this.loopA !== null && this.loopB !== null) {
      if (curr >= this.loopB) {
        this.audio.currentTime = this.loopA;
      }
    }

    // Check segment limit if set
    if (this.segmentEnd !== null && curr >= this.segmentEnd) {
      this.pause();
      this.audio.currentTime = this.segmentStart || 0;
    }

    this.updateProgressBar(curr, dur);
    this.updateTimeDisplay(curr, dur);
  },

  onEnded() {
    this.isPlaying = false;
    this.updatePlayState();
    if (this.isLooping && this.loopA !== null) {
      this.audio.currentTime = this.loopA;
      this.play();
    }
  },

  updateProgressBar(curr, dur) {
    const bar = document.getElementById("audio-progress-bar");
    if (bar && dur > 0) {
      bar.value = (curr / dur) * 100;
    }
  },

  updateTimeDisplay(curr = 0, dur = 0) {
    const display = document.getElementById("audio-time-display");
    if (display) {
      const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
      };
      display.textContent = `${formatTime(curr)} / ${formatTime(dur)}`;
    }
  },

  updatePlayState() {
    const btn = document.getElementById("audio-play-btn");
    if (btn) {
      btn.innerHTML = this.isPlaying ? "⏸️" : "▶️";
      btn.title = this.isPlaying ? "Pause" : "Play";
    }
  },

  seek(percent) {
    if (this.audio.duration) {
      this.audio.currentTime = (percent / 100) * this.audio.duration;
    }
  }
};
