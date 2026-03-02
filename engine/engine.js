/* ============================================================
   ENGINE LPB v6 — Moteur complet MDB + LDT
   Compatible avec ImmoAnalyse v6
============================================================ */// engine/engine.js
// Patch complet prêt à coller – version exploitant les pondérations dynamiques de garanties

export function runLPBEngine(input) {
  const { type = "MDB", valeurs = {}, garanties = {}, ldt = {} } = input;

  // 1. Ratios de base
  const ratios = computeRatios(type, valeurs, ldt);

  // 2. Pondération dynamique des garanties (même logique que dans l’index)
  const garantiesDyn = computeGarantiesDynamiques(garanties, valeurs.mise || 0);

  // 3. Score “brut” hors garanties
  const scoreBase = computeScoreBase(type, valeurs, ratios);

  // 4. Bonus / malus liés aux garanties dynamiques
  const bonusGaranties = computeBonusGaranties(garantiesDyn.total);

  // 5. Score final moteur (avant éventuel ajustement dans l’UI)
  const score = clamp(scoreBase + bonusGaranties, 0, 100);

  // 6. Métadonnées de sécurité globale (intègre garantiesDyn)
  const meta = buildMeta(type, valeurs, ratios, garantiesDyn, score);

  // 7. Ticket IA (plage 0–1000 €) ajusté par garantiesDyn
  const ticketIA = computeTicketIA(score, meta, valeurs.mise || 0, garantiesDyn.total);

  // 8. Diagnostic textuel (résumé pédagogique)
  const diagnostic = buildDiagnostic(type, valeurs, ratios, garantiesDyn, meta);

  return { ratios, score, diagnostic, ticketIA, meta };
}

/* ============================================================
   Ratios de base
============================================================ */

function computeRatios(type, v, ldt) {
  const ratios = {};

  if (isNumber(v.LTV)) ratios.LTV = v.LTV;
  if (isNumber(v.LTA)) ratios.LTA = v.LTA;
  if (isNumber(v.LTC)) ratios.LTC = v.LTC;

  // Exemple : ratio de couverture de dette LDT (facultatif)
  if (type === "LDT" && isNumber(ldt.montant) && isNumber(ldt.remboursement) && ldt.montant > 0) {
    ratios.coverDebt = (ldt.remboursement / ldt.montant) * 100;
  }

  return ratios;
}

/* ============================================================
   Pondération dynamique des garanties
   (même logique que dans index.html)
============================================================ */

function computeGarantiesDynamiques(garanties, montantProjet) {
  const poids = {
    fiducie: 1.0,   // très forte
    g1d: 1.0,       // très forte
    hyp1: 1.0,      // très forte
    nantissement: 0.6, // moyenne
    caution: 0.3    // faible
  };

  let total = 0;
  let details = {};
  let alertes = [];

  function capCouverture(v) {
    if (v == null) return 0;
    if (v > 150) {
      alertes.push("Couverture >150% : vérifier la cohérence.");
      return 150;
    }
    return Math.max(0, v);
  }

  // Fiducie
  if (garanties?.fiducie?.active) {
    const pct = capCouverture(garanties.fiducie.pct);
    const pond = poids.fiducie * (pct / 100);
    total += pond;
    details.fiducie = pond;
  }

  // G1D
  if (garanties?.g1d?.active) {
    const pct = capCouverture(garanties.g1d.pct);
    const pond = poids.g1d * (pct / 100);
    total += pond;
    details.g1d = pond;
  }

  // Hypothèque
  if (garanties?.hyp1?.active) {
    const pct = capCouverture(garanties.hyp1.pct);
    const pond = poids.hyp1 * (pct / 100);
    total += pond;
    details.hyp1 = pond;
  }

  // Nantissement
  if (garanties?.nantissement?.active) {
    const pct = capCouverture(garanties.nantissement.pct);
    const pond = poids.nantissement * (pct / 100);
    total += pond;
    details.nantissement = pond;
  }

  // Caution personnelle (en % de la mise / montantProjet)
  if (garanties?.caution?.active && montantProjet > 0) {
    const pct = ((garanties.caution.eur || 0) / montantProjet) * 100;
    const pctEff = capCouverture(pct);
    const pond = poids.caution * (pctEff / 100);
    total += pond;
    details.caution = pond;
  }

  return {
    total,   // pondération totale (0 à ~1.5+)
    details, // pondération par garantie
    alertes  // alertes éventuelles
  };
}

/* ============================================================
   Score de base (hors garanties)
============================================================ */

function computeScoreBase(type, v, ratios) {
  let score = 0;
  let poidsTotal = 0;

  // LTV
  if (isNumber(ratios.LTV)) {
    const ltv = ratios.LTV;
    let s = 0;
    if (ltv < 60) s = 100;
    else if (ltv <= 75) s = 80;
    else if (ltv <= 85) s = 60;
    else if (ltv <= 95) s = 40;
    else s = 20;
    score += s * 0.25;
    poidsTotal += 0.25;
  }

  // LTA
  if (isNumber(ratios.LTA)) {
    const lta = ratios.LTA;
    let s = 0;
    if (lta < 70) s = 100;
    else if (lta <= 85) s = 70;
    else s = 40;
    score += s * 0.15;
    poidsTotal += 0.15;
  }

  // LTC
  if (isNumber(ratios.LTC)) {
    const ltc = ratios.LTC;
    let s = 0;
    if (ltc < 70) s = 100;
    else if (ltc <= 85) s = 75;
    else s = 40;
    score += s * 0.15;
    poidsTotal += 0.15;
  }

  // Marge (MDB)
  if (type === "MDB" && isNumber(v.marge)) {
    const m = v.marge;
    let s = 0;
    if (m > 20) s = 100;
    else if (m >= 15) s = 80;
    else if (m >= 10) s = 60;
    else s = 30;
    score += s * 0.2;
    poidsTotal += 0.2;
  }

  // Pré-comm
  if (isNumber(v.precomm)) {
    const p = v.precomm;
    let s = 0;
    if (p > 50) s = 100;
    else if (p >= 30) s = 70;
    else s = 40;
    score += s * 0.1;
    poidsTotal += 0.1;
  }

  // Liquidité
  if (isNumber(v.liquidite)) {
    const liq = v.liquidite;
    let s = 0;
    if (liq >= 8) s = 100;
    else if (liq >= 5) s = 75;
    else s = 40;
    score += s * 0.15;
    poidsTotal += 0.15;
  }

  if (poidsTotal === 0) return 0;
  return score / poidsTotal;
}

/* ============================================================
   Bonus / malus liés aux garanties dynamiques
============================================================ */

function computeBonusGaranties(totalGaranties) {
  // totalGaranties ~ 0 à 1.5+
  if (totalGaranties >= 1.0) return +10;   // très bien sécurisé
  if (totalGaranties >= 0.6) return +5;    // bien sécurisé
  if (totalGaranties >= 0.3) return 0;     // neutre
  if (totalGaranties > 0) return -5;       // faible
  return -10;                              // aucune garantie
}

/* ============================================================
   Meta : sécurité globale, niveau de garanties, etc.
============================================================ */

function buildMeta(type, v, ratios, garantiesDyn, score) {
  const meta = {};

  // Niveau de garanties
  let niveauGaranties = "aucune";
  if (garantiesDyn.total >= 1.0) niveauGaranties = "forte";
  else if (garantiesDyn.total >= 0.6) niveauGaranties = "moyenne";
  else if (garantiesDyn.total > 0) niveauGaranties = "faible";

  meta.garanties = {
    total: garantiesDyn.total,
    niveau: niveauGaranties,
    details: garantiesDyn.details,
    alertes: garantiesDyn.alertes
  };

  // Sécurité globale : combine score + garanties
  let securiteGlobale = "critique";
  if (score >= 80 && garantiesDyn.total >= 0.6) securiteGlobale = "forte";
  else if (score >= 60 && garantiesDyn.total >= 0.3) securiteGlobale = "moyenne";
  else if (score >= 40) securiteGlobale = "faible";
  else securiteGlobale = "critique";

  meta.securiteGlobale = securiteGlobale;

  // On peut exposer les ratios pour le guide
  meta.ratios = ratios;
  meta.type = type;

  return meta;
}

/* ============================================================
   Ticket IA (0–1000 €) ajusté par garantiesDyn
============================================================ */

function computeTicketIA(score, meta, mise, totalGaranties) {
  // Base sur le score
  let min = 0;
  let max = 0;

  if (score >= 80) {
    min = 500;
    max = 1000;
  } else if (score >= 60) {
    min = 250;
    max = 750;
  } else if (score >= 40) {
    min = 0;
    max = 500;
  } else {
    min = 0;
    max = 250;
  }

  // Ajustement par garanties dynamiques
  if (totalGaranties >= 1.0) {
    min += 100;
    max += 100;
  } else if (totalGaranties < 0.3) {
    max = Math.max(0, max - 150);
  }

  // Clamp 0–1000
  min = clamp(min, 0, 1000);
  max = clamp(max, 0, 1000);

  // Option : ne jamais dépasser la mise si elle est < 1000
  if (isNumber(mise) && mise > 0) {
    max = Math.min(max, mise);
  }

  return {
    plage: { min, max }
  };
}

/* ============================================================
   Diagnostic textuel
============================================================ */

function buildDiagnostic(type, v, ratios, garantiesDyn, meta) {
  const lignes = [];

  // LTV
  if (isNumber(ratios.LTV)) {
    if (ratios.LTV > 85) lignes.push("LTV élevé : risque de levier important.");
    else if (ratios.LTV > 75) lignes.push("LTV en zone de vigilance.");
    else lignes.push("LTV confortable.");
  }

  // Marge
  if (type === "MDB" && isNumber(v.marge)) {
    if (v.marge < 10) lignes.push("Marge faible : coussin de sécurité limité.");
    else if (v.marge < 15) lignes.push("Marge correcte mais perfectible.");
    else lignes.push("Marge solide.");
  }

  // Garanties
  if (garantiesDyn.total === 0) {
    lignes.push("Aucune garantie réelle : risque structurel élevé.");
  } else if (garantiesDyn.total < 0.3) {
    lignes.push("Garanties faibles : renforcer les sûretés (hypothèque, G1D, fiducie…).");
  } else if (garantiesDyn.total >= 0.6) {
    lignes.push("Structure de garanties satisfaisante.");
  }

  // Alertes de couverture
  if (garantiesDyn.alertes.length > 0) {
    lignes.push(...garantiesDyn.alertes);
  }

  // Synthèse sécurité globale
  lignes.push(`Sécurité globale : ${meta.securiteGlobale.toUpperCase()}.`);

  return lignes;
}

/* ============================================================
   Helpers
============================================================ */

function isNumber(v) {
  return typeof v === "number" && !isNaN(v);
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}


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

