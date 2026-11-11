# Crônicas do Eclipse

RPG roguelike de cartas para navegador, com mapa em pixel art, combates por turnos e progressão por salas.
Feito com **HTML, CSS e JavaScript puro** — sem bibliotecas, sem build e sem servidor.

Projeto da disciplina **Aplicações FrontEnd** — Prof. João Paulo Pimentel.
Autor: **Matheus Henrique da Cruz Pereira**.

## O jogo

Você controla um aventureiro que atravessa uma fortaleza tomada pelo Eclipse. A cada andar escolhe uma sala
(combate, elite, evento, loja ou descanso), monta seu baralho e, no topo, enfrenta **O Regente do Eclipse**.

- **Duas classes:** Guardião (bloqueio e golpes pesados) e Tecelã Arcana (combinações, veneno e energia).
- **Mapa em pixel art:** o herói anda pelos corredores e ataca o inimigo para abrir o combate.
- **Combate por turnos com cartas:** 3 de energia por turno, intenção do inimigo sempre visível.
- **Conteúdo:** 24 cartas, 6 inimigos comuns, 3 elites, chefe com duas fases, 6 eventos, 8 artefatos e 6 consumíveis.
- **Salvamento automático** no navegador, pontuação e ranking local com as 10 melhores partidas.

## Como jogar

Abra `cronicas-do-eclipse/index.html` no navegador. Não precisa instalar nada.

| Onde | Tecla | Ação |
|---|---|---|
| Mapa | `←` `↑` `→` | andar até uma sala |
| Mapa | `↓` | voltar |
| Mapa | `Espaço` | atacar (inicia o combate se houver inimigo) ou entrar na sala |
| Combate | `1`–`9` | usar a carta correspondente |
| Combate | `E` | encerrar o turno |
| Combate | `D` | abrir o baralho |
| Qualquer tela | `Esc` | fechar janelas |

Também é possível jogar só com o mouse.

## Estrutura do repositório

```
cronicas-do-eclipse/   o jogo (index.html, css/, js/) e os testes (tests.html)
apresentacao/          roteiro da apresentação
```

A organização do código (camadas de interface, estado, domínio e infraestrutura), as chaves de salvamento
e a fórmula de pontuação estão descritas em [cronicas-do-eclipse/README.md](cronicas-do-eclipse/README.md).

## Testes

Abra `cronicas-do-eclipse/tests.html` no navegador: 39 testes das regras do jogo, incluindo a simulação de
60 jornadas completas.

## Créditos

Todo o conteúdo (cartas, inimigos, eventos e sprites) é original. Os sprites são desenhados em código e os
sons são sintetizados com a Web Audio API; o projeto não usa arquivos de imagem ou áudio de terceiros.
