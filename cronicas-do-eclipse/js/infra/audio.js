/* Infraestrutura: efeitos sonoros sintetizados com Web Audio (sem arquivos externos). */
(function (CE) {
  'use strict';
  let ctx = null;
  const settings = { volume: 0.5, muted: false };

  const SOUNDS = {
    click:  [[660, 0.04, 'sine']],
    card:   [[520, 0.05, 'triangle'], [780, 0.06, 'triangle']],
    hit:    [[180, 0.1, 'square'], [110, 0.12, 'square']],
    hurt:   [[140, 0.15, 'sawtooth']],
    block:  [[320, 0.08, 'sine'], [420, 0.08, 'sine']],
    coin:   [[880, 0.05, 'square'], [1320, 0.08, 'square']],
    error:  [[160, 0.12, 'sawtooth']],
    win:    [[523, 0.1, 'triangle'], [659, 0.1, 'triangle'], [784, 0.2, 'triangle']],
    lose:   [[392, 0.15, 'triangle'], [311, 0.15, 'triangle'], [233, 0.3, 'triangle']],
    level:  [[523, 0.08, 'sine'], [784, 0.08, 'sine'], [1047, 0.15, 'sine']],
  };

  function configure(s) { settings.volume = s.volume; settings.muted = s.muted; }

  function play(name) {
    if (settings.muted || settings.volume <= 0) return;
    const seq = SOUNDS[name];
    if (!seq) return;
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      let t = ctx.currentTime;
      for (const [freq, dur, type] of seq) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.18 * settings.volume, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur + 0.02);
        t += dur * 0.9;
      }
    } catch (e) { /* áudio indisponível: o jogo continua sem som */ }
  }

  CE.audio = { configure, play };
})(window.CE = window.CE || {});
