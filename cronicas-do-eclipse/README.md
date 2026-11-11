# Crônicas do Eclipse

RPG roguelike de cartas para navegador, com combates por turnos e progressão por salas.
Feito com **HTML, CSS e JavaScript puro** — sem bibliotecas, sem build, sem servidor.

## Como executar

- Abra `index.html` direto no navegador (duplo clique), **ou**
- sirva a pasta como site estático (GitHub Pages, Netlify, `npx serve`, etc.).

Testes das regras: abra `tests.html` no navegador.

## Estrutura

```
index.html            página do jogo
tests.html            executor dos testes automatizados
css/style.css         design system (cores, botões, cartas, painéis, responsividade)
js/core/rng.js        aleatoriedade com semente (reprodutível)
js/data/content.js    catálogos: classes, 24 cartas, 9 inimigos + chefe, artefatos, consumíveis, eventos
js/domain/combat.js   motor de combate (turnos, energia, bloqueio, efeitos, intenções, fases do chefe)
js/domain/map.js      geração/validação do mapa ramificado
js/domain/run.js      jornada: salas, recompensas, XP/nível, loja, descanso, eventos
js/domain/score.js    fórmula de pontuação e ranking
js/infra/persistence.js  localStorage versionado + validação de save
js/infra/audio.js     efeitos sonoros sintetizados (Web Audio)
js/ui/sprites.js      sprites em pixel art desenhados em código (classes, inimigos, ícones)
js/ui/views.js        renderização das telas (estado → HTML)
js/ui/pixelmap.js     mapa da fortaleza em pixel art, com o herói andando entre as salas
js/main.js            estado global, ações centralizadas, teclado, inicialização
tests/tests.js        testes de regras + simulação de 60 jornadas completas
```

Camadas: **Interface** (`ui/`, `main.js`) → **Estado** (`CE.app`) → **Domínio** (`domain/`) → **Infraestrutura** (`core/`, `infra/`).
O domínio não conhece a interface, por isso pode ser testado isoladamente.

## Controles

- Mouse ou teclado (`Tab`, `Enter`, `Esc`).
- Mapa: `←` `↑` `→` andam até uma sala, `↓` volta, `Espaço` ataca (inicia o combate se houver inimigo).
- Combate: `1`–`9` usam cartas, `E` encerra o turno, `D` abre o baralho.

## Persistência (localStorage)

| Chave | Conteúdo |
|---|---|
| `chronicles.settings.v1` | volume, mudo, reduzir animações, apelido |
| `chronicles.profile.v1` | estatísticas gerais, tutorial visto |
| `chronicles.activeRun.v1` | jornada ativa (salva ao entrar/sair de salas e no início de cada turno) |
| `chronicles.ranking.v1` | 10 melhores partidas |

Save inválido/corrompido abre a tela de recuperação, preservando configurações e ranking.

## Pontuação

Salas ×10 · inimigos ×15 · elites ×40 · chefe 150 · HP restante ×1 · ouro/2 (máx. 100) · níveis acima do 1 ×20.
Vitória multiplica por 1,5. Acima de 45 minutos: −1 ponto por minuto (máx. −50).

## Depuração

O estado global fica em `window.CE.app` (console do navegador).
