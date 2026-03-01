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
   2) Cohérence LDT
   (on place la fonction ici, plus dans index)
============================================================ */
function coherenceLDT(ldt, garanties) {
  let score = 100;
  let alerts = [];

  // 1) Capacité totale de remboursement
  let freq = ldt.frequence;
  let cycles = 0;

  switch (freq) {
    case "mensuel": cycles = ldt.duree; break;
    case "trimestriel": cycles = Math.floor(ldt.duree / 3); break;
    case "semestriel": cycles = Math.floor(ldt.duree / 6); break;
    case "annuel": cycles = Math.floor(ldt.duree / 12); break;
    case "in_fine": cycles = 1; break;
  }

  let capaciteTotale = (ldt.remboursement || 0) * cycles;

  if (capaciteTotale < (ldt.montant || 0)) {
    score -= 30;
    alerts.push("Capacité totale de remboursement insuffisante.");
  }

  // 2) Durée du financement
  if (ldt.duree > 24) {
    score -= 20;
    alerts.push("Durée longue : risque structurel accru.");
  }
  if (ldt.duree > 36) {
    score -= 10;
    alerts.push("Durée très longue : risque élevé.");
  }

  // 3) Taux proposé
  if (ldt.taux > 10) {
    score -= 15;
    alerts.push("Taux élevé : risque financier important.");
  }
  if (ldt.taux > 12) {
    score -= 10;
    alerts.push("Taux très élevé : risque financier critique.");
  }

  // 4) Fréquence de remboursement
  if (ldt.frequence === "in_fine") {
    score -= 25;
    alerts.push("Remboursement in fine : risque de défaut en fin de période.");
  }

  // 5) Garanties
  const garantiesFortes =
    (garanties?.g1d || 0) +
    (garanties?.fiducie || 0) +
    (garanties?.hyp1 || 0);

  if (garantiesFortes < 30) {
    score -= 20;
    alerts.push("Garanties faibles pour une ligne de trésorerie.");
  }

  // 6) Risque structurel global
  if (ldt.duree > 24 && ldt.taux > 10) {
    score -= 10;
    alerts.push("Durée longue + taux élevé : risque structurel combiné.");
  }

  if (score < 0) score = 0;

  let niveau = "SAFE";
  if (score < 80) niveau = "MOYEN";
  if (score < 60) niveau = "TENDU";
  if (score < 40) niveau = "CRITIQUE";

  return { score, niveau, alerts, capaciteTotale };
}

/* ============================================================
   3) Stress test LDT
============================================================ */
function stressTestLDT(ldt) {
  const results = {};

  let freq = ldt.frequence;
  let cycles = 0;

  switch (freq) {
    case "mensuel": cycles = ldt.duree; break;
    case "trimestriel": cycles = Math.floor(ldt.duree / 3); break;
    case "semestriel": cycles = Math.floor(ldt.duree / 6); break;
    case "annuel": cycles = Math.floor(ldt.duree / 12); break;
    case "in_fine": cycles = 1; break;
  }

  const capaciteBase = (ldt.remboursement || 0) * cycles;
  const capaciteStress = capaciteBase * 0.8;

  results.capaciteBase = capaciteBase;
  results.capaciteStress = capaciteStress;
  results.deficitStress = capaciteStress < (ldt.montant || 0);

  // Stress retard 6 mois (simple proxy : durée > 30 mois)
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
  if (type === "LDT" && coherence) {
    score -= (100 - (coherence.score ?? 100)) * 0.6;

    if (stress?.deficitStress) score -= 20;
    if (stress?.retard) score -= 10;
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

  if (score < 40) max = 250;
  else if (score < 60) max = 500;
  else if (score < 80) max = 750;

  if (type === "LDT" && coherence) {
    if (coherence.niveau === "TENDU") max = Math.min(max, 300);
    if (coherence.niveau === "CRITIQUE") max = Math.min(max, 150);
    if (stress?.deficitStress) max = Math.min(max, 200);
    if (stress?.retard) max = Math.min(max, 300);
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

  if (type === "LDT" && coherence) {
    html += `<h3>Cohérence LDT</h3>`;
    html += `<p>Score cohérence : ${coherence.score}/100</p>`;
    html += `<p>Niveau : ${coherence.niveau}</p>`;
    html += `<p>Capacité totale : ${coherence.capaciteTotale.toLocaleString("fr-FR")} €</p>`;
    if (coherence.alerts?.length) {
      html += `<ul>`;
      coherence.alerts.forEach(a => html += `<li>${a}</li>`);
      html += `</ul>`;
    }

    if (stress) {
      html += `<h3>Stress test</h3>`;
      html += `<p>Capacité stress (-20%) : ${stress.capaciteStress.toLocaleString("fr-FR")} €</p>`;
      html += `<p>Déficit : ${stress.deficitStress ? "Oui" : "Non"}</p>`;
      html += `<p>Retard 6 mois : ${stress.retard ? "Risque" : "OK"}</p>`;
    }
  }

  return html;
}

/* ============================================================
   8) Moteur principal
============================================================ */
export function runLPBEngine(input) {
  const { type, valeurs, garanties, ldt } = input;

  const ratios = computeRatiosMDB(valeurs);

  let coherence = null;
  let stress = null;

  if (type === "LDT") {
    coherence = coherenceLDT(ldt || {}, garanties || {});
    stress = stressTestLDT(ldt || {});
  }

  const score = computeScore(valeurs || {}, coherence, stress, type);
  const securiteGlobale = computeSecuriteGlobale(score);
  const ticketIA = computeTicketIA(score, coherence, stress, type);
  const diagnostic = buildDiagnostic(valeurs || {}, coherence, stress, score, type);

  const meta = {
    securiteGlobale,
    coherenceLDT: coherence,
    stressLDT: stress
  };

  return { ratios, score, diagnostic, ticketIA, meta };
}
