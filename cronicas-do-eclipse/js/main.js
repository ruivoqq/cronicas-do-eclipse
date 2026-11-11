/* Aplicação: estado global, ações centralizadas e máquina de estados.
 * Única fonte de verdade: o objeto `app` (inspecionável em window.CE.app). */
(function (CE) {
  'use strict';
  const P = CE.persistence;
  const C = CE.content;
  const V = CE.views;

  const app = {
    state: 'BOOTING', // BOOTING | MAIN_MENU | CLASS_SELECTION | <estados da jornada> | VICTORY | DEFEAT | ERROR_RECOVERY
    screen: 'menu',   // sub-tela do menu: menu | ranking | help | settings | credits
    settings: null, profile: null, ranking: [], run: null, savedRun: null, result: null, modal: null,
    ui: { heroAt: null, selectedClass: null, busy: false, toast: null, fx: null, levelSel: null, recoveryErrors: [] },
    lastTick: Date.now(),
  };
  CE.app = app;

  let root, modalRoot, toastRoot, toastTimer;
  let lastStateKey = '';
  let modalReturnFocus = null;

  /* ---------- Renderização ---------- */
  function focusKeyOf(el) {
    return el && el.dataset && el.dataset.action ? { action: el.dataset.action, arg: el.dataset.arg } : null;
  }
  function findByKey(container, key) {
    if (!key) return null;
    let sel = `[data-action="${CSS.escape(key.action)}"]`;
    if (key.arg != null) sel += `[data-arg="${CSS.escape(key.arg)}"]`;
    const el = container.querySelector(sel);
    return el && !el.disabled ? el : null;
  }

  function render() {
    const prevFocus = focusKeyOf(document.activeElement);
    const prevInModal = modalRoot.contains(document.activeElement);
    const stateKey = app.state + '|' + app.screen;
    const stateChanged = stateKey !== lastStateKey;
    lastStateKey = stateKey;
    const oldMap = document.getElementById('map-scroll');
    const prevMapScroll = oldMap ? oldMap.scrollTop : null;

    if (app.state !== 'EXPLORING') app.ui.heroAt = null;
    root.innerHTML = V.screen(app);
    if (stateChanged) { const scr = root.querySelector('.screen'); if (scr) scr.classList.add('enter'); }
    const prevModal = modalRoot.firstElementChild ? modalRoot.firstElementChild.dataset.kind : null;
    modalRoot.innerHTML = V.modal(app);
    const backdrop = modalRoot.firstElementChild;
    if (backdrop) {
      backdrop.dataset.kind = app.modal.type + (app.modal.mode || app.modal.pile || '');
      if (backdrop.dataset.kind === prevModal) backdrop.classList.add('static'); // sem animação ao redesenhar o mesmo diálogo
    }
    document.body.classList.toggle('modal-open', !!app.modal);
    root.inert = !!app.modal;

    if (app.modal) {
      const m = modalRoot.querySelector('.modal');
      const el = (prevInModal && findByKey(m, prevFocus)) || m.querySelector('button:not([disabled]), input');
      if (el) el.focus();
    } else if (stateChanged) {
      const h = root.querySelector('h1');
      if (h) h.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    } else {
      const el = findByKey(root, modalReturnFocus || prevFocus) || (prevFocus && prevFocus.action === 'playCard' ? root.querySelector('.hand .card') : null);
      if (el) el.focus({ preventScroll: true });
      modalReturnFocus = null;
    }
    if (app.state === 'EXPLORING') {
      const box = document.getElementById('map-scroll');
      if (stateChanged || prevMapScroll == null) scrollMap();
      else if (box) box.scrollTop = prevMapScroll; // preserva a rolagem entre redesenhos
      const here = app.ui.heroAt && nodeEl(app.ui.heroAt);
      if (box && here) { // mantém o herói visível
        if (here.offsetTop - 110 < box.scrollTop) box.scrollTop = here.offsetTop - 110;
        else if (here.offsetTop + 70 > box.scrollTop + box.clientHeight) box.scrollTop = here.offsetTop + 70 - box.clientHeight;
      }
    }
    app.ui.fx = null;
  }

  function scrollMap() {
    const box = document.getElementById('map-scroll');
    if (!box) return;
    const target = box.querySelector('.map-node.available') || box.querySelector('.map-node.current');
    if (target) box.scrollTop = target.offsetTop - box.clientHeight / 2;
    else box.scrollTop = box.scrollHeight;
  }

  function toast(text, kind) {
    app.ui.toast = { text, kind };
    toastRoot.innerHTML = V.toast(app);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { app.ui.toast = null; toastRoot.innerHTML = V.toast(app); }, 2600);
  }

  function sound(name) { CE.audio.play(name); }
  function delay(ms) { return app.settings.reduceMotion ? 0 : ms; }

  function fail(res) {
    sound('error');
    toast(res.reason || 'Ação inválida.', 'error');
    return false;
  }

  /* ---------- Persistência ---------- */
  function tick() {
    const now = Date.now();
    if (app.run) CE.run.addPlayTime(app.run, now - app.lastTick);
    app.lastTick = now;
  }

  /** Salva e renderiza após uma ação da jornada. Em combate só salva em checkpoints (início de turno). */
  function commit(opts) {
    const run = app.run;
    if (!run) { render(); return; }
    tick();
    if (run.state === 'VICTORY' || run.state === 'DEFEAT') { finishRun(run.state === 'VICTORY'); return; }
    if (run.state !== 'IN_COMBAT' || (opts && opts.checkpoint)) {
      if (!P.saveRun(run)) toast('Não foi possível salvar no navegador.', 'error');
    }
    app.state = run.state;
    render();
  }

  function refreshSaved() {
    const res = P.loadRun();
    app.savedRun = res.status === 'ok' ? res.run : null;
    return res;
  }

  function applySettings() {
    CE.audio.configure(app.settings);
    document.body.classList.toggle('reduce-motion', app.settings.reduceMotion);
  }

  /* ---------- Fluxo da jornada ---------- */
  function goClassSelect() {
    app.ui.selectedClass = null;
    app.state = 'CLASS_SELECTION';
    app.modal = null;
    render();
  }

  function startRun() {
    const cls = app.ui.selectedClass;
    if (!C.CLASSES[cls]) return; // RN01
    P.clearRun(); // RN21: substituído somente após confirmação
    app.run = CE.run.createRun(cls, CE.rng.newSeed());
    app.savedRun = null;
    app.lastTick = Date.now();
    app.profile.runsStarted++;
    const firstTime = !app.profile.tutorialSeen;
    app.profile.tutorialSeen = true;
    P.saveProfile(app.profile);
    app.modal = firstTime ? { type: 'help' } : null;
    sound('level');
    commit();
  }

  function finishRun(victory) {
    const run = app.run;
    const score = CE.score.computeScore(run, victory);
    const entry = {
      name: (app.settings.nickname || '').trim() || 'Aventureiro', cls: run.cls, score: score.total, victory,
      rooms: run.stats.rooms, bossReached: run.currentNode === 'boss', date: Date.now(), seed: run.seed,
    };
    const ins = CE.score.insertEntry(app.ranking, entry);
    app.ranking = ins.list;
    P.saveRanking(app.ranking);
    if (victory) app.profile.victories++; else app.profile.defeats++;
    app.profile.bestScore = Math.max(app.profile.bestScore, score.total);
    P.saveProfile(app.profile);
    P.clearRun(); // RN22: depois do registro
    app.result = {
      victory, score, position: ins.list.includes(entry) ? ins.position : 0, cls: run.cls, level: run.player.level,
      rooms: run.stats.rooms, cardsPlayed: run.stats.cardsPlayed, damageDealt: run.stats.damageDealt, minutes: score.minutes,
    };
    app.run = null;
    app.savedRun = null;
    app.modal = null;
    app.state = victory ? 'VICTORY' : 'DEFEAT';
    sound(victory ? 'win' : 'lose');
    render();
  }

  /** Após uma ação de combate: verifica fim do combate ou apenas redesenha. */
  function afterCombatAction() {
    const run = app.run, c = run.combat;
    if (c && c.result) {
      app.ui.busy = true;
      render();
      setTimeout(() => {
        app.ui.busy = false;
        const out = CE.run.resolveCombat(run);
        if (out === 'reward') { sound('coin'); }
        commit();
      }, delay(800));
      return;
    }
    render();
  }

  function nodeEl(id) { return root.querySelector(`.map-node[data-arg="${CSS.escape(id)}"]`); }

  /** Anda até uma sala disponível (id) ou de volta ao ponto de partida (null). Não entra na sala. */
  function heroWalk(id) {
    const origin = document.getElementById('map-origin');
    const toEl = id ? nodeEl(id) : origin;
    if (!toEl) return;
    // entre salas vizinhas, o herói passa pelo corredor que as liga
    const midY = id && app.ui.heroAt && origin ? (origin.offsetTop + toEl.offsetTop) / 2 : null;
    app.ui.busy = true; // RN27: nada mais é processado enquanto o herói anda
    sound('click');
    CE.pixelmap.walk(toEl, id ? CE.pixelmap.HERO_OFFSET : 0, midY, () => {
      app.ui.busy = false;
      app.ui.heroAt = id;
      render();
    }, app.settings.reduceMotion);
  }

  function openModal(m) {
    modalReturnFocus = focusKeyOf(document.activeElement);
    app.modal = m;
    render();
  }
  function closeModal() {
    app.modal = null;
    render();
  }

  function confirmDialog(opts) {
    openModal(Object.assign({ type: 'confirm' }, opts));
  }

  /* ---------- Ações ---------- */
  const actions = {
    goScreen(arg) {
      app.modal = null;
      app.state = 'MAIN_MENU';
      app.screen = arg || 'menu';
      if (app.screen === 'menu') refreshSaved();
      if (app.screen === 'help') { app.profile.tutorialSeen = true; P.saveProfile(app.profile); }
      render();
    },
    newRun() {
      refreshSaved();
      if (app.savedRun) {
        confirmDialog({ title: 'Substituir a jornada salva?', text: 'Iniciar uma nova jornada apagará a jornada em andamento. Esta ação não pode ser desfeita.', yesLabel: 'Começar nova jornada', danger: true, onYes: goClassSelect });
      } else goClassSelect();
    },
    selectClass(arg) { app.ui.selectedClass = arg; render(); },
    confirmClass() {
      const cls = C.CLASSES[app.ui.selectedClass];
      if (!cls) return fail({ reason: 'Selecione uma classe.' });
      confirmDialog({ title: `Iniciar como ${cls.name}?`, text: `Você começará com ${cls.maxHp} HP e ${cls.starter.length} cartas. A classe vale até o fim da jornada.`, yesLabel: 'Iniciar jornada', onYes: startRun });
    },
    continueRun() {
      const res = refreshSaved();
      if (res.status === 'ok') {
        app.run = res.run;
        app.lastTick = Date.now();
        app.state = app.run.state;
        app.ui.levelSel = null;
        render();
        toast('Jornada retomada.');
      } else if (res.status === 'invalid') {
        app.ui.recoveryErrors = res.errors;
        app.state = 'ERROR_RECOVERY';
        render();
      } else { toast('Nenhuma jornada salva.'); render(); }
    },
    discardInvalid() { P.clearRun(); app.savedRun = null; actions.goScreen('menu'); toast('Jornada inválida descartada.'); },

    /* Mapa: andar (setas ou clique) e atacar/interagir (Espaço) */
    mapGo(arg) {
      if (app.run.state !== 'EXPLORING') return;
      if (!CE.map.available(app.run).includes(arg)) return fail({ reason: 'Esta sala não está conectada à sua posição.' }); // RN02
      if (app.ui.heroAt === arg) return actions.mapInteract();
      heroWalk(arg);
    },
    mapMove(dir) {
      if (app.run.state !== 'EXPLORING') return;
      const els = Array.from(root.querySelectorAll('.map-node.available')).sort((a, b) => a.offsetLeft - b.offsetLeft);
      if (!els.length) return;
      const at = app.ui.heroAt;
      if (at) { // já está em uma sala: troca de sala vizinha ou volta
        const i = els.findIndex((e) => e.dataset.arg === at);
        if (dir === 'down') return heroWalk(null);
        if (dir === 'left' && i > 0) return heroWalk(els[i - 1].dataset.arg);
        if (dir === 'right' && i < els.length - 1) return heroWalk(els[i + 1].dataset.arg);
        if (dir === 'up') toast('Aperte Espaço para ' + (CE.pixelmap.isFight(app.run.map.nodes[at]) ? 'atacar.' : 'entrar.'));
        return;
      }
      if (dir === 'down') return;
      const origin = document.getElementById('map-origin');
      const ox = origin ? origin.offsetLeft : 0;
      let target = null;
      if (dir === 'up') target = els.slice().sort((a, b) => Math.abs(a.offsetLeft - ox) - Math.abs(b.offsetLeft - ox))[0];
      else if (dir === 'left') target = els.filter((e) => e.offsetLeft < ox - 4).pop();
      else if (dir === 'right') target = els.find((e) => e.offsetLeft > ox + 4);
      if (!target && els.length === 1) target = els[0];
      if (target) heroWalk(target.dataset.arg);
    },
    mapInteract() {
      const run = app.run;
      if (run.state !== 'EXPLORING') return;
      const at = app.ui.heroAt;
      const node = at ? run.map.nodes[at] : null;
      const fight = CE.pixelmap.isFight(node);
      const enter = () => {
        app.ui.busy = false;
        if (!at) return;
        const r = CE.run.enterNode(run, at, { openingStrike: fight });
        app.ui.heroAt = null;
        if (!r.ok) { render(); return fail(r); }
        commit({ checkpoint: true });
      };
      if (at && !fight) { sound('click'); return enter(); } // loja, evento e descanso: só entra
      app.ui.busy = true; // RN27
      sound(run.cls === 'guardian' ? 'hit' : 'card');
      CE.pixelmap.attack(run.cls, at ? nodeEl(at) : null, enter, app.settings.reduceMotion);
    },

    /* Combate */
    playCard(arg) {
      const run = app.run, c = run.combat;
      if (!c) return;
      const before = { e: c.enemy.hp, blk: c.block };
      const r = CE.combat.playCard(run, Number(arg));
      if (!r.ok) return fail(r);
      const dmg = before.e - c.enemy.hp;
      app.ui.fx = { playerAttack: r.view.type === 'attack' };
      if (dmg > 0) app.ui.fx.enemy = dmg;
      sound(dmg > 0 ? 'hit' : c.block > before.blk ? 'block' : 'card');
      afterCombatAction();
    },
    endTurn() {
      const run = app.run, c = run && run.combat;
      if (!c || c.result || app.ui.busy) return;
      app.ui.busy = true;
      render();
      setTimeout(() => {
        const hpBefore = run.player.hp, enBefore = c.enemy.hp;
        const attacks = CE.combat.intentPreview(run).parts.some((p) => p.kind === 'attack');
        CE.combat.endTurn(run);
        app.ui.busy = false;
        const fx = { enemyAttack: attacks };
        if (hpBefore - run.player.hp > 0) fx.player = hpBefore - run.player.hp;
        if (enBefore - c.enemy.hp > 0) fx.enemy = enBefore - c.enemy.hp;
        app.ui.fx = fx;
        sound(fx.player ? 'hurt' : 'block');
        if (c.result) return afterCombatAction();
        if (c.phaseChanged) { c.phaseChanged = false; toast('O Regente entrou na segunda fase!', 'boss'); }
        commit({ checkpoint: true }); // ponto estável: início do turno
      }, delay(550));
    },
    openPile(arg) { if (app.run && app.run.combat) openModal({ type: 'pile', pile: arg }); },
    openDeck(arg) { if (app.run) openModal({ type: 'deck', tab: arg === 'inventory' ? 'inventory' : 'deck' }); },
    deckTab(arg) { if (app.modal) { app.modal.tab = arg; render(); } },
    openPotion(arg) { openModal({ type: 'potion', slot: Number(arg) }); },
    usePotion(arg) {
      const run = app.run, c = run.combat;
      const before = c ? c.enemy.hp : 0;
      const r = CE.combat.usePotion(run, Number(arg));
      if (!r.ok) return fail(r);
      app.modal = null;
      toast(`${r.name} usada.`);
      if (c) {
        if (before - c.enemy.hp > 0) app.ui.fx = { enemy: before - c.enemy.hp };
        sound('card');
        afterCombatAction();
      } else { sound('level'); commit(); }
    },
    discardPotion(arg) {
      const run = app.run;
      const id = run.player.potions[Number(arg)];
      if (!id) return;
      confirmDialog({
        title: 'Descartar consumível?', text: `${C.POTIONS[id].name} será perdida.`, yesLabel: 'Descartar', danger: true,
        onYes: () => { run.player.potions.splice(Number(arg), 1); app.modal = null; if (run.state === 'IN_COMBAT') render(); else commit(); },
      });
    },

    /* Recompensas */
    takeRewardCard(arg) {
      const r = CE.run.takeRewardCard(app.run, Number(arg));
      if (!r.ok) return fail(r);
      sound('card'); toast(`${r.name} adicionada ao baralho.`); commit();
    },
    skipRewardCard() { const r = CE.run.skipRewardCard(app.run); if (!r.ok) return fail(r); commit(); },
    takeRewardItem() { const r = CE.run.takeRewardItem(app.run); if (!r.ok) return fail(r); sound('coin'); commit(); },
    leaveReward() {
      const rw = app.run.room.rewards;
      const go = () => { app.modal = null; CE.run.completeRoom(app.run); app.ui.levelSel = null; commit(); };
      if (rw.cardTaken == null && !rw.cardSkipped) {
        confirmDialog({ title: 'Deixar a carta para trás?', text: 'Você ainda não escolheu uma carta. Continuar irá pular a recompensa de carta.', yesLabel: 'Continuar sem carta', onYes: go });
      } else go();
    },

    /* Evento */
    eventChoice(arg) {
      const r = CE.run.resolveEvent(app.run, Number(arg));
      if (!r.ok) return fail(r);
      sound('click'); commit();
    },
    leaveEvent() {
      const r = CE.run.leaveEvent(app.run);
      if (!r.ok) return fail(r);
      commit(r.combat ? { checkpoint: true } : undefined);
    },

    /* Loja */
    shopBuy(arg) {
      const [kind, idx] = String(arg).split(':');
      const r = CE.run.shopBuy(app.run, kind, Number(idx));
      if (!r.ok) return fail(r);
      sound('coin'); toast(`Você comprou ${r.name}.`); commit();
    },
    leaveShop() { CE.run.completeRoom(app.run); app.ui.levelSel = null; commit(); },

    /* Descanso */
    restHeal() { const r = CE.run.restHeal(app.run); if (!r.ok) return fail(r); sound('level'); commit(); },
    leaveRest() { CE.run.completeRoom(app.run); app.ui.levelSel = null; commit(); },

    /* Seletor de cartas (aprimorar / remover) */
    openPicker(arg) { openModal({ type: 'picker', mode: arg }); },
    pickCard(arg) {
      const run = app.run, uid = Number(arg), mode = app.modal && app.modal.mode;
      const card = run.player.deck.find((c) => c.uid === uid);
      if (!card) return;
      const name = C.cardView(card).name;
      if (mode === 'upgrade') {
        const r = CE.run.restUpgrade(run, uid);
        if (!r.ok) return fail(r);
        app.modal = null; sound('level'); toast(`${r.name} aprimorada.`); commit();
      } else if (mode === 'remove') {
        confirmDialog({
          title: 'Remover carta?', text: `${name} será removida permanentemente do baralho por ${CE.run.removalPrice(run)} de ouro.`, yesLabel: 'Remover', danger: true,
          onYes: () => { const r = CE.run.shopRemove(run, uid); app.modal = null; if (!r.ok) { render(); return fail(r); } sound('coin'); toast(`${r.name} removida.`); commit(); },
        });
      }
    },

    /* Evolução */
    selectLevelUp(arg) { app.ui.levelSel = Number(arg); render(); },
    confirmLevelUp() {
      if (app.ui.levelSel == null) return fail({ reason: 'Escolha uma melhoria.' });
      const r = CE.run.chooseLevelUp(app.run, app.ui.levelSel);
      if (!r.ok) return fail(r);
      app.ui.levelSel = null;
      sound('level'); toast(`${r.name} aplicada.`);
      lastStateKey = ''; // força foco no título se houver outra evolução
      commit();
    },

    /* Menus */
    openRunMenu() { openModal({ type: 'runMenu' }); },
    openHelpModal() { app.modal = { type: 'help' }; render(); },
    saveAndExit() {
      if (app.run.state !== 'IN_COMBAT') { tick(); P.saveRun(app.run); }
      app.run = null;
      actions.goScreen('menu');
      toast('Jornada salva.');
    },
    abandonRun() {
      confirmDialog({
        title: 'Abandonar jornada?', text: 'A jornada será encerrada como derrota e registrada no ranking. Não é possível desfazer.', yesLabel: 'Abandonar', danger: true,
        onYes: () => { const run = app.run; if (run.combat) { run.stats.cardsPlayed += run.combat.cardsPlayed; run.stats.damageDealt += run.combat.damageDealt; } tick(); finishRun(false); },
      });
    },
    clearRanking() {
      confirmDialog({
        title: 'Limpar ranking?', text: 'Todas as pontuações locais serão apagadas. Esta ação não pode ser desfeita.', yesLabel: 'Limpar', danger: true,
        onYes: () => { app.ranking = []; P.clearRanking(); app.modal = null; render(); toast('Ranking limpo.'); },
      });
    },
    closeModal() { closeModal(); },
    confirmYes() { const m = app.modal; if (m && m.onYes) { app.modal = null; m.onYes(); } },
    backdrop(arg, el, ev) { if (ev.target === el) closeModal(); },
  };

  // Ações permitidas enquanto o turno do inimigo é processado (RN27)
  const SAFE_WHILE_BUSY = ['openPile', 'openDeck', 'deckTab', 'closeModal', 'backdrop', 'openRunMenu', 'openHelpModal'];

  function dispatch(name, arg, el, ev) {
    const fn = actions[name];
    if (!fn) return;
    if (app.ui.busy && !SAFE_WHILE_BUSY.includes(name)) return;
    try {
      fn(arg, el, ev);
    } catch (err) {
      console.error(err);
      app.ui.busy = false;
      toast('Ocorreu um erro inesperado. Seu último salvamento foi preservado.', 'error');
      if (!root.innerHTML.trim()) actions.goScreen('menu');
    }
  }

  /* ---------- Eventos de entrada ---------- */
  function onClick(ev) {
    const el = ev.target.closest('[data-action]');
    if (!el || el.disabled) return;
    if (el.getAttribute('aria-disabled') === 'true' && el.dataset.action !== 'playCard') return;
    dispatch(el.dataset.action, el.dataset.arg, el, ev);
  }

  function onKey(ev) {
    if (ev.key === 'Escape' && app.modal) { ev.preventDefault(); closeModal(); return; }
    if (app.modal && ev.key === 'Tab') { // mantém o foco dentro do diálogo
      const f = Array.from(modalRoot.querySelectorAll('button:not([disabled]), input, [tabindex="0"]'));
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      return;
    }
    if (app.modal || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
    if (app.state === 'EXPLORING') {
      const dirs = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
      if (dirs[ev.key]) { ev.preventDefault(); dispatch('mapMove', dirs[ev.key]); return; }
      if (ev.key === ' ' || ev.code === 'Space') {
        const t = ev.target;
        if (t.tagName === 'BUTTON' && !t.classList.contains('map-node')) return; // outros botões seguem normais
        ev.preventDefault();
        if (!ev.repeat) dispatch('mapInteract');
        return;
      }
    }
    if (app.state === 'IN_COMBAT') {
      if (/^[1-9]$/.test(ev.key)) { ev.preventDefault(); dispatch('playCard', String(Number(ev.key) - 1)); }
      else if (ev.key === 'e' || ev.key === 'E') { ev.preventDefault(); dispatch('endTurn'); }
      else if (ev.key === 'd' || ev.key === 'D') { ev.preventDefault(); dispatch('openDeck', 'deck'); }
    }
  }

  function onSetting(ev) {
    const el = ev.target;
    const key = el.dataset && el.dataset.setting;
    if (!key) return;
    const s = app.settings;
    if (key === 'volume') {
      s.volume = Number(el.value) / 100;
      const out = el.parentElement.querySelector('output');
      if (out) out.textContent = el.value + '%';
      el.setAttribute('aria-valuetext', el.value + '%');
    } else if (key === 'muted' || key === 'reduceMotion') s[key] = el.checked;
    else if (key === 'nickname') s.nickname = el.value.slice(0, 16);
    P.saveSettings(s);
    applySettings();
    if (ev.type === 'change' && key === 'volume') sound('click');
  }

  /* ---------- Inicialização ---------- */
  function boot() {
    root = document.getElementById('app');
    modalRoot = document.getElementById('modal-root');
    toastRoot = document.getElementById('toast-root');
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    // Espaço em uma sala do mapa é "atacar", não "clicar" (alguns navegadores clicam no keyup)
    document.addEventListener('keyup', (ev) => {
      if ((ev.key === ' ' || ev.code === 'Space') && app.state === 'EXPLORING' && ev.target.classList && ev.target.classList.contains('map-node')) ev.preventDefault();
    });
    document.addEventListener('input', onSetting);
    document.addEventListener('change', onSetting);
    window.addEventListener('pagehide', () => { if (app.run && app.run.state !== 'IN_COMBAT') { tick(); P.saveRun(app.run); } });
    window.addEventListener('error', () => { if (toastRoot) toast('Ocorreu um erro inesperado.', 'error'); });

    app.settings = P.loadSettings();
    applySettings();
    render(); // BOOTING
    app.profile = P.loadProfile();
    app.ranking = P.loadRanking();
    const res = refreshSaved();
    if (res.status === 'invalid') {
      app.ui.recoveryErrors = res.errors;
      app.state = 'ERROR_RECOVERY';
    } else {
      app.state = 'MAIN_MENU';
      app.screen = 'menu';
    }
    render();
    toastRoot.innerHTML = V.toast(app);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.CE = window.CE || {});
