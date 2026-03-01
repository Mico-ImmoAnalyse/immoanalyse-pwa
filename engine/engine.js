/* ============================================================
   ENGINE LPB v6 — Moteur complet MDB + LDT
   Compatible avec ImmoAnalyse v6
============================================================ */

/* ============================================================
   1) Ratios MDB
============================================================ */
function computeRatiosMDB(valeurs) {
  const ratios = {};

  if (valeurs.LTV != null) ratios.LTV_net = valeurs.LTV;
  if (valeurs.LTA != null) ratios.LTA = valeurs.LTA;
  if (valeurs.LTC != null) ratios.LTC = valeurs.LTC;

  return ratios;
}

/* ============================================================
   2) Cohérence LDT (appelée depuis index)
============================================================ */
import { coherenceLDT } from "../index.js"; 
// si tu préfères, on peut déplacer coherenceLDT ici pour éviter l'import

/* ============================================================
   3) Stress test LDT
============================================================ */
function stressTestLDT(ldt) {
  const results = {};

  // Stress -20% capacité
  let freq = ldt.frequence;
  let cycles = 0;

  switch (freq) {
    case "mensuel": cycles = ldt.duree; break;
    case "trimestriel": cycles = Math.floor(ldt.duree / 3); break;
    case "semestriel": cycles = Math.floor(ldt.duree / 6); break;
    case "annuel": cycles = Math.floor(ldt.duree / 12); break;
    case "in_fine": cycles = 1; break;
  }

  const capaciteBase = ldt.remboursement * cycles;
  const capaciteStress = capaciteBase * 0.8;

  results.capaciteBase = capaciteBase;
  results.capaciteStress = capaciteStress;
  results.deficitStress = capaciteStress < ldt.montant;

  // Stress retard 6 mois
  results.retard = ldt.duree > 30;

  return results;
}

/* ============================================================
   4) Score global LPB
============================================================ */
function computeScore(valeurs, coherence, stress, type) {
  let score = 100;

  // MDB
  if (type === "MDB") {
    if (valeurs.LTV > 85) score -= 20;
    if (valeurs.LTC > 85) score -= 20;
    if (valeurs.marge < 10) score -= 20;
    if (valeurs.precomm < 30) score -= 10;
    if (valeurs.liquidite < 5) score -= 10;
  }

  // LDT
  if (type === "LDT") {
    score -= (100 - coherence.score) * 0.6;

    if (stress.deficitStress) score -= 20;
    if (stress.retard) score -= 10;
  }

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  return score;
}

/* ============================================================
   5) Sécurité globale (meta)
============================================================ */
function computeSecuriteGlobale(score) {
  if (score >= 80) return "forte";
  if (score >= 60) return "moyenne";
  if (score >= 40) return "faible";
  return "critique";
}

/* ============================================================
   6) Ticket IA prudent
============================================================ */
function computeTicketIA(score, coherence, stress, type) {
  let min = 0;
  let max = 1000;

  // Plafonds selon risque
  if (score < 40) max = 250;
  else if (score < 60) max = 500;
  else if (score < 80) max = 750;

  // LDT : prudence renforcée
  if (type === "LDT") {
    if (coherence.niveau === "TENDU") max = 300;
    if (coherence.niveau === "CRITIQUE") max = 150;
    if (stress.deficitStress) max = 200;
    if (stress.retard) max = 300;
  }

  return { plage: { min, max } };
}

/* ============================================================
   7) Diagnostic enrichi
============================================================ */
function buildDiagnostic(valeurs, coherence, stress, score, type) {
  let html = "";

  html += `<h3>Score global</h3>`;
  html += `<p>${score}/100</p>`;

  if (type === "LDT") {
    html += `<h3>Cohérence LDT</h3>`;
    html += `<p>Score cohérence : ${coherence.score}/100</p>`;
    html += `<p>Niveau : ${coherence.niveau}</p>`;
    html += `<p>Capacité totale : ${coherence.capaciteTotale.toLocaleString("fr-FR")} €</p>`;
    html += `<ul>`;
    coherence.alerts.forEach(a => html += `<li>${a}</li>`);
    html += `</ul>`;

    html += `<h3>Stress test</h3>`;
    html += `<p>Capacité stress (-20%) : ${stress.capaciteStress.toLocaleString("fr-FR")} €</p>`;
    html += `<p>Déficit : ${stress.deficitStress ? "Oui" : "Non"}</p>`;
    html += `<p>Retard 6 mois : ${stress.retard ? "Risque" : "OK"}</p>`;
  }

  return html;
}

/* ============================================================
   8) Moteur principal
============================================================ */
export function runLPBEngine(input) {
  const { type, valeurs, garanties, ldt } = input;

  // MDB ratios
  const ratios = computeRatiosMDB(valeurs);

  // Cohérence LDT
  let coherence = null;
  let stress = null;

  if (type === "LDT") {
    coherence = coherenceLDT(ldt, garanties);
    stress = stressTestLDT(ldt);
  }

  // Score global
  const score = computeScore(valeurs, coherence || {}, stress || {}, type);

  // Sécurité globale
  const securiteGlobale = computeSecuriteGlobale(score);

  // Ticket IA
  const ticketIA = computeTicketIA(score, coherence || {}, stress || {}, type);

  // Diagnostic
  const diagnostic = buildDiagnostic(valeurs, coherence || {}, stress || {}, score, type);

  // Meta
  const meta = {
    securiteGlobale,
    coherenceLDT: coherence,
    stressLDT: stress
  };

  return { ratios, score, diagnostic, ticketIA, meta };
}
