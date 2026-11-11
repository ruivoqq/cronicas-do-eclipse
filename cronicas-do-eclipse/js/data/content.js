/* Conteúdo estático: classes, cartas, inimigos, itens e eventos.
 * Nada aqui guarda estado; tudo é catálogo (RNF07). */
(function (CE) {
  'use strict';

  /* ---------- Efeitos de estado ---------- */
  const STATUS = {
    strength:   { name: 'Força',         icon: '💪', kind: 'buff',   desc: 'Aumenta em X o dano de cada ataque.' },
    fortify:    { name: 'Postura',       icon: '🏰', kind: 'buff',   desc: 'Ganha X de bloqueio no início de cada turno.' },
    flow:       { name: 'Fluxo',         icon: '🌀', kind: 'buff',   desc: 'Compra X carta(s) a mais no início de cada turno.' },
    eclipse:    { name: 'Eclipse Total', icon: '🌑', kind: 'buff',   desc: 'Ganha X de Força ao final de cada rodada.' },
    vulnerable: { name: 'Vulnerável',    icon: '🎯', kind: 'debuff', desc: 'Recebe 50% a mais de dano de ataques. Dura X rodada(s).' },
    weak:       { name: 'Fraco',         icon: '🥀', kind: 'debuff', desc: 'Causa 25% a menos de dano com ataques. Dura X rodada(s).' },
    poison:     { name: 'Veneno',        icon: '☠️', kind: 'debuff', desc: 'Perde X de HP ao final da rodada (ignora bloqueio) e o valor diminui em 1.' },
  };
  const STATUS_ORDER = ['strength', 'fortify', 'flow', 'eclipse', 'vulnerable', 'weak', 'poison'];

  const CARD_TYPES = { attack: 'Ataque', defense: 'Defesa', skill: 'Habilidade', power: 'Poder' };
  const RARITY = { starter: 'Inicial', common: 'Comum', uncommon: 'Incomum', rare: 'Rara' };

  /* ---------- Classes ---------- */
  const CLASSES = {
    guardian: {
      id: 'guardian', name: 'Guardião', icon: '🛡️', maxHp: 80,
      desc: 'Veterano das muralhas da fortaleza. Resiste ao desgaste acumulando bloqueio e responde com golpes pesados.',
      style: 'Resistente e previsível',
      focus: 'Bloqueio, Força e ataques pesados',
      passiveName: 'Baluarte',
      passiveDesc: (lvl) => `O primeiro bloqueio obtido em cada combate recebe +${4 + 3 * lvl}.`,
      starter: ['g_strike', 'g_strike', 'g_strike', 'g_strike', 'g_defend', 'g_defend', 'g_defend', 'g_defend', 'g_shield_bash', 'g_heavy'],
    },
    weaver: {
      id: 'weaver', name: 'Tecelã Arcana', icon: '🔮', maxHp: 70,
      desc: 'Estudiosa das runas do Eclipse. Manipula energia, compra de cartas e efeitos para montar combinações.',
      style: 'Combinações e planejamento',
      focus: 'Efeitos, compra de cartas e energia',
      passiveName: 'Trama Rúnica',
      passiveDesc: (lvl) => `A primeira Habilidade usada em cada turno concede ${4 + 2 * lvl} de bloqueio.`,
      starter: ['a_spark', 'a_spark', 'a_spark', 'a_spark', 'a_veil', 'a_veil', 'a_veil', 'a_veil', 'a_glimpse', 'a_hex'],
    },
  };

  /* ---------- Cartas (12 por classe) ----------
   * Efeitos: dmg{v,n} blk{v} apply{s,v} (no inimigo) self{s,v} (no jogador)
   *          draw{v} energy{v} dmgBlock (dano = bloqueio atual) */
  const CARDS = {
    // Guardião
    g_strike:      { name: 'Golpe', cls: 'guardian', type: 'attack', rarity: 'starter', cost: 1,
                     effects: [{ t: 'dmg', v: 6 }], up: { effects: [{ t: 'dmg', v: 9 }] } },
    g_defend:      { name: 'Defender', cls: 'guardian', type: 'defense', rarity: 'starter', cost: 1,
                     effects: [{ t: 'blk', v: 5 }], up: { effects: [{ t: 'blk', v: 8 }] } },
    g_shield_bash: { name: 'Golpe de Escudo', cls: 'guardian', type: 'attack', rarity: 'starter', cost: 1,
                     effects: [{ t: 'dmg', v: 5 }, { t: 'blk', v: 5 }], up: { effects: [{ t: 'dmg', v: 7 }, { t: 'blk', v: 7 }] } },
    g_heavy:       { name: 'Investida Pesada', cls: 'guardian', type: 'attack', rarity: 'starter', cost: 2,
                     effects: [{ t: 'dmg', v: 14 }], up: { effects: [{ t: 'dmg', v: 19 }] } },
    g_twin:        { name: 'Golpe Duplo', cls: 'guardian', type: 'attack', rarity: 'common', cost: 1,
                     effects: [{ t: 'dmg', v: 4, n: 2 }], up: { effects: [{ t: 'dmg', v: 6, n: 2 }] } },
    g_wall:        { name: 'Muralha', cls: 'guardian', type: 'defense', rarity: 'common', cost: 2,
                     effects: [{ t: 'blk', v: 12 }], up: { effects: [{ t: 'blk', v: 16 }] } },
    g_roar:        { name: 'Brado Intimidador', cls: 'guardian', type: 'skill', rarity: 'common', cost: 1,
                     effects: [{ t: 'apply', s: 'weak', v: 2 }, { t: 'blk', v: 3 }], up: { effects: [{ t: 'apply', s: 'weak', v: 3 }, { t: 'blk', v: 5 }] } },
    g_crush:       { name: 'Pancada Esmagadora', cls: 'guardian', type: 'attack', rarity: 'uncommon', cost: 2,
                     effects: [{ t: 'dmg', v: 10 }, { t: 'apply', s: 'vulnerable', v: 2 }], up: { effects: [{ t: 'dmg', v: 13 }, { t: 'apply', s: 'vulnerable', v: 3 }] } },
    g_skin:        { name: 'Segunda Pele', cls: 'guardian', type: 'defense', rarity: 'uncommon', cost: 1, exhaust: true,
                     effects: [{ t: 'blk', v: 10 }], up: { effects: [{ t: 'blk', v: 14 }] } },
    g_fury:        { name: 'Fúria Contida', cls: 'guardian', type: 'power', rarity: 'uncommon', cost: 1,
                     effects: [{ t: 'self', s: 'strength', v: 2 }], up: { effects: [{ t: 'self', s: 'strength', v: 3 }] } },
    g_stance:      { name: 'Postura Firme', cls: 'guardian', type: 'power', rarity: 'rare', cost: 2,
                     effects: [{ t: 'self', s: 'fortify', v: 3 }], up: { effects: [{ t: 'self', s: 'fortify', v: 5 }] } },
    g_ram:         { name: 'Impacto do Escudo', cls: 'guardian', type: 'attack', rarity: 'rare', cost: 1,
                     effects: [{ t: 'dmgBlock' }], up: { cost: 0 } },

    // Tecelã Arcana
    a_spark:   { name: 'Faísca', cls: 'weaver', type: 'attack', rarity: 'starter', cost: 1,
                 effects: [{ t: 'dmg', v: 7 }], up: { effects: [{ t: 'dmg', v: 10 }] } },
    a_veil:    { name: 'Véu Protetor', cls: 'weaver', type: 'defense', rarity: 'starter', cost: 1,
                 effects: [{ t: 'blk', v: 5 }], up: { effects: [{ t: 'blk', v: 8 }] } },
    a_glimpse: { name: 'Lampejo', cls: 'weaver', type: 'skill', rarity: 'starter', cost: 0,
                 effects: [{ t: 'draw', v: 1 }], up: { effects: [{ t: 'draw', v: 2 }] } },
    a_hex:     { name: 'Maldição Sombria', cls: 'weaver', type: 'skill', rarity: 'starter', cost: 1,
                 effects: [{ t: 'apply', s: 'vulnerable', v: 2 }, { t: 'apply', s: 'weak', v: 1 }],
                 up: { effects: [{ t: 'apply', s: 'vulnerable', v: 3 }, { t: 'apply', s: 'weak', v: 2 }] } },
    a_bolts:   { name: 'Seta Arcana', cls: 'weaver', type: 'attack', rarity: 'common', cost: 1,
                 effects: [{ t: 'dmg', v: 4, n: 3 }], up: { effects: [{ t: 'dmg', v: 5, n: 3 }] } },
    a_rune:    { name: 'Barreira Rúnica', cls: 'weaver', type: 'defense', rarity: 'common', cost: 1,
                 effects: [{ t: 'blk', v: 6 }, { t: 'draw', v: 1 }], up: { effects: [{ t: 'blk', v: 9 }, { t: 'draw', v: 1 }] } },
    a_toxin:   { name: 'Toxina Estelar', cls: 'weaver', type: 'skill', rarity: 'common', cost: 1,
                 effects: [{ t: 'apply', s: 'poison', v: 7 }], up: { effects: [{ t: 'apply', s: 'poison', v: 10 }] } },
    a_channel: { name: 'Canalizar', cls: 'weaver', type: 'skill', rarity: 'uncommon', cost: 0, exhaust: true,
                 effects: [{ t: 'energy', v: 2 }], up: { effects: [{ t: 'energy', v: 3 }] } },
    a_meditate:{ name: 'Meditação', cls: 'weaver', type: 'skill', rarity: 'uncommon', cost: 1, retain: true,
                 effects: [{ t: 'draw', v: 3 }], up: { cost: 0 } },
    a_mirror:  { name: 'Espelho Lunar', cls: 'weaver', type: 'defense', rarity: 'uncommon', cost: 1, retain: true,
                 effects: [{ t: 'blk', v: 7 }], up: { effects: [{ t: 'blk', v: 10 }] } },
    a_flow:    { name: 'Fluxo Arcano', cls: 'weaver', type: 'power', rarity: 'rare', cost: 1,
                 effects: [{ t: 'self', s: 'flow', v: 1 }], up: { cost: 0 } },
    a_storm:   { name: 'Tempestade de Éter', cls: 'weaver', type: 'attack', rarity: 'rare', cost: 2,
                 effects: [{ t: 'dmg', v: 16 }, { t: 'apply', s: 'poison', v: 4 }], up: { effects: [{ t: 'dmg', v: 22 }, { t: 'apply', s: 'poison', v: 6 }] } },
  };

  /* ---------- Inimigos ---------- */
  const ENEMIES = {
    rat: { name: 'Rato da Cripta', tier: 'common', art: '🐀', hp: [20, 24], randomStart: true,
      moves: {
        bite: { name: 'Mordida', effects: [{ t: 'dmg', v: 6 }] },
        gnaw: { name: 'Roer', effects: [{ t: 'dmg', v: 3 }, { t: 'apply', s: 'weak', v: 1 }] },
      }, pattern: ['bite', 'gnaw', 'bite'] },
    bat: { name: 'Morcego Sombrio', tier: 'common', art: '🦇', hp: [18, 22], randomStart: true,
      moves: {
        flurry: { name: 'Revoada', effects: [{ t: 'dmg', v: 3, n: 3 }] },
        screech: { name: 'Guincho', effects: [{ t: 'dmg', v: 4 }, { t: 'apply', s: 'vulnerable', v: 1 }] },
      }, pattern: ['flurry', 'screech'] },
    cultist: { name: 'Cultista do Eclipse', tier: 'common', art: '🧟', hp: [26, 30],
      moves: {
        chant: { name: 'Cântico Sombrio', effects: [{ t: 'self', s: 'strength', v: 2 }] },
        slash: { name: 'Adaga Ritual', effects: [{ t: 'dmg', v: 6 }] },
      }, pattern: ['chant', 'slash', 'slash'] },
    skeleton: { name: 'Esqueleto Sentinela', tier: 'common', art: '💀', hp: [30, 34], randomStart: true,
      moves: {
        swing: { name: 'Lâmina Enferrujada', effects: [{ t: 'dmg', v: 9 }] },
        guard: { name: 'Guarda Óssea', effects: [{ t: 'blk', v: 8 }, { t: 'dmg', v: 4 }] },
        double: { name: 'Corte Duplo', effects: [{ t: 'dmg', v: 5, n: 2 }] },
      }, pattern: ['swing', 'guard', 'double'] },
    slime: { name: 'Lodo Corrosivo', tier: 'common', art: '🫧', hp: [34, 38], randomStart: true,
      moves: {
        spit: { name: 'Cuspe Ácido', effects: [{ t: 'dmg', v: 4 }, { t: 'apply', s: 'poison', v: 3 }] },
        slam: { name: 'Esmagar', effects: [{ t: 'dmg', v: 9 }] },
      }, pattern: ['spit', 'slam'] },
    gargoyle: { name: 'Gárgula Rachada', tier: 'common', art: '🗿', hp: [38, 42],
      moves: {
        harden: { name: 'Endurecer', effects: [{ t: 'blk', v: 10 }, { t: 'dmg', v: 5 }] },
        crush: { name: 'Punho de Pedra', effects: [{ t: 'dmg', v: 13 }] },
        glare: { name: 'Olhar Petrificante', effects: [{ t: 'apply', s: 'weak', v: 2 }, { t: 'apply', s: 'vulnerable', v: 1 }] },
      }, pattern: ['harden', 'crush', 'glare'] },

    // Elites
    knight: { name: 'Cavaleiro Caído', tier: 'elite', art: '🤺', hp: [68, 72],
      moves: {
        rend: { name: 'Rasgar Armadura', effects: [{ t: 'dmg', v: 6, n: 2 }, { t: 'apply', s: 'vulnerable', v: 2 }] },
        cleave: { name: 'Golpe Devastador', effects: [{ t: 'dmg', v: 15 }] },
        rally: { name: 'Juramento Sombrio', effects: [{ t: 'blk', v: 12 }, { t: 'self', s: 'strength', v: 2 }] },
      }, pattern: ['rend', 'cleave', 'rally'] },
    witch: { name: 'Bruxa da Névoa', tier: 'elite', art: '🧙', hp: [58, 62],
      moves: {
        curse: { name: 'Maldição da Névoa', effects: [{ t: 'apply', s: 'weak', v: 2 }, { t: 'apply', s: 'vulnerable', v: 2 }] },
        miasma: { name: 'Miasma', effects: [{ t: 'dmg', v: 8 }, { t: 'apply', s: 'poison', v: 4 }] },
        bolt: { name: 'Raio Espectral', effects: [{ t: 'dmg', v: 16 }] },
      }, pattern: ['curse', 'miasma', 'bolt'] },
    wanderer: { name: 'Guerreiro Errante', tier: 'elite', art: '⚔️', hp: [48, 52],
      moves: {
        thrust: { name: 'Estocada', effects: [{ t: 'dmg', v: 10 }] },
        parry: { name: 'Aparar', effects: [{ t: 'blk', v: 10 }, { t: 'dmg', v: 5 }] },
        focus: { name: 'Concentração', effects: [{ t: 'self', s: 'strength', v: 3 }] },
      }, pattern: ['thrust', 'parry', 'focus'] },

    // Chefe final
    regent: { name: 'O Regente do Eclipse', tier: 'boss', art: '🌑', hp: [140, 140], phaseAt: 0.5,
      moves: {
        blade: { name: 'Lâmina Eclipsada', effects: [{ t: 'dmg', v: 11 }] },
        shroud: { name: 'Manto Umbral', effects: [{ t: 'blk', v: 14 }, { t: 'apply', s: 'weak', v: 2 }] },
        rain: { name: 'Chuva de Sombras', effects: [{ t: 'dmg', v: 4, n: 3 }] },
        twin: { name: 'Eclipse Gêmeo', effects: [{ t: 'dmg', v: 8, n: 2 }] },
        tide: { name: 'Maré Negra', effects: [{ t: 'blk', v: 10 }, { t: 'dmg', v: 7 }, { t: 'apply', s: 'vulnerable', v: 2 }] },
        annihilate: { name: 'Aniquilação', effects: [{ t: 'dmg', v: 20 }] },
      },
      phases: [
        { name: 'Fase 1 — O Regente', pattern: ['blade', 'shroud', 'rain'] },
        { name: 'Fase 2 — Eclipse Total', pattern: ['twin', 'tide', 'annihilate'] },
      ] },
  };
  const EARLY_ENEMIES = ['rat', 'bat', 'cultist'];
  const COMMON_ENEMIES = ['rat', 'bat', 'cultist', 'skeleton', 'slime', 'gargoyle'];
  const ELITE_ENEMIES = ['knight', 'witch'];

  /* ---------- Artefatos (ordem fixa de execução, RN28) ---------- */
  const ARTIFACTS = {
    iron_heart:      { name: 'Coração de Ferro', icon: '❤️', desc: 'Ao obter: +10 de HP máximo (e recupera 10 de HP).' },
    ember_amulet:    { name: 'Amuleto de Brasa', icon: '🔥', desc: 'Início do combate: ganha 1 de Força.' },
    shield_stone:    { name: 'Pedra-Escudo', icon: '🪨', desc: 'Início do combate: ganha 6 de bloqueio.' },
    obsidian_thorn:  { name: 'Espinho de Obsidiana', icon: '🗡️', desc: 'Início do combate: o inimigo recebe 1 de Vulnerável.' },
    ancient_lantern: { name: 'Lanterna Ancestral', icon: '🏮', desc: 'Primeiro turno de cada combate: +1 de energia.' },
    hourglass:       { name: 'Ampulheta Rachada', icon: '⏳', desc: 'Primeiro turno de cada combate: compra 2 cartas a mais.' },
    crimson_chalice: { name: 'Cálice Rubro', icon: '🍷', desc: 'Ao vencer um combate, recupera 6 de HP.' },
    enchanted_purse: { name: 'Bolsa Encantada', icon: '👛', desc: 'Combates concedem 10 de ouro adicional.' },
  };
  const ARTIFACT_ORDER = Object.keys(ARTIFACTS);

  /* ---------- Consumíveis (limite de 3) ---------- */
  const POTIONS = {
    heal:   { name: 'Poção de Cura', icon: '🧪', desc: 'Recupera 15 de HP. Pode ser usada fora de combate.', anywhere: true },
    fire:   { name: 'Frasco de Fogo', icon: '💥', desc: 'Causa 12 de dano ao inimigo.' },
    energy: { name: 'Elixir de Energia', icon: '⚡', desc: 'Ganha 2 de energia neste turno.' },
    stone:  { name: 'Tônico de Pedra', icon: '🛡️', desc: 'Ganha 12 de bloqueio.' },
    acid:   { name: 'Pó Corrosivo', icon: '🧫', desc: 'Aplica 3 de Vulnerável ao inimigo.' },
    might:  { name: 'Óleo de Força', icon: '💪', desc: 'Ganha 2 de Força neste combate.' },
  };
  const MAX_POTIONS = 3;

  /* ---------- Evolução de nível ---------- */
  const LEVEL_UPS = {
    vitality: { name: 'Vitalidade', icon: '❤️' },
    recover:  { name: 'Recuperação', icon: '✨' },
    mastery:  { name: 'Maestria da Classe', icon: '📜' },
    fortune:  { name: 'Fortuna', icon: '🪙' },
    refine:   { name: 'Refinamento', icon: '⚒️' },
  };

  /* ---------- Eventos narrativos ----------
   * available(run) => true | 'motivo'. resolve(run, rng, api) => { text, combat? } */
  const EVENTS = {
    altar: {
      name: 'Altar Rachado', icon: '🕯️',
      text: 'No centro do salão, um altar de pedra negra pulsa sob a luz do Eclipse. Fendas vermelhas parecem respirar, à espera de uma oferenda.',
      choices: [
        { label: 'Oferecer sangue', cost: 'Perde 8 de HP. Ganha ouro.',
          available: (run) => run.player.hp > 8 || 'HP insuficiente.',
          resolve: (run, r, api) => { api.loseHp(run, 8); api.gainGold(run, 55); return { text: 'Você corta a palma da mão. O altar bebe o sangue e expele 55 moedas antigas.' }; } },
        { label: 'Rezar em silêncio', cost: 'Nenhum custo aparente…',
          resolve: (run, r, api) => {
            if (CE.rng.next(r) < 0.6) { const h = api.heal(run, 12); return { text: `Uma luz morna percorre seu corpo. Você recupera ${h} de HP.` }; }
            const l = api.loseHp(run, 4); return { text: `O altar despreza sua prece. Uma chama fria o queima: −${l} de HP.` };
          } },
        { label: 'Seguir caminho', cost: 'Nenhum', resolve: () => ({ text: 'Você se afasta do altar sem olhar para trás.' }) },
      ],
    },
    forge: {
      name: 'Forja Fantasma', icon: '⚒️',
      text: 'Um ferreiro translúcido martela uma bigorna que não existe. Sem levantar os olhos, ele estende a mão e murmura: “Trabalho ou sucata?”',
      choices: [
        { label: 'Pagar pelo trabalho', cost: 'Perde 30 de ouro. Melhora uma carta aleatória.',
          available: (run, api) => run.player.gold < 30 ? 'Ouro insuficiente.' : (api.upgradableCards(run).length ? true : 'Nenhuma carta para melhorar.'),
          resolve: (run, r, api) => { api.spendGold(run, 30); const n = api.upgradeRandom(run, r); return { text: `As marteladas ecoam pelo corredor. ${n} foi aprimorada.` }; } },
        { label: 'Entregar sucata', cost: 'Perde uma carta inicial aleatória. Ganha 20 de ouro.',
          available: (run, api) => api.starterCards(run).length && run.player.deck.length > 5 ? true : 'Nenhuma carta inicial disponível.',
          resolve: (run, r, api) => { const n = api.removeRandomStarter(run, r); api.gainGold(run, 20); return { text: `O ferreiro derrete ${n} e lhe entrega 20 de ouro pela sucata.` }; } },
        { label: 'Ir embora', cost: 'Nenhum', resolve: () => ({ text: 'O martelar some atrás de você.' }) },
      ],
    },
    library: {
      name: 'Biblioteca Esquecida', icon: '📚',
      text: 'Estantes tombadas cercam um tomo acorrentado que sussurra seu nome. Pergaminhos mais modestos estão espalhados pelo chão.',
      choices: [
        { label: 'Ler o tomo proibido', cost: 'Perde 6 de HP. Recebe uma carta rara.',
          available: (run) => run.player.hp > 6 || 'HP insuficiente.',
          resolve: (run, r, api) => { api.loseHp(run, 6); const n = api.addRandomCard(run, r, 'rare'); return { text: `As palavras queimam sua mente, mas deixam algo para trás: ${n} entrou no seu baralho.` }; } },
        { label: 'Estudar os pergaminhos', cost: 'Nenhum. Ganha 20 de experiência.',
          resolve: (run, r, api) => { const ups = api.gainXp(run, 20); return { text: 'Horas de estudo rendem 20 de experiência.' + (ups ? ' Você sente que pode evoluir!' : '') }; } },
        { label: 'Sair em silêncio', cost: 'Nenhum', resolve: () => ({ text: 'O sussurro do tomo some quando você fecha a porta.' }) },
      ],
    },
    fountain: {
      name: 'Fonte Escura', icon: '⛲',
      text: 'Uma fonte de água negra reflete um céu que não está lá. A superfície é calma, mas algo se move no fundo.',
      choices: [
        { label: 'Beber da fonte', cost: 'Recupera 20 de HP. Risco desconhecido.',
          resolve: (run, r, api) => {
            const h = api.heal(run, 20);
            if (CE.rng.next(r) < 0.4) { api.loseMaxHp(run, 4); return { text: `A água revigora (+${h} HP), mas deixa um frio permanente: −4 de HP máximo.` }; }
            return { text: `A água é surpreendentemente doce. Você recupera ${h} de HP.` };
          } },
        { label: 'Encher um frasco', cost: 'Ocupa 1 espaço de consumível.',
          available: (run) => run.player.potions.length < MAX_POTIONS || 'Inventário de consumíveis cheio.',
          resolve: (run, r, api) => { api.gainPotion(run, 'heal'); return { text: 'Você guarda um pouco da água. Ela brilha como uma Poção de Cura.' }; } },
        { label: 'Não tocar em nada', cost: 'Nenhum', resolve: () => ({ text: 'Algo no fundo da fonte observa você partir.' }) },
      ],
    },
    duel: {
      name: 'Guerreiro Errante', icon: '⚔️',
      text: 'Um guerreiro de armadura gasta bloqueia a passagem. “Lutei contra o Eclipse por cem anos. Mostre-me que você é digno do que carrego.”',
      choices: [
        { label: 'Aceitar o duelo', cost: 'Enfrenta um inimigo de elite. Recompensa de elite.',
          resolve: () => ({ text: 'O guerreiro ergue a lâmina e assume posição.', combat: 'wanderer' }) },
        { label: 'Recusar com respeito', cost: 'Nenhum', resolve: () => ({ text: '“Talvez em outra vida.” Ele se afasta e some na névoa.' }) },
      ],
    },
    pilgrim: {
      name: 'Peregrino Ferido', icon: '🧳',
      text: 'Um peregrino ferido está encostado na parede, agarrado a uma bolsa de relíquias. “Posso vender… ou retribuir uma ajuda.”',
      choices: [
        { label: 'Comprar uma relíquia', cost: 'Perde 40 de ouro. Recebe um artefato aleatório.',
          available: (run, api) => run.player.gold < 40 ? 'Ouro insuficiente.' : (api.availableArtifacts(run).length ? true : 'Ele não tem nada novo para você.'),
          resolve: (run, r, api) => { api.spendGold(run, 40); const n = api.gainRandomArtifact(run, r); return { text: `Ele entrega ${n} com um sorriso cansado.` }; } },
        { label: 'Cuidar dos ferimentos', cost: 'Perde 5 de HP.',
          available: (run) => run.player.hp > 5 || 'HP insuficiente.',
          resolve: (run, r, api) => {
            api.loseHp(run, 5);
            if (run.player.potions.length < MAX_POTIONS) { const id = CE.rng.pick(r, Object.keys(POTIONS)); api.gainPotion(run, id); return { text: `Grato, ele lhe entrega ${POTIONS[id].name}.` }; }
            api.gainGold(run, 25); return { text: 'Grato, ele lhe entrega 25 de ouro.' };
          } },
        { label: 'Seguir adiante', cost: 'Nenhum', resolve: () => ({ text: 'Você deixa o peregrino para trás.' }) },
      ],
    },
  };

  /* ---------- Helpers de cartas ---------- */
  function cardView(inst) {
    const d = CARDS[inst.id];
    const up = inst.up && d.up ? d.up : {};
    return {
      id: inst.id, uid: inst.uid, up: !!inst.up, upgradable: !inst.up && !!d.up,
      name: d.name + (inst.up ? '+' : ''), cls: d.cls, type: d.type, rarity: d.rarity,
      cost: up.cost != null ? up.cost : d.cost,
      effects: up.effects || d.effects,
      exhaust: up.exhaust != null ? up.exhaust : !!d.exhaust,
      retain: up.retain != null ? up.retain : !!d.retain,
    };
  }

  function effectText(e, ctx) {
    switch (e.t) {
      case 'dmg': {
        const v = ctx ? ctx.dmg(e.v) : e.v;
        return `Causa ${v} de dano` + (e.n > 1 ? ` ${e.n} vezes` : '');
      }
      case 'dmgBlock': return ctx ? `Causa dano igual ao seu bloqueio (${ctx.dmg(ctx.block)})` : 'Causa dano igual ao seu bloqueio atual';
      case 'blk': return `Ganha ${e.v} de bloqueio`;
      case 'apply': return `Aplica ${e.v} de ${STATUS[e.s].name}`;
      case 'self':
        if (e.s === 'fortify') return `No início de cada turno, ganha ${e.v} de bloqueio`;
        if (e.s === 'flow') return `No início de cada turno, compra ${e.v} carta a mais`;
        return `Ganha ${e.v} de ${STATUS[e.s].name}`;
      case 'draw': return `Compra ${e.v} carta${e.v > 1 ? 's' : ''}`;
      case 'energy': return `Ganha ${e.v} de energia`;
      default: return '';
    }
  }

  function cardText(v, ctx) {
    const parts = v.effects.map((e) => effectText(e, ctx));
    if (v.retain) parts.push('Retenção');
    if (v.exhaust) parts.push('Exaurir');
    return parts.join('. ') + '.';
  }

  CE.content = {
    STATUS, STATUS_ORDER, CARD_TYPES, RARITY, CLASSES, CARDS, ENEMIES,
    EARLY_ENEMIES, COMMON_ENEMIES, ELITE_ENEMIES, ARTIFACTS, ARTIFACT_ORDER,
    POTIONS, MAX_POTIONS, LEVEL_UPS, EVENTS, cardView, cardText,
  };
})(window.CE = window.CE || {});
