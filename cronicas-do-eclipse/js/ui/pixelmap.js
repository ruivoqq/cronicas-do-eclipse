/* Interface: mapa da fortaleza em pixel art.
 * Salas são câmaras ligadas por corredores. O herói anda com as setas (ou clique)
 * e ataca com Espaço: em uma sala com inimigo, o ataque inicia o combate. */
(function (CE) {
  'use strict';
  const S = CE.sprites;
  const C = CE.content;
  const esc = CE.views.esc;

  const ICON = { combat: 'i_sword', elite: 'i_skull', event: 'i_event', rest: 'i_fire', shop: 'i_bag', boss: 'regent' };
  const FIGHT = ['combat', 'elite', 'boss'];
  const ROOM_HINT = {
    combat: 'Um inimigo bloqueia a passagem.',
    elite: 'Um inimigo de elite guarda esta sala. Recompensa maior.',
    boss: 'O Regente do Eclipse aguarda no topo da fortaleza.',
    event: 'Algo estranho acontece aqui.',
    shop: 'Um mercador oferece cartas, artefatos e consumíveis.',
    rest: 'Uma fogueira para descansar ou aprimorar uma carta.',
  };
  const ROW_H = 96, PAD_TOP = 80, FOOT = 100;
  const HERO_OFFSET = -36; // o herói para ao lado esquerdo da sala, de frente para o que há nela

  function layout(map) {
    const height = PAD_TOP + map.rows * ROW_H + FOOT + 50;
    const pos = (n) => ({ x: ((n.lane + 0.5 + (n.dx || 0)) / map.lanes) * 100, y: PAD_TOP + (map.rows - n.row) * ROW_H });
    const entrance = { x: 50, y: PAD_TOP + map.rows * ROW_H + FOOT };
    return { height, pos, entrance };
  }

  /** Corredor em "cotovelo": sobe, anda de lado, sobe. */
  function elbow(a, b) {
    const my = (a.y + b.y) / 2;
    return `${a.x},${a.y} ${a.x},${my} ${b.x},${my} ${b.x},${b.y}`;
  }

  function isFight(node) { return !!node && FIGHT.includes(node.type); }

  function sidePanel(app, avail) {
    const run = app.run, at = app.ui.heroAt, node = at && run.map.nodes[at];
    const atk = CE.combat.OPENING[run.cls].name;
    if (node) {
      const t = CE.map.ROOM_TYPES[node.type];
      const enemy = CE.run.peekEnemy(run, at);
      const fight = isFight(node);
      return `<div class="map-prompt" role="status">
          <h2>${t.name}${enemy ? ': ' + esc(C.ENEMIES[enemy].name) : ''}</h2>
          <p>${ROOM_HINT[node.type]}</p>
          ${fight ? `<p class="small muted">Seu ataque inicial (${atk}) causa ${CE.combat.OPENING[run.cls].damage} de dano e começa o combate.</p>` : ''}
          <div class="map-prompt-actions">
            <button type="button" class="btn primary" data-action="mapInteract">${fight ? `Atacar` : 'Entrar'} <kbd>Espaço</kbd></button>
            <button type="button" class="btn" data-action="mapMove" data-arg="down">Voltar <kbd>↓</kbd></button>
          </div>
        </div>`;
    }
    return `<div class="map-prompt">
        <p>${avail.length ? 'Ande até uma das salas destacadas.' : 'Nenhuma sala disponível.'}</p>
        <ul class="key-list">
          <li><kbd>←</kbd> <kbd>↑</kbd> <kbd>→</kbd> andar até uma sala</li>
          <li><kbd>↓</kbd> voltar</li>
          <li><kbd>Espaço</kbd> atacar (${atk})</li>
        </ul>
        <p class="small muted">Também funciona com o mouse: clique na sala para andar e clique de novo para entrar.</p>
      </div>`;
  }

  function mapScreen(app) {
    const run = app.run, map = run.map;
    const avail = CE.map.available(run);
    if (app.ui.heroAt && !avail.includes(app.ui.heroAt)) app.ui.heroAt = null;
    const heroAt = app.ui.heroAt;
    const L = layout(map);
    const nodes = Object.values(map.nodes);
    const reached = (id) => run.visited.includes(id) || run.currentNode === id;

    const edges = [];
    nodes.filter((n) => n.row === 0).forEach((n) => edges.push({ pts: elbow(L.entrance, L.pos(n)), taken: reached(n.id) }));
    nodes.forEach((n) => n.next.forEach((id) => {
      edges.push({ pts: elbow(L.pos(n), L.pos(map.nodes[id])), taken: run.visited.includes(n.id) && reached(id) });
    }));
    const line = (cls) => (e) => `<polyline points="${e.pts}" class="${cls}" vector-effect="non-scaling-stroke"/>`;
    const corridors = edges.map(line('cor-wall')).join('') + edges.map(line('cor-floor')).join('') +
      edges.filter((e) => e.taken).map(line('cor-trail')).join('');

    const rooms = nodes.map((n) => {
      const t = CE.map.ROOM_TYPES[n.type];
      const p = L.pos(n);
      const visited = run.visited.includes(n.id);
      const isAvail = avail.includes(n.id);
      const enemy = isAvail && n.type !== 'boss' ? CE.run.peekEnemy(run, n.id) : null;
      const state = visited ? 'visitada' : isAvail ? (heroAt === n.id ? 'você está aqui' : 'disponível') : 'bloqueada';
      const label = `${t.name}${enemy ? ' (' + C.ENEMIES[enemy].name + ')' : ''}, andar ${n.row + 1}, ${state}`;
      return `<button type="button" class="map-node t-${n.type}${visited ? ' visited' : ''}${isAvail ? ' available' : ''}${run.currentNode === n.id ? ' current' : ''}${heroAt === n.id ? ' hero-here' : ''}${enemy ? ' has-enemy' : ''}"
        ${run.currentNode === n.id ? 'id="map-origin" ' : ''}style="left:${p.x}%;top:${p.y}px" data-action="mapGo" data-arg="${n.id}"${isAvail ? '' : ' disabled'}
        aria-label="${esc(label)}" title="${esc(t.name)}">${S.svg(enemy || ICON[n.type])}${visited ? '<span class="done" aria-hidden="true">✔</span>' : ''}</button>`;
    }).join('');

    let heroStyle;
    if (heroAt) { const p = L.pos(map.nodes[heroAt]); heroStyle = `left:calc(${p.x}% + ${HERO_OFFSET}px);top:${p.y}px`; }
    else { const p = run.currentNode ? L.pos(map.nodes[run.currentNode]) : L.entrance; heroStyle = `left:${p.x}%;top:${p.y}px`; }
    const legend = Object.keys(CE.map.ROOM_TYPES).map((k) => `<li>${S.svg(k === 'boss' ? 'i_crown' : ICON[k])} ${CE.map.ROOM_TYPES[k].name}</li>`).join('');

    return `${CE.views.hud(app)}
      <main class="screen map-screen">
        <div class="map-side">
          <h1 tabindex="-1">Mapa da fortaleza</h1>
          ${sidePanel(app, avail)}
          <ul class="legend-list" aria-label="Legenda">${legend}</ul>
          <p class="muted small">Salas concluídas: ${run.stats.rooms} · Semente: ${run.seed}</p>
        </div>
        <div class="map-scroll pxmap" id="map-scroll">
          <div class="map-canvas" style="height:${L.height}px">
            <svg class="map-lines" viewBox="0 0 100 ${L.height}" preserveAspectRatio="none" aria-hidden="true">${corridors}</svg>
            <div class="map-door" ${run.currentNode ? '' : 'id="map-origin" '}style="left:${L.entrance.x}%;top:${L.entrance.y}px" aria-hidden="true">${S.svg('i_door')}<small>Entrada</small></div>
            ${rooms}
            <div class="map-hero" id="map-hero" style="${heroStyle}" aria-hidden="true">${S.svg(run.cls)}</div>
          </div>
        </div>
      </main>`;
  }

  function once(fn) { let ran = false; return () => { if (!ran) { ran = true; fn(); } }; }

  /** Anima o herói pelo corredor até `toEl` e chama `done` ao chegar.
   *  midY: altura (px) do trecho horizontal do corredor; se nulo, usa o meio do caminho. */
  function walk(toEl, offsetX, midY, done, instant) {
    const hero = document.getElementById('map-hero');
    const finish = once(done);
    if (instant || !hero || !toEl || !hero.animate) { finish(); return; }
    const a = { x: hero.offsetLeft, y: hero.offsetTop }, b = { x: toEl.offsetLeft + offsetX, y: toEl.offsetTop };
    const my = midY == null ? (a.y + b.y) / 2 : midY;
    hero.classList.add('walking');
    if (b.x < a.x - 2) hero.classList.add('left');
    const frames = [
      { left: a.x + 'px', top: a.y + 'px' }, { left: a.x + 'px', top: my + 'px' },
      { left: b.x + 'px', top: my + 'px' }, { left: b.x + 'px', top: b.y + 'px' },
    ];
    const dist = Math.abs(a.y - my) + Math.abs(b.x - a.x) + Math.abs(b.y - my);
    const duration = Math.max(250, Math.min(800, dist * 3.2));
    try { hero.animate(frames, { duration, easing: 'linear', fill: 'forwards' }).onfinish = finish; }
    catch (e) { finish(); return; }
    setTimeout(finish, duration + 400); // garantia caso a aba esteja em segundo plano
  }

  function spawn(canvas, sprite, cls, x, y) {
    const el = document.createElement('div');
    el.className = 'map-fx ' + cls;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.innerHTML = S.svg(sprite);
    canvas.appendChild(el);
    return el;
  }

  /** Ataque da classe no mapa: espadada (Guardião) ou orbe arcano (Tecelã).
   *  targetEl: sala com inimigo atingido (ou nulo para atacar o vazio). */
  function attack(cls, targetEl, done, instant) {
    const hero = document.getElementById('map-hero');
    const canvas = hero && hero.parentElement;
    const finish = once(done);
    if (instant || !hero || !hero.animate) { finish(); return; }
    const x = hero.offsetLeft, y = hero.offsetTop - 22;
    const strike = () => { if (targetEl) { targetEl.classList.remove('struck'); void targetEl.offsetWidth; targetEl.classList.add('struck'); } };
    const base = 'translate(-50%, -95%)';
    let total;
    if (cls === 'guardian') {
      total = 320;
      hero.animate([{ transform: base }, { transform: 'translate(calc(-50% + 16px), -95%)', offset: 0.35 }, { transform: base }], { duration: 260, easing: 'ease-out' });
      const fx = spawn(canvas, 'fx_slash', 'fx-slash', x + 30, y);
      fx.animate([{ opacity: 0, transform: 'translate(-50%, -50%) rotate(-50deg) scale(.6)' }, { opacity: 1, transform: 'translate(-50%, -50%) rotate(0deg) scale(1.1)', offset: 0.5 },
        { opacity: 0, transform: 'translate(-50%, -50%) rotate(40deg) scale(1.2)' }], { duration: 280, easing: 'steps(5)' }).onfinish = () => fx.remove();
      setTimeout(strike, 130);
    } else {
      total = 420;
      const reach = targetEl ? Math.max(40, targetEl.offsetLeft - x - 6) : 110;
      hero.animate([{ transform: base }, { transform: 'translate(-50%, -105%)', offset: 0.3 }, { transform: base }], { duration: 220, easing: 'steps(3)' });
      const orb = spawn(canvas, 'fx_orb', 'fx-orb', x + 22, y - 6);
      orb.animate([{ transform: 'translate(-50%, -50%) scale(.6)' }, { transform: `translate(calc(-50% + ${reach}px), -50%) scale(1)` }], { duration: 300, easing: 'linear' }).onfinish = () => {
        orb.remove();
        strike();
        const burst = spawn(canvas, 'fx_burst', 'fx-burst', x + 22 + reach, y - 6);
        burst.animate([{ opacity: 1, transform: 'translate(-50%, -50%) scale(.5)' }, { opacity: 0, transform: 'translate(-50%, -50%) scale(1.6)' }], { duration: 200, easing: 'steps(4)' }).onfinish = () => burst.remove();
      };
    }
    setTimeout(finish, total);
  }

  CE.pixelmap = { mapScreen, walk, attack, isFight, HERO_OFFSET };
})(window.CE = window.CE || {});
