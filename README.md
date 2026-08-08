# Emprega TI

**Emprega TI** é um portal gratuito — hoje e para sempre — com um objetivo simples: ajudar profissionais
de TI a se empregar melhor no Brasil. Entender quanto vale o próprio trabalho, comparar CLT x PJ, e
encontrar a próxima vaga, tudo num só lugar, sem paywall e sem cadastro.

O projeto começou pelas ferramentas mais imediatas — pesquisa salarial e calculadora — e já inclui a
primeira versão do agregador de vagas (LinkedIn, Gupy, Programathor, Remotar e outras fontes).

Site estático (HTML/CSS/JS puro, sem build/bundler), 4 páginas:

- **`index.html`** — home do portal: hero, cards de entrada para as 3 ferramentas (com estatísticas ao vivo) e uma prévia de vagas em destaque.
- **`cargos.html`** — tabela cruzada de cargos e salários de TI no Brasil, do estágio ao C-level, comparando regimes **CLT** e **PJ**, com faixas estimadas por estado/região.
- **`calculadora.html`** — calculadora que converte salário entre CLT e PJ nos dois sentidos, considerando 13º, férias remuneradas (+1/3), FGTS, INSS, IRRF, Simples Nacional, INSS pró-labore e contador.
- **`vagas.html`** — busca de vagas reais de TI, filtrável por área, nível e modalidade, sempre linkando para a vaga original.

Fontes: Robert Half (Guia Salarial 2026), Michael Page, Glassdoor Brasil, Nerdin, Código Fonte TV, salario.com.br, Aprender21, HUNT IT, Contabilizei, Receita Federal, LinkedIn, Gupy, Programathor e Remotar — ver rodapé de cada página para os links.

## Estrutura do projeto

```
index.html               home do portal (hero + cards + vagas em destaque)
cargos.html               tabela de cargos e salários
calculadora.html          calculadora CLT x PJ
vagas.html                 busca de vagas de TI
data/
  cargos.json               domínio "cargos" — cargo/área/nível/CLT/PJ/fonte + índice byArea/byNivel
  regioes.json              domínio "regiões" — multiplicador por estado + índice byCode
  executivos.json           domínio "executivos" — CIO/CTO/CSO (Robert Half)
  referencias.json          domínio "referências" — medianas agregadas sem distinção CLT/PJ
  vagas.json                 domínio "vagas" — vagas reais + índice byArea/byNivel/byModalidade
assets/
  styles.css                tokens (cores, tipografia) + chrome compartilhado das 4 páginas (nav, hero, tool-cards)
  calculadora.css            estilos específicos da calculadora
  og-image*.svg              imagens de preview social, uma por página
  favicon-*.svg               favicon por página (emoji)
scripts/
  data-loader.js              carrega data/*.json (fetch) — loadCargosData() e loadVagasData()
  salary-table.js             Web Component <salary-table> — tabela filtrável (busca, área, nível, região)
  reference-table.js          Web Component <reference-table> — tabela de referências agregadas
  job-listings.js              Web Component <job-listings> — busca/filtro de vagas em cards (ou prévia compacta com `limit`)
  calculadora.js                lógica de cálculo (INSS/IRRF/Simples) + wiring do formulário
.claude/agents/
  salary-data-updater.md        pesquisa e atualiza data/cargos.json, regioes.json, executivos.json, referencias.json
  job-listings-finder.md        pesquisa e atualiza data/vagas.json (lista de plataformas por região/cargo)
  learning-resources-finder.md  pesquisa e monta data/recursos.json (cursos gratuitos, dicas, tendências)
  fullstack-developer.md        implementa novas funcionalidades (HTML/CSS/JS vanilla, sem framework)
.github/workflows/deploy.yml   publica no GitHub Pages a cada push em main
```

### Navegação compartilhada

As 4 páginas usam o mesmo `.site-nav` (definido em `assets/styles.css`): marca "Emprega TI" + links para
Cargos & Salários / Calculadora / Vagas, com a página atual marcada via `aria-current="page"`. Como não há
templating, o bloco de nav é duplicado em cada `<body>` — mesmo padrão do `<head>`, que também é duplicado
por página.

### Ícones (Lucide)

As 4 páginas carregam `https://unpkg.com/lucide@latest/dist/umd/lucide.js` e chamam
`window.lucide.createIcons()` após o conteúdo estático (e, em `cargos.html`/`index.html`, após cada
re-render dinâmico dos cards executivos/vagas em destaque). Ícones só aparecem em **light DOM** — o
Lucide varre `document` procurando `[data-lucide]`, e não enxerga dentro de Shadow DOM, então o interior
de `<salary-table>`/`<reference-table>`/`<job-listings>` (tabelas e cards gerados dinamicamente) fica sem
ícones de propósito.

### Os dados (`data/*.json`)

Cada domínio é um arquivo próprio, no formato compacto `{ fields, rows }` (tuplas em vez de objetos repetindo
chaves — menor payload), mais um `index` pré-computado e a data da última sincronização:

```json
{
  "domain": "cargos",
  "lastSync": "2026-08-08",
  "sources": ["Robert Half 2026", "Nerdin 2026", "..."],
  "fields": ["cargo", "area", "nivel", "cltMin", "cltMax", "pjMin", "pjMax", "fonte"],
  "rows": [["Desenvolvedor Front-End", "Desenvolvimento", "Júnior", 4500, 6500, 6000, 9000, "Nerdin 2026"], "..."],
  "index": { "byArea": { "Desenvolvimento": [0, 1, 2, "..."] }, "byNivel": { "Júnior": [0, 3, 6, "..."] } }
}
```

`data/vagas.json` segue o mesmo formato, com `fields: ["titulo", "empresa", "area", "nivel", "modalidade",
"localizacao", "descricao", "link", "fonte"]` e índice `byArea`/`byNivel`/`byModalidade`.

`scripts/data-loader.js` expõe duas funções: `loadCargosData()` (cargos + regiões + executivos +
referências, usado por `cargos.html` e pelas estatísticas de `index.html`) e `loadVagasData()` (vagas,
usado por `vagas.html`, `index.html` e a prévia em destaque). Os componentes recebem o índice via
propriedade (`el.index = ROWS_INDEX`) e usam `byArea`/`byNivel`/`byModalidade` para montar o conjunto de
candidatos ao filtrar, em vez de varrer todas as linhas a cada clique.

Para atualizar os dados, edite o arquivo do domínio em `data/` diretamente — são a fonte única da verdade;
não há dados hardcoded em nenhum `.js`. Ver também os agents em `.claude/agents/` que automatizam essa
pesquisa.

### Os Web Components

`<salary-table>`, `<reference-table>` e `<job-listings>` são `HTMLElement`s com Shadow DOM
(`scripts/salary-table.js`, `scripts/reference-table.js`, `scripts/job-listings.js`). Recebem os dados via
propriedade JS (não atributo, por serem arrays/objetos):

```html
<salary-table id="salary-table"></salary-table>
<script type="module">
  import { loadCargosData } from "./scripts/data-loader.js";
  const { ROWS, ROWS_INDEX, REGIONS } = await loadCargosData();
  const el = document.getElementById("salary-table");
  el.rows = ROWS;
  el.index = ROWS_INDEX;
  el.regions = REGIONS;
</script>
```

`<salary-table>` dispara um evento `region-change` (`{ detail: { code, mult, region } }`) sempre que o usuário troca
o estado/região no seletor interno — é assim que os cards executivos de `cargos.html` (que ficam fora do componente,
no light DOM) sabem recalcular com o mesmo multiplicador.

`<job-listings>` aceita uma propriedade/atributo `limit` opcional: com `limit`, renderiza só os N primeiros
resultados sem a barra de filtros (usado pela home para "Vagas em destaque"); sem `limit`, é a experiência
completa de busca/filtro usada em `vagas.html`.

As cores/fontes usadas dentro do Shadow DOM são as mesmas custom properties (`var(--accent)`, `var(--clt)`, etc.)
definidas em `assets/styles.css` — custom properties atravessam a fronteira do Shadow DOM normalmente, então não
há duplicação de tokens.

## Rodar localmente

Os scripts usam ES Modules (`import`/`export`), que o navegador bloqueia por CORS ao abrir o HTML direto do disco
(`file://`). É preciso servir por HTTP:

```bash
python -m http.server 5500
# ou
npx serve .
```

Depois abra `http://localhost:5500`.

## Publicar no GitHub Pages

Este repositório já inclui um workflow (`.github/workflows/deploy.yml`) que publica o site automaticamente a cada `push` na branch `main`, usando o Actions oficial do GitHub Pages.

1. Crie o repositório no GitHub e envie este projeto (veja "Comandos" abaixo).
2. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Não é preciso escolher branch/pasta — o workflow cuida disso.
3. Cada push em `main` dispara o job em **Actions**; acompanhe ali até o status ficar verde.
4. O site fica disponível em `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`.
5. Abra as 4 páginas e troque as tags `<meta property="og:url" content="...">` pela URL final, para o preview em redes sociais ficar correto — depois faça commit e push da alteração.

Se preferir não usar Actions, dá para trocar o Source de volta para **Deploy from a branch** (`main`, pasta raiz) a qualquer momento — os HTMLs funcionam do mesmo jeito nos dois modos.

## Comandos (a partir desta pasta)

```bash
git add -A
git commit -m "Publica tabela de cargos e salários de TI"
git push -u origin main
```

**Importante:** siga `CLAUDE.md` — nunca commite/dê push automaticamente. Isso é decisão do usuário, sempre.

## Compartilhamento em redes sociais

Cada página tem seu próprio Open Graph e Twitter Card, apontando para uma imagem `assets/og-image*.svg`
própria. A maioria das redes (X/Twitter, Discord, Slack, WhatsApp, Telegram, LinkedIn) renderiza SVG no
preview; para garantir compatibilidade total com Facebook (que às vezes prefere raster), exporte os SVGs
para PNG 1200×630 em qualquer conversor e aponte as tags `og:image` / `twitter:image` para o `.png`.

## Atualizar os dados

Edite o arquivo do domínio correspondente em `data/` (ver seção "Os dados" acima) — `cargos.json` para
cargos/salários, `regioes.json` para os multiplicadores por estado, `executivos.json` para CIO/CTO/CSO,
`referencias.json` para a tabela agregada, e `vagas.json` para as vagas. Ao adicionar ou remover linhas,
recalcule o `index` correspondente (listas de posições no array `rows`) e atualize `lastSync`. Os agents em
`.claude/agents/` automatizam a pesquisa e a regeneração do índice — ver `salary-data-updater.md`,
`job-listings-finder.md` e `learning-resources-finder.md`.

Os parâmetros da calculadora (tabelas INSS/IRRF, Simples Nacional) ficam no topo de `scripts/calculadora.js`.
