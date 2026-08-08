// <job-listings> — busca/filtro de vagas (texto, área, nível, modalidade) ou, em modo
// compacto (propriedade `limit`), uma prévia em cards sem a barra de filtros — usada na
// home para "Vagas em destaque". Mesmo padrão arquitetural de scripts/salary-table.js:
// Web Component com Shadow DOM, API via propriedades JS, filtragem usando o índice
// pré-computado de data/vagas.json.
//
// Uso (página completa):
//   <job-listings></job-listings>
//   <script type="module">
//     import { loadVagasData } from "./data-loader.js";
//     const { VAGAS, VAGAS_INDEX } = await loadVagasData();
//     const el = document.querySelector("job-listings");
//     el.rows = VAGAS;
//     el.index = VAGAS_INDEX;
//   </script>
//
// Uso (prévia compacta, ex. na home):
//   <job-listings limit="4"></job-listings>  <!-- ou el.limit = 4 via JS -->

const FIELDS = ["titulo", "empresa", "area", "nivel", "modalidade", "localizacao", "descricao", "link", "fonte"];

const FULL_TEMPLATE = `
<style>
  :host { display: block; font-family: var(--font-body); color: var(--ink); }
  *, *::before, *::after { box-sizing: border-box; }

  .filters {
    position: sticky;
    top: 0;
    z-index: 5;
    background: var(--bg);
    padding: 0.9rem 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
    border-bottom: 1px solid var(--border);
    margin-bottom: 1.1rem;
  }
  #search {
    flex: 1 1 220px;
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--ink);
    border-radius: 8px;
    padding: 0.55rem 0.8rem;
    font-family: var(--font-body);
    font-size: 0.92rem;
  }
  #search:focus-visible, .chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .chip-group { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .chip {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    padding: 0.4rem 0.7rem;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--ink-dim);
    cursor: pointer;
    user-select: none;
  }
  .chip[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
  .result-count { font-family: var(--font-mono); font-size: 0.78rem; color: var(--ink-dim); margin-left: auto; }

  ${cardCss()}
</style>

<div class="filters">
  <input id="search" type="search" placeholder="Buscar vaga (ex: Python, Analista de Dados, remoto)…" autocomplete="off" />
  <div class="chip-group" id="area-chips"></div>
  <div class="chip-group" id="nivel-chips"></div>
  <div class="chip-group" id="modalidade-chips"></div>
  <span class="result-count" id="result-count"></span>
</div>

<div class="grid" id="grid"></div>
`;

function cardCss() {
  return `
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
  .card {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1.1rem 1.2rem;
    box-shadow: var(--shadow);
  }
  .card .titulo { font-family: var(--font-display); font-weight: 700; font-size: 1.02rem; line-height: 1.3; }
  .card .empresa { font-size: 0.85rem; color: var(--ink-dim); }
  .badges { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .badge {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    padding: 0.15rem 0.5rem;
    border-radius: 5px;
    border: 1px solid var(--border);
    color: var(--ink-dim);
    white-space: nowrap;
  }
  .badge.remoto { color: var(--accent); border-color: var(--accent); }
  .card .descricao { font-size: 0.88rem; color: var(--ink-dim); flex: 1; margin: 0; }
  .card .foot { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; padding-top: 0.4rem; border-top: 1px dashed var(--border); }
  .card .fonte { font-size: 0.72rem; color: var(--ink-dim); }
  .card .ver { font-family: var(--font-mono); font-size: 0.82rem; color: var(--accent); text-decoration: none; white-space: nowrap; }
  .card .ver:hover { text-decoration: underline; }
  .empty { text-align: center; padding: 2.2rem; color: var(--ink-dim); grid-column: 1 / -1; }
  `;
}

const COMPACT_TEMPLATE = `<style>${cardCss()}</style><div class="grid" id="grid"></div>`;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function cardHtml(row) {
  const obj = Object.fromEntries(FIELDS.map((f, i) => [f, row[i]]));
  const badges = [
    obj.area ? `<span class="badge">${escapeHtml(obj.area)}</span>` : "",
    obj.nivel ? `<span class="badge">${escapeHtml(obj.nivel)}</span>` : "",
    obj.modalidade ? `<span class="badge${obj.modalidade === "Remoto" ? " remoto" : ""}">${escapeHtml(obj.modalidade)}</span>` : "",
  ].join("");
  return `
    <article class="card">
      <div class="titulo">${escapeHtml(obj.titulo)}</div>
      <div class="empresa">${escapeHtml(obj.empresa)}${obj.localizacao ? " · " + escapeHtml(obj.localizacao) : ""}</div>
      <div class="badges">${badges}</div>
      <p class="descricao">${escapeHtml(obj.descricao)}</p>
      <div class="foot">
        <span class="fonte">${escapeHtml(obj.fonte)}</span>
        <a class="ver" href="${escapeHtml(obj.link)}" target="_blank" rel="noopener">Ver vaga →</a>
      </div>
    </article>`;
}

class JobListings extends HTMLElement {
  static get observedAttributes() { return ["limit"]; }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._rows = [];
    this._index = null;
    this._limit = null;
    this._shellBuilt = false;
    this.state = { areas: new Set(), niveis: new Set(), modalidades: new Set(), q: "" };
  }

  set rows(v) { this._rows = v || []; this._chipsBuilt = false; this._updateAll(); }
  get rows() { return this._rows; }

  set index(v) { this._index = v || null; this._render(); }
  get index() { return this._index; }

  set limit(v) {
    this._limit = v == null || v === "" ? null : Number(v);
    this._shellBuilt = false; // muda de template (completo <-> compacto)
    this._updateAll();
  }
  get limit() { return this._limit; }

  attributeChangedCallback(name, _old, value) {
    if (name === "limit") this.limit = value;
  }

  connectedCallback() { this._updateAll(); }

  _ensureShell() {
    if (this._shellBuilt) return;
    this.shadowRoot.innerHTML = this._limit ? COMPACT_TEMPLATE : FULL_TEMPLATE;
    this._shellBuilt = true;
    this.$grid = this.shadowRoot.getElementById("grid");

    if (this._limit) return; // modo compacto não tem filtros

    this.$search = this.shadowRoot.getElementById("search");
    this.$areaChips = this.shadowRoot.getElementById("area-chips");
    this.$nivelChips = this.shadowRoot.getElementById("nivel-chips");
    this.$modalidadeChips = this.shadowRoot.getElementById("modalidade-chips");
    this.$resultCount = this.shadowRoot.getElementById("result-count");

    this.$search.addEventListener("input", (e) => {
      this.state.q = e.target.value.trim().toLowerCase();
      this._render();
    });
    const bindChips = (container, set) => {
      container.addEventListener("click", (e) => {
        const btn = e.target.closest(".chip");
        if (!btn) return;
        const v = btn.dataset.value;
        set.has(v) ? set.delete(v) : set.add(v);
        btn.setAttribute("aria-pressed", set.has(v));
        this._render();
      });
    };
    bindChips(this.$areaChips, this.state.areas);
    bindChips(this.$nivelChips, this.state.niveis);
    bindChips(this.$modalidadeChips, this.state.modalidades);
  }

  _ensureChips() {
    if (this._limit || this._chipsBuilt || !this._rows.length) return;
    this._chipsBuilt = true;
    const uniq = (fieldIdx) => [...new Set(this._rows.map((r) => r[fieldIdx]).filter(Boolean))];
    const areas = this._index?.byArea ? Object.keys(this._index.byArea) : uniq(FIELDS.indexOf("area"));
    const niveis = this._index?.byNivel ? Object.keys(this._index.byNivel) : uniq(FIELDS.indexOf("nivel"));
    const modalidades = this._index?.byModalidade ? Object.keys(this._index.byModalidade) : uniq(FIELDS.indexOf("modalidade"));
    const chip = (v) => `<button class="chip" type="button" data-value="${escapeHtml(v)}" aria-pressed="false">${escapeHtml(v)}</button>`;
    this.$areaChips.innerHTML = areas.map(chip).join("");
    this.$nivelChips.innerHTML = niveis.map(chip).join("");
    this.$modalidadeChips.innerHTML = modalidades.map(chip).join("");
  }

  _updateAll() {
    if (!this.isConnected) return;
    this._ensureShell();
    this._ensureChips();
    this._render();
  }

  _candidateIndexes() {
    const idx = this._index;
    const union = (map, keys) => {
      const set = new Set();
      keys.forEach((k) => (map[k] || []).forEach((i) => set.add(i)));
      return set;
    };
    let candidate = null;
    const intersect = (a, b) => (a ? new Set([...a].filter((i) => b.has(i))) : b);
    if (this.state.areas.size) candidate = intersect(candidate, union(idx.byArea || {}, this.state.areas));
    if (this.state.niveis.size) candidate = intersect(candidate, union(idx.byNivel || {}, this.state.niveis));
    if (this.state.modalidades.size) candidate = intersect(candidate, union(idx.byModalidade || {}, this.state.modalidades));
    return candidate;
  }

  _render() {
    if (!this._shellBuilt || !this._rows.length) return;

    if (this._limit) {
      const rows = this._rows.slice(0, this._limit);
      this.$grid.innerHTML = rows.map(cardHtml).join("") || `<div class="empty">Nenhuma vaga disponível no momento.</div>`;
      return;
    }

    let base = this._rows.map((r, i) => [i, r]);
    const hasFacetFilter = this.state.areas.size || this.state.niveis.size || this.state.modalidades.size;
    if (this._index && hasFacetFilter) {
      const candidate = this._candidateIndexes();
      base = base.filter(([i]) => candidate.has(i));
    } else if (hasFacetFilter) {
      base = base.filter(([, r]) => {
        const [, , area, nivel, modalidade] = r;
        if (this.state.areas.size && !this.state.areas.has(area)) return false;
        if (this.state.niveis.size && !this.state.niveis.has(nivel)) return false;
        if (this.state.modalidades.size && !this.state.modalidades.has(modalidade)) return false;
        return true;
      });
    }

    const q = this.state.q;
    const filtered = base
      .map(([, r]) => r)
      .filter((r) => !q || r[0].toLowerCase().includes(q) || r[1].toLowerCase().includes(q));

    this.$resultCount.textContent = `${filtered.length} vaga${filtered.length === 1 ? "" : "s"}`;
    this.$grid.innerHTML = filtered.map(cardHtml).join("") || `<div class="empty">Nenhuma vaga encontrada com esses filtros.</div>`;
  }
}

customElements.define("job-listings", JobListings);
