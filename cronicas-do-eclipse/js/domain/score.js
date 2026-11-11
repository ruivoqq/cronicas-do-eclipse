/* Domínio: pontuação e ranking. Fórmula única e documentada (seção 8.10).
 *
 *  Salas concluídas ........ 10 pts cada
 *  Inimigos comuns ......... 15 pts cada
 *  Elites .................. 40 pts cada
 *  Chefe ................... 150 pts
 *  HP restante ............. 1 pt por HP
 *  Ouro restante ........... 1 pt a cada 2 de ouro (máx. 100 pts)
 *  Níveis alcançados ....... 20 pts por nível acima do 1
 *  Vitória ................. subtotal × 1,5
 *  Tempo ................... −1 pt por minuto acima de 45 (máx. −50)
 *  Derrota mantém a pontuação parcial, sem multiplicador.
 */
(function (CE) {
  'use strict';

  const RULES = {
    room: 10, enemy: 15, elite: 40, boss: 150, hp: 1, goldDivisor: 2, goldCap: 100, level: 20,
    victoryMultiplier: 1.5, freeMinutes: 45, penaltyPerMinute: 1, penaltyCap: 50,
  };
  const MAX_RANKING = 10;

  function clampInt(v, max) { return Math.max(0, Math.min(max, Math.floor(Number(v) || 0))); }

  function computeScore(run, victory) {
    const s = run.stats, p = run.player;
    // Limites anti-exploração (seção 14)
    const rooms = clampInt(s.rooms, 30), enemies = clampInt(s.enemies, 30), elites = clampInt(s.elites, 10);
    const lines = [
      { label: `Salas concluídas (${rooms})`, value: rooms * RULES.room },
      { label: `Inimigos derrotados (${enemies})`, value: enemies * RULES.enemy },
      { label: `Elites derrotados (${elites})`, value: elites * RULES.elite },
      { label: 'Chefe derrotado', value: s.boss ? RULES.boss : 0 },
      { label: `HP restante (${Math.max(0, p.hp)})`, value: clampInt(p.hp, 999) * RULES.hp },
      { label: `Ouro restante (${p.gold})`, value: Math.min(RULES.goldCap, Math.floor(clampInt(p.gold, 9999) / RULES.goldDivisor)) },
      { label: `Nível alcançado (${p.level})`, value: clampInt(p.level - 1, 10) * RULES.level },
    ];
    const subtotal = lines.reduce((a, l) => a + l.value, 0);
    const mult = victory ? RULES.victoryMultiplier : 1;
    const minutes = Math.floor((run.playMs || 0) / 60000);
    const penalty = Math.min(RULES.penaltyCap, Math.max(0, minutes - RULES.freeMinutes) * RULES.penaltyPerMinute);
    const total = Math.max(0, Math.round(subtotal * mult) - penalty);
    return { lines, subtotal, multiplier: mult, penalty, minutes, total };
  }

  /** Ordem: pontuação ↓, vitória primeiro, mais salas, data mais antiga (RN24). */
  function compareEntries(a, b) {
    return (b.score - a.score) || ((b.victory ? 1 : 0) - (a.victory ? 1 : 0)) || (b.rooms - a.rooms) || (a.date - b.date);
  }

  function insertEntry(list, entry) {
    const next = list.concat([entry]).sort(compareEntries).slice(0, MAX_RANKING); // RN23
    return { list: next, position: next.indexOf(entry) + 1 };
  }

  CE.score = { RULES, MAX_RANKING, computeScore, compareEntries, insertEntry };
})(window.CE = window.CE || {});
