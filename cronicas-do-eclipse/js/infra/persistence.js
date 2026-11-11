/* Infraestrutura: persistência versionada no localStorage.
 * Só usa JSON.parse — nada lido do armazenamento é executado como código (RNF09). */
(function (CE) {
  'use strict';
  const C = CE.content;

  const KEYS = {
    settings: 'chronicles.settings.v1',
    profile: 'chronicles.profile.v1',
    run: 'chronicles.activeRun.v1',
    ranking: 'chronicles.ranking.v1',
  };
  const VERSION = 1;
  const RUN_STATES = ['EXPLORING', 'IN_COMBAT', 'CHOOSING_REWARD', 'IN_EVENT', 'IN_SHOP', 'RESTING', 'LEVELING_UP'];

  function store() { try { return window.localStorage; } catch (e) { return null; } }

  function readRaw(key) {
    const s = store();
    if (!s) return { status: 'empty' };
    let raw;
    try { raw = s.getItem(key); } catch (e) { return { status: 'empty' }; }
    if (raw == null) return { status: 'empty' };
    try { return { status: 'ok', data: JSON.parse(raw) }; } catch (e) { return { status: 'corrupt' }; }
  }

  function writeRaw(key, data) {
    const s = store();
    if (!s) return false;
    try { s.setItem(key, JSON.stringify(data)); return true; } catch (e) { return false; }
  }

  function remove(key) { const s = store(); try { if (s) s.removeItem(key); } catch (e) { /* ignorado */ } }

  const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
  const isNum = (n) => typeof n === 'number' && isFinite(n);
  const isInt = (n) => Number.isInteger(n);

  /* ---------- Configurações ---------- */
  function defaultSettings() { return { version: VERSION, volume: 0.5, muted: false, reduceMotion: false, nickname: '' }; }
  function loadSettings() {
    const res = readRaw(KEYS.settings);
    const d = defaultSettings();
    if (res.status !== 'ok' || !isObj(res.data)) return d;
    const o = res.data;
    return {
      version: VERSION,
      volume: isNum(o.volume) ? Math.max(0, Math.min(1, o.volume)) : d.volume,
      muted: typeof o.muted === 'boolean' ? o.muted : d.muted,
      reduceMotion: typeof o.reduceMotion === 'boolean' ? o.reduceMotion : d.reduceMotion,
      nickname: typeof o.nickname === 'string' ? o.nickname.slice(0, 16) : '',
    };
  }
  function saveSettings(s) { return writeRaw(KEYS.settings, s); }

  /* ---------- Perfil ---------- */
  function defaultProfile() { return { version: VERSION, tutorialSeen: false, runsStarted: 0, victories: 0, defeats: 0, bestScore: 0 }; }
  function loadProfile() {
    const res = readRaw(KEYS.profile);
    const d = defaultProfile();
    if (res.status !== 'ok' || !isObj(res.data)) return d;
    const o = res.data;
    Object.keys(d).forEach((k) => {
      if (k === 'version') return;
      if (typeof d[k] === 'boolean' && typeof o[k] === 'boolean') d[k] = o[k];
      if (typeof d[k] === 'number' && isInt(o[k]) && o[k] >= 0) d[k] = o[k];
    });
    return d;
  }
  function saveProfile(p) { return writeRaw(KEYS.profile, p); }

  /* ---------- Ranking ---------- */
  function validEntry(e) {
    return isObj(e) && isInt(e.score) && e.score >= 0 && typeof e.victory === 'boolean' && isNum(e.date) &&
      typeof e.cls === 'string' && !!C.CLASSES[e.cls] && isInt(e.rooms) && typeof e.name === 'string';
  }
  function loadRanking() {
    const res = readRaw(KEYS.ranking);
    if (res.status !== 'ok' || !isObj(res.data) || !Array.isArray(res.data.entries)) return [];
    return res.data.entries.filter(validEntry)
      .map((e) => ({ name: e.name.slice(0, 16), cls: e.cls, score: e.score, victory: e.victory, rooms: e.rooms,
        bossReached: !!e.bossReached, date: e.date, seed: isInt(e.seed) ? e.seed : 0 }))
      .sort(CE.score.compareEntries).slice(0, CE.score.MAX_RANKING);
  }
  function saveRanking(entries) { return writeRaw(KEYS.ranking, { version: VERSION, entries }); }
  function clearRanking() { return saveRanking([]); }

  /* ---------- Jornada ativa ---------- */
  function validCardList(list) {
    return Array.isArray(list) && list.every((c) => isObj(c) && isInt(c.uid) && !!C.CARDS[c.id] && typeof c.up === 'boolean');
  }

  function validateRun(run) {
    const errors = [];
    const err = (m) => errors.push(m);
    if (!isObj(run)) return ['O save não é um objeto válido.'];
    if (run.version !== VERSION) err(`Versão do save incompatível (${run.version}).`);
    if (typeof run.id !== 'string') err('Identificador ausente.');
    if (!isInt(run.seed)) err('Semente inválida.');
    if (!C.CLASSES[run.cls]) err('Classe inválida.');
    if (!RUN_STATES.includes(run.state)) err('Estado da jornada inválido.');
    const p = run.player;
    if (!isObj(p)) { err('Dados do jogador ausentes.'); return errors; }
    if (!isInt(p.maxHp) || p.maxHp <= 0) err('HP máximo inválido.');
    if (!isInt(p.hp) || p.hp <= 0 || p.hp > p.maxHp) err('HP atual inválido.');
    if (!isInt(p.gold) || p.gold < 0) err('Ouro inválido.');
    if (!isInt(p.level) || p.level < 1 || p.level > CE.run.MAX_LEVEL) err('Nível inválido.');
    if (!isInt(p.xp) || p.xp < 0) err('Experiência inválida.');
    if (!validCardList(p.deck) || p.deck.length === 0) err('Baralho inválido.');
    if (!Array.isArray(p.artifacts) || !p.artifacts.every((a) => C.ARTIFACTS[a])) err('Artefatos inválidos.');
    if (!Array.isArray(p.potions) || p.potions.length > C.MAX_POTIONS || !p.potions.every((a) => C.POTIONS[a])) err('Consumíveis inválidos.');
    if (!isObj(run.map) || !CE.map.validateMap(run.map)) err('Mapa inválido.');
    else if (run.currentNode !== null && !run.map.nodes[run.currentNode]) err('Posição no mapa inválida.');
    if (!Array.isArray(run.visited) || !isObj(run.stats)) err('Progresso inválido.');
    if (run.state === 'IN_COMBAT') {
      const c = run.combat;
      if (!isObj(c) || !isObj(c.enemy) || !C.ENEMIES[c.enemy.id] || !validCardList(c.hand) || !validCardList(c.draw) ||
          !validCardList(c.discard) || !validCardList(c.exhaust) || !isInt(c.enemy.hp)) err('Combate salvo inválido.');
    }
    if (['IN_EVENT', 'IN_SHOP', 'RESTING'].includes(run.state) && (!isObj(run.room) || !isObj(run.room.content))) err('Sala atual inválida.');
    if (run.state === 'CHOOSING_REWARD' && (!isObj(run.room) || !isObj(run.room.rewards) || !Array.isArray(run.room.rewards.cards))) err('Recompensa inválida.');
    if (run.state === 'IN_EVENT' && run.room && run.room.content && !C.EVENTS[run.room.content.eventId]) err('Evento inválido.');
    if (run.state === 'LEVELING_UP' && (!isObj(run.levelUp) || !Array.isArray(run.levelUp.options))) err('Evolução pendente inválida.');
    return errors;
  }

  /** Migração simples: hoje só existe a v1. */
  function migrate(obj) {
    if (isObj(obj) && obj.version === VERSION) return obj;
    return null;
  }

  function loadRun() {
    const res = readRaw(KEYS.run);
    if (res.status === 'empty') return { status: 'none' };
    if (res.status === 'corrupt') return { status: 'invalid', errors: ['O arquivo de save está corrompido (JSON ilegível).'] };
    const migrated = migrate(res.data);
    if (!migrated) return { status: 'invalid', errors: [`Save de versão incompatível (${isObj(res.data) ? res.data.version : '?'}).`] };
    const errors = validateRun(migrated);
    if (errors.length) return { status: 'invalid', errors };
    return { status: 'ok', run: migrated };
  }
  function saveRun(run) { return writeRaw(KEYS.run, run); }
  function clearRun() { remove(KEYS.run); }

  CE.persistence = {
    KEYS, VERSION, readRaw, writeRaw, loadSettings, saveSettings, defaultSettings, loadProfile, saveProfile,
    loadRanking, saveRanking, clearRanking, validateRun, loadRun, saveRun, clearRun,
  };
})(window.CE = window.CE || {});
