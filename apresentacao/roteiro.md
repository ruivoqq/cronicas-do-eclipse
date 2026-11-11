# Roteiro de apresentação — Crônicas do Eclipse

Duração sugerida: **10 a 12 minutos** + perguntas.
**Aluno:** Matheus Henrique da Cruz Pereira · **Disciplina:** Aplicações FrontEnd · **Professor:** João Paulo Pimentel · **Data:** 11/11/2026
Falta preencher no último slide: link do repositório no GitHub e link do jogo publicado.

Antes de começar:
- Deixe o jogo aberto em outra aba (`cronicas-do-eclipse/index.html`) já no **menu inicial**.
- Deixe uma segunda aba com `cronicas-do-eclipse/tests.html` aberta.
- Se possível, tenha uma jornada salva em andamento para mostrar o "Continuar".

---

## 1. Abertura (30 s) — slide "Crônicas do Eclipse"

> Boa noite. Eu sou **Matheus Henrique da Cruz Pereira** e vou apresentar o **Crônicas do Eclipse**, um RPG roguelike de cartas que roda inteiramente no navegador, desenvolvido para a disciplina **Aplicações FrontEnd**, com o professor João Paulo Pimentel.

## 2. Objetivo (1 min) — slide "O desafio"

> O objetivo foi construir um jogo web completo que demonstrasse, na prática, os conteúdos da disciplina: interface interativa, gerenciamento de um estado complexo, persistência local, regras de negócio bem definidas e testes.
> Escolhi um RPG de cartas porque ele tem muitas regras — energia, bloqueio, efeitos, recompensas — e isso exige organizar bem o código. E fiz tudo com **HTML, CSS e JavaScript puro**, sem nenhuma biblioteca.

## 3. O jogo (1 min) — slide "O ciclo da jornada"

> O jogador controla um aventureiro que atravessa uma fortaleza tomada pelo Eclipse. O mapa é uma masmorra em pixel art, com sprites desenhados no próprio código: o herói anda pelos corredores com as setas do teclado e, a cada andar, escolhe uma sala: combate, elite, evento, loja ou descanso.
> Depois de cada sala ele recebe recompensas, volta ao mapa e, no fim, enfrenta o chefe. Uma jornada dura de 25 a 45 minutos e cada uma é diferente, porque o mapa e as recompensas são gerados a partir de uma semente aleatória.

## 4. Classes (45 s) — slide "Duas classes, dois estilos"

> Há duas classes. O **Guardião** tem mais vida e joga na defesa: acumula bloqueio e responde com golpes pesados.
> A **Tecelã Arcana** tem menos vida e joga com combinações: compra cartas, gera energia e aplica veneno e fraquezas.
> Cada uma tem uma habilidade passiva e um baralho inicial diferente.

## 5. Combate (1 min 30 s) — slide "Como funciona o combate"

> O combate começa no mapa: o jogador chega ao lado do inimigo e aperta Espaço. O Guardião dá uma espadada e a Tecelã solta um orbe de magia; esse ataque inicial causa 4 de dano e abre o combate. A partir daí o combate é por turnos. Cada turno o jogador recebe 3 de energia e compra 5 cartas. Cada carta tem um custo; ele usa as cartas enquanto tiver energia e encerra o turno.
> O ponto principal: o inimigo **mostra antes** o que vai fazer — atacar, defender ou aplicar um efeito. Então a vitória depende de planejamento, não de reflexo.
> As regras seguem uma ordem fixa e documentada: bloqueio absorve dano antes da vida, veneno age no fim da rodada, e assim por diante. Isso deixa o combate previsível e testável.

## 6. Conteúdo (30 s) — slide "Conteúdo do MVP"

> Implementei todo o MVP do plano: 24 cartas, 6 inimigos comuns, 3 elites, um chefe com duas fases, 6 eventos narrativos, 8 artefatos e 6 consumíveis, além de loja, descanso, experiência e evolução de nível.

## 7. Arquitetura (1 min 30 s) — slide "Arquitetura em quatro camadas"

> O código foi dividido em quatro camadas.
> A **interface** só desenha telas a partir do estado, incluindo o mapa e os sprites em pixel art, que são grades de pixels escritas em código, sem arquivos de imagem. O **estado** fica num único objeto central, e toda mudança passa por ações centralizadas.
> O **domínio** contém as regras — combate, mapa, recompensas, pontuação — e não conhece a interface. Por isso consegui testar as regras sem abrir o jogo.
> A **infraestrutura** cuida do salvamento, do áudio e da aleatoriedade com semente.

## 8. Estado e persistência (1 min) — slide "Estado e salvamento"

> A jornada é uma máquina de estados: explorando, em combate, escolhendo recompensa, em evento, na loja, descansando, evoluindo, vitória e derrota.
> O jogo salva sozinho no localStorage ao entrar e sair de salas e no início de cada turno. Todo save tem versão e é validado ao carregar. Se estiver corrompido, o jogo mostra uma tela de recuperação e preserva o ranking e as configurações.

## 9. Testes (1 min) — slide "Testes e qualidade"

> Criei 39 testes automatizados para as regras de maior risco: dano, bloqueio, energia, compra e descarte, fases do chefe, mapa sempre válido, loja, pontuação, ranking e validação do save.
> Um dos testes simula 60 jornadas completas do início ao fim. Também usei simulações para balancear: na primeira versão o chefe era forte demais e a Tecelã muito fraca, e ajustei os números.
> *(Mostrar rapidamente a aba `tests.html` com 39/39.)*

## 10. Acessibilidade (30 s) — slide "Acessível e responsivo"

> Todas as ações funcionam pelo teclado: as setas andam no mapa, Espaço ataca, números jogam as cartas, E encerra o turno, Esc fecha janelas. O foco é sempre visível, as informações não dependem só de cor, há opção de reduzir animações e o layout funciona a partir de 768 pixels.

## 11. Demonstração (3 min) — slide "Demonstração"

Siga esta ordem, falando o que está fazendo:
1. **Menu** → Nova jornada → mostrar as duas classes → escolher uma e confirmar.
2. **Mapa** → apertar Espaço uma vez para mostrar o ataque da classe sem inimigo; depois andar com as setas até uma sala com inimigo (só as salas conectadas ficam disponíveis).
3. **Combate** → apertar Espaço ao lado do inimigo (o ataque inicial abre o combate); mostrar a intenção do inimigo, usar uma carta (energia diminui), encerrar o turno.
4. **Recompensa** → escolher uma carta.
5. **Recarregar a página (F5)** → Continuar jornada → mostrar que tudo voltou.
6. **Ranking** → mostrar a tabela com pontuação.

> Se o tempo estiver curto, pule para os itens 3, 5 e 6.

## 12. Resultados (45 s) — slide "Resultados"

> Entreguei todo o escopo obrigatório: é possível jogar uma jornada completa, do menu ao chefe, com salvamento e ranking.
> Como próximos passos, o plano prevê uma terceira classe, modo difícil, conquistas e um compêndio de cartas.
> O principal aprendizado foi separar regras e interface: isso tornou possível testar e balancear o jogo com segurança.

## 13. Encerramento — slide "Obrigado"

> Obrigado. Fico à disposição para perguntas.

---

## Perguntas prováveis

- **Por que não usaram React?** O plano permitia; escolhi JavaScript puro para mostrar domínio da base (DOM, eventos, estado) e ter zero dependências. A organização em camadas cumpre o papel que um framework daria.
- **Como garantem que o mapa sempre tem caminho até o chefe?** O mapa é gerado por caminhos que partem do início e chegam ao último andar, e uma função valida isso; um teste roda 200 sementes diferentes.
- **O que acontece se alguém editar o localStorage?** O save é validado campo a campo; dados inválidos são rejeitados e nada é executado como código.
- **Como fizeram o balanceamento?** Com simulações automáticas de jornadas inteiras, observando onde o jogador morria e ajustando vida e dano.
