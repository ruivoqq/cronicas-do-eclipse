/* Domínio: jornada — salas, recompensas, progressão, loja, descanso e eventos.
 * Todas as funções recebem o objeto `run` e devolvem { ok, reason?, ... }. */
(function (CE) {
  'use strict';
  const R = CE.rng;
  const C = CE.content;

  const SAVE_VERSION = 1;
  const START_GOLD = 99;
  const XP_NEEDED = [0, 25, 35, 45, 55]; // XP para sair do nível i
  const MAX_LEVEL = 5;
  const MIN_DECK = 5;

  const ok = (extra) => Object.assign({ ok: true }, extra || {});
  const fail = (reason) => ({ ok: false, reason });

  /* ---------- Criação ---------- */
  function createRun(clsId, seed) {
    const cls = C.CLASSES[clsId];
    if (!cls) throw new Error('Classe inválida'); // RN01
    const run = {
      version: SAVE_VERSION,
      id: 'run-' + seed.toString(36) + '-' + Date.now().toString(36),
      seed, cls: clsId, difficulty: 'normal', state: 'EXPLORING',
      createdAt: Date.now(), playMs: 0, nextUid: 1,
      player: { hp: cls.maxHp, maxHp: cls.maxHp, gold: START_GOLD, level: 1, xp: 0, passiveLevel: 0, deck: [], artifacts: [], potions: ['heal'] },
      map: CE.map.generateMap(seed),
      currentNode: null, visited: [], room: null, combat: null,
      seenEvents: [], removeCount: 0, pendingLevels: 0, levelUps: 0, levelUp: null,
      stats: { rooms: 0, combats: 0, enemies: 0, elites: 0, boss: 0, cardsPlayed: 0, damageDealt: 0, goldEarned: 0 },
    };
    if (!CE.map.validateMap(run.map)) throw new Error('Mapa inválido gerado');
    cls.starter.forEach((id) => addCard(run, id));
    return run;
  }

  /* ---------- Helpers de jogador ---------- */
  function addCard(run, id, up) {
    const inst = { uid: run.nextUid++, id, up: !!up };
    run.player.deck.push(inst);
    return inst;
  }
  function heal(run, v) {
    const p = run.player;
    const before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + v); // RN05
    return p.hp - before;
  }
  function loseHp(run, v) {
    const p = run.player;
    const before = p.hp;
    p.hp = Math.max(1, p.hp - v); // eventos nunca matam
    return before - p.hp;
  }
  function loseMaxHp(run, v) {
    const p = run.player;
    p.maxHp = Math.max(10, p.maxHp - v);
    p.hp = Math.min(p.hp, p.maxHp);
  }
  function gainGold(run, v) { run.player.gold += v; run.stats.goldEarned += v; }
  function spendGold(run, v) { run.player.gold -= v; }
  function gainPotion(run, id) {
    if (run.player.potions.length >= C.MAX_POTIONS) return false; // RN18
    run.player.potions.push(id);
    return true;
  }
  function gainArtifact(run, id) {
    if (run.player.artifacts.includes(id)) return false;
    run.player.artifacts.push(id);
    if (id === 'iron_heart') { run.player.maxHp += 10; heal(run, 10); }
    return true;
  }
  function availableArtifacts(run) { return C.ARTIFACT_ORDER.filter((id) => !run.player.artifacts.includes(id)); }
  function gainRandomArtifact(run, r) {
    const pool = availableArtifacts(run);
    if (!pool.length) return null;
    const id = R.pick(r, pool);
    gainArtifact(run, id);
    return C.ARTIFACTS[id].name;
  }
  function upgradableCards(run) { return run.player.deck.filter((c) => !c.up && C.CARDS[c.id].up); }
  function upgradeCard(run, uid) {
    const card = run.player.deck.find((c) => c.uid === uid);
    if (!card) return fail('Carta não encontrada.');
    if (card.up || !C.CARDS[card.id].up) return fail('Esta carta já está melhorada.');
    card.up = true;
    return ok({ name: C.cardView(card).name });
  }
  function upgradeRandom(run, r) {
    const list = upgradableCards(run);
    if (!list.length) return null;
    return upgradeCard(run, R.pick(r, list).uid).name;
  }
  function starterCards(run) { return run.player.deck.filter((c) => C.CARDS[c.id].rarity === 'starter'); }
  function removeCard(run, uid) {
    const i = run.player.deck.findIndex((c) => c.uid === uid);
    if (i < 0) return fail('Carta não encontrada.');
    if (run.player.deck.length <= MIN_DECK) return fail(`O baralho precisa de pelo menos ${MIN_DECK} cartas.`);
    const [c] = run.player.deck.splice(i, 1);
    return ok({ name: C.cardView(c).name });
  }
  function removeRandomStarter(run, r) {
    const list = starterCards(run);
    if (!list.length) return null;
    return removeCard(run, R.pick(r, list).uid).name;
  }
  function addRandomCard(run, r, rarity) {
    const pool = Object.keys(C.CARDS).filter((id) => C.CARDS[id].cls === run.cls && C.CARDS[id].rarity === rarity);
    const id = R.pick(r, pool);
    addCard(run, id);
    return C.CARDS[id].name;
  }

  /* ---------- Experiência ---------- */
  function xpToNext(level) { return level >= MAX_LEVEL ? Infinity : XP_NEEDED[level]; }
  /** Excedente é mantido; o nível sobe imediatamente e a escolha fica pendente (RN19). */
  function gainXp(run, v) {
    const p = run.player;
    if (p.level >= MAX_LEVEL) return 0;
    p.xp += v;
    let ups = 0;
    while (p.level < MAX_LEVEL && p.xp >= xpToNext(p.level)) {
      p.xp -= xpToNext(p.level);
      p.level++;
      run.pendingLevels++;
      ups++;
    }
    if (p.level >= MAX_LEVEL) p.xp = 0;
    return ups;
  }

  function generateLevelUp(run) {
    const r = R.derive(run.seed, 'levelup:' + run.levelUps);
    const pool = ['vitality', 'recover', 'mastery', 'fortune'];
    const up = upgradableCards(run);
    if (up.length) pool.push('refine');
    const picks = R.sample(r, pool, 3);
    return { options: picks.map((id) => ({ id, target: id === 'refine' ? R.pick(r, up).uid : null })) };
  }

  function levelUpDesc(run, opt) {
    const p = run.player;
    switch (opt.id) {
      case 'vitality': return '+8 de HP máximo e recupera 8 de HP.';
      case 'recover': return `Recupera 30% do HP máximo (${Math.ceil(p.maxHp * 0.3)} HP).`;
      case 'mastery': return `${C.CLASSES[run.cls].passiveName}: ${C.CLASSES[run.cls].passiveDesc(p.passiveLevel + 1)}`;
      case 'fortune': return 'Ganha 40 de ouro.';
      case 'refine': {
        const card = p.deck.find((c) => c.uid === opt.target);
        return card ? `Melhora ${C.CARDS[card.id].name} → ${C.cardView({ ...card, up: true }).name}.` : 'Melhora uma carta.';
      }
    }
    return '';
  }

  function chooseLevelUp(run, idx) {
    if (run.state !== 'LEVELING_UP' || !run.levelUp) return fail('Nenhuma evolução pendente.');
    const opt = run.levelUp.options[idx];
    if (!opt) return fail('Opção inválida.');
    const p = run.player;
    switch (opt.id) {
      case 'vitality': p.maxHp += 8; heal(run, 8); break;
      case 'recover': heal(run, Math.ceil(p.maxHp * 0.3)); break;
      case 'mastery': p.passiveLevel++; break;
      case 'fortune': gainGold(run, 40); break;
      case 'refine': upgradeCard(run, opt.target); break;
    }
    run.pendingLevels--;
    run.levelUps++;
    if (run.pendingLevels > 0) run.levelUp = generateLevelUp(run);
    else { run.levelUp = null; run.state = 'EXPLORING'; }
    return ok({ name: C.LEVEL_UPS[opt.id].name });
  }

  /* ---------- Salas ---------- */
  /** Qual inimigo está em uma sala (mesmo sorteio usado ao entrar: conteúdo estável, RN30). */
  function peekEnemy(run, nodeId) {
    const node = run.map.nodes[nodeId];
    if (!node) return null;
    if (node.type === 'boss') return 'regent';
    const r = R.derive(run.seed, 'room:' + nodeId);
    if (node.type === 'combat') return R.pick(r, node.row <= 2 ? C.EARLY_ENEMIES : C.COMMON_ENEMIES);
    if (node.type === 'elite') return R.pick(r, C.ELITE_ENEMIES);
    return null;
  }

  /** opts.openingStrike: o jogador abriu o combate atacando no mapa. */
  function enterNode(run, nodeId, opts) {
    if (run.state !== 'EXPLORING') return fail('Conclua a etapa atual primeiro.');
    if (!CE.map.available(run).includes(nodeId)) return fail('Esta sala não está conectada à sua posição.'); // RN02
    const node = run.map.nodes[nodeId];
    run.currentNode = nodeId;
    const r = R.derive(run.seed, 'room:' + nodeId);
    run.room = { nodeId, type: node.type, completed: false, content: null, rewards: null };
    switch (node.type) {
      case 'combat': {
        const enemy = R.pick(r, node.row <= 2 ? C.EARLY_ENEMIES : C.COMMON_ENEMIES);
        run.room.content = { enemy };
        beginCombat(run, enemy, 'normal');
        break;
      }
      case 'elite': {
        const enemy = R.pick(r, C.ELITE_ENEMIES);
        run.room.content = { enemy };
        beginCombat(run, enemy, 'elite');
        break;
      }
      case 'boss':
        run.room.content = { enemy: 'regent' };
        beginCombat(run, 'regent', 'boss');
        break;
      case 'event': {
        const all = Object.keys(C.EVENTS);
        const pool = all.filter((id) => !run.seenEvents.includes(id));
        const id = R.pick(r, pool.length ? pool : all);
        run.seenEvents.push(id);
        run.room.content = { eventId: id, resolved: false, choice: null, result: null, pendingCombat: null };
        run.state = 'IN_EVENT';
        break;
      }
      case 'shop':
        run.room.content = generateShop(run, r);
        run.state = 'IN_SHOP';
        break;
      case 'rest':
        run.room.content = { used: false, result: null };
        run.state = 'RESTING';
        break;
    }
    if (opts && opts.openingStrike && run.state === 'IN_COMBAT') CE.combat.openingStrike(run);
    return ok({ type: node.type });
  }

  function beginCombat(run, enemyId, kind) {
    run.stats.combats++;
    CE.combat.startCombat(run, enemyId, kind);
    run.state = 'IN_COMBAT';
  }

  /** Processa o fim do combate. Retorna 'victory' | 'defeat' | 'reward'. */
  function resolveCombat(run) {
    const c = run.combat;
    if (!c || !c.result) return null;
    run.stats.cardsPlayed += c.cardsPlayed;
    run.stats.damageDealt += c.damageDealt;
    if (c.result === 'lose') { run.state = 'DEFEAT'; return 'defeat'; }
    if (c.kind === 'boss') { // RN20
      run.stats.boss = 1;
      if (run.room && !run.room.completed) { run.room.completed = true; run.visited.push(run.currentNode); run.stats.rooms++; }
      run.state = 'VICTORY';
      return 'victory';
    }
    if (c.kind === 'elite') run.stats.elites++; else run.stats.enemies++;
    if (run.player.artifacts.includes('crimson_chalice')) heal(run, 6);
    const rw = generateRewards(run, c.kind);
    gainGold(run, rw.gold);
    rw.levelsGained = gainXp(run, rw.xp);
    run.room.rewards = rw;
    run.combat = null;
    run.state = 'CHOOSING_REWARD';
    return 'reward';
  }

  function rollCards(run, r, n, weights) {
    const byRarity = {};
    Object.keys(C.CARDS).forEach((id) => {
      const d = C.CARDS[id];
      if (d.cls !== run.cls || d.rarity === 'starter') return;
      (byRarity[d.rarity] = byRarity[d.rarity] || []).push(id);
    });
    const out = [];
    let guard = 0;
    while (out.length < n && guard++ < 100) {
      const rar = R.weighted(r, weights);
      const pool = (byRarity[rar] || []).filter((id) => !out.includes(id));
      if (pool.length) out.push(R.pick(r, pool));
    }
    return out;
  }
  const NORMAL_WEIGHTS = [['common', 60], ['uncommon', 32], ['rare', 8]];
  const ELITE_WEIGHTS = [['common', 40], ['uncommon', 42], ['rare', 18]];
  const SHOP_WEIGHTS = [['common', 45], ['uncommon', 38], ['rare', 17]];

  function generateRewards(run, kind) {
    const r = R.derive(run.seed, 'reward:' + run.currentNode + ':' + run.stats.combats);
    const elite = kind === 'elite';
    let gold = elite ? R.int(r, 30, 40) : R.int(r, 12, 20);
    if (run.player.artifacts.includes('enchanted_purse')) gold += 10;
    const xp = elite ? 30 : 12;
    const cards = rollCards(run, r, 3, elite ? ELITE_WEIGHTS : NORMAL_WEIGHTS);
    let item = null;
    if (elite) {
      const pool = availableArtifacts(run);
      item = pool.length ? { kind: 'artifact', id: R.pick(r, pool) } : { kind: 'potion', id: R.pick(r, Object.keys(C.POTIONS)) };
    } else if (R.next(r) < 0.4) {
      item = { kind: 'potion', id: R.pick(r, Object.keys(C.POTIONS)) };
    }
    return { gold, xp, cards, cardTaken: null, cardSkipped: false, item, itemTaken: false };
  }

  function takeRewardCard(run, idx) {
    const rw = run.room && run.room.rewards;
    if (run.state !== 'CHOOSING_REWARD' || !rw) return fail('Nenhuma recompensa disponível.');
    if (rw.cardTaken != null || rw.cardSkipped) return fail('A recompensa de carta já foi resolvida.'); // RN14
    const id = rw.cards[idx];
    if (!id) return fail('Carta inválida.');
    addCard(run, id);
    rw.cardTaken = idx;
    return ok({ name: C.CARDS[id].name });
  }
  function skipRewardCard(run) {
    const rw = run.room && run.room.rewards;
    if (!rw || rw.cardTaken != null || rw.cardSkipped) return fail('A recompensa de carta já foi resolvida.');
    rw.cardSkipped = true; // RN15
    return ok();
  }
  function takeRewardItem(run) {
    const rw = run.room && run.room.rewards;
    if (!rw || !rw.item || rw.itemTaken) return fail('Item indisponível.');
    if (rw.item.kind === 'potion') {
      if (!gainPotion(run, rw.item.id)) return fail(`Limite de ${C.MAX_POTIONS} consumíveis atingido. Use ou descarte um antes.`);
    } else if (!gainArtifact(run, rw.item.id)) return fail('Você já possui este artefato.');
    rw.itemTaken = true;
    return ok();
  }

  /** Conclui a sala atual (RN03) e volta ao mapa ou à evolução de nível. */
  function completeRoom(run) {
    if (run.room && !run.room.completed) {
      run.room.completed = true;
      if (!run.visited.includes(run.currentNode)) run.visited.push(run.currentNode);
      run.stats.rooms++;
    }
    run.room = null;
    run.combat = null;
    if (run.pendingLevels > 0) {
      run.state = 'LEVELING_UP';
      run.levelUp = generateLevelUp(run);
    } else run.state = 'EXPLORING';
    return ok();
  }

  /* ---------- Loja ---------- */
  const CARD_PRICES = { common: [45, 55], uncommon: [68, 80], rare: [105, 125] };

  function generateShop(run, r) {
    const cards = rollCards(run, r, 3, SHOP_WEIGHTS).map((id) => {
      const pr = CARD_PRICES[C.CARDS[id].rarity];
      return { id, price: R.int(r, pr[0], pr[1]), sold: false };
    });
    const arts = availableArtifacts(run);
    const artifact = arts.length ? { id: R.pick(r, arts), price: R.int(r, 130, 160), sold: false } : null;
    const potions = R.sample(r, Object.keys(C.POTIONS), R.int(r, 1, 2)).map((id) => ({ id, price: R.int(r, 35, 50), sold: false }));
    return { cards, artifact, potions, removedThisVisit: false };
  }

  function removalPrice(run) { return 50 + 25 * run.removeCount; }

  function shopBuy(run, kind, idx) {
    if (run.state !== 'IN_SHOP') return fail('Você não está na loja.');
    const s = run.room.content;
    const item = kind === 'card' ? s.cards[idx] : kind === 'potion' ? s.potions[idx] : s.artifact;
    if (!item) return fail('Item inválido.');
    if (item.sold) return fail('Este item já foi vendido.'); // RN17
    if (run.player.gold < item.price) return fail('Ouro insuficiente.'); // RN16
    if (kind === 'potion' && run.player.potions.length >= C.MAX_POTIONS) return fail(`Limite de ${C.MAX_POTIONS} consumíveis atingido.`);
    if (kind === 'artifact' && run.player.artifacts.includes(item.id)) return fail('Você já possui este artefato.');
    spendGold(run, item.price);
    if (kind === 'card') addCard(run, item.id);
    else if (kind === 'potion') gainPotion(run, item.id);
    else gainArtifact(run, item.id);
    item.sold = true;
    const name = kind === 'card' ? C.CARDS[item.id].name : kind === 'potion' ? C.POTIONS[item.id].name : C.ARTIFACTS[item.id].name;
    return ok({ name });
  }

  function shopRemove(run, uid) {
    if (run.state !== 'IN_SHOP') return fail('Você não está na loja.');
    const s = run.room.content;
    if (s.removedThisVisit) return fail('O serviço de remoção já foi usado nesta loja.');
    const price = removalPrice(run);
    if (run.player.gold < price) return fail('Ouro insuficiente.');
    const res = removeCard(run, uid);
    if (!res.ok) return res;
    spendGold(run, price);
    run.removeCount++;
    s.removedThisVisit = true;
    return res;
  }

  /* ---------- Descanso ---------- */
  function restHeal(run) {
    const s = run.room && run.room.content;
    if (run.state !== 'RESTING' || s.used) return fail('Você já descansou aqui.');
    const h = heal(run, Math.ceil(run.player.maxHp * 0.3));
    s.used = true;
    s.result = `Você descansa junto à fogueira e recupera ${h} de HP.`;
    return ok();
  }
  function restUpgrade(run, uid) {
    const s = run.room && run.room.content;
    if (run.state !== 'RESTING' || s.used) return fail('Você já descansou aqui.');
    const res = upgradeCard(run, uid);
    if (!res.ok) return res;
    s.used = true;
    s.result = `Você afia sua técnica: ${res.name}.`;
    return res;
  }

  /* ---------- Eventos ---------- */
  const eventApi = {
    heal, loseHp, loseMaxHp, gainGold, spendGold, gainXp, gainPotion, upgradeRandom, upgradableCards,
    starterCards, removeRandomStarter, addRandomCard, availableArtifacts, gainRandomArtifact,
  };

  function choiceAvailable(run, ch) {
    return ch.available ? ch.available(run, eventApi) : true;
  }

  function resolveEvent(run, idx) {
    if (run.state !== 'IN_EVENT') return fail('Nenhum evento ativo.');
    const s = run.room.content;
    if (s.resolved) return fail('A decisão já foi tomada.'); // RN29
    const ev = C.EVENTS[s.eventId];
    const ch = ev.choices[idx];
    if (!ch) return fail('Escolha inválida.');
    const av = choiceAvailable(run, ch);
    if (av !== true) return fail(av);
    const r = R.derive(run.seed, 'event:' + run.currentNode + ':' + idx);
    const res = ch.resolve(run, r, eventApi);
    s.resolved = true;
    s.choice = idx;
    s.result = res.text;
    s.pendingCombat = res.combat || null;
    return ok();
  }

  function leaveEvent(run) {
    const s = run.room.content;
    if (!s.resolved) return fail('Tome uma decisão primeiro.');
    if (s.pendingCombat) {
      const enemy = s.pendingCombat;
      s.pendingCombat = null;
      beginCombat(run, enemy, 'elite');
      return ok({ combat: true });
    }
    return completeRoom(run);
  }

  function addPlayTime(run, ms) { run.playMs += Math.max(0, Math.min(ms, 10 * 60 * 1000)); }

  CE.run = {
    SAVE_VERSION, MAX_LEVEL, XP_NEEDED, MIN_DECK, createRun, addCard, heal, loseHp, gainGold, gainXp, xpToNext,
    gainArtifact, gainPotion, upgradeCard, upgradableCards, removeCard, enterNode, peekEnemy, resolveCombat, generateRewards,
    takeRewardCard, skipRewardCard, takeRewardItem, completeRoom, generateLevelUp, levelUpDesc, chooseLevelUp,
    removalPrice, shopBuy, shopRemove, restHeal, restUpgrade, resolveEvent, leaveEvent, choiceAvailable, addPlayTime,
  };
})(window.CE = window.CE || {});
