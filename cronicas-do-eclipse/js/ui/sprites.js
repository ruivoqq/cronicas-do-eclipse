/* Interface: sprites em pixel art desenhados em código (sem arquivos de imagem).
 * Cada sprite é uma grade de caracteres; cada letra é uma cor da paleta.
 * O resultado é um <svg> com "pixels" quadrados, que pode ser ampliado sem borrar. */
(function (CE) {
  'use strict';

  const PALETTE = {
    k: '#1a1423', w: '#f3eee4', g: '#9aa3b5', d: '#5b6478',
    s: '#f0c8a0', b: '#4a7fd6', B: '#2c4f96', p: '#a77bff', P: '#6a44c4',
    r: '#e2525c', R: '#8f2531', y: '#f2b84b', Y: '#b9791f', n: '#8a5a34', N: '#5a3820',
    e: '#5fd18b', E: '#2f8f57', o: '#ff9a3c', c: '#7fe3ff', m: '#d9c9a3',
    v: '#3b3156', V: '#5a4d80',
  };

  const GRIDS = {
    /* ---------- Classes ---------- */
    guardian: [
      '....kkkkkk......',
      '...kggggggk.....',
      '...kgggggggk....',
      '...kgkkkkkgk....',
      '...kgsssssgk....',
      '....kgggggk.....',
      '..kkkbbbbbkkk...',
      '.kyykbbbbbkgk...',
      'kyyyykbbbkkgk...',
      'kybbykbbbk.kgk..',
      'kyyyykbbbk..kgk.',
      '.kyykkBBBk...kk.',
      '..kk.kgkgk......',
      '.....kgkgk......',
      '....kkgkgkk.....',
      '....kkkkkkk.....',
    ],
    weaver: [
      '......kk........',
      '.....kppk....kk.',
      '....kppppk..kcck',
      '...kppppppk.kcck',
      '..kkkkkkkkkk.kk.',
      '...kskssksk..n..',
      '...kssssssk..n..',
      '..kkpppppkk..n..',
      '.kppppypppksskn.',
      '.kpppppppppkk.n.',
      '.kpPpppppPpk..n.',
      '.kpPpppppPpk..n.',
      '..kPpppppPk...n.',
      '..kPPpppPPk...n.',
      '.kPPPPPPPPPk..n.',
      '.kkkkkkkkkkk....',
    ],

    /* ---------- Inimigos comuns ---------- */
    rat: [
      '..kk......kk....',
      '.kssk....knnk...',
      '.kssnkkkknnnk...',
      '..knnnnnnnnnk...',
      '.knrnnnnnnnnnk..',
      'knnnnnnnnnnnnk.s',
      'kwnnnnnnnnnnnksk',
      '.kknnnnnnnnnnks.',
      '...knnkkkknnk...',
      '...kkk....kkk...',
    ],
    bat: [
      'k..............k',
      'kk....k..k....kk',
      'kPk..kPkkPk..kPk',
      'kPPkkPPPPPPkkPPk',
      'kPPPPPrPPrPPPPPk',
      '.kPPPPPPPPPPPPk.',
      '.kPkPPPwPwPPkPk.',
      '..k.kPPPPPPk.k..',
      '.....kPPPPk.....',
      '......kkkk......',
    ],
    cultist: [
      '......kkkk......',
      '.....kRRRRk.....',
      '....kRRRRRRk....',
      '....kRkkkkRk....',
      '....kRkykyRk....',
      '....kRkkkkRk....',
      '...kkRRRRRRkk...',
      '..kRRRRRRRRRRk..',
      '..kRRRRyyRRRRk..',
      '..kRkRRyyRRkRk..',
      '..kskRRRRRRksk..',
      '...kkRRRRRRkk...',
      '....kRRRRRRk....',
      '....kRRRRRRk....',
      '...kRRRRRRRRk...',
      '...kkkkkkkkkk...',
    ],
    skeleton: [
      '.....kkkkkk.....',
      '....kwwwwwwk....',
      '....kwkwwkwk....',
      '....kwwwwwwk....',
      '.....kwkwkk.....',
      '......kkkk......',
      '...kkkwwwwkkk...',
      '..kwkkwkkwkkwk..',
      '..kwkwwwwwwkwk..',
      '..kwkkwkkwkkwk..',
      '..kwk.kwwk.kwk..',
      '..kk.kwwwwk.kk..',
      '.....kwkkwk.....',
      '.....kwkkwk.....',
      '....kwwkkwwk....',
      '....kkkkkkkk....',
    ],
    slime: [
      '......kkkk......',
      '....kkeeeekk....',
      '...keeeeeeeek...',
      '..keewweeeeeek..',
      '..keeeeeeeeeek..',
      '.keekkeeeekkeek.',
      '.keekkeeeekkeek.',
      '.keeeeeeeeeeeek.',
      '.keeeekkkkeeeek.',
      '.kEeeeeeeeeeeEk.',
      '.kEEeeeeeeeeEEk.',
      '..kkkkkkkkkkkk..',
    ],
    gargoyle: [
      '..k..........k..',
      '.kdk.kkkkkk.kdk.',
      '.kddkkggggkkddk.',
      'kddkggggggggkddk',
      'kddkgrggggrgkddk',
      'kddkggggggggkddk',
      'kdkkgggkkgggkkdk',
      'kk.kggggggggk.kk',
      '...kggggggggk...',
      '..kgkggggggkgk..',
      '..kkkggggggkkk..',
      '....kggkkggk....',
      '....kggkkggk....',
      '...kgggkkgggk...',
      '...kkkkkkkkkk...',
    ],

    /* ---------- Chefe ---------- */
    regent: [
      '...y..y..y..y...',
      '...yyyyyyyyyy...',
      '...kkkkkkkkkk...',
      '..kvvvvvvvvvvk..',
      '..kvykvvvvkyvk..',
      '..kvvvvvvvvvvk..',
      '..kkvvkkkkvvkk..',
      '.kkPkkvvvvkkPkk.',
      'kPPPPkkkkkkPPPPk',
      'kPPPPPPyyPPPPPPk',
      'kPkPPPyooyPPPkPk',
      'kPkPPPPyyPPPPkPk',
      'kvk.kPPPPPPk.kvk',
      'kk..kPPPPPPk..kk',
      '....kPPPPPPk....',
      '...kPPPPPPPPk...',
      '..kPPPPPPPPPPk..',
      '..kkkkkkkkkkkk..',
    ],

    /* ---------- Ícones das salas ---------- */
    i_sword: [
      '.........kk.',
      '........kwwk',
      '.......kwwk.',
      '......kwwk..',
      '.....kwwk...',
      '.k..kwwk....',
      '.kkkwwk.....',
      '..kykk......',
      '.knkykk.....',
      'knk..k......',
      'kk..........',
    ],
    i_skull: [
      '..kkkkkk..',
      '.kwwwwwwk.',
      'kwwwwwwwwk',
      'kwkkwwkkwk',
      'kwkkwwkkwk',
      'kwwwkkwwwk',
      '.kwwwwwwk.',
      '.kwkwkwkk.',
      '..kkkkkk..',
    ],
    i_event: [
      '..kkkkkk..',
      '.kyyyyyyk.',
      'kyykkkkyyk',
      'kkk..kyyyk',
      '....kyyyk.',
      '...kyyk...',
      '...kyyk...',
      '...kkkk...',
      '...kyyk...',
      '...kkkk...',
    ],
    i_fire: [
      '....k.....',
      '...kok....',
      '...kook...',
      '..koyok...',
      '..koyyok..',
      '.koyyyok..',
      '.koyyyyok.',
      '..kooook..',
      '.knnkknnk.',
      'kNnnnnnnNk',
      '.kkkkkkkk.',
    ],
    i_bag: [
      '...kkkk...',
      '...knnk...',
      '..kkyykk..',
      '.knnnnnnk.',
      'knnnyynnnk',
      'knnyynnnnk',
      'knnnyynnnk',
      'knnnnyynnk',
      'knnyynnnnk',
      '.knnnnnnk.',
      '..kkkkkk..',
    ],
    i_crown: [
      'k...kk...k',
      'kk.kyyk.kk',
      'kykkyykkyk',
      'kyyyyyyyyk',
      'kyryyyyryk',
      'kyyyyyyyyk',
      'kkkkkkkkkk',
    ],
    /* ---------- Efeitos de ataque ---------- */
    fx_orb: [
      '.kkkk.',
      'kcwwck',
      'kwccbk',
      'kccbbk',
      'kcbbBk',
      '.kkkk.',
    ],
    fx_slash: [
      '...www..',
      '....wwww',
      '.....wgw',
      '......ww',
      '......ww',
      '.....wgw',
      '....wwww',
      '...www..',
    ],
    fx_burst: [
      'c..c..c',
      '.c.w.c.',
      '..www..',
      'cwwwwwc',
      '..www..',
      '.c.w.c.',
      'c..c..c',
    ],
    i_door: [
      '..kkkkkk..',
      '.knnnnnnk.',
      'knnNnnNnnk',
      'knnNnnNnnk',
      'knnNnnNnnk',
      'knnNnnNynk',
      'knnNnnNnnk',
      'knnNnnNnnk',
      'kkkkkkkkkk',
    ],
  };

  /* Variações por troca de cores (mesmo desenho, outro personagem). */
  const RECOLOR = {
    knight:   { base: 'guardian', map: { g: 'd', d: 'k', b: 'v', B: 'k', y: 'R', s: 'r' } },   // Cavaleiro Caído
    wanderer: { base: 'guardian', map: { b: 'n', B: 'N', y: 'g' } },                           // Guerreiro Errante
    witch:    { base: 'weaver',   map: { p: 'e', P: 'E', c: 'r', s: 'm', y: 'k' } },           // Bruxa da Névoa
  };

  const cache = {};

  function grid(name) {
    if (GRIDS[name]) return { rows: GRIDS[name], map: null };
    const rc = RECOLOR[name];
    if (rc) return { rows: GRIDS[rc.base], map: rc.map };
    return null;
  }

  /** Devolve o <svg> do sprite. Linhas de mesma cor viram um único retângulo. */
  function svg(name, cls) {
    const key = name + '|' + (cls || '');
    if (cache[key]) return cache[key];
    const g = grid(name);
    if (!g) return '';
    const h = g.rows.length;
    const w = g.rows.reduce((m, r) => Math.max(m, r.length), 0);
    let rects = '';
    g.rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        let ch = row[x];
        if (ch === '.') { x++; continue; }
        let end = x + 1;
        while (end < row.length && row[end] === ch) end++;
        if (g.map && g.map[ch]) ch = g.map[ch];
        const color = PALETTE[ch];
        if (color) rects += `<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${color}"/>`;
        x = end;
      }
    });
    const out = `<svg class="${cls || 'spr'}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects}</svg>`;
    cache[key] = out;
    return out;
  }

  function has(name) { return !!grid(name); }

  CE.sprites = { svg, has, PALETTE };
})(window.CE = window.CE || {});
