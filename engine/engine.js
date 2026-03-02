/* ============================================================
   ENGINE LPB v6 — Moteur unifié MDB + LDT
   Pondération dynamique complète pour les deux types
============================================================ */

export function runLPBEngine(input) {
  const { type = "MDB", valeurs = {}, garanties = {}, garantiesDyn = {}, ldt = {} } = input;

  // Ratios MDB (LTV, LTA, LTC)
  const ratios = computeRatios(type, valeurs, ldt);

  // Cohérence + stress LDT
  let coherence = null;
  let stress = null;

  if (type === "LDT") {
    coherence = coherenceLDT(ldt, garantiesDyn);
    stress = stressTestLDT(ldt, garantiesDyn);
  }

  // Score global unifié
  const score = computeScore(valeurs, coherence, stress, type, garantiesDyn);

  // Sécurité globale
  const securiteGlobale = computeSecuriteGlobale(score);

  // Ticket IA unifié
  const ticketIA = computeTicketIA(score, coherence, stress, type, garantiesDyn);

  // Diagnostic unifié
  const diagnostic = buildDiagnostic(type, valeurs, ratios, garantiesDyn, { securiteGlobale }, coherence, stress);

  const meta = {
    securiteGlobale,
    coherenceLDT: coherence,
    stressLDT: stress,
    garantiesDyn
  };

  return { ratios, score, diagnostic, ticketIA, meta };
}

/* ============================================================
   Ratios MDB + LDT
============================================================ */

function computeRatios(type, v, ldt) {
  const ratios = {};

  if (v.LTV != null) ratios.LTV = v.LTV;
  if (v.LTA != null) ratios.LTA = v.LTA;
  if (v.LTC != null) ratios.LTC = v.LTC;

  if (type === "LDT" && ldt.montant > 0 && ldt.remboursement > 0) {
    ratios.coverDebt = (ldt.remboursement / ldt.montant) * 100;
  }

  return ratios;
}

/* ============================================================
   Cohérence LDT — version dynamique
============================================================ */

function coherenceLDT(ldt, garantiesDyn) {
  let score = 100;
  let alerts = [];

  let cycles = 0;
  switch (ldt.frequence) {
    case "mensuel": cycles = ldt.duree; break;
    case "trimestriel": cycles = Math.floor(ldt.duree / 3); break;
    case "semestriel": cycles = Math.floor(ldt.duree / 6); break;
    case "annuel": cycles = Math.floor(ldt.duree / 12); break;
    case "in_fine": cycles = 1; break;
  }

  const capaciteTotale = (ldt.remboursement || 0) * cycles;

  if (capaciteTotale < (ldt.montant || 0)) {
    score -= 30;
    alerts.push("Capacité totale de remboursement insuffisante.");
  }

  if (ldt.duree > 24) score -= 20;
  if (ldt.duree > 36) score -= 10;

  if (ldt.taux > 10) score -= 15;
  if (ldt.taux > 12) score -= 10;

  if (ldt.frequence === "in_fine") {
    score -= 25;
    alerts.push("Remboursement in fine : risque de défaut en fin de période.");
  }

  // Pondération dynamique
  const g = garantiesDyn.total;

  if (g >= 1.0) score += 10;
  else if (g >= 0.6) score += 5;
  else if (g < 0.3 && g > 0) score -= 5;
  else if (g === 0) score -= 15;

  score = Math.max(0, score);

  let niveau = "SAFE";
  if (score < 80) niveau = "MOYEN";
  if (score < 60) niveau = "TENDU";
  if (score < 40) niveau = "CRITIQUE";

  return { score, niveau, alerts, capaciteTotale };
}

/* ============================================================
   Stress test LDT — version dynamique
============================================================ */

function stressTestLDT(ldt, garantiesDyn) {
  let cycles = 0;
  switch (ldt.frequence) {
    case "mensuel": cycles = ldt.duree; break;
    case "trimestriel": cycles = Math.floor(ldt.duree / 3); break;
    case "semestriel": cycles = Math.floor(ldt.duree / 6); break;
    case "annuel": cycles = Math.floor(ldt.duree / 12); break;
    case "in_fine": cycles = 1; break;
  }

  const capaciteBase = (ldt.remboursement || 0) * cycles;
  const capaciteStress = capaciteBase * 0.8;

  let deficitStress = capaciteStress < (ldt.montant || 0);

  // Bonus garanties fortes
  if (garantiesDyn.total >= 1.0) {
    deficitStress = false;
  }

  const retard = ldt.duree > 30;

  return { capaciteBase, capaciteStress, deficitStress, retard };
}

/* ============================================================
   Score global unifié MDB + LDT
============================================================ */

function computeScore(valeurs, coherence, stress, type, garantiesDyn) {
  let score = 100;

  if (type === "MDB") {
    if (valeurs.LTV > 85) score -= 20;
    if (valeurs.LTC > 85) score -= 20;
    if (valeurs.marge < 10) score -= 20;
    if (valeurs.precomm < 30) score -= 10;
    if (valeurs.liquidite < 5) score -= 10;
  }

  if (type === "LDT" && coherence) {
    score -= (100 - coherence.score) * 0.6;
    if (stress.deficitStress) score -= 20;
    if (stress.retard) score -= 10;
  }

  // Pondération dynamique
  const g = garantiesDyn.total;

  if (g >= 1.0) score += 10;
  else if (g >= 0.6) score += 5;
  else if (g < 0.3 && g > 0) score -= 5;
  else if (g === 0) score -= 15;

  return Math.max(0, Math.min(100, score));
}

/* ============================================================
   Sécurité globale
============================================================ */

function computeSecuriteGlobale(score) {
  if (score >= 80) return "forte";
  if (score >= 60) return "moyenne";
  if (score >= 40) return "faible";
  return "critique";
}

/* ============================================================
   Ticket IA unifié MDB + LDT
============================================================ */

function computeTicketIA(score, coherence, stress, type, garantiesDyn) {
  let min = 0;
  let max = 1000;

  if (score < 40) max = 250;
  else if (score < 60) max = 500;
  else if (score < 80) max = 750;

  if (type === "LDT" && coherence) {
    if (coherence.niveau === "TENDU") max = Math.min(max, 300);
    if (coherence.niveau === "CRITIQUE") max = Math.min(max, 150);
    if (stress.deficitStress) max = Math.min(max, 200);
    if (stress.retard) max = Math.min(max, 300);
  }

  // Pondération dynamique
  const g = garantiesDyn.total;

  if (g >= 1.0) max += 100;
  else if (g < 0.3) max -= 150;

  return { plage: { min, max: Math.max(0, Math.min(1000, max)) } };
}

/* ============================================================
   Diagnostic unifié MDB + LDT
============================================================ */

function buildDiagnostic(type, valeurs, ratios, garantiesDyn, meta, coherence, stress) {
  const lignes = [];

  lignes.push(`Sécurité globale : ${meta.securiteGlobale.toUpperCase()}.`);

  if (type === "LDT") {
    lignes.push(`Score cohérence : ${coherence.score}/100`);
    lignes.push(`Capacité totale : ${coherence.capaciteTotale.toLocaleString("fr-FR")} €`);
    if (stress.deficitStress) lignes.push("Stress test : déficit en scénario -20%.");
    if (stress.retard) lignes.push("Stress test : risque de retard 6 mois.");
  }

  if (garantiesDyn.total === 0) lignes.push("Aucune garantie réelle : risque structurel élevé.");
  else if (garantiesDyn.total < 0.3) lignes.push("Garanties faibles : renforcer les sûretés.");
  else if (garantiesDyn.total >= 0.6) lignes.push("Structure de garanties satisfaisante.");

  if (garantiesDyn.alertes.length > 0) lignes.push(...garantiesDyn.alertes);

  return lignes;
}
