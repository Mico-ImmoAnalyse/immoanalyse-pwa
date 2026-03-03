// ======================================================
//  MOTEUR IA LPB v6 — Pondération dynamique + LTV net
// ======================================================

export function runLPBEngine(input) {
  const { type, valeurs, garanties, ldt } = input;

  // -------------------------------
  // 1) LECTURE DES VALEURS
  // -------------------------------
  const LTV = valeurs.LTV ?? 0;
  const LTA = valeurs.LTA ?? 0;
  const LTC = valeurs.LTC ?? 0;
  const marge = valeurs.marge ?? 0;
  const precomm = valeurs.precomm ?? 0;
  const liquidite = valeurs.liquidite ?? 0;
  const mise = valeurs.mise ?? 0;

  // -------------------------------
  // 2) POIDS LPB v6 DES GARANTIES
  // -------------------------------
  const poids = {
    fiducie: 1.0,
    g1d: 1.0,
    hyp1: 1.0,
    nantissement: 0.6,
    caution: 0.4
  };

  // -------------------------------
  // 3) CALCUL PONDÉRATION DYNAMIQUE
  // -------------------------------
  function pondGarantie(active, couverture, poidsBase) {
    if (!active || couverture == null || isNaN(couverture)) return 0;

    const brute = poidsBase * couverture;
    return Math.min(brute, 100); // plafonnement LPB v6
  }

  // Fiducie
  const p_fiducie = pondGarantie(garanties.fiducie, garanties.fiducie_pct, poids.fiducie);

  // G1D
  const p_g1d = pondGarantie(garanties.g1d, garanties.g1d_pct, poids.g1d);

  // Hypothèque
  const p_hyp1 = pondGarantie(garanties.hyp1, garanties.hyp1_pct, poids.hyp1);

  // Nantissement
  const p_nant = pondGarantie(garanties.nantissement, garanties.nantissement_pct, poids.nantissement);

  // Caution → conversion en %
  let p_caution = 0;
  if (garanties.caution && garanties.caution_eur != null && garanties.caution_eur > 0) {
    const montantProjet = ldt?.montant ?? 100000; // fallback minimal
    const cautionPct = (garanties.caution_eur / montantProjet) * 100;
    const brute = cautionPct * poids.caution;
    p_caution = Math.min(brute, 100);
  }

  // Pondération totale
  const pondTotale = Math.min(
    p_fiducie + p_g1d + p_hyp1 + p_nant + p_caution,
    100
  );

  // -------------------------------
  // 4) LTV NET LPB v6
  // -------------------------------
  const LTV_net = LTV * (1 - pondTotale / 100);

  // -------------------------------
  // 5) SCORE GLOBAL LPB v6
  // -------------------------------
  let score = 0;

  // LTV net
  if (LTV_net < 60) score += 25;
  else if (LTV_net < 75) score += 18;
  else if (LTV_net < 85) score += 10;
  else score += 2;

  // LTA
  if (LTA < 70) score += 15;
  else if (LTA < 85) score += 10;
  else score += 3;

  // LTC
  if (LTC < 70) score += 15;
  else if (LTC < 85) score += 10;
  else score += 3;

  // Marge (MDB uniquement)
  if (type === "MDB") {
    if (marge > 20) score += 15;
    else if (marge > 10) score += 10;
    else score += 3;
  }

  // Pré‑commercialisation
  if (precomm > 50) score += 10;
  else if (precomm > 30) score += 6;
  else score += 2;

  // Liquidité
  if (liquidite >= 8) score += 10;
  else if (liquidite >= 5) score += 6;
  else score += 2;

  // Garanties
  if (pondTotale >= 80) score += 10;
  else if (pondTotale >= 40) score += 6;
  else score += 2;

  // Mise
  if (mise >= 500) score += 10;
  else if (mise >= 250) score += 6;
  else score += 2;

  if (score > 100) score = 100;

  // -------------------------------
  // 6) SÉCURITÉ GLOBALE
  // -------------------------------
  let securiteGlobale = "critique";

  if (score >= 80) securiteGlobale = "forte";
  else if (score >= 60) securiteGlobale = "moyenne";
  else if (score >= 40) securiteGlobale = "faible";
  else securiteGlobale = "critique";

  // -------------------------------
  // 7) TICKET IA LPB v6
  // -------------------------------
  function ticket(min, max) {
    return { plage: { min, max } };
  }

  let ticketIA;

  if (securiteGlobale === "forte") {
    ticketIA = ticket(500, 1000);
  } else if (securiteGlobale === "moyenne") {
    ticketIA = ticket(250, 500);
  } else if (securiteGlobale === "faible") {
    ticketIA = ticket(100, 250);
  } else {
    ticketIA = ticket(0, 100);
  }

  // -------------------------------
  // 8) DIAGNOSTIC
  // -------------------------------
  const diagnostic = [];

  if (LTV > 85) diagnostic.push("LTV élevé");
  if (LTC > 85) diagnostic.push("LTC élevé");
  if (marge < 10 && type === "MDB") diagnostic.push("Marge insuffisante");
  if (precomm < 30) diagnostic.push("Pré‑commercialisation faible");
  if (liquidite < 5) diagnostic.push("Liquidité faible");
  if (pondTotale < 20) diagnostic.push("Garanties insuffisantes");

  // -------------------------------
  // 9) RETOUR MOTEUR IA
  // -------------------------------
  return {
    ratios: {
      LTV,
      LTV_net,
      LTA,
      LTC
    },
    score,
    diagnostic,
    ticketIA,
    meta: {
      pondTotale,
      securiteGlobale
    }
  };
}