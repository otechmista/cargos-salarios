// <reference-table> — tabela estática de referências agregadas (medianas/percentis
// que não separam CLT de PJ na fonte original).
// Uso:
//   <reference-table></reference-table>
//   <script type="module">
//     import { REF } from './cargos-data.js';
//     document.querySelector('reference-table').rows = REF;
//   </script>

const TEMPLATE = `
<style>
  :host { display: block; font-family: var(--font-body); color: var(--ink); }
  *, *::before, *::after { box-sizing: border-box; }

  .table-scroll { overflow-x: auto; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); box-shadow: var(--shadow); }
  table { width: 100%; border-collapse: collapse; font-size: 0.88rem; min-width: 560px; }
  th {
    text-align: left; font-family: var(--font-mono); font-size: 0.72rem; text-transform: uppercase;
    letter-spacing: 0.05em; color: var(--ink-dim); padding: 0.55rem 0.8rem; border-bottom: 1px solid var(--border);
    background: var(--surface-2);
  }
  td { padding: 0.55rem 0.8rem; border-bottom: 1px solid var(--border); }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:hover { background: var(--surface-2); }
  td.num { font-family: var(--font-mono); font-variant-numeric: tabular-nums; text-align: right; }
  th.num { text-align: right; }
  .src { font-size: 0.74rem; color: var(--ink-dim); white-space: nowrap; }
</style>
<div class="table-scroll">
  <table>
    <thead>
      <tr><th>Cargo</th><th class="num">Mediana</th><th class="num">Percentil 75 / topo</th><th>Fonte</th></tr>
    </thead>
    <tbody id="body"></tbody>
  </table>
</div>
`;

class ReferenceTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._rows = [];
  }

  set rows(v) {
    this._rows = v || [];
    this._render();
  }
  get rows() { return this._rows; }

  connectedCallback() {
    this._render();
  }

  _render() {
    if (!this.isConnected) return;
    if (!this.shadowRoot.firstElementChild) this.shadowRoot.innerHTML = TEMPLATE;
    const tbody = this.shadowRoot.getElementById("body");
    tbody.innerHTML = this._rows.map(([cargo, med, top, fonte]) => `
      <tr>
        <td>${cargo}</td>
        <td class="num">${med}</td>
        <td class="num">${top}</td>
        <td class="src">${fonte}</td>
      </tr>`).join("");
  }
}

customElements.define("reference-table", ReferenceTable);
