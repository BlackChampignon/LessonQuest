window.GameAudio = {
  enabled: true,
  context: null,
  unlock() {
    if (!this.context) { const Audio = window.AudioContext || window.webkitAudioContext; if (Audio) this.context = new Audio(); }
    this.context?.resume().catch(() => {});
  },
  tone(frequency, start, duration = .14, type = 'sine', volume = .09, endFrequency = frequency) {
    if (!this.enabled || !this.context) return;
    const ctx = this.context, oscillator = ctx.createOscillator(), gain = ctx.createGain(), at = ctx.currentTime + start;
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, at); oscillator.frequency.exponentialRampToValueAtTime(Math.max(1,endFrequency), at + duration);
    gain.gain.setValueAtTime(.001, at); gain.gain.exponentialRampToValueAtTime(volume, at + .01); gain.gain.exponentialRampToValueAtTime(.001, at + duration);
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(at); oscillator.stop(at + duration + .02);
  },
  play(kind) {
    if (!this.enabled) return; this.unlock();
    if (kind === 'correct') [523,659,784,1047].forEach((f,i) => this.tone(f,i*.09,.19));
    else if (kind === 'wrong') { this.tone(160,0,.25,'triangle',.07,70); this.tone(110,.18,.2,'sine',.07,180); }
    else if (kind === 'flip' || kind === 'box') this.tone(220,0,.2,'triangle',.04,1400);
    else if (kind === 'victory') [523,659,784,1047,784,1047,1319].forEach((f,i) => this.tone(f,i*.12,.25,'triangle'));
    else if (kind === 'tick') this.tone(650,0,.025,'sine',.025);
    else this.tone(500,0,.07,'sine',.035,700);
  }
};
