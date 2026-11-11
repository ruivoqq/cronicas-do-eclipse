/* Testes automatizados das regras de maior risco. Abra tests.html no navegador. */
(function (CE) {
  'use strict';
  const C = CE.content;
  const results = [];

  function test(name, fn) {
    try { fn(); results.push({ name, ok: true }); }
    catch (e) { results.push({ name, ok: false, err: e && e.stack ? e.stack : String(e) }); }
  }
  function assert(cond, msg) { if (!cond) throw new Error(msg || 'Asserção falhou'); }
  function eq(a, b, msg) { if (a !== b) throw new Error(`${msg || 'Esperado igual'}: recebido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`); }

  function newRun(cls, seed) { return CE.run.createRun(cls || 'guardian', seed == null ? 12345 : seed); }
  function combatRun(enemy, cls) {
    const run = newRun(cls);
    run.currentNode = 'n0_0';
    CE.combat.startCombat(run, enemy || 'rat', 'normal');
    run.state = 'IN_COMBAT';
    return run;
  }
  function inst(run, id, up) { return { uid: run.nextUid++, id, up: !!up }; }

  /* ---------- RNG ---------- */
  test('RNG com mesma semente gera a mesma sequência (RN25)', () => {
    const a = CE.rng.create(42), b = CE.rng.create(42);
    for (let i = 0; i < 50; i++) eq(CE.rng.next(a), CE.rng.next(b));
  });
  test('derive() é estável para a mesma chave', () => {
    eq(CE.rng.next(CE.rng.derive(7, 'room:n1_1')), CE.rng.next(CE.rng.derive(7, 'room:n1_1')));
  });

  /* ---------- Conteúdo mínimo do MVP ---------- */
  test('Pelo menos 12 cartas por classe (24 no total)', () => {
    ['guardian', 'weaver'].forEach((cls) => assert(Object.values(C.CARDS).filter((c) => c.cls === cls).length >= 12, cls));
  });
  test('Seis inimigos comuns, dois elites e um chefe', () => {
    eq(C.COMMON_ENEMIES.length, 6); eq(C.ELITE_ENEMIES.length, 2);
    assert(Object.values(C.ENEMIES).some((e) => e.tier === 'boss'));
  });
  test('Pelo menos quatro eventos', () => assert(Object.keys(C.EVENTS).length >= 4));
  test('Todos os padrões de inimigos referenciam golpes existentes', () => {
    Object.values(C.ENEMIES).forEach((e) => {
      const pats = e.phases ? e.phases.map((p) => p.pattern) : [e.pattern];
      pats.forEach((p) => p.forEach((k) => assert(e.moves[k], `${e.name}: ${k}`)));
    });
  });

  /* ---------- Dano e bloqueio ---------- */
  test('Cálculo de dano com Força, Fraco e Vulnerável', () => {
    const z = CE.combat.emptyStatus();
    eq(CE.combat.calcDamage(6, z, z), 6);
    eq(CE.combat.calcDamage(6, { ...z, strength: 2 }, z), 8);
    eq(CE.combat.calcDamage(8, { ...z, weak: 1 }, z), 6);
    eq(CE.combat.calcDamage(6, z, { ...z, vulnerable: 1 }), 9);
  });
  test('Bloqueio reduz o dano antes do HP (RN09)', () => {
    const h = { block: 5 };
    eq(CE.combat.absorb(h, 8), 3); eq(h.block, 0);
    const h2 = { block: 10 };
    eq(CE.combat.absorb(h2, 4), 0); eq(h2.block, 6);
  });

  /* ---------- Combate ---------- */
  test('Combate inicia com 5 cartas na mão e 3 de energia', () => {
    const run = combatRun();
    eq(run.combat.hand.length, 5); eq(run.combat.energy, 3);
    eq(run.combat.hand.length + run.combat.draw.length, run.player.deck.length);
  });
  test('Energia insuficiente impede o uso da carta (RN06) e é descontada imediatamente (RN08)', () => {
    const run = combatRun();
    const c = run.combat;
    c.hand = [inst(run, 'g_heavy'), inst(run, 'g_heavy')];
    assert(CE.combat.playCard(run, 0).ok);
    eq(c.energy, 1);
    const r = CE.combat.playCard(run, 0);
    assert(!r.ok, 'deveria falhar'); eq(c.hand.length, 1);
  });
  test('Golpe causa 6 de dano; Golpe+ causa 9', () => {
    const run = combatRun('gargoyle');
    const c = run.combat; c.enemy.hp = 100; c.enemy.maxHp = 100;
    c.hand = [inst(run, 'g_strike'), inst(run, 'g_strike', true)];
    CE.combat.playCard(run, 0); eq(c.enemy.hp, 94);
    CE.combat.playCard(run, 0); eq(c.enemy.hp, 85);
  });
  test('Passiva do Guardião: bônus apenas no primeiro bloqueio do combate', () => {
    const run = combatRun();
    const c = run.combat; c.block = 0; c.flags.firstBlock = false;
    c.hand = [inst(run, 'g_defend'), inst(run, 'g_defend')];
    CE.combat.playCard(run, 0); eq(c.block, 9);
    CE.combat.playCard(run, 0); eq(c.block, 14);
  });
  test('Passiva da Tecelã: primeira Habilidade do turno concede bloqueio', () => {
    const run = combatRun('rat', 'weaver');
    const c = run.combat;
    c.hand = [inst(run, 'a_hex'), inst(run, 'a_hex')]; c.energy = 3; c.block = 0;
    CE.combat.playCard(run, 0); eq(c.block, 4);
    CE.combat.playCard(run, 0); eq(c.block, 4);
  });
  test('Descarte volta para a pilha de compra quando ela esvazia (RN12)', () => {
    const run = combatRun();
    const c = run.combat;
    c.discard = c.draw.concat(c.discard); c.draw = [];
    const total = c.discard.length;
    CE.combat.drawCards(c, 2);
    eq(c.draw.length + c.hand.length, total + 5);
    eq(c.discard.length, 0);
  });
  test('Cartas exauridas não voltam no mesmo combate (RN13)', () => {
    const run = combatRun();
    const c = run.combat;
    c.hand = [inst(run, 'g_skin')];
    CE.combat.playCard(run, 0);
    eq(c.exhaust.length, 1); eq(c.discard.length, 0);
  });
  test('Retenção mantém a carta na mão ao fim do turno', () => {
    const run = combatRun('rat', 'weaver');
    const c = run.combat;
    c.hand = [inst(run, 'a_mirror'), inst(run, 'a_spark')];
    run.player.hp = 999; run.player.maxHp = 999;
    CE.combat.endTurn(run);
    assert(c.hand.some((x) => x.id === 'a_mirror'), 'Espelho deveria permanecer');
  });
  test('Inimigo executa exatamente a intenção mostrada (RN11)', () => {
    const run = combatRun('gargoyle');
    const c = run.combat;
    c.enemy.step = 1; c.enemy.intent = 'crush'; // 13 de dano
    c.hand = []; c.block = 0;
    const preview = CE.combat.intentPreview(run).parts[0].value;
    const hp = run.player.hp;
    CE.combat.endTurn(run);
    eq(hp - run.player.hp, preview);
  });
  test('Vitória quando o HP do inimigo chega a zero', () => {
    const run = combatRun();
    const c = run.combat; c.enemy.hp = 3; c.enemy.block = 0;
    c.hand = [inst(run, 'g_strike')];
    CE.combat.playCard(run, 0);
    eq(c.result, 'win');
  });
  test('Derrota quando o HP do jogador chega a zero (RN04)', () => {
    const run = combatRun('gargoyle');
    const c = run.combat; run.player.hp = 1; c.block = 0; c.hand = [];
    c.enemy.intent = 'crush';
    CE.combat.endTurn(run);
    eq(c.result, 'lose');
    eq(CE.run.resolveCombat(run), 'defeat');
  });
  test('Veneno causa dano ao fim da rodada e diminui', () => {
    const run = combatRun('cultist');
    const c = run.combat; c.enemy.intent = 'chant'; c.enemy.status.poison = 5; c.enemy.hp = 50; c.hand = [];
    CE.combat.endTurn(run);
    eq(c.enemy.hp, 45); eq(c.enemy.status.poison, 4);
  });
  test('Debuff aplicado pelo inimigo dura até o próximo turno do jogador', () => {
    const run = combatRun('rat');
    const c = run.combat; c.enemy.intent = 'gnaw'; c.hand = [];
    CE.combat.endTurn(run);
    eq(c.status.weak, 1);
  });
  test('Chefe muda de fase com metade do HP e remove efeitos negativos', () => {
    const run = newRun();
    run.currentNode = 'boss';
    CE.combat.startCombat(run, 'regent', 'boss');
    const c = run.combat;
    c.enemy.status.vulnerable = 2; c.enemy.hp = Math.floor(c.enemy.maxHp / 2) + 3; c.enemy.block = 0;
    c.hand = [inst(run, 'g_strike')];
    CE.combat.playCard(run, 0);
    eq(c.enemy.phase, 1); eq(c.enemy.status.vulnerable, 0); assert(c.enemy.status.eclipse > 0);
    assert(C.ENEMIES.regent.phases[1].pattern.includes(c.enemy.intent));
  });

  /* ---------- Mapa ---------- */
  test('Mapas gerados sempre possuem caminho válido até o chefe (200 sementes)', () => {
    for (let s = 1; s <= 200; s++) {
      const m = CE.map.generateMap(s);
      assert(CE.map.validateMap(m), 'semente ' + s);
      assert(Object.values(m.nodes).some((n) => n.type === 'shop'), 'sem loja ' + s);
      assert(Object.values(m.nodes).some((n) => n.type === 'elite'), 'sem elite ' + s);
    }
  });
  test('Só é possível acessar salas conectadas (RN02)', () => {
    const run = newRun();
    const start = CE.map.available(run)[0];
    const far = Object.values(run.map.nodes).find((n) => n.row === 5).id;
    assert(!CE.run.enterNode(run, far).ok);
    assert(CE.run.enterNode(run, start).ok);
  });

  test('Ataque inicial no mapa causa dano ao abrir o combate, no inimigo previsto para a sala', () => {
    const a = newRun('weaver', 555), b = newRun('weaver', 555);
    const start = CE.map.available(a)[0];
    const expected = CE.run.peekEnemy(a, start);
    CE.run.enterNode(a, start);
    CE.run.enterNode(b, start, { openingStrike: true });
    eq(a.combat.enemy.id, expected);
    eq(a.combat.enemy.hp - b.combat.enemy.hp, CE.combat.OPENING.weaver.damage);
  });

  /* ---------- Progressão ---------- */
  test('Experiência excedente é mantida ao subir de nível (RN19)', () => {
    const run = newRun();
    eq(CE.run.gainXp(run, 30), 1);
    eq(run.player.level, 2); eq(run.player.xp, 5); eq(run.pendingLevels, 1);
  });
  test('Nível máximo é 5', () => {
    const run = newRun();
    CE.run.gainXp(run, 9999);
    eq(run.player.level, 5);
  });
  test('Recompensa de carta só pode ser escolhida uma vez (RN14)', () => {
    const run = combatRun();
    run.room = { nodeId: 'n0_0', type: 'combat', completed: false, content: {}, rewards: null };
    run.combat.result = 'win';
    eq(CE.run.resolveCombat(run), 'reward');
    const size = run.player.deck.length;
    assert(CE.run.takeRewardCard(run, 0).ok);
    assert(!CE.run.takeRewardCard(run, 1).ok);
    eq(run.player.deck.length, size + 1);
  });
  test('HP nunca ultrapassa o máximo (RN05)', () => {
    const run = newRun();
    run.player.hp = run.player.maxHp - 2;
    eq(CE.run.heal(run, 50), 2); eq(run.player.hp, run.player.maxHp);
  });
  test('Limite de 3 consumíveis (RN18)', () => {
    const run = newRun();
    run.player.potions = ['heal', 'fire', 'acid'];
    assert(!CE.run.gainPotion(run, 'heal'));
  });

  /* ---------- Loja ---------- */
  function shopRun() {
    const run = newRun();
    run.state = 'IN_SHOP';
    run.room = { nodeId: 'x', type: 'shop', completed: false, content: { cards: [{ id: 'g_wall', price: 50, sold: false }], potions: [{ id: 'heal', price: 40, sold: false }], artifact: { id: 'shield_stone', price: 140, sold: false }, removedThisVisit: false } };
    return run;
  }
  test('Compra exige ouro suficiente (RN16) e remove o item do estoque (RN17)', () => {
    const run = shopRun();
    run.player.gold = 10;
    assert(!CE.run.shopBuy(run, 'card', 0).ok);
    run.player.gold = 100;
    assert(CE.run.shopBuy(run, 'card', 0).ok);
    eq(run.player.gold, 50);
    assert(!CE.run.shopBuy(run, 'card', 0).ok);
  });
  test('Preço de remoção aumenta a cada uso', () => {
    const run = shopRun();
    run.player.gold = 500;
    const p1 = CE.run.removalPrice(run);
    assert(CE.run.shopRemove(run, run.player.deck[0].uid).ok);
    assert(CE.run.removalPrice(run) > p1);
  });
  test('Estoque da loja é estável para a mesma sala e semente (RN30)', () => {
    const a = newRun('weaver', 999), b = newRun('weaver', 999);
    const shop = Object.values(a.map.nodes).find((n) => n.type === 'shop');
    a.state = b.state = 'EXPLORING';
    a.currentNode = b.currentNode = null;
    // força disponibilidade para teste
    a.visited = b.visited = []; a.map.nodes[shop.id].row = 0; b.map.nodes[shop.id].row = 0;
    CE.run.enterNode(a, shop.id); CE.run.enterNode(b, shop.id);
    eq(JSON.stringify(a.room.content), JSON.stringify(b.room.content));
  });

  /* ---------- Eventos ---------- */
  test('Decisão de evento não pode ser desfeita (RN29)', () => {
    const run = newRun();
    run.state = 'IN_EVENT'; run.currentNode = 'n0_0';
    run.room = { nodeId: 'n0_0', type: 'event', completed: false, content: { eventId: 'library', resolved: false } };
    assert(CE.run.resolveEvent(run, 1).ok);
    assert(!CE.run.resolveEvent(run, 0).ok);
  });

  /* ---------- Pontuação e ranking ---------- */
  test('Pontuação segue a fórmula documentada', () => {
    const run = newRun();
    run.stats = { rooms: 10, enemies: 6, elites: 2, boss: 1, cardsPlayed: 0, damageDealt: 0, goldEarned: 0, combats: 0 };
    run.player.hp = 40; run.player.gold = 100; run.player.level = 4; run.playMs = 0;
    const s = CE.score.computeScore(run, true);
    eq(s.subtotal, 100 + 90 + 80 + 150 + 40 + 50 + 60);
    eq(s.total, Math.round(s.subtotal * 1.5));
    eq(CE.score.computeScore(run, false).total, s.subtotal);
  });
  test('Ranking ordenado e limitado a 10 entradas; desempate por vitória (RN23/RN24)', () => {
    let list = [];
    for (let i = 0; i < 15; i++) list = CE.score.insertEntry(list, { name: 'a', cls: 'guardian', score: i * 10, victory: false, rooms: 1, date: i }).list;
    eq(list.length, 10); eq(list[0].score, 140);
    const r = CE.score.insertEntry([{ score: 100, victory: false, rooms: 5, date: 1 }], { score: 100, victory: true, rooms: 1, date: 2 });
    eq(r.position, 1);
  });

  /* ---------- Persistência ---------- */
  test('Save válido passa na validação após JSON ida e volta', () => {
    const run = newRun();
    const copy = JSON.parse(JSON.stringify(run));
    eq(CE.persistence.validateRun(copy).length, 0);
  });
  test('Save corrompido ou adulterado é rejeitado (RNF14)', () => {
    const run = JSON.parse(JSON.stringify(newRun()));
    run.player.hp = 9999;
    assert(CE.persistence.validateRun(run).length > 0);
    assert(CE.persistence.validateRun(null).length > 0);
    assert(CE.persistence.validateRun({ version: 99 }).length > 0);
    const r2 = JSON.parse(JSON.stringify(newRun())); r2.player.deck.push({ uid: 99, id: '<script>', up: false });
    assert(CE.persistence.validateRun(r2).length > 0);
  });

  /* ---------- Simulação completa ---------- */
  function autoplay(cls, seed) {
    const run = CE.run.createRun(cls, seed);
    let guard = 0;
    while (guard++ < 5000) {
      // valida o save em todo ponto estável
      if (run.state !== 'VICTORY' && run.state !== 'DEFEAT') {
        const errs = CE.persistence.validateRun(JSON.parse(JSON.stringify(run)));
        if (errs.length) throw new Error(`Save inválido em ${run.state}: ${errs.join('; ')}`);
      }
      switch (run.state) {
        case 'EXPLORING': {
          const av = CE.map.available(run);
          const pref = ['rest', 'shop', 'event', 'combat', 'elite', 'boss'];
          av.sort((a, b) => pref.indexOf(run.map.nodes[a].type) - pref.indexOf(run.map.nodes[b].type));
          const r = CE.run.enterNode(run, av[0]);
          if (!r.ok) throw new Error('enterNode: ' + r.reason);
          break;
        }
        case 'IN_COMBAT': {
          const c = run.combat;
          let played = true;
          while (played && !c.result) {
            played = false;
            for (let i = 0; i < c.hand.length; i++) {
              if (CE.combat.canPlay(run, i).ok) { CE.combat.playCard(run, i); played = true; break; }
            }
          }
          if (!c.result && run.player.potions.length) CE.combat.usePotion(run, 0);
          if (!c.result) CE.combat.endTurn(run);
          if (c.result) CE.run.resolveCombat(run);
          if (c.turn > 200) throw new Error('Combate não termina');
          break;
        }
        case 'CHOOSING_REWARD':
          CE.run.takeRewardCard(run, 0);
          CE.run.takeRewardItem(run);
          CE.run.completeRoom(run);
          break;
        case 'IN_EVENT': {
          const s = run.room.content;
          if (!s.resolved) {
            const ev = C.EVENTS[s.eventId];
            const idx = ev.choices.findIndex((ch) => CE.run.choiceAvailable(run, ch) === true);
            if (!CE.run.resolveEvent(run, idx).ok) throw new Error('evento');
          } else CE.run.leaveEvent(run);
          break;
        }
        case 'IN_SHOP':
          CE.run.shopBuy(run, 'card', 0);
          CE.run.completeRoom(run);
          break;
        case 'RESTING':
          if (run.player.hp < run.player.maxHp * 0.6) CE.run.restHeal(run);
          else { const up = CE.run.upgradableCards(run); if (up.length) CE.run.restUpgrade(run, up[0].uid); }
          CE.run.completeRoom(run);
          break;
        case 'LEVELING_UP':
          if (!CE.run.chooseLevelUp(run, 0).ok) throw new Error('levelup');
          break;
        case 'VICTORY': case 'DEFEAT':
          return run;
        default: throw new Error('Estado inesperado: ' + run.state);
      }
      if (run.player.hp > run.player.maxHp) throw new Error('HP acima do máximo');
    }
    throw new Error('Jornada não terminou');
  }

  const sim = { victory: 0, defeat: 0, rooms: 0 };
  test('Simulação: 60 jornadas completas sem erros (30 por classe)', () => {
    for (let s = 1; s <= 30; s++) {
      ['guardian', 'weaver'].forEach((cls) => {
        const run = autoplay(cls, s * 7919);
        sim[run.state === 'VICTORY' ? 'victory' : 'defeat']++;
        sim.rooms += run.stats.rooms;
        const score = CE.score.computeScore(run, run.state === 'VICTORY');
        assert(score.total >= 0);
      });
    }
  });

  /* ---------- Saída ---------- */
  const ol = document.getElementById('results');
  results.forEach((r) => {
    const li = document.createElement('li');
    li.className = r.ok ? 'pass' : 'fail';
    li.textContent = (r.ok ? '✔ ' : '✘ ') + r.name;
    if (!r.ok) { const pre = document.createElement('pre'); pre.textContent = r.err; li.appendChild(pre); }
    ol.appendChild(li);
  });
  const passed = results.filter((r) => r.ok).length;
  const summary = document.getElementById('summary');
  summary.textContent = `${passed}/${results.length} testes passaram` +
    ` · Simulação (bot simples): ${sim.victory} vitórias, ${sim.defeat} derrotas, média de ${(sim.rooms / 60).toFixed(1)} salas`;
  summary.className = passed === results.length ? 'pass' : 'fail';
  window.TEST_RESULTS = { passed, total: results.length, results, sim };
})(window.CE);
