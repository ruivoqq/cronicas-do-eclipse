/* Domínio: geração, validação e navegação do mapa. */
(function (CE) {
  'use strict';
  const R = CE.rng;

  const ROWS = 10;   // andares antes do chefe (0..9)
  const LANES = 4;
  const PATHS = 5;

  const ROOM_TYPES = {
    combat: { name: 'Combate', icon: '⚔️' },
    elite:  { name: 'Elite', icon: '😈' },
    event:  { name: 'Evento', icon: '❓' },
    rest:   { name: 'Descanso', icon: '🔥' },
    shop:   { name: 'Loja', icon: '💰' },
    boss:   { name: 'Chefe', icon: '👑' },
  };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function generateMap(seed) {
    const r = R.derive(seed, 'map');
    const nodes = {};
    const key = (row, lane) => `n${row}_${lane}`;
    function ensure(row, lane) {
      const id = key(row, lane);
      if (!nodes[id]) nodes[id] = { id, row, lane, type: null, next: [], dx: Math.round((R.next(r) - 0.5) * 30) / 100 };
      return nodes[id];
    }

    for (let p = 0; p < PATHS; p++) {
      let lane = p === 0 ? R.int(r, 0, 1) : p === 1 ? R.int(r, 2, 3) : R.int(r, 0, LANES - 1);
      let prev = ensure(0, lane);
      for (let row = 1; row < ROWS; row++) {
        let nl = clamp(lane + R.int(r, -1, 1), 0, LANES - 1);
        // evita arestas cruzadas: (row-1,nl) -> (row,lane)
        if (nl !== lane) {
          const opposite = nodes[key(row - 1, nl)];
          if (opposite && opposite.next.includes(key(row, lane))) nl = lane;
        }
        const cur = ensure(row, nl);
        if (!prev.next.includes(cur.id)) prev.next.push(cur.id);
        prev = cur;
        lane = nl;
      }
    }

    nodes.boss = { id: 'boss', row: ROWS, lane: (LANES - 1) / 2, type: 'boss', next: [], dx: 0 };
    Object.values(nodes).forEach((n) => { if (n.row === ROWS - 1) n.next = ['boss']; });
    assignTypes(nodes, r);
    return { rows: ROWS, lanes: LANES, nodes, bossId: 'boss' };
  }

  function assignTypes(nodes, r) {
    const list = Object.values(nodes).filter((n) => n.id !== 'boss').sort((a, b) => a.row - b.row || a.lane - b.lane);
    for (const n of list) {
      if (n.row === 0) { n.type = 'combat'; continue; }
      if (n.row === ROWS - 1) { n.type = 'rest'; continue; }
      const opts = [['combat', 46], ['event', 22]];
      if (n.row >= 2) opts.push(['shop', 9]);
      if (n.row >= 3 && n.row <= ROWS - 3) opts.push(['rest', 10]);
      if (n.row >= 4) opts.push(['elite', 13]);
      n.type = R.weighted(r, opts);
    }
    ensureType(list, r, 'shop', (n) => n.row >= 3 && n.row <= 7);
    ensureType(list, r, 'elite', (n) => n.row >= 4 && n.row <= 8);
  }

  function ensureType(list, r, type, where) {
    if (list.some((n) => n.type === type)) return;
    const cands = list.filter((n) => n.type === 'combat' && where(n));
    if (cands.length) R.pick(r, cands).type = type;
  }

  /** Garante que todo nó é alcançável a partir do início e leva ao chefe (M4). */
  function validateMap(map) {
    if (!map || !map.nodes || !map.nodes[map.bossId]) return false;
    const nodes = map.nodes;
    const starts = Object.values(nodes).filter((n) => n.row === 0);
    if (!starts.length) return false;
    for (const n of Object.values(nodes)) {
      if (!ROOM_TYPES[n.type]) return false;
      if (n.id === map.bossId) continue;
      if (!Array.isArray(n.next) || n.next.length === 0) return false;
      for (const id of n.next) {
        const t = nodes[id];
        if (!t || t.row !== n.row + 1) return false;
      }
    }
    const seen = new Set(starts.map((n) => n.id));
    const queue = starts.slice();
    while (queue.length) {
      const n = queue.shift();
      for (const id of n.next) if (!seen.has(id)) { seen.add(id); queue.push(nodes[id]); }
    }
    return seen.has(map.bossId) && seen.size === Object.keys(nodes).length;
  }

  /** Nós que o jogador pode acessar agora (RN02). */
  function available(run) {
    const nodes = run.map.nodes;
    if (!run.currentNode) return Object.values(nodes).filter((n) => n.row === 0).map((n) => n.id);
    if (!run.visited.includes(run.currentNode)) return [];
    return nodes[run.currentNode].next.slice();
  }

  CE.map = { ROWS, LANES, ROOM_TYPES, generateMap, validateMap, available };
})(window.CE = window.CE || {});
