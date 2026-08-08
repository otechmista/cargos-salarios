// <salary-table> — tabela de cargos filtrável (busca, área, nível, estado/região).
// Uso:
//   <salary-table></salary-table>
//   <script type="module">
//     import { ROWS, REGIONS } from './cargos-data.js';
//     const el = document.querySelector('salary-table');
//     el.rows = ROWS;
//     el.regions = REGIONS;
//   </script>
//
// Dispara `region-change` (CustomEvent, detail: { code, mult, region }) sempre que
// o usuário troca o estado/região, para quem estiver fora do componente (ex.: os
// cards executivos de index.html) recalcular com o mesmo multiplicador.

const TEMPLATE = `
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
  #region {
    flex: 0 0 auto;
    background: var(--surface);
    border: 1px solid var(--accent);
    color: var(--ink);
    border-radius: 8px;
    padding: 0.55rem 0.8rem;
    font-family: var(--font-mono);
    font-size: 0.82rem;
    max-width: 260px;
  }
  #search:focus-visible, #region:focus-visible, .chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .region-note { font-size: 0.8rem; color: var(--ink-dim); margin: -0.5rem 0 1.1rem; max-width: 68ch; }
  .region-note strong { color: var(--ink); }

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

  .table-scroll { overflow-x: auto; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); box-shadow: var(--shadow); }
  table { border-collapse: collapse; width: 100%; min-width: 760px; font-size: 0.9rem; }
  thead th {
    position: sticky; top: 52px;
    background: var(--surface-2);
    text-align: left;
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-dim);
    padding: 0.65rem 0.9rem;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  th.num, td.num { text-align: right; }
  tbody td { padding: 0.6rem 0.9rem; border-bottom: 1px solid var(--border); vertical-align: middle; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:hover { background: var(--surface-2); }
  td.num, .figure { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
  .role-cell .cargo { font-weight: 600; }
  .role-cell .area { display: block; font-size: 0.76rem; color: var(--ink-dim); }
  .level-badge {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
    border-radius: 5px;
    border: 1px solid var(--border);
    color: var(--ink-dim);
    white-space: nowrap;
  }
  .figure.clt { color: var(--clt); }
  .figure.pj { color: var(--pj); }
  .diff { font-family: var(--font-mono); font-size: 0.82rem; }
  .diff.up::before { content: "+"; }
  .muted { color: var(--ink-dim); }
  .src { font-size: 0.74rem; color: var(--ink-dim); white-space: nowrap; }
  .empty-row td { text-align: center; padding: 2.2rem; color: var(--ink-dim); }
</style>

<div class="filters">
  <input id="search" type="search" placeholder="Buscar cargo (ex: Python, DBA, Product Owner)…" autocomplete="off" />
  <select id="region" aria-label="Estado ou região"></select>
  <div class="chip-group" id="area-chips"></div>
  <div class="chip-group" id="level-chips"></div>
  <span class="result-count" id="result-count"></span>
</div>
<p class="region-note" id="region-note"></p>

<div class="table-scroll">
  <table>
    <thead>
      <tr>
        <th>Cargo</th>
        <th>Nível</th>
        <th class="num">CLT (R$/mês)</th>
        <th class="num">PJ (R$/mês)</th>
        <th class="num">Δ PJ vs CLT</th>
        <th>Fonte</th>
      </tr>
    </thead>
    <tbody id="table-body"></tbody>
  </table>
</div>
`;

const fmt = (n) => (n == null ? "—" : "R$ " + n.toLocaleString("pt-BR"));
const scale = (n, mult) => (n == null ? null : Math.round((n * mult) / 100) * 100);

function diffLabel(cltMin, cltMax, pjMin, pjMax) {
  if (cltMin == null || pjMin == null) return { text: "—", cls: "muted" };
  const cltMid = (cltMin + cltMax) / 2;
  const pjMid = (pjMin + pjMax) / 2;
  const pct = ((pjMid - cltMid) / cltMid) * 100;
  return { text: pct.toFixed(0) + "%", cls: "diff up" };
}

class SalaryTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._rows = [];
    this._regions = [];
    this._shellBuilt = false;
    this.state = { areas: new Set(), levels: new Set(), q: "", region: "nacional" };
  }

  set rows(v) {
    this._rows = v || [];
    this._chipsBuilt = false;
    this._updateAll();
  }
  get rows() { return this._rows; }

  set regions(v) {
    this._regions = v || [];
    this._regionOptionsBuilt = false;
    this._updateAll();
  }
  get regions() { return this._regions; }

  connectedCallback() {
    this._updateAll();
  }

  _ensureShell() {
    if (this._shellBuilt) return;
    this.shadowRoot.innerHTML = TEMPLATE;
    this._shellBuilt = true;

    this.$search = this.shadowRoot.getElementById("search");
    this.$region = this.shadowRoot.getElementById("region");
    this.$areaChips = this.shadowRoot.getElementById("area-chips");
    this.$levelChips = this.shadowRoot.getElementById("level-chips");
    this.$resultCount = this.shadowRoot.getElementById("result-count");
    this.$regionNote = this.shadowRoot.getElementById("region-note");
    this.$tbody = this.shadowRoot.getElementById("table-body");

    this.$search.addEventListener("input", (e) => {
      this.state.q = e.target.value.trim().toLowerCase();
      this._render();
    });
    this.$region.addEventListener("change", (e) => {
      this.state.region = e.target.value;
      this._render();
      const r = this._regionByCode(this.state.region);
      this.dispatchEvent(new CustomEvent("region-change", {
        detail: { code: r.code, mult: r.mult, region: r },
        bubbles: true,
        composed: true,
      }));
    });
    this.$areaChips.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      const a = btn.dataset.area;
      this.state.areas.has(a) ? this.state.areas.delete(a) : this.state.areas.add(a);
      btn.setAttribute("aria-pressed", this.state.areas.has(a));
      this._render();
    });
    this.$levelChips.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      const l = btn.dataset.level;
      this.state.levels.has(l) ? this.state.levels.delete(l) : this.state.levels.add(l);
      btn.setAttribute("aria-pressed", this.state.levels.has(l));
      this._render();
    });
  }

  _regionByCode(code) {
    return this._regions.find((r) => r.code === code) || { code: "nacional", mult: 1, label: "Brasil (nacional)", note: "" };
  }

  _ensureChips() {
    if (this._chipsBuilt || !this._rows.length) return;
    this._chipsBuilt = true;
    const areas = [...new Set(this._rows.map((r) => r[1]))];
    const levels = ["Júnior", "Pleno", "Sênior", "Gerência", "C-Level"];
    this.$areaChips.innerHTML = areas.map((a) => `<button class="chip" type="button" data-area="${a}" aria-pressed="false">${a}</button>`).join("");
    this.$levelChips.innerHTML = levels.map((l) => `<button class="chip" type="button" data-level="${l}" aria-pressed="false">${l}</button>`).join("");
  }

  _ensureRegionOptions() {
    if (this._regionOptionsBuilt || !this._regions.length) return;
    this._regionOptionsBuilt = true;
    this.$region.innerHTML = this._regions.map((r) => `<option value="${r.code}">${r.label}</option>`).join("");
  }

  _updateAll() {
    if (!this.isConnected) return;
    this._ensureShell();
    this._ensureChips();
    this._ensureRegionOptions();
    this._render();
  }

  _render() {
    if (!this._shellBuilt || !this._rows.length) return;
    const filtered = this._rows.filter((r) => {
      const [cargo, area, nivel] = r;
      if (this.state.q && !cargo.toLowerCase().includes(this.state.q)) return false;
      if (this.state.areas.size && !this.state.areas.has(area)) return false;
      if (this.state.levels.size && !this.state.levels.has(nivel)) return false;
      return true;
    });

    this.$resultCount.textContent = `${filtered.length} cargo${filtered.length === 1 ? "" : "s"}`;

    const region = this._regionByCode(this.state.region);
    this.$regionNote.innerHTML = region.code === "nacional"
      ? "Selecione um estado/região acima para estimar as faixas fora da média nacional."
      : `<strong>${region.label}:</strong> ${region.note} Valores abaixo são estimativas (base nacional × ${region.mult.toFixed(2)}), não medianas coletadas nesse estado.`;

    if (!filtered.length) {
      this.$tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Nenhum cargo encontrado com esses filtros.</td></tr>`;
      return;
    }

    const mult = region.mult;
    this.$tbody.innerHTML = filtered.map(([cargo, area, nivel, cltMin, cltMax, pjMin, pjMax, fonte]) => {
      const d = diffLabel(cltMin, cltMax, pjMin, pjMax);
      const sCltMin = scale(cltMin, mult), sCltMax = scale(cltMax, mult);
      const sPjMin = scale(pjMin, mult), sPjMax = scale(pjMax, mult);
      return `
        <tr>
          <td class="role-cell"><span class="cargo">${cargo}</span><span class="area">${area}</span></td>
          <td><span class="level-badge">${nivel}</span></td>
          <td class="num figure clt">${fmt(sCltMin)} – ${fmt(sCltMax)}</td>
          <td class="num figure pj">${sPjMin == null ? "—" : fmt(sPjMin) + " – " + fmt(sPjMax)}</td>
          <td class="num ${d.cls}">${d.text}</td>
          <td class="src">${fonte}</td>
        </tr>`;
    }).join("");
  }
}

customElements.define("salary-table", SalaryTable);
