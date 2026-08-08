// Calculadora CLT x PJ — INSS, IRRF (tabelas 2026) e Simples Nacional (Anexo III).
// Ver footer de calculadora.html para as fontes.

const round2 = (n) => Math.round(n * 100) / 100;
const fmt = (n) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt0 = (n) => "R$ " + Math.round(n).toLocaleString("pt-BR");

function inssCLT(gross) {
  if (gross <= 0) return 0;
  const base = Math.min(gross, 8475.55);
  let aliq, deducao;
  if (base <= 1621.00) { aliq = 0.075; deducao = 0; }
  else if (base <= 2902.84) { aliq = 0.09; deducao = 24.32; }
  else if (base <= 4354.27) { aliq = 0.12; deducao = 111.40; }
  else { aliq = 0.14; deducao = 198.49; }
  return round2(base * aliq - deducao);
}

function irrfPadrao(base) {
  if (base <= 2428.80) return 0;
  if (base <= 2826.65) return round2(base * 0.075 - 182.16);
  if (base <= 3751.05) return round2(base * 0.15 - 394.16);
  if (base <= 4664.68) return round2(base * 0.225 - 675.49);
  return round2(base * 0.275 - 908.73);
}

// Lei 15.270/2025: isenção total até R$5.000 de salário bruto; transição decrescente
// até R$7.350; acima disso, tabela tradicional integral. A faixa de transição é
// aproximada aqui por interpolação linear entre R$0 (em 5.000) e o valor padrão (em 7.350).
function irrfMensal(grossSalary) {
  if (grossSalary <= 5000) return 0;
  const inssAt7350 = inssCLT(7350);
  const padrao7350 = irrfPadrao(Math.max(0, 7350 - inssAt7350));
  if (grossSalary <= 7350) {
    const frac = (grossSalary - 5000) / (7350 - 5000);
    return round2(padrao7350 * frac);
  }
  const inss = inssCLT(grossSalary);
  return irrfPadrao(Math.max(0, grossSalary - inss));
}

function calcCLT(gross, extraBeneficios) {
  gross = Math.max(0, gross);
  extraBeneficios = Math.max(0, extraBeneficios || 0);
  const inss = inssCLT(gross);
  const irrf = irrfMensal(gross);
  const netMonthly = gross - inss - irrf;
  const netDecimoTerceiro = netMonthly; // simplificação: mesma tributação de um mês normal
  const feriasGross = gross * 4 / 3;
  const netFerias = feriasGross - inssCLT(feriasGross) - irrfMensal(feriasGross);
  const fgtsAnual = gross * 0.08 * 13;
  const annualNet = netMonthly * 12 + netDecimoTerceiro + netFerias + extraBeneficios * 12;
  return { inss, irrf, netMonthly, netDecimoTerceiro, netFerias, fgtsAnual, annualNet };
}

function calcPJ(gross, o) {
  gross = Math.max(0, gross);
  const dasRate = Math.max(0, o.dasRate) / 100;
  const das = gross * dasRate;
  const inssProLabore = Math.max(0, o.inssProLabore || 0);
  const contadorFee = Math.max(0, o.contadorFee || 0);
  const extraBeneficios = Math.max(0, o.extraBeneficios || 0);
  const netMonthly = gross - das - inssProLabore - contadorFee + extraBeneficios;
  const netPerInvoice = gross * (1 - dasRate);
  const netDecimoTerceiro = o.incluiDecimo ? netPerInvoice : 0;
  const netFerias = o.incluiFerias ? (gross * 4 / 3) * (1 - dasRate) : 0;
  const annualNet = netMonthly * 12 + netDecimoTerceiro + netFerias;
  return { das, netMonthly, netDecimoTerceiro, netFerias, annualNet };
}

function bisect(fn, target, lo, hi, iters) {
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2;
    if (fn(mid) < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

const els = {
  cltGross: document.getElementById("clt-gross"),
  cltExtra: document.getElementById("clt-extra"),
  pjGross: document.getElementById("pj-gross"),
  pjFerias: document.getElementById("pj-ferias"),
  pjDecimo: document.getElementById("pj-decimo"),
  pjDas: document.getElementById("pj-das"),
  pjInss: document.getElementById("pj-inss"),
  pjContador: document.getElementById("pj-contador"),
  pjExtra: document.getElementById("pj-extra"),
  cltBreakdown: document.getElementById("clt-breakdown"),
  pjBreakdown: document.getElementById("pj-breakdown"),
  cltToPj: document.getElementById("clt-to-pj"),
  pjToClt: document.getElementById("pj-to-clt"),
  summaryBar: document.getElementById("summary-bar"),
};

function row(k, v, opts) {
  opts = opts || {};
  return `<div class="row ${opts.total ? "total" : ""} ${opts.neg ? "neg" : ""}"><span class="k">${k}</span><span class="v">${opts.neg ? "− " : ""}${v}</span></div>`;
}

function render() {
  const cltGross = parseFloat(els.cltGross.value) || 0;
  const cltExtra = parseFloat(els.cltExtra.value) || 0;
  const pjGross = parseFloat(els.pjGross.value) || 0;
  const pjOpts = {
    dasRate: parseFloat(els.pjDas.value) || 0,
    inssProLabore: parseFloat(els.pjInss.value) || 0,
    contadorFee: parseFloat(els.pjContador.value) || 0,
    extraBeneficios: parseFloat(els.pjExtra.value) || 0,
    incluiFerias: els.pjFerias.checked,
    incluiDecimo: els.pjDecimo.checked,
  };

  const clt = calcCLT(cltGross, cltExtra);
  const pj = calcPJ(pjGross, pjOpts);

  els.cltBreakdown.innerHTML =
    row("INSS", fmt(clt.inss), { neg: true }) +
    row("IRRF", fmt(clt.irrf), { neg: true }) +
    row("Líquido mensal", fmt(clt.netMonthly)) +
    row("13º líquido (1x/ano)", fmt(clt.netDecimoTerceiro)) +
    row("Férias líquidas +1/3 (1x/ano)", fmt(clt.netFerias)) +
    row("FGTS depositado (1x/ano, não é líquido disponível)", fmt(clt.fgtsAnual), { neg: false }) +
    row("Total líquido anual", fmt0(clt.annualNet), { total: true });

  els.pjBreakdown.innerHTML =
    row("DAS (Simples Nacional)", fmt(pj.das), { neg: true }) +
    row("INSS pró-labore", fmt(pjOpts.inssProLabore), { neg: true }) +
    row("Contador", fmt(pjOpts.contadorFee), { neg: true }) +
    row("Líquido mensal", fmt(pj.netMonthly)) +
    row("13º líquido" + (pjOpts.incluiDecimo ? " (1x/ano)" : " — não incluso"), fmt(pj.netDecimoTerceiro)) +
    row("Férias líquidas" + (pjOpts.incluiFerias ? " +1/3 (1x/ano)" : " — não inclusas"), fmt(pj.netFerias)) +
    row("Total líquido anual", fmt0(pj.annualNet), { total: true });

  if (cltGross > 0) {
    const eqPj = bisect((g) => calcPJ(g, pjOpts).annualNet, clt.annualNet, 0, 400000, 60);
    els.cltToPj.innerHTML = fmt0(eqPj) + " <small>/ mês</small>";
  } else {
    els.cltToPj.textContent = "—";
  }

  if (pjGross > 0) {
    const eqClt = bisect((g) => calcCLT(g, cltExtra).annualNet, pj.annualNet, 0, 400000, 60);
    els.pjToClt.innerHTML = fmt0(eqClt) + " <small>/ mês</small>";
  } else {
    els.pjToClt.textContent = "—";
  }

  if (cltGross > 0 && pjGross > 0) {
    const diff = pj.annualNet - clt.annualNet;
    const pct = clt.annualNet > 0 ? (diff / clt.annualNet) * 100 : 0;
    const who = diff >= 0 ? "PJ" : "CLT";
    const cls = diff >= 0 ? "" : "neg";
    els.summaryBar.innerHTML = `<span class="headline">Com os valores informados, <strong class="${cls}">${who} rende ${Math.abs(pct).toFixed(0)}% ${diff >= 0 ? "a mais" : "a menos"}</strong> de líquido anual (diferença de ${fmt0(Math.abs(diff))}).</span>`;
  } else {
    els.summaryBar.innerHTML = `<span class="headline" style="color:var(--ink-dim)">Preencha os dois campos de salário bruto para comparar diretamente, ou use os campos "Equivalente" para converter em um único sentido.</span>`;
  }
}

[els.cltGross, els.cltExtra, els.pjGross, els.pjDas, els.pjInss, els.pjContador, els.pjExtra].forEach((el) =>
  el.addEventListener("input", render)
);
[els.pjFerias, els.pjDecimo].forEach((el) => el.addEventListener("change", render));

render();
