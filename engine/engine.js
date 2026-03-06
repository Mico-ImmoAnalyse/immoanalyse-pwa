// ======================================================
//  MOTEUR IA LPB v6 — Pondération dynamique + LTV net RÉEL
// ======================================================

export function readNumber(v) {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
}

// -------------------------------
// 0) Haircuts "réels" par type de garantie
// -------------------------------
const REAL_GUARANTEE_WEIGHTS = {
    hypotheque: 0.85,   // 85% de valeur réelle
    caution: 0.60,      // 60% de valeur réelle
    nantissement: 0.50, // 50% de valeur réelle
    fiducie: 1.00,      // 100% de valeur réelle
    g1d: 1.00           // 100% de valeur réelle
};

// -------------------------------
// 1) Pondération réelle des garanties
// -------------------------------
function computeRealGuaranteeCoverage(montantProjet, garanties) {
    const hypotheque_pct = garanties.hyp1_pct ?? 0;
    const nantissement_pct = garanties.nantissement_pct ?? 0;
    const fiducie_pct = garanties.fiducie_pct ?? 0;
    const g1d_pct = garanties.g1d_pct ?? 0;
    const caution_montant = garanties.caution_eur ?? 0;
    const cout_projet = montantProjet ?? 0;

    const hypoReal = garanties.hyp1
        ? hypotheque_pct * REAL_GUARANTEE_WEIGHTS.hypotheque
        : 0;

    const nantReal = garanties.nantissement
        ? nantissement_pct * REAL_GUARANTEE_WEIGHTS.nantissement
        : 0;

    const fiducieReal = garanties.fiducie
        ? fiducie_pct * REAL_GUARANTEE_WEIGHTS.fiducie
        : 0;

    const g1dReal = garanties.g1d
        ? g1d_pct * REAL_GUARANTEE_WEIGHTS.g1d
        : 0;

    let cautionPct = 0;
    let cautionReal = 0;
    if (garanties.caution && cout_projet > 0 && caution_montant > 0) {
        cautionPct = (caution_montant / cout_projet) * 100;
        cautionReal = cautionPct * REAL_GUARANTEE_WEIGHTS.caution;
    }

    let totalReal = hypoReal + nantReal + fiducieReal + g1dReal + cautionReal;
    if (totalReal > 100) totalReal = 100;

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

// -------------------------------
// 2) Moteur principal LPB v6
// -------------------------------
export function runLPBEngine(input) {
    const { type, valeurs, garanties } = input;

    // 1) LECTURE DES VALEURS
    const montantProjet = valeurs.montantProjet ?? 0;

    const LTV = valeurs.LTV ?? 0;
    const LTA = valeurs.LTA ?? 0;
    const LTC = valeurs.LTC ?? 0;
    const marge = valeurs.marge ?? 0;
    const precomm = valeurs.precomm ?? 0;
    const liquidite = valeurs.liquidite ?? 0;
    const mise = valeurs.mise ?? 0;

    // 2) POIDS LPB v6 DES GARANTIES (MÉTHODOLOGIQUE)
    const poids = {
        fiducie: 1.0,
        g1d: 1.0,
        hyp1: 1.0,
        nantissement: 0.6,
        caution: 0.4
    };

    // 3) PONDÉRATION DYNAMIQUE LPB (inchangée)
    function pondGarantie(active, couverture, poidsBase) {
        if (!active || couverture == null || isNaN(couverture)) return 0;
        const brute = poidsBase * couverture;
        return Math.min(brute, 100);
    }

    const p_fiducie = pondGarantie(garanties.fiducie, garanties.fiducie_pct, poids.fiducie);
    const p_g1d = pondGarantie(garanties.g1d, garanties.g1d_pct, poids.g1d);
    const p_hyp1 = pondGarantie(garanties.hyp1, garanties.hyp1_pct, poids.hyp1);
    const p_nant = pondGarantie(garanties.nantissement, garanties.nantissement_pct, poids.nantissement);

    let p_caution = 0;
    if (garanties.caution && garanties.caution_eur > 0 && montantProjet > 0) {
        const cautionPct = (garanties.caution_eur / montantProjet) * 100;
        p_caution = Math.min(cautionPct * poids.caution, 100);
    }

    const pondTotale = Math.min(
        p_fiducie + p_g1d + p_hyp1 + p_nant + p_caution,
        100
    );

    // 4) LTV NET RÉEL PROFESSIONNEL (haircuts réels)
    const { totalReal } = computeRealGuaranteeCoverage(montantProjet, garanties);

    let LTV_net_reel = LTV * (1 - totalReal / 100);

    const MIN_RESIDUAL = 5;
    if (LTV_net_reel < MIN_RESIDUAL) {
        LTV_net_reel = MIN_RESIDUAL;
    }
    if (LTV < MIN_RESIDUAL) {
        LTV_net_reel = LTV;
    }

    // 5) SCORE GLOBAL LPB v6 (basé sur LTV_net_reel)
    let score = 0;

    // LTV net réel
    if (LTV_net_reel < 60) score += 25;
    else if (LTV_net_reel < 75) score += 18;
    else if (LTV_net_reel < 85) score += 10;
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

    // Pré-commercialisation
    if (precomm > 50) score += 10;
    else if (precomm > 30) score += 6;
    else score += 2;

    // Liquidité
    if (liquidite >= 8) score += 10;
    else if (liquidite >= 5) score += 6;
    else score += 2;

    // Garanties (pondération LPB, inchangée)
    if (pondTotale >= 80) score += 10;
    else if (pondTotale >= 40) score += 6;
    else score += 2;

    // Mise
    if (mise >= 500) score += 10;
    else if (mise >= 250) score += 6;
    else score += 2;

    if (score > 100) score = 100;

    // 6) SÉCURITÉ GLOBALE
    let securiteGlobale = "critique";
    if (score >= 80) securiteGlobale = "forte";
    else if (score >= 60) securiteGlobale = "moyenne";
    else if (score >= 40) securiteGlobale = "faible";

    // 7) TICKET IA LPB v6
    function ticket(min, max) {
        return { plage: { min, max } };
    }

    let ticketIA;
    if (securiteGlobale === "forte") ticketIA = ticket(500, 1000);
    else if (securiteGlobale === "moyenne") ticketIA = ticket(250, 500);
    else if (securiteGlobale === "faible") ticketIA = ticket(100, 250);
    else ticketIA = ticket(0, 100);

    // 8) DIAGNOSTIC
    const diagnostic = [];
    if (LTV > 85) diagnostic.push("LTV élevé");
    if (LTC > 85) diagnostic.push("LTC élevé");
    if (marge < 10 && type === "MDB") diagnostic.push("Marge insuffisante");
    if (precomm < 30) diagnostic.push("Pré‑commercialisation faible");
    if (liquidite < 5) diagnostic.push("Liquidité faible");
    if (pondTotale < 20) diagnostic.push("Garanties insuffisantes");

    // 9) RETOUR MOTEUR IA
    return {
        ratios: {
            LTV,
            LTV_net_reel,   // nouveau LTV net réel professionnel
            LTA,
            LTC,
            pondTotale,
            coverageReal: totalReal
        },
        score,
        diagnostic,
        ticketIA,
        meta: {
            securiteGlobale
        }
    };
}
