// Carrega os domínios de dados (data/*.json) e devolve estruturas prontas para os
// componentes. Cada arquivo em data/ é a fonte única da verdade: schema compacto
// (fields + rows em tuplas, para reduzir tamanho) com um índice pré-computado por
// campo e a data da última sincronização.

const DATA_URL = new URL("../data/", import.meta.url);

async function loadDomain(name) {
  const res = await fetch(new URL(`${name}.json`, DATA_URL));
  if (!res.ok) throw new Error(`Falha ao carregar data/${name}.json: ${res.status}`);
  return res.json();
}

const rowToObject = (fields, row) => Object.fromEntries(fields.map((f, i) => [f, row[i]]));
const rowsToObjects = (fields, rows) => rows.map((r) => rowToObject(fields, r));

export async function loadCargosData() {
  const [cargos, regioes, executivos, referencias] = await Promise.all([
    loadDomain("cargos"),
    loadDomain("regioes"),
    loadDomain("executivos"),
    loadDomain("referencias"),
  ]);

  return {
    // Tuplas — [cargo, area, nivel, cltMin, cltMax, pjMin, pjMax, fonte]
    ROWS: cargos.rows,
    ROWS_FIELDS: cargos.fields,
    ROWS_INDEX: cargos.index, // { byArea: {area: [i,...]}, byNivel: {nivel: [i,...]} }
    REGIONS: rowsToObjects(regioes.fields, regioes.rows),
    EXEC: rowsToObjects(executivos.fields, executivos.rows),
    REF: referencias.rows, // [cargo, mediana, topo, fonte]
    meta: {
      cargos: { lastSync: cargos.lastSync, sources: cargos.sources },
      regioes: { lastSync: regioes.lastSync, sources: regioes.sources },
      executivos: { lastSync: executivos.lastSync, sources: executivos.sources },
      referencias: { lastSync: referencias.lastSync, sources: referencias.sources },
    },
  };
}
