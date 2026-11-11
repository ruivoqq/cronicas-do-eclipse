/* Interface: funções que transformam o estado em HTML. Não alteram o estado. */
(function (CE) {
  'use strict';
  const C = CE.content;

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ESC[ch]);
  const TYPE_ICON = { attack: '⚔️', defense: '🛡️', skill: '✨', power: '🔆' };

  function btn(label, action, arg, o) {
    o = o || {};
    return `<button type="button" class="btn ${o.cls || ''}" data-action="${action}"` +
      (arg != null ? ` data-arg="${esc(arg)}"` : '') +
      (o.disabled ? ' disabled' : '') +
      (o.title ? ` title="${esc(o.title)}"` : '') +
      (o.aria ? ` aria-label="${esc(o.aria)}"` : '') +
      (o.pressed != null ? ` aria-pressed="${o.pressed}"` : '') +
      `>${label}</button>`;
  }

  function cardHTML(v, o) {
    o = o || {};
    const text = C.cardText(v, o.ctx);
    const isBtn = !!o.action;
    const tag = isBtn ? 'button' : 'div';
    const aria = `${v.name}, ${C.CARD_TYPES[v.type]}, ${C.RARITY[v.rarity]}, custo ${v.cost} de energia. ${text}${o.ariaExtra || ''}`;
    const attrs = isBtn
      ? ` type="button" data-action="${o.action}" data-arg="${esc(o.arg)}"${o.disabled ? ' aria-disabled="true"' : ''}${o.pressed != null ? ` aria-pressed="${o.pressed}"` : ''}`
      : ' role="group"';
    return `<${tag} class="card type-${v.type} rarity-${v.rarity}${v.up ? ' upgraded' : ''}${o.disabled ? ' unplayable' : ''}${o.cls ? ' ' + o.cls : ''}"${attrs} aria-label="${esc(aria)}">` +
      `<span class="card-cost" aria-hidden="true">${v.cost}</span>` +
      `<span class="card-name" aria-hidden="true">${esc(v.name)}</span>` +
      `<span class="card-art" aria-hidden="true">${TYPE_ICON[v.type]}</span>` +
      `<span class="card-type" aria-hidden="true">${C.CARD_TYPES[v.type]} · ${C.RARITY[v.rarity]}</span>` +
      `<span class="card-text" aria-hidden="true">${esc(text)}</span>` +
      (o.key ? `<span class="card-key" aria-hidden="true">${o.key}</span>` : '') +
      (o.footer || '') +
      `</${tag}>`;
  }

  function statusList(status, who) {
    const items = C.STATUS_ORDER.filter((s) => status[s] > 0).map((s) => {
      const st = C.STATUS[s];
      const desc = st.desc.replace(/X/g, status[s]);
      return `<li class="status ${st.kind}" tabindex="0" title="${esc(st.name + ': ' + desc)}" aria-label="${esc(st.name + ' ' + status[s] + '. ' + desc)}">` +
        `<span aria-hidden="true">${st.icon}</span><b>${status[s]}</b><span class="status-name">${st.name}</span></li>`;
    });
    return items.length ? `<ul class="status-list" aria-label="Efeitos ${who}">${items.join('')}</ul>` : `<ul class="status-list empty" aria-label="Sem efeitos ${who}"></ul>`;
  }

  function hpBar(hp, max, block, label) {
    const pct = Math.max(0, Math.round((hp / max) * 100));
    return `<div class="hpbar" role="meter" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${hp}">` +
      `<span class="hpfill" style="width:${pct}%"></span><span class="hptext">${hp} / ${max}</span>` +
      (block > 0 ? `<span class="block-badge" title="Bloqueio" aria-label="Bloqueio ${block}">🛡️ ${block}</span>` : '') +
      '</div>';
  }

  /* ---------- HUD ---------- */
  function hud(app) {
    const run = app.run, p = run.player, cls = C.CLASSES[run.cls];
    const need = CE.run.xpToNext(p.level);
    const xpPct = need === Infinity ? 100 : Math.round((p.xp / need) * 100);
    const floor = run.currentNode ? run.map.nodes[run.currentNode].row + 1 : 0;
    const slots = [];
    for (let i = 0; i < C.MAX_POTIONS; i++) {
      const id = p.potions[i];
      slots.push(id
        ? `<button type="button" class="slot filled" data-action="openPotion" data-arg="${i}" title="${esc(C.POTIONS[id].name + ': ' + C.POTIONS[id].desc)}" aria-label="${esc('Consumível: ' + C.POTIONS[id].name)}">${C.POTIONS[id].icon}</button>`
        : '<span class="slot empty" aria-hidden="true"></span>');
    }
    const arts = p.artifacts.map((id) => {
      const a = C.ARTIFACTS[id];
      return `<button type="button" class="art" data-action="openDeck" data-arg="inventory" title="${esc(a.name + ': ' + a.desc)}" aria-label="${esc('Artefato ' + a.name + ': ' + a.desc)}">${a.icon}</button>`;
    }).join('');
    return `<header class="hud">
      <div class="hud-cls">${CE.sprites.svg(run.cls)} ${cls.name}</div>
      <div class="hud-stat hp" title="Pontos de vida"><span aria-hidden="true">❤️</span> <span class="sr-only">HP</span>${p.hp}/${p.maxHp}</div>
      <div class="hud-stat gold" title="Ouro"><span aria-hidden="true">🪙</span> <span class="sr-only">Ouro</span>${p.gold}</div>
      <div class="hud-stat lvl" title="Nível e experiência">Nv ${p.level}
        <span class="xpbar" role="progressbar" aria-label="Experiência" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${xpPct}"><span style="width:${xpPct}%"></span></span>
        <small>${need === Infinity ? 'máx.' : p.xp + '/' + need}</small></div>
      <div class="hud-slots" aria-label="Consumíveis (máximo ${C.MAX_POTIONS})">${slots.join('')}</div>
      <div class="hud-arts" aria-label="Artefatos">${arts || '<small class="muted">Sem artefatos</small>'}</div>
      <div class="hud-floor">Andar ${floor}/${CE.map.ROWS + 1}</div>
      <div class="hud-actions">
        ${btn(`<span aria-hidden="true">🂠</span> Baralho (${p.deck.length})`, 'openDeck', 'deck')}
        ${btn('<span aria-hidden="true">☰</span>', 'openRunMenu', null, { aria: 'Menu da jornada', title: 'Menu da jornada' })}
      </div>
    </header>`;
  }

  /* ---------- Telas fora da jornada ---------- */
  function booting() {
    return '<main class="screen center"><div class="eclipse-logo spin" aria-hidden="true"></div><p>Carregando…</p></main>';
  }

  function menu(app) {
    const r = app.savedRun;
    const contInfo = r ? `<small>${C.CLASSES[r.cls].name} · Nv ${r.player.level} · ${r.player.hp}/${r.player.maxHp} HP · ${r.stats.rooms} salas</small>` : '<small>Nenhuma jornada salva</small>';
    return `<main class="screen menu">
      <div class="menu-hero">
        <div class="eclipse-logo" aria-hidden="true"></div>
        <h1 tabindex="-1">Crônicas do Eclipse</h1>
        <p class="tagline">Atravesse a fortaleza tomada pelo Eclipse. Monte seu baralho. Derrote o Regente.</p>
      </div>
      <nav class="menu-buttons" aria-label="Menu principal">
        ${btn('Nova jornada', 'newRun', null, { cls: 'primary big' })}
        <button type="button" class="btn big" data-action="continueRun"${r ? '' : ' disabled'}>Continuar jornada ${contInfo}</button>
        ${btn('Ranking', 'goScreen', 'ranking')}
        ${btn('Como jogar', 'goScreen', 'help')}
        ${btn('Configurações', 'goScreen', 'settings')}
        ${btn('Créditos', 'goScreen', 'credits')}
      </nav>
      ${app.profile.runsStarted ? `<p class="muted small">Jornadas: ${app.profile.runsStarted} · Vitórias: ${app.profile.victories} · Melhor pontuação: ${app.profile.bestScore}</p>` : ''}
    </main>`;
  }

  function subScreen(title, body, back) {
    return `<main class="screen panel-screen">
      <div class="panel wide">
        <div class="panel-head"><h1 tabindex="-1">${title}</h1>${btn('← Voltar', back || 'goScreen', back ? null : 'menu')}</div>
        ${body}
      </div></main>`;
  }

  function ranking(app) {
    const rows = app.ranking.map((e, i) => `<tr>
      <td>${i + 1}</td><td>${esc(e.name || 'Aventureiro')}</td><td>${C.CLASSES[e.cls].name}</td>
      <td>${e.victory ? '<span class="tag win">🏆 Vitória</span>' : `<span class="tag lose">💀 Derrota</span>${e.bossReached ? ' <small>(chefe)</small>' : ''}`}</td>
      <td class="num"><b>${e.score}</b></td><td class="num">${e.rooms}</td>
      <td>${new Date(e.date).toLocaleDateString('pt-BR')}</td></tr>`).join('');
    const body = app.ranking.length
      ? `<div class="table-wrap"><table class="ranking"><caption class="sr-only">Dez melhores partidas locais</caption>
          <thead><tr><th>#</th><th>Nome</th><th>Classe</th><th>Resultado</th><th>Pontos</th><th>Salas</th><th>Data</th></tr></thead>
          <tbody>${rows}</tbody></table></div>
          <div class="row-end">${btn('Limpar ranking', 'clearRanking', null, { cls: 'danger' })}</div>`
      : '<p class="empty-note">Nenhuma partida registrada ainda. Complete uma jornada para aparecer aqui.</p>';
    return subScreen('Ranking local', body);
  }

  function helpContent() {
    return `<div class="help">
      <section><h2>Objetivo</h2><p>Atravesse ${CE.map.ROWS} andares da fortaleza e derrote <b>O Regente do Eclipse</b> no topo do mapa. Se seu HP chegar a zero, a jornada termina.</p></section>
      <section><h2>Mapa</h2><p>Escolha uma sala conectada à sua posição atual. Os caminhos se ramificam:</p>
        <ul class="legend-list">${Object.values(CE.map.ROOM_TYPES).map((t) => `<li><span aria-hidden="true">${t.icon}</span> ${t.name}</li>`).join('')}</ul></section>
      <section><h2>Combate</h2><ul>
        <li>A cada turno você recebe <b>3 de energia</b> e compra <b>5 cartas</b>.</li>
        <li>Cada carta mostra seu custo no canto. Use cartas enquanto tiver energia e então <b>encerre o turno</b>.</li>
        <li>O inimigo mostra sua <b>intenção</b> (⚔️ ataque, 🛡️ defesa, efeitos) antes de agir.</li>
        <li><b>Bloqueio</b> absorve dano antes do HP e some no início do seu próximo turno.</li>
        <li>Quando a pilha de compra acaba, o descarte é embaralhado de volta.</li></ul></section>
      <section><h2>Efeitos</h2><ul>${C.STATUS_ORDER.map((s) => `<li><span aria-hidden="true">${C.STATUS[s].icon}</span> <b>${C.STATUS[s].name}</b>: ${C.STATUS[s].desc}</li>`).join('')}
        <li><b>Retenção</b>: a carta permanece na mão ao fim do turno.</li><li><b>Exaurir</b>: a carta sai do combate após o uso.</li></ul></section>
      <section><h2>Progressão</h2><p>Combates dão ouro, experiência e a escolha de uma carta (ou pular). Ao subir de nível você escolhe uma entre três melhorias (máximo nível ${CE.run.MAX_LEVEL}). Você pode carregar até ${C.MAX_POTIONS} consumíveis.</p></section>
      <section><h2>Teclado</h2><ul>
        <li><kbd>Tab</kbd> navega; <kbd>Enter</kbd>/<kbd>Espaço</kbd> confirmam.</li>
        <li>No mapa: <kbd>←</kbd> <kbd>↑</kbd> <kbd>→</kbd> andam até uma sala, <kbd>↓</kbd> volta e <kbd>Espaço</kbd> ataca. Atacar em uma sala com inimigo causa dano e inicia o combate.</li>
        <li>Em combate: <kbd>1</kbd>–<kbd>9</kbd> usam a carta correspondente, <kbd>E</kbd> encerra o turno, <kbd>D</kbd> abre o baralho.</li>
        <li><kbd>Esc</kbd> fecha janelas.</li></ul></section>
      <section><h2>Salvamento</h2><p>O jogo salva automaticamente ao entrar e sair de salas e no início de cada turno de combate. Você pode fechar a página e continuar depois pelo menu.</p></section>
    </div>`;
  }

  function help() { return subScreen('Como jogar', helpContent()); }

  function settings(app) {
    const s = app.settings;
    return subScreen('Configurações', `<form class="settings" onsubmit="return false">
      <label class="field">Volume <input type="range" min="0" max="100" step="5" value="${Math.round(s.volume * 100)}" data-setting="volume" aria-valuetext="${Math.round(s.volume * 100)}%"><output>${Math.round(s.volume * 100)}%</output></label>
      <label class="field check"><input type="checkbox" data-setting="muted"${s.muted ? ' checked' : ''}> Silenciar sons</label>
      <label class="field check"><input type="checkbox" data-setting="reduceMotion"${s.reduceMotion ? ' checked' : ''}> Reduzir animações</label>
      <label class="field">Apelido para o ranking (opcional) <input type="text" maxlength="16" value="${esc(s.nickname)}" data-setting="nickname" placeholder="Aventureiro" autocomplete="off"></label>
      <p class="muted small">As configurações são salvas automaticamente neste navegador. Nenhum dado pessoal é coletado.</p>
    </form>`);
  }

  function credits() {
    return subScreen('Créditos', `<div class="help">
      <p><b>Crônicas do Eclipse</b> — RPG roguelike de cartas para navegador.</p>
      <p>Desenvolvido com HTML, CSS e JavaScript puro, sem bibliotecas externas.</p>
      <p>Ícones: emojis Unicode do sistema. Sons: sintetizados em tempo real com Web Audio API.</p>
      <p>Projeto acadêmico. Todo o conteúdo (cartas, inimigos, eventos) é original.</p>
    </div>`);
  }

  function classSelect(app) {
    const sel = app.ui.selectedClass;
    const cards = Object.values(C.CLASSES).map((cls) => {
      const counts = {};
      cls.starter.forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
      const deck = Object.keys(counts).map((id) => `<li>${counts[id]}× ${C.CARDS[id].name} <small class="muted">— ${esc(C.cardText(C.cardView({ id, up: false })))}</small></li>`).join('');
      return `<button type="button" class="class-card${sel === cls.id ? ' selected' : ''}" data-action="selectClass" data-arg="${cls.id}" aria-pressed="${sel === cls.id}">
        <span class="class-icon">${CE.sprites.svg(cls.id)}</span>
        <span class="class-name">${cls.name}</span>
        <span class="class-desc">${cls.desc}</span>
        <span class="class-attrs"><span>❤️ HP ${cls.maxHp}</span><span>⚡ Energia 3</span><span>🎯 ${cls.focus}</span></span>
        <span class="class-passive"><b>Passiva — ${cls.passiveName}:</b> ${cls.passiveDesc(0)}</span>
        <span class="class-style">Estilo: ${cls.style}</span>
        <span class="class-deck"><b>Baralho inicial:</b><ul>${deck}</ul></span>
      </button>`;
    }).join('');
    return `<main class="screen panel-screen">
      <div class="panel wide">
        <div class="panel-head"><h1 tabindex="-1">Escolha sua classe</h1>${btn('← Voltar', 'goScreen', 'menu')}</div>
        <div class="class-grid">${cards}</div>
        <div class="row-end">${btn(sel ? `Iniciar jornada como ${C.CLASSES[sel].name}` : 'Selecione uma classe', 'confirmClass', null, { cls: 'primary big', disabled: !sel })}</div>
      </div></main>`;
  }

  function errorRecovery(app) {
    return `<main class="screen panel-screen"><div class="panel">
      <h1 tabindex="-1">Não foi possível carregar a jornada</h1>
      <p>O save da jornada ativa está inválido ou é de uma versão incompatível. Suas configurações e o ranking foram preservados.</p>
      <ul class="error-list">${app.ui.recoveryErrors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
      <div class="row-end">${btn('Descartar jornada inválida e voltar ao menu', 'discardInvalid', null, { cls: 'primary' })}</div>
    </div></main>`;
  }

  /* ---------- Mapa ---------- */
  function mapScreen(app) {
    const run = app.run, map = run.map;
    const avail = CE.map.available(run);
    const ROW_H = 74, PAD = 44;
    const H = map.rows * ROW_H + PAD * 2;
    const pos = (n) => ({ x: ((n.lane + 0.5 + (n.dx || 0)) / map.lanes) * 100, y: PAD + (map.rows - n.row) * ROW_H });
    const onPath = (a, b) => run.visited.includes(a) && (run.visited.includes(b) || run.currentNode === b);
    const nodes = Object.values(map.nodes);
    let lines = '';
    nodes.forEach((n) => n.next.forEach((id) => {
      const a = pos(n), b = pos(map.nodes[id]);
      const cls = onPath(n.id, id) ? 'taken' : (n.id === run.currentNode && avail.includes(id)) || (!run.currentNode && false) ? 'open' : '';
      lines += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="${cls}" vector-effect="non-scaling-stroke"/>`;
    }));
    const btns = nodes.map((n) => {
      const t = CE.map.ROOM_TYPES[n.type];
      const p = pos(n);
      const visited = run.visited.includes(n.id);
      const isAvail = avail.includes(n.id);
      const state = visited ? 'visitada' : isAvail ? 'disponível' : 'bloqueada';
      return `<button type="button" class="map-node t-${n.type}${visited ? ' visited' : ''}${isAvail ? ' available' : ''}${run.currentNode === n.id ? ' current' : ''}"
        style="left:${p.x}%;top:${p.y}px" data-action="enterNode" data-arg="${n.id}"${isAvail ? '' : ' disabled'}
        aria-label="${esc(`${t.name}, andar ${n.row + 1}, ${state}`)}" title="${esc(t.name)}"><span aria-hidden="true">${visited ? '✔' : t.icon}</span></button>`;
    }).join('');
    const legend = Object.values(CE.map.ROOM_TYPES).map((t) => `<li><span aria-hidden="true">${t.icon}</span> ${t.name}</li>`).join('');
    return `${hud(app)}
      <main class="screen map-screen">
        <div class="map-side">
          <h1 tabindex="-1">Mapa da fortaleza</h1>
          <p>${avail.length ? 'Escolha uma das salas destacadas. Só é possível avançar por caminhos conectados.' : 'Nenhuma sala disponível.'}</p>
          <ul class="legend-list" aria-label="Legenda">${legend}<li><span aria-hidden="true">✔</span> Visitada</li></ul>
          <p class="muted small">Salas concluídas: ${run.stats.rooms} · Semente: ${run.seed}</p>
        </div>
        <div class="map-scroll" id="map-scroll">
          <div class="map-canvas" style="height:${H}px">
            <svg class="map-lines" viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>
            ${btns}
          </div>
        </div>
      </main>`;
  }

  /* ---------- Combate ---------- */
  function combatScreen(app) {
    const run = app.run, c = run.combat, en = c.enemy, cls = C.CLASSES[run.cls];
    const def = C.ENEMIES[en.id];
    const intent = CE.combat.intentPreview(run);
    const ctx = CE.combat.cardContext(run);
    const busy = app.ui.busy || !!c.result;
    const fx = app.ui.fx || {};
    const intentHTML = intent.parts.map((p) => `<span class="intent-part ${p.kind}" title="${esc(p.label)}"><span aria-hidden="true">${p.icon}</span><b>${p.value}${p.n > 1 ? '×' + p.n : ''}</b><small>${esc(p.label)}</small></span>`).join('');
    const intentAria = intent.parts.map((p) => `${p.label} ${p.value}${p.n > 1 ? ' ' + p.n + ' vezes' : ''}`).join(', ');
    const phase = def.phases ? `<div class="boss-phase">${def.phases[en.phase].name}</div>` : '';
    const hand = c.hand.map((inst, i) => {
      const v = C.cardView(inst);
      const playable = !busy && v.cost <= c.energy;
      return cardHTML(v, { action: 'playCard', arg: i, disabled: !playable, key: i < 9 ? String(i + 1) : '', ctx, ariaExtra: playable ? '' : ' Indisponível: energia insuficiente.' });
    }).join('');
    const potions = run.player.potions.map((id, i) => `<button type="button" class="btn small potion-btn" data-action="openPotion" data-arg="${i}"${busy ? ' disabled' : ''} title="${esc(C.POTIONS[id].desc)}"><span aria-hidden="true">${C.POTIONS[id].icon}</span> ${C.POTIONS[id].name}</button>`).join('');
    const logItems = c.log.slice(-7).map((l) => `<li class="log-${l.k}">${esc(l.t)}</li>`).join('');
    return `${hud(app)}
      <main class="screen combat-screen${en.tier !== 'common' ? ' tier-' + en.tier : ''}">
        <h1 class="sr-only" tabindex="-1">Combate contra ${esc(en.name)}</h1>
        <section class="arena" aria-label="Arena">
          <div class="fighter player${fx.player ? ' hit' : ''}">
            <div class="portrait${fx.playerAttack ? ' lunge-r' : ''}" aria-hidden="true">${CE.sprites.svg(run.cls)}${fx.player ? `<span class="float-dmg">-${fx.player}</span>` : ''}</div>
            <div class="fighter-name">Você <small>(${cls.name})</small></div>
            ${hpBar(run.player.hp, run.player.maxHp, c.block, 'Seu HP')}
            ${statusList(c.status, 'do jogador')}
          </div>
          <div class="turn-badge" aria-live="polite">${c.result ? (c.result === 'win' ? 'Vitória!' : 'Derrota') : app.ui.busy ? 'Turno do inimigo…' : `Turno ${c.turn}`}</div>
          <div class="fighter enemy${fx.enemy ? ' hit' : ''}${en.hp <= 0 ? ' dead' : ''}">
            <div class="intent" role="status" aria-label="${esc('Intenção do inimigo: ' + intent.name + '. ' + intentAria)}">
              <span class="intent-name">Intenção: ${esc(intent.name)}</span><span class="intent-parts">${intentHTML}</span></div>
            <div class="portrait${fx.enemyAttack ? ' lunge-l' : ''}" aria-hidden="true">${CE.sprites.svg(en.id) || def.art}${fx.enemy ? `<span class="float-dmg">-${fx.enemy}</span>` : ''}</div>
            <div class="fighter-name">${esc(en.name)} ${en.tier === 'elite' ? '<span class="tag elite">Elite</span>' : en.tier === 'boss' ? '<span class="tag boss">Chefe</span>' : ''}</div>
            ${phase}
            ${hpBar(en.hp, en.maxHp, en.block, 'HP do inimigo')}
            ${statusList(en.status, 'do inimigo')}
          </div>
        </section>
        <section class="combat-log" aria-label="Histórico de ações"><ul aria-live="polite">${logItems}</ul></section>
        <section class="hand-zone" aria-label="Sua mão">
          <div class="hand-left">
            <div class="energy" aria-label="Energia ${c.energy} de ${c.maxEnergy}"><span aria-hidden="true">⚡</span><b>${c.energy}</b><small>/${c.maxEnergy}</small></div>
            ${btn(`Compra <b>${c.draw.length}</b>`, 'openPile', 'draw', { cls: 'small pile' })}
            ${btn(`Descarte <b>${c.discard.length}</b>`, 'openPile', 'discard', { cls: 'small pile' })}
            ${btn(`Exaustas <b>${c.exhaust.length}</b>`, 'openPile', 'exhaust', { cls: 'small pile' })}
          </div>
          <div class="hand" style="--n:${Math.max(2, c.hand.length)}">${hand || '<p class="muted">Sua mão está vazia.</p>'}</div>
          <div class="hand-right">
            ${potions ? `<div class="potion-bar">${potions}</div>` : ''}
            ${btn('Encerrar turno <kbd>E</kbd>', 'endTurn', null, { cls: 'primary end-turn', disabled: busy })}
          </div>
        </section>
      </main>`;
  }

  /* ---------- Recompensas ---------- */
  function rewardScreen(app) {
    const run = app.run, rw = run.room.rewards;
    const cardDone = rw.cardTaken != null || rw.cardSkipped;
    const cards = rw.cards.map((id, i) => {
      const v = C.cardView({ id, up: false, uid: 0 });
      const chosen = rw.cardTaken === i;
      return cardHTML(v, { action: 'takeRewardCard', arg: i, disabled: cardDone, cls: chosen ? 'chosen' : cardDone ? 'faded' : '', footer: chosen ? '<span class="card-badge">Escolhida</span>' : '' });
    }).join('');
    let item = '';
    if (rw.item) {
      const it = rw.item.kind === 'artifact' ? C.ARTIFACTS[rw.item.id] : C.POTIONS[rw.item.id];
      item = `<div class="reward-item">
        <span class="big-icon" aria-hidden="true">${it.icon}</span>
        <div><b>${rw.item.kind === 'artifact' ? 'Artefato' : 'Consumível'}: ${it.name}</b><p>${it.desc}</p></div>
        ${rw.itemTaken ? '<span class="tag win">Coletado</span>' : btn('Pegar', 'takeRewardItem', null, { cls: 'primary' })}
      </div>`;
    }
    return `${hud(app)}
      <main class="screen panel-screen"><div class="panel wide">
        <h1 tabindex="-1">Recompensas</h1>
        <div class="reward-summary">
          <span class="pill"><span aria-hidden="true">🪙</span> +${rw.gold} de ouro</span>
          <span class="pill"><span aria-hidden="true">✨</span> +${rw.xp} de experiência</span>
          ${rw.levelsGained ? '<span class="pill gold">⬆ Subiu de nível!</span>' : ''}
        </div>
        ${item}
        <h2>Escolha uma carta para o baralho</h2>
        <div class="card-row">${cards}</div>
        <div class="row-end">
          ${cardDone ? '' : btn('Pular carta', 'skipRewardCard')}
          ${btn(rw.levelsGained ? 'Continuar (evoluir)' : 'Continuar', 'leaveReward', null, { cls: 'primary' })}
        </div>
      </div></main>`;
  }

  /* ---------- Evento ---------- */
  function eventScreen(app) {
    const run = app.run, s = run.room.content, ev = C.EVENTS[s.eventId];
    let body;
    if (!s.resolved) {
      body = `<div class="choices">${ev.choices.map((ch, i) => {
        const av = CE.run.choiceAvailable(run, ch);
        return `<button type="button" class="choice" data-action="eventChoice" data-arg="${i}"${av === true ? '' : ' disabled'}>
          <b>${esc(ch.label)}</b><small>${esc(ch.cost)}${av === true ? '' : ' — ' + esc(av)}</small></button>`;
      }).join('')}</div>`;
    } else {
      body = `<div class="event-result" role="status"><p><b>Você escolheu:</b> ${esc(ev.choices[s.choice].label)}</p><p>${esc(s.result)}</p></div>
        <div class="row-end">${btn(s.pendingCombat ? 'Lutar!' : 'Continuar', 'leaveEvent', null, { cls: 'primary' })}</div>`;
    }
    return `${hud(app)}
      <main class="screen panel-screen"><div class="panel event">
        <div class="event-icon" aria-hidden="true">${ev.icon}</div>
        <h1 tabindex="-1">${ev.name}</h1>
        <p class="narrative">${esc(ev.text)}</p>
        ${body}
      </div></main>`;
  }

  /* ---------- Loja ---------- */
  function shopScreen(app) {
    const run = app.run, s = run.room.content, gold = run.player.gold;
    const priceBtn = (kind, i, price, sold, extraDisabled) => sold
      ? '<span class="tag">Vendido</span>'
      : btn(`🪙 ${price}`, 'shopBuy', `${kind}:${i}`, { cls: gold >= price ? 'primary small' : 'small', disabled: gold < price || extraDisabled, aria: `Comprar por ${price} de ouro` + (gold < price ? ' (ouro insuficiente)' : '') });
    const cards = s.cards.map((it, i) => `<div class="shop-item${it.sold ? ' sold' : ''}">${cardHTML(C.cardView({ id: it.id, up: false, uid: 0 }))}${priceBtn('card', i, it.price, it.sold)}</div>`).join('');
    const full = run.player.potions.length >= C.MAX_POTIONS;
    const potions = s.potions.map((it, i) => {
      const p = C.POTIONS[it.id];
      return `<div class="shop-row${it.sold ? ' sold' : ''}"><span class="big-icon" aria-hidden="true">${p.icon}</span><div><b>${p.name}</b><p>${p.desc}</p>${full && !it.sold ? '<small class="warn">Inventário cheio</small>' : ''}</div>${priceBtn('potion', i, it.price, it.sold, full)}</div>`;
    }).join('');
    const art = s.artifact ? (() => {
      const a = C.ARTIFACTS[s.artifact.id];
      return `<div class="shop-row${s.artifact.sold ? ' sold' : ''}"><span class="big-icon" aria-hidden="true">${a.icon}</span><div><b>${a.name}</b><p>${a.desc}</p></div>${priceBtn('artifact', 0, s.artifact.price, s.artifact.sold)}</div>`;
    })() : '<p class="muted">Você já possui todos os artefatos.</p>';
    const rp = CE.run.removalPrice(run);
    return `${hud(app)}
      <main class="screen panel-screen"><div class="panel wide">
        <div class="panel-head"><h1 tabindex="-1"><span aria-hidden="true">💰</span> Mercador das Sombras</h1><span class="pill"><span aria-hidden="true">🪙</span> ${gold} de ouro</span></div>
        <h2>Cartas</h2><div class="card-row">${cards}</div>
        <div class="shop-cols">
          <section><h2>Artefato</h2>${art}</section>
          <section><h2>Consumíveis</h2>${potions}</section>
          <section><h2>Serviço</h2><div class="shop-row${s.removedThisVisit ? ' sold' : ''}"><span class="big-icon" aria-hidden="true">🗑️</span>
            <div><b>Remover uma carta</b><p>Remove permanentemente uma carta do baralho. O preço aumenta a cada uso.</p></div>
            ${s.removedThisVisit ? '<span class="tag">Usado</span>' : btn(`🪙 ${rp}`, 'openPicker', 'remove', { cls: gold >= rp ? 'primary small' : 'small', disabled: gold < rp })}</div></section>
        </div>
        <div class="row-end">${btn('Sair da loja', 'leaveShop', null, { cls: 'primary' })}</div>
      </div></main>`;
  }

  /* ---------- Descanso ---------- */
  function restScreen(app) {
    const run = app.run, s = run.room.content;
    const healAmt = Math.min(Math.ceil(run.player.maxHp * 0.3), run.player.maxHp - run.player.hp);
    const canUp = CE.run.upgradableCards(run).length > 0;
    const body = s.used
      ? `<div class="event-result" role="status"><p>${esc(s.result)}</p></div><div class="row-end">${btn('Continuar', 'leaveRest', null, { cls: 'primary' })}</div>`
      : `<div class="choices two">
          <button type="button" class="choice" data-action="restHeal"><b><span aria-hidden="true">❤️</span> Descansar</b><small>Recupera 30% do HP máximo (+${healAmt} HP).</small></button>
          <button type="button" class="choice" data-action="openPicker" data-arg="upgrade"${canUp ? '' : ' disabled'}><b><span aria-hidden="true">⚒️</span> Aprimorar</b><small>${canUp ? 'Melhora permanentemente uma carta do baralho.' : 'Nenhuma carta pode ser melhorada.'}</small></button>
        </div><div class="row-end">${btn('Seguir sem descansar', 'leaveRest')}</div>`;
    return `${hud(app)}
      <main class="screen panel-screen"><div class="panel event">
        <div class="event-icon campfire" aria-hidden="true">🔥</div>
        <h1 tabindex="-1">Fogueira</h1>
        <p class="narrative">Uma fogueira tranquila crepita em um canto esquecido da fortaleza. Por alguns instantes, o Eclipse parece distante.</p>
        ${body}
      </div></main>`;
  }

  /* ---------- Evolução ---------- */
  function levelUpScreen(app) {
    const run = app.run, sel = app.ui.levelSel;
    const opts = run.levelUp.options.map((o, i) => {
      const d = C.LEVEL_UPS[o.id];
      return `<button type="button" class="choice level-opt${sel === i ? ' selected' : ''}" data-action="selectLevelUp" data-arg="${i}" aria-pressed="${sel === i}">
        <span class="big-icon" aria-hidden="true">${d.icon}</span><b>${d.name}</b><small>${esc(CE.run.levelUpDesc(run, o))}</small></button>`;
    }).join('');
    return `${hud(app)}
      <main class="screen panel-screen"><div class="panel">
        <h1 tabindex="-1"><span aria-hidden="true">⬆</span> Nível ${run.player.level - run.pendingLevels + 1}!</h1>
        <p>Escolha uma melhoria. O efeito é aplicado ao confirmar.</p>
        <div class="choices three">${opts}</div>
        <div class="row-end">${btn('Confirmar melhoria', 'confirmLevelUp', null, { cls: 'primary', disabled: sel == null })}</div>
      </div></main>`;
  }

  /* ---------- Resultado ---------- */
  function resultScreen(app) {
    const res = app.result;
    const win = res.victory;
    const lines = res.score.lines.map((l) => `<tr><td>${esc(l.label)}</td><td class="num">${l.value}</td></tr>`).join('');
    return `<main class="screen panel-screen"><div class="panel result ${win ? 'victory' : 'defeat'}">
      <div class="result-icon" aria-hidden="true">${win ? '🏆' : '💀'}</div>
      <h1 tabindex="-1">${win ? 'Vitória!' : 'Derrota'}</h1>
      <p class="narrative">${win ? 'O Regente do Eclipse cai, e a luz volta a atravessar as janelas da fortaleza.' : 'A escuridão do Eclipse o engole. Mas cada queda ensina algo para a próxima jornada.'}</p>
      <div class="result-stats">
        <span class="pill">${C.CLASSES[res.cls].name}</span><span class="pill">Nível ${res.level}</span>
        <span class="pill">${res.rooms} salas</span><span class="pill">${res.cardsPlayed} cartas usadas</span>
        <span class="pill">${res.damageDealt} de dano causado</span><span class="pill">${res.minutes} min</span>
      </div>
      <table class="score-table"><caption>Pontuação</caption><tbody>${lines}
        <tr class="sub"><td>Subtotal</td><td class="num">${res.score.subtotal}</td></tr>
        ${win ? `<tr><td>Multiplicador de vitória</td><td class="num">×${res.score.multiplier}</td></tr>` : ''}
        ${res.score.penalty ? `<tr><td>Penalidade de tempo</td><td class="num">−${res.score.penalty}</td></tr>` : ''}
        <tr class="total"><td>Total</td><td class="num">${res.score.total}</td></tr></tbody></table>
      <p class="rank-pos">${res.position ? `Registrado no ranking em <b>${res.position}º lugar</b>.` : 'A pontuação não entrou entre as dez melhores.'}</p>
      <div class="row-center">${btn('Ver ranking', 'goScreen', 'ranking')}${btn('Nova jornada', 'newRun', null, { cls: 'primary' })}${btn('Menu', 'goScreen', 'menu')}</div>
    </div></main>`;
  }

  /* ---------- Modais ---------- */
  function modal(app) {
    const m = app.modal;
    if (!m) return '';
    let inner = '';
    const run = app.run;
    switch (m.type) {
      case 'confirm':
        inner = `<h2 id="modal-title">${esc(m.title)}</h2><p>${esc(m.text)}</p>
          <div class="row-end">${btn('Cancelar', 'closeModal')}${btn(esc(m.yesLabel || 'Confirmar'), 'confirmYes', null, { cls: m.danger ? 'danger' : 'primary' })}</div>`;
        break;
      case 'deck': {
        const tab = m.tab || 'deck';
        const tabs = `<div class="tabs" role="tablist">${[['deck', `Baralho (${run.player.deck.length})`], ['inventory', 'Inventário']].map(([id, label]) =>
          `<button type="button" role="tab" class="tab${tab === id ? ' active' : ''}" aria-selected="${tab === id}" data-action="deckTab" data-arg="${id}">${label}</button>`).join('')}</div>`;
        let content;
        if (tab === 'deck') {
          const list = run.player.deck.slice().sort((a, b) => a.id.localeCompare(b.id) || a.uid - b.uid).map((inst) => cardHTML(C.cardView(inst))).join('');
          content = `<div class="card-grid">${list}</div>`;
        } else {
          const arts = run.player.artifacts.map((id) => `<li><span aria-hidden="true">${C.ARTIFACTS[id].icon}</span> <b>${C.ARTIFACTS[id].name}</b> — ${C.ARTIFACTS[id].desc}</li>`).join('') || '<li class="muted">Nenhum artefato.</li>';
          const pots = run.player.potions.map((id) => `<li><span aria-hidden="true">${C.POTIONS[id].icon}</span> <b>${C.POTIONS[id].name}</b> — ${C.POTIONS[id].desc}</li>`).join('') || '<li class="muted">Nenhum consumível.</li>';
          const cls = C.CLASSES[run.cls];
          content = `<h3>Passiva da classe</h3><p><b>${cls.passiveName}</b> (nível ${run.player.passiveLevel + 1}): ${cls.passiveDesc(run.player.passiveLevel)}</p>
            <h3>Artefatos</h3><ul class="inv-list">${arts}</ul>
            <h3>Consumíveis (${run.player.potions.length}/${C.MAX_POTIONS})</h3><ul class="inv-list">${pots}</ul>`;
        }
        inner = `<div class="panel-head"><h2 id="modal-title">Baralho e inventário</h2>${btn('Fechar', 'closeModal')}</div>${tabs}
          ${run.state === 'IN_COMBAT' ? '<p class="muted small">Somente consulta durante o combate.</p>' : ''}${content}`;
        break;
      }
      case 'pile': {
        const c = run.combat;
        const names = { draw: 'Pilha de compra', discard: 'Pilha de descarte', exhaust: 'Cartas exauridas' };
        let list = (c[m.pile] || []).slice();
        if (m.pile === 'draw') list.sort((a, b) => a.id.localeCompare(b.id)); // não revela a ordem
        const html = list.map((inst) => cardHTML(C.cardView(inst))).join('') || '<p class="muted">Vazia.</p>';
        inner = `<div class="panel-head"><h2 id="modal-title">${names[m.pile]} (${list.length})</h2>${btn('Fechar', 'closeModal')}</div>
          ${m.pile === 'draw' ? '<p class="muted small">Exibida em ordem alfabética; a ordem real é oculta.</p>' : ''}<div class="card-grid">${html}</div>`;
        break;
      }
      case 'potion': {
        const id = run.player.potions[m.slot];
        const p = C.POTIONS[id];
        const usable = run.state === 'IN_COMBAT' ? !app.ui.busy : p.anywhere;
        inner = `<h2 id="modal-title"><span aria-hidden="true">${p.icon}</span> ${p.name}</h2><p>${p.desc}</p>
          ${!usable ? '<p class="muted small">Só pode ser usado durante o combate.</p>' : ''}
          <div class="row-end">${btn('Descartar', 'discardPotion', m.slot, { cls: 'danger' })}${btn('Fechar', 'closeModal')}${btn('Usar', 'usePotion', m.slot, { cls: 'primary', disabled: !usable })}</div>`;
        break;
      }
      case 'picker': {
        const isUp = m.mode === 'upgrade';
        const list = (isUp ? CE.run.upgradableCards(run) : run.player.deck).slice().sort((a, b) => a.id.localeCompare(b.id));
        const html = list.map((inst) => {
          const v = C.cardView(inst);
          const preview = isUp ? `<span class="card-badge">→ ${esc(C.cardText(C.cardView({ ...inst, up: true })))}</span>` : '';
          return cardHTML(v, { action: 'pickCard', arg: inst.uid, footer: preview, ariaExtra: isUp ? ' Após melhoria: ' + C.cardText(C.cardView({ ...inst, up: true })) : '' });
        }).join('');
        inner = `<div class="panel-head"><h2 id="modal-title">${isUp ? 'Escolha uma carta para aprimorar' : `Escolha uma carta para remover (🪙 ${CE.run.removalPrice(run)})`}</h2>${btn('Cancelar', 'closeModal')}</div>
          ${!isUp && run.player.deck.length <= CE.run.MIN_DECK ? `<p class="warn">O baralho precisa de pelo menos ${CE.run.MIN_DECK} cartas.</p>` : ''}
          <div class="card-grid">${html}</div>`;
        break;
      }
      case 'runMenu':
        inner = `<h2 id="modal-title">Menu da jornada</h2>
          <div class="menu-buttons">
            ${btn('Continuar jogando', 'closeModal', null, { cls: 'primary' })}
            ${btn('Como jogar', 'openHelpModal')}
            ${btn('Salvar e voltar ao menu', 'saveAndExit')}
            ${btn('Abandonar jornada', 'abandonRun', null, { cls: 'danger' })}
          </div>
          ${run.state === 'IN_COMBAT' ? '<p class="muted small">Em combate, o progresso é salvo no início de cada turno.</p>' : ''}`;
        break;
      case 'help':
        inner = `<div class="panel-head"><h2 id="modal-title">Como jogar</h2>${btn('Fechar', 'closeModal')}</div>${helpContent()}`;
        break;
    }
    return `<div class="modal-backdrop" data-action="backdrop"><div class="modal ${m.type === 'confirm' || m.type === 'potion' || m.type === 'runMenu' ? 'small' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">${inner}</div></div>`;
  }

  function toast(app) {
    const t = app.ui.toast;
    return `<div class="toast${t ? ' show ' + (t.kind || '') : ''}" role="status" aria-live="polite">${t ? esc(t.text) : ''}</div>`;
  }

  function screen(app) {
    switch (app.state) {
      case 'BOOTING': return booting();
      case 'MAIN_MENU':
        if (app.screen === 'ranking') return ranking(app);
        if (app.screen === 'help') return help();
        if (app.screen === 'settings') return settings(app);
        if (app.screen === 'credits') return credits();
        return menu(app);
      case 'CLASS_SELECTION': return classSelect(app);
      case 'EXPLORING': return CE.pixelmap ? CE.pixelmap.mapScreen(app) : mapScreen(app);
      case 'IN_COMBAT': return combatScreen(app);
      case 'CHOOSING_REWARD': return rewardScreen(app);
      case 'IN_EVENT': return eventScreen(app);
      case 'IN_SHOP': return shopScreen(app);
      case 'RESTING': return restScreen(app);
      case 'LEVELING_UP': return levelUpScreen(app);
      case 'VICTORY': case 'DEFEAT': return resultScreen(app);
      case 'ERROR_RECOVERY': return errorRecovery(app);
      default: return '<main class="screen center"><p>Estado desconhecido.</p></main>';
    }
  }

  CE.views = { esc, screen, modal, toast, cardHTML, hud };
})(window.CE = window.CE || {});
