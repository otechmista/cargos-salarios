# Emprega TI

Ajudar profissionais de TI a se empregar melhor no Brasil. Portal gratuito — hoje e para sempre. Começou
pelas ferramentas mais rápidas de entregar — quanto vale o próprio trabalho — e já tem a primeira versão
do **agregador de vagas de TI** espalhadas pela internet (LinkedIn, Gupy, Programathor, Remotar). Mantenha
essa direção em mente ao propor próximos passos ou ao decidir modelagem de dados — o formato `data/*.json`
por domínio já comporta `vagas` e foi pensado para comportar mais domínios (ex.: `recursos` de
capacitação) da mesma forma.

## Estado atual

Site estático (HTML/CSS/JS puro, sem build/bundler, sem framework), 4 páginas:

- `index.html` — home do portal: hero, cards de entrada para as 3 ferramentas (com estatísticas ao vivo) e
  prévia de vagas em destaque.
- `cargos.html` — tabela cruzada de cargos e salários de TI, do estágio ao C-level, CLT x PJ, com faixas
  estimadas por estado/região.
- `calculadora.html` — calculadora que converte salário entre CLT e PJ nos dois sentidos (13º, férias
  +1/3, FGTS, INSS, IRRF, Simples Nacional, INSS pró-labore, contador).
- `vagas.html` — busca de vagas de TI (área, nível, modalidade), sempre linkando para a vaga original.

Ver `README.md` para a estrutura de pastas completa, como rodar localmente e como publicar. Resumo:

- `data/*.json` — fonte única da verdade dos dados (cargos, regiões, executivos, referências, vagas), um
  domínio por arquivo, schema `{ fields, rows, index, lastSync, sources }`.
- `scripts/data-loader.js` — busca os JSONs via `fetch` (`loadCargosData()`, `loadVagasData()`) e monta as
  estruturas usadas pelas páginas.
- `scripts/salary-table.js` / `scripts/reference-table.js` / `scripts/job-listings.js` — Web Components
  (`customElements.define`, Shadow DOM) que renderizam tabelas/cards a partir de `rows`+`index`.
- `scripts/calculadora.js` — lógica de cálculo (INSS/IRRF/Simples Nacional) da calculadora.
- `assets/styles.css` / `assets/calculadora.css` — CSS próprio (sem framework), tokens via custom
  properties (`--accent`, `--clt`, `--pj`, etc.), tema claro/escuro via `prefers-color-scheme`, nav
  compartilhada (`.site-nav`) e cards de portal (`.tool-cards`) usados pelas 4 páginas.
- Ícones: Lucide via CDN (`unpkg.com/lucide`), `data-lucide="..."` + `window.lucide.createIcons()`, só em
  **light DOM** (header, nav, cards, footers) — o Lucide não enxerga dentro de Shadow DOM, então o
  conteúdo dinâmico de `<salary-table>`/`<reference-table>`/`<job-listings>` fica sem ícones de propósito.
- `.github/workflows/deploy.yml` — publica no GitHub Pages a cada push em `main`.
- `.claude/agents/` — `salary-data-updater.md` (cargos/regiões/executivos/referências),
  `job-listings-finder.md` (vagas), `learning-resources-finder.md` (cursos/dicas/tendências, domínio
  `recursos` ainda não gerado), `fullstack-developer.md` (implementação de novas funcionalidades).

## Design — regra importante

**Paleta é negociável, o estilo de componente não é (a menos que peçam explicitamente).** O visual atual
é: tipografia Inter (Google Fonts) em todo o site — pesos maiores (600–800) nos títulos para compensar
a ausência do serif que havia antes —, fundo neutro morno tipo "ledger", cards arredondados (~10px) com
sombra suave, barra de filtros sticky, tudo em CSS próprio (sem Tailwind). Números tabulares continuam em
fonte monoespaçada (`--font-mono`), sem trocar para Inter, para manter o alinhamento das colunas de R$.

Já foi tentado trocar para Tailwind CDN + padrões de componente do gov.br (barra de identificação,
breadcrumb, chips em pill, cards com ícone Lucide) — o usuário rejeitou explicitamente ("ficou feio") e
pediu para voltar ao estilo anterior, mudando **só as cores** para o azul institucional do gov.br
(`--accent: #1351b4` claro / `#6ea8f0` escuro). Como o accent virou azul, `--pj` foi realocado para o
teal que o accent usava antes (`#0f6e5c` claro / `#3fc0a0` escuro), pra CLT/PJ continuarem visualmente
distintos. `--clt` (âmbar) não mudou.

Se pedirem para "usar as cores do gov.br" de novo, isso significa ajustar os valores hex dos tokens em
`assets/styles.css` — não trocar para Tailwind nem replicar os componentes literais do gov.br (breadcrumb,
barra superior, etc.), nem usar o brasão/logo oficial (o site não é institucional, é um projeto
independente — evite qualquer coisa que sugira ser um site oficial do governo).

**Nota técnica:** Tailwind CDN/Play não estiliza conteúdo dentro de Shadow DOM (ele varre `document`
procurando classes usadas; shadow roots são isolados). Se Tailwind for reintroduzido algum dia, os
Web Components de tabela precisariam renderizar em light DOM antes disso funcionar.

## Git — nunca commitar ou dar push automaticamente

**Nunca execute `git commit` ou `git push` neste repositório sem o usuário pedir explicitamente
em cada ocasião.** O usuário é quem decide quando e o que commitar/enviar. Isso vale para
Claude Code rodando diretamente na sessão e para qualquer subagent definido em
`.claude/agents/` (ex.: `salary-data-updater`).

- Está tudo bem deixar mudanças no working tree sem commitar — é o esperado.
- Se o trabalho terminou e normalmente você commitaria, em vez disso resuma o que mudou e
  pergunte se o usuário quer que você commite.
- `git add`/`git status`/`git diff` para revisar mudanças são normais e não precisam de
  permissão. O que precisa de pedido explícito é criar o commit (e, claro, `git push`).

## Rodar localmente

Os scripts usam ES Modules (`import`/`export`) — não funcionam abrindo o HTML direto do disco
(`file://`, bloqueado por CORS). Sirva por HTTP: `python -m http.server 5500` (há um
`.claude/launch.json` configurado para `preview_start` usar isso automaticamente) e abra
`http://localhost:5500`.
