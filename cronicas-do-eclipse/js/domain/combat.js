/* Domínio: motor de combate. Não depende da interface (RNF08).
 *
 * Ordem fixa de resolução (RN10):
 *  Início do turno do jogador: remove bloqueio do jogador (a partir do 2º turno) → energia ao máximo
 *    → Postura (bloqueio) → compra de cartas (5 + Fluxo).
 *  Fim do turno do jogador: descarta a mão (exceto Retenção).
 *  Turno do inimigo: remove bloqueio do inimigo → executa a intenção mostrada.
 *  Fim da rodada: Veneno do jogador → Veneno do inimigo → reduz Vulnerável/Fraco (jogador, depois inimigo;
 *    debuffs aplicados pelo inimigo nesta rodada não são reduzidos) → Eclipse Total → nova intenção.
 *  Vitória/derrota é verificada após cada ação; a derrota do jogador tem prioridade (RN04).
 */
(function (CE) {
  'use strict';
  const R = CE.rng;
  const C = CE.content;

  const HAND_LIMIT = 10;
  const BASE_DRAW = 5;
  const BASE_ENERGY = 3;

  function emptyStatus() {
    return { strength: 0, fortify: 0, flow: 0, eclipse: 0, vulnerable: 0, weak: 0, poison: 0 };
  }

  function sortedArtifacts(run) {
    return C.ARTIFACT_ORDER.filter((id) => run.player.artifacts.includes(id));
  }
  function hasArt(run, id) { return run.player.artifacts.includes(id); }

  function calcDamage(base, atk, def) {
    let d = base + (atk.strength || 0);
    if (atk.weak > 0) d = Math.floor(d * 0.75);
    if (def.vulnerable > 0) d = Math.floor(d * 1.5);
    return Math.max(0, d);
  }

  /** Bloqueio reduz o dano antes do HP (RN09). Retorna o dano que passou. */
  function absorb(holder, amount) {
    const blocked = Math.min(holder.block, amount);
    holder.block -= blocked;
    return amount - blocked;
  }

  function log(c, text, kind) {
    c.log.push({ t: text, k: kind || 'info' });
    if (c.log.length > 50) c.log.shift();
  }

  function enemyDef(c) { return C.ENEMIES[c.enemy.id]; }
  function pattern(c) {
    const d = enemyDef(c);
    return d.phases ? d.phases[c.enemy.phase].pattern : d.pattern;
  }
  function setIntent(c) {
    const p = pattern(c);
    c.enemy.intent = p[c.enemy.step % p.length];
  }
  function currentMove(c) { return enemyDef(c).moves[c.enemy.intent]; }

  /* ---------- Início ---------- */
  function startCombat(run, enemyId, kind) {
    const def = C.ENEMIES[enemyId];
    const r = R.derive(run.seed, 'combat:' + run.currentNode + ':' + enemyId + ':' + run.stats.combats);
    const hp = R.int(r, def.hp[0], def.hp[1]);
    const c = {
      kind, turn: 0, energy: 0, maxEnergy: BASE_ENERGY, block: 0, status: emptyStatus(),
      hand: [], draw: R.shuffle(r, run.player.deck.map((x) => ({ uid: x.uid, id: x.id, up: x.up }))),
      discard: [], exhaust: [],
      enemy: {
        id: enemyId, name: def.name, tier: def.tier, hp, maxHp: hp, block: 0, status: emptyStatus(),
        phase: 0, step: def.randomStart ? R.int(r, 0, def.pattern.length - 1) : 0, intent: null,
      },
      log: [], rng: { s: r.s },
      flags: { firstBlock: false, skillThisTurn: false }, fresh: {},
      result: null, cardsPlayed: 0, damageDealt: 0, hitSeq: 0, lastHit: null,
    };
    run.combat = c;
    setIntent(c);
    log(c, `${def.name} surge diante de você!`, 'enemy');

    for (const a of sortedArtifacts(run)) {
      if (a === 'ember_amulet') { c.status.strength += 1; log(c, 'Amuleto de Brasa: +1 de Força.', 'passive'); }
      if (a === 'shield_stone') { const g = gainBlock(run, 6); log(c, `Pedra-Escudo: +${g} de bloqueio.`, 'passive'); }
      if (a === 'obsidian_thorn') { c.enemy.status.vulnerable += 1; log(c, 'Espinho de Obsidiana: inimigo Vulnerável.', 'passive'); }
    }
    startPlayerTurn(run);
    return c;
  }

  function startPlayerTurn(run) {
    const c = run.combat;
    c.turn++;
    log(c, `— Turno ${c.turn} —`, 'turn');
    if (c.turn > 1) c.block = 0;
    c.energy = c.maxEnergy + (c.turn === 1 && hasArt(run, 'ancient_lantern') ? 1 : 0);
    c.flags.skillThisTurn = false;
    if (c.status.fortify > 0) { const g = gainBlock(run, c.status.fortify); log(c, `Postura: +${g} de bloqueio.`, 'passive'); }
    const n = BASE_DRAW + c.status.flow + (c.turn === 1 && hasArt(run, 'hourglass') ? 2 : 0);
    drawCards(c, n);
  }

  /* ---------- Pilhas ---------- */
  function drawCards(c, n) {
    let drawn = 0;
    for (let i = 0; i < n; i++) {
      if (c.draw.length === 0) {
        if (c.discard.length === 0) break;
        c.draw = R.shuffle(c.rng, c.discard); // RN12
        c.discard = [];
        log(c, 'Pilha de descarte embaralhada na pilha de compra.', 'info');
      }
      const card = c.draw.pop();
      if (c.hand.length >= HAND_LIMIT) { c.discard.push(card); continue; }
      c.hand.push(card);
      drawn++;
    }
    return drawn;
  }

  function gainBlock(run, v) {
    const c = run.combat;
    let amount = v;
    if (run.cls === 'guardian' && !c.flags.firstBlock) {
      c.flags.firstBlock = true;
      const bonus = 4 + 3 * run.player.passiveLevel;
      amount += bonus;
      log(c, `Baluarte: +${bonus} de bloqueio adicional.`, 'passive');
    }
    c.block += amount;
    return amount;
  }

  /* ---------- Dano ---------- */
  function hitEnemy(run, amount) {
    const c = run.combat, en = c.enemy;
    const hpLoss = Math.min(en.hp, absorb(en, amount));
    en.hp -= hpLoss;
    c.damageDealt += hpLoss;
    c.lastHit = { who: 'enemy', amount: hpLoss, blocked: amount - Math.max(hpLoss, 0), seq: ++c.hitSeq };
    log(c, `${en.name} sofre ${hpLoss} de dano` + (amount > hpLoss ? ` (${amount - hpLoss} absorvido)` : '') + '.', 'dmg');
    checkBossPhase(run);
  }

  function hitPlayer(run, amount) {
    const c = run.combat;
    const hpLoss = Math.min(run.player.hp, absorb(c, amount));
    run.player.hp -= hpLoss;
    c.lastHit = { who: 'player', amount: hpLoss, seq: ++c.hitSeq };
    log(c, `Você sofre ${hpLoss} de dano` + (amount > hpLoss ? ` (${amount - hpLoss} bloqueado)` : '') + '.', 'hurt');
  }

  function checkBossPhase(run) {
    const c = run.combat, en = c.enemy, d = C.ENEMIES[en.id];
    if (!d.phases || en.phase !== 0 || en.hp <= 0) return;
    if (en.hp <= Math.floor(en.maxHp * d.phaseAt)) {
      en.phase = 1;
      en.step = 0;
      en.status.vulnerable = 0; en.status.weak = 0; en.status.poison = 0;
      en.status.eclipse += 1;
      setIntent(c);
      c.phaseChanged = true;
      log(c, 'O Regente invoca o ECLIPSE TOTAL! Efeitos negativos removidos. A cada rodada ele ganhará Força.', 'boss');
    }
  }

  /** Ataque inicial da classe, dado no mapa para abrir o combate (espadada / orbe arcano). */
  const OPENING = { guardian: { name: 'Espadada', damage: 4 }, weaver: { name: 'Orbe arcano', damage: 4 } };
  function openingStrike(run) {
    const c = run.combat;
    if (!c || c.result) return;
    const o = OPENING[run.cls];
    log(c, `Ataque inicial — ${o.name}!`, 'player');
    hitEnemy(run, o.damage);
    checkEnd(run);
  }

  /* ---------- Ações do jogador ---------- */
  function canPlay(run, idx) {
    const c = run.combat;
    if (!c || c.result) return { ok: false, reason: 'O combate já terminou.' };
    const inst = c.hand[idx];
    if (!inst) return { ok: false, reason: 'Carta inválida.' };
    const v = C.cardView(inst);
    if (v.cost > c.energy) return { ok: false, reason: 'Energia insuficiente.' }; // RN06
    if (c.enemy.hp <= 0) return { ok: false, reason: 'Não há alvo válido.' };   // RN07
    return { ok: true, view: v };
  }

  function playCard(run, idx) {
    const chk = canPlay(run, idx);
    if (!chk.ok) return chk;
    const c = run.combat, v = chk.view;
    c.energy -= v.cost; // RN08
    const inst = c.hand.splice(idx, 1)[0];
    log(c, `Você usa ${v.name}.`, 'player');
    for (const e of v.effects) {
      applyCardEffect(run, e);
      if (c.enemy.hp <= 0) break;
    }
    if (v.type === 'skill' && run.cls === 'weaver' && !c.flags.skillThisTurn) {
      c.flags.skillThisTurn = true;
      const b = 4 + 2 * run.player.passiveLevel;
      c.block += b;
      log(c, `Trama Rúnica: +${b} de bloqueio.`, 'passive');
    }
    if (v.exhaust || v.type === 'power') c.exhaust.push(inst); // RN13
    else c.discard.push(inst);
    c.cardsPlayed++;
    checkEnd(run);
    return { ok: true, view: v };
  }

  function applyCardEffect(run, e) {
    const c = run.combat, en = c.enemy;
    switch (e.t) {
      case 'dmg':
        for (let i = 0; i < (e.n || 1); i++) {
          if (en.hp <= 0) break;
          hitEnemy(run, calcDamage(e.v, c.status, en.status));
        }
        break;
      case 'dmgBlock': hitEnemy(run, calcDamage(c.block, c.status, en.status)); break;
      case 'blk': { const g = gainBlock(run, e.v); log(c, `Você ganha ${g} de bloqueio.`, 'block'); break; }
      case 'apply': en.status[e.s] += e.v; log(c, `${en.name} recebe ${e.v} de ${C.STATUS[e.s].name}.`, 'effect'); break;
      case 'self': c.status[e.s] += e.v; log(c, `Você ganha ${e.v} de ${C.STATUS[e.s].name}.`, 'effect'); break;
      case 'draw': drawCards(c, e.v); break;
      case 'energy': c.energy += e.v; log(c, `Você ganha ${e.v} de energia.`, 'effect'); break;
    }
  }

  function usePotion(run, slot) {
    const c = run.combat;
    const id = run.player.potions[slot];
    if (!id) return { ok: false, reason: 'Consumível inválido.' };
    if (c && c.result) return { ok: false, reason: 'O combate já terminou.' };
    const p = C.POTIONS[id];
    if (!c && !p.anywhere) return { ok: false, reason: 'Só pode ser usado em combate.' };
    if (id === 'heal' && run.player.hp >= run.player.maxHp) return { ok: false, reason: 'Seu HP já está cheio.' };
    run.player.potions.splice(slot, 1);
    switch (id) {
      case 'heal': { const h = CE.run.heal(run, 15); if (c) log(c, `Poção de Cura: +${h} de HP.`, 'effect'); break; }
      case 'fire': hitEnemy(run, 12); break;
      case 'energy': c.energy += 2; log(c, 'Elixir de Energia: +2 de energia.', 'effect'); break;
      case 'stone': { const g = gainBlock(run, 12); log(c, `Tônico de Pedra: +${g} de bloqueio.`, 'block'); break; }
      case 'acid': c.enemy.status.vulnerable += 3; log(c, `${c.enemy.name} recebe 3 de Vulnerável.`, 'effect'); break;
      case 'might': c.status.strength += 2; log(c, 'Óleo de Força: +2 de Força.', 'effect'); break;
    }
    if (c) checkEnd(run);
    return { ok: true, name: p.name };
  }

  /* ---------- Fim de turno ---------- */
  function endTurn(run) {
    const c = run.combat;
    if (!c || c.result) return { ok: false, reason: 'O combate já terminou.' };
    const keep = [];
    for (const inst of c.hand) {
      if (C.cardView(inst).retain) keep.push(inst); else c.discard.push(inst);
    }
    c.hand = keep;

    enemyTurn(run);
    if (checkEnd(run)) return { ok: true };

    const phaseBefore = c.enemy.phase;
    endOfRound(run);
    if (checkEnd(run)) return { ok: true };

    if (c.enemy.phase === phaseBefore) c.enemy.step++;
    setIntent(c);
    startPlayerTurn(run);
    return { ok: true };
  }

  function enemyTurn(run) {
    const c = run.combat, en = c.enemy;
    en.block = 0;
    c.fresh = {};
    const move = currentMove(c);
    log(c, `${en.name} usa ${move.name}.`, 'enemy');
    for (const e of move.effects) {
      if (run.player.hp <= 0) break;
      switch (e.t) {
        case 'dmg':
          for (let i = 0; i < (e.n || 1); i++) {
            if (run.player.hp <= 0) break;
            hitPlayer(run, calcDamage(e.v, en.status, c.status));
          }
          break;
        case 'blk': en.block += e.v; log(c, `${en.name} ganha ${e.v} de bloqueio.`, 'block'); break;
        case 'apply': c.status[e.s] += e.v; c.fresh[e.s] = true; log(c, `Você recebe ${e.v} de ${C.STATUS[e.s].name}.`, 'effect'); break;
        case 'self': en.status[e.s] += e.v; log(c, `${en.name} ganha ${e.v} de ${C.STATUS[e.s].name}.`, 'effect'); break;
      }
    }
  }

  function endOfRound(run) {
    const c = run.combat, en = c.enemy;
    if (c.status.poison > 0 && run.player.hp > 0) {
      const l = Math.min(run.player.hp, c.status.poison);
      run.player.hp -= l;
      log(c, `Veneno: você perde ${l} de HP.`, 'hurt');
      c.status.poison--;
    }
    if (en.status.poison > 0 && en.hp > 0) {
      const l = Math.min(en.hp, en.status.poison);
      en.hp -= l; c.damageDealt += l;
      log(c, `Veneno: ${en.name} perde ${l} de HP.`, 'dmg');
      en.status.poison--;
      checkBossPhase(run);
    }
    for (const s of ['vulnerable', 'weak']) {
      if (c.status[s] > 0 && !c.fresh[s]) c.status[s]--;
      if (en.status[s] > 0) en.status[s]--;
    }
    c.fresh = {};
    if (en.status.eclipse > 0 && en.hp > 0) {
      en.status.strength += en.status.eclipse;
      log(c, `Eclipse Total: ${en.name} ganha ${en.status.eclipse} de Força.`, 'boss');
    }
  }

  function checkEnd(run) {
    const c = run.combat;
    if (c.result) return true;
    if (run.player.hp <= 0) { c.result = 'lose'; log(c, 'Você caiu...', 'hurt'); return true; }
    if (c.enemy.hp <= 0) { c.result = 'win'; log(c, `${c.enemy.name} foi derrotado!`, 'win'); return true; }
    return false;
  }

  /** Intenção visível do inimigo (RN11), já com modificadores aplicados. */
  function intentPreview(run) {
    const c = run.combat, en = c.enemy;
    const move = currentMove(c);
    const parts = move.effects.map((e) => {
      switch (e.t) {
        case 'dmg': return { kind: 'attack', icon: '⚔️', value: calcDamage(e.v, en.status, c.status), n: e.n || 1, label: 'Ataque' };
        case 'blk': return { kind: 'defend', icon: '🛡️', value: e.v, label: 'Defesa' };
        case 'apply': return { kind: 'debuff', icon: C.STATUS[e.s].icon, value: e.v, label: `Aplica ${C.STATUS[e.s].name}` };
        case 'self': return { kind: 'buff', icon: C.STATUS[e.s].icon, value: e.v, label: `Ganha ${C.STATUS[e.s].name}` };
        default: return null;
      }
    }).filter(Boolean);
    return { name: move.name, parts };
  }

  /** Contexto para mostrar o dano real nas cartas. */
  function cardContext(run) {
    const c = run.combat;
    return { block: c.block, dmg: (base) => calcDamage(base, c.status, c.enemy.status) };
  }

  CE.combat = {
    HAND_LIMIT, BASE_DRAW, BASE_ENERGY, emptyStatus, calcDamage, absorb,
    startCombat, startPlayerTurn, drawCards, canPlay, playCard, usePotion, endTurn,
    intentPreview, cardContext, checkEnd, openingStrike, OPENING,
  };
})(window.CE = window.CE || {});
