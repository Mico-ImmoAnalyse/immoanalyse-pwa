// engine/engine.js

// =========================
// 1. Haircuts "réels" par type de garantie
// =========================

const REAL_GUARANTEE_WEIGHTS = {
  hypotheque: 0.85,   // 85% de valeur réelle
  caution: 0.60,      // 60% de valeur réelle
  nantissement: 0.50, // 50% de valeur réelle
  fiducie: 1.00,      // 100% de valeur réelle
  g1d: 1.00           // 100% de valeur réelle
};

// =========================
// 2. Calcul de la pondération réelle des garanties
// =========================

function computeRealGuaranteeCoverage(inputs) {
  const {
    hypotheque_pct = 0,
    nantissement_pct = 0,
    fiducie_pct = 0,
    g1d_pct = 0,
    caution_montant = 0,
    cout_projet = 0
  } = inputs;

  // Hypothèque (en % du projet)
  const hypoReal = hypotheque_pct * REAL_GUARANTEE_WEIGHTS.hypotheque;

  // Nantissement (en % du projet)
  const nantReal = nantissement_pct * REAL_GUARANTEE_WEIGHTS.nantissement;

  // Fiducie (en % du projet)
  const fiducieReal = fiducie_pct * REAL_GUARANTEE_WEIGHTS.fiducie;

  // Garantie à première demande (en % du projet)
  const g1dReal = g1d_pct * REAL_GUARANTEE_WEIGHTS.g1d;

  // Caution : conversion montant → % du projet, puis haircut
  let cautionPct = 0;
  if (cout_projet > 0 && caution_montant > 0) {
    cautionPct = (caution_montant / cout_projet) * 100;
  }
  const cautionReal = cautionPct * REAL_GUARANTEE_WEIGHTS.caution;

  // Somme réelle
  let totalReal = hypoReal + nantReal + fiducieReal + g1dReal + cautionReal;

  // Cap à 100% (comme en analyse crédit)
  if (totalReal > 100) {
    totalReal = 100;
  }

  return {
    totalReal,
    details: {
      hypoReal,
      nantReal,
      fiducieReal,
      g1dReal,
      cautionReal,
      cautionPct
    }
  };
}

// =========================
// 3. Calcul des ratios principaux (LTV, LTA, LTC, etc.)
// =========================

function computeRatios(inputs) {
  const {
    ltv = 0,
    lta = 0,
    ltc = 0,
    marge = 0,
    precom = 0,
    liquidite = 0
  } = inputs;

  // Ici tu peux garder ta logique existante si elle est plus riche.
  // Je laisse simple et propre.

  return {
    LTV: Number(ltv) || 0,
    LTA: Number(lta) || 0,
    LTC: Number(ltc) || 0,
    marge: Number(marge) || 0,
    precom: Number(precom) || 0,
    liquidite: Number(liquidite) || 0
  };
}

// =========================
// 4. Calcul du LTV net réel professionnel
// =========================

function computeRealLTVNet(inputs) {
  const ratios = computeRatios(inputs);
  const LTV = ratios.LTV;

  const { totalReal } = computeRealGuaranteeCoverage(inputs);

  // LTV net "brut" réel
  let ltvNetReal = LTV * (1 - totalReal / 100);

  // Risque résiduel incompressible : jamais en dessous de 5%
  const MIN_RESIDUAL = 5;

  if (ltvNetReal < MIN_RESIDUAL) {
    ltvNetReal = MIN_RESIDUAL;
  }

  // Si LTV est déjà très faible (ex : < 5%), on ne force pas artificiellement
  if (LTV < MIN_RESIDUAL) {
    ltvNetReal = LTV;
  }

  return {
    LTV_net_reel: ltvNetReal,
    LTV: LTV,
    coverageReal: totalReal
  };
}

// =========================
// 5. Fonction principale du moteur
// =========================

export function runLPBEngine(formData) {
  // formData est l’objet venant du formulaire (index)
  // On suppose qu’il contient au moins :
  // ltv, lta, ltc, marge, precom, liquidite,
  // hypotheque_pct, nantissement_pct, fiducie_pct, g1d_pct,
  // caution_montant, cout_projet

  const ratios = computeRatios(formData);
  const ltvReal = computeRealLTVNet(formData);

  const result = {
    ratios: {
      ...ratios,
      // Ancien LTV_net (LPB) supprimé de la sortie
      // Nouveau LTV net réel professionnel :
      LTV_net_reel: ltvReal.LTV_net_reel,
      coverageReal: ltvReal.coverageReal
    },
    meta: {
      // Tu peux enrichir ici : type de projet, date, etc.
      createdAt: new Date().toISOString()
    }
  };

  return result;
}
