/* Infraestrutura: geração aleatória com semente (RN25).
 * Todo estado do gerador é um objeto simples { s } para poder ser salvo em JSON. */
(function (CE) {
  'use strict';

  function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function create(seed) { return { s: seed >>> 0 }; }

  // mulberry32
  function next(r) {
    let t = (r.s = (r.s + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function int(r, min, max) { return min + Math.floor(next(r) * (max - min + 1)); }
  function pick(r, arr) { return arr[Math.floor(next(r) * arr.length)]; }

  function shuffle(r, arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(next(r) * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function sample(r, arr, n) { return shuffle(r, arr.slice()).slice(0, n); }

  function weighted(r, entries) {
    const total = entries.reduce((s, e) => s + e[1], 0);
    let x = next(r) * total;
    for (const [item, w] of entries) { if ((x -= w) < 0) return item; }
    return entries[entries.length - 1][0];
  }

  /** Gerador derivado: mesmo seed + chave => mesma sequência (conteúdo estável, RN30). */
  function derive(seed, key) { return create(hashString(seed + ':' + key)); }

  function newSeed() { return Math.floor(Math.random() * 0xffffffff) >>> 0; }

  CE.rng = { hashString, create, next, int, pick, shuffle, sample, weighted, derive, newSeed };
})(window.CE = window.CE || {});
