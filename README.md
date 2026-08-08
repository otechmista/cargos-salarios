# Cargos & Salários em TI — Brasil 2026

Site estático (HTML/CSS/JS puro, sem build/bundler) com duas páginas:

- **`index.html`** — tabela cruzada de cargos e salários de TI no Brasil, do estágio ao C-level, comparando regimes **CLT** e **PJ**, com faixas estimadas por estado/região.
- **`calculadora.html`** — calculadora que converte salário entre CLT e PJ nos dois sentidos, considerando 13º, férias remuneradas (+1/3), FGTS, INSS, IRRF, Simples Nacional, INSS pró-labore e contador.

Fontes: Robert Half (Guia Salarial 2026), Michael Page, Glassdoor Brasil, Nerdin, Código Fonte TV, salario.com.br, Aprender21, HUNT IT, Contabilizei e Receita Federal — ver rodapé de cada página para os links.

## Estrutura do projeto

```
index.html              tabela de cargos e salários
calculadora.html         calculadora CLT x PJ
data/
  cargos.json              domínio "cargos" — cargo/área/nível/CLT/PJ/fonte + índice byArea/byNivel
  regioes.json              domínio "regiões" — multiplicador por estado + índice byCode
  executivos.json           domínio "executivos" — CIO/CTO/CSO (Robert Half)
  referencias.json          domínio "referências" — medianas agregadas sem distinção CLT/PJ
assets/
  styles.css              tokens (cores, tipografia) + chrome compartilhado das páginas
  calculadora.css          estilos específicos da calculadora
  og-image.svg             imagem de preview social — index.html
  og-image-calculadora.svg imagem de preview social — calculadora.html
  favicon-cargos.svg
  favicon-calculadora.svg
scripts/
  data-loader.js             carrega data/*.json (fetch) e devolve ROWS/REGIONS/EXEC/REF prontos
  salary-table.js             Web Component <salary-table> — tabela filtrável (busca, área, nível, região)
  reference-table.js          Web Component <reference-table> — tabela de referências agregadas
  calculadora.js               lógica de cálculo (INSS/IRRF/Simples) + wiring do formulário
.github/workflows/deploy.yml  publica no GitHub Pages a cada push em main
```

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

`scripts/data-loader.js` busca os quatro arquivos com `fetch`, converte `regioes`/`executivos` (poucas linhas)
para objetos e mantém `cargos`/`referencias` como tuplas. `<salary-table>` recebe o índice via `el.index =
ROWS_INDEX` e usa `byArea`/`byNivel` para montar o conjunto de candidatos ao filtrar, em vez de varrer as 114
linhas a cada clique.

Para regenerar os JSONs a partir de uma edição manual, edite os arquivos em `data/` diretamente — eles são a
fonte única da verdade; não há mais dados de cargos hardcoded em nenhum `.js`.

### Os Web Components

`<salary-table>` e `<reference-table>` são `HTMLElement`s com Shadow DOM (`scripts/salary-table.js` e
`scripts/reference-table.js`). Eles recebem os dados via propriedade JS (não atributo, por serem arrays/objetos):

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
o estado/região no seletor interno — é assim que os cards executivos de `index.html` (que ficam fora do componente,
no light DOM) sabem recalcular com o mesmo multiplicador.

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
5. Abra `index.html` e `calculadora.html` e troque as tags `<meta property="og:url" content="...">` pela URL final, para o preview em redes sociais ficar correto — depois faça commit e push da alteração.

Se preferir não usar Actions, dá para trocar o Source de volta para **Deploy from a branch** (`main`, pasta raiz) a qualquer momento — os HTMLs funcionam do mesmo jeito nos dois modos.

## Comandos (a partir desta pasta)

```bash
git add -A
git commit -m "Publica tabela de cargos e salários de TI"
git push -u origin main
```

## Compartilhamento em redes sociais

Os `<head>` já incluem Open Graph e Twitter Card apontando para `assets/og-image.svg` / `assets/og-image-calculadora.svg`. A maioria das redes (X/Twitter, Discord, Slack, WhatsApp, Telegram, LinkedIn) renderiza SVG no preview; para garantir compatibilidade total com Facebook (que às vezes prefere raster), exporte os SVGs para PNG 1200×630 em qualquer conversor e aponte as tags `og:image` / `twitter:image` para o `.png`.

## Atualizar os dados

Edite o arquivo do domínio correspondente em `data/` (ver seção "Os dados" acima) — `cargos.json` para
cargos/salários, `regioes.json` para os multiplicadores por estado, `executivos.json` para CIO/CTO/CSO e
`referencias.json` para a tabela agregada. Ao adicionar ou remover linhas de `cargos.json`, recalcule
`index.byArea`/`index.byNivel` (listas de posições no array `rows`) e atualize `lastSync`.

Os parâmetros da calculadora (tabelas INSS/IRRF, Simples Nacional) ficam no topo de `scripts/calculadora.js`.
