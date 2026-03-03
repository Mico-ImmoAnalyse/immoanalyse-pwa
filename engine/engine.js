// ======================================================
//  ENGINE LPB v6 PRO — VERSION FINALE
// ======================================================

// --- Lecture sécurisée des nombres ---
export function readNumber(value) {
    if (value === null || value === undefined) return null;
    const v = parseFloat(String(value).replace(",", "."));
    return isNaN(v) ? null : v;
}

// --- Lecture booléenne (checkbox) ---
export function readBool(v) {
    return v === true || v === "true";
}

// --- Normalisation des ratios ---
function clampRatio(v) {
    if (v === null || v === undefined || isNaN(v)) return null;
    return Math.max(0, Math.min(500, v));
}

// --- Pondération stricte LPB v6 PRO des garanties ---
const GARANTIES_PRO = {
    fiducie: 1.0,
    g1d: 0.9,
    hyp1: 0.8,
    nantissement: 0.6,
    caution: 0.3
};

// --- Calcul pondéré des garanties ---
function computeGaranties(garanties, valeurs) {
    let couverture = 0;

    if (garanties.fiducie && valeurs.fiducie_pct != null) {
        couverture += GARANTIES_PRO.fiducie * Math.min(valeurs.fiducie_pct, 100);
    }
    if (garanties.g1d && valeurs.g1d_pct != null) {
        couverture += GARANTIES_PRO.g1d * Math.min(valeurs.g1d_pct, 100);
    }
    if (garanties.hyp1 && valeurs.hyp1_pct != null) {
        couverture += GARANTIES_PRO.hyp1 * Math.min(valeurs.hyp1_pct, 100);
    }
    if (garanties.nantissement && valeurs.nantissement_pct != null) {
        couverture += GARANTIES_PRO.nantissement * Math.min(valeurs.nantissement_pct, 100);
    }
    if (garanties.caution && valeurs.caution_eur != null) {
        const pct = Math.min(100, valeurs.caution_eur / 10000);
        couverture += GARANTIES_PRO.caution * pct;
    }

    return Math.min(100, couverture);
}

// --- LTV net pondéré garanties + structure ---
function computeLTVNet(LTV, couverture, LTA, LTC) {
    if (LTV == null) return null;

    let ltv = LTV;

    const bonus = (couverture / 100) * 0.25; // max -25 %
    ltv = ltv * (1 - bonus);

    if (LTA != null) ltv *= (1 + (LTA - 100) / 600);
    if (LTC != null) ltv *= (1 + (LTC - 100) / 600);

    return Math.max(0, ltv);
}

// --- Score LTV ---
function scoreLTV(LTV, type) {
    if (LTV == null) return 0;
    const v = clampRatio(LTV);

    if (type === "MDB") {
        if (v < 60) return 35;
        if (v < 75) return 25;
        if (v < 85) return 15;
        if (v < 95) return 5;
        return -10;
    } else {
        if (v < 50) return 35;
        if (v < 65) return 25;
        if (v < 80) return 15;
        if (v < 90) return 5;
        return -15;
    }
}

// --- Score LTA ---
function scoreLTA(LTA, type) {
    if (LTA == null) return 0;
    const v = clampRatio(LTA);

    if (type === "MDB") {
        if (v < 80) return 20;
        if (v < 120) return 12;
        if (v < 150) return 5;
        if (v < 200) return -5;
        return -15;
    } else {
        if (v < 70) return 20;
        if (v < 85) return 12;
        if (v < 100) return 5;
        if (v < 130) return -10;
        if (v < 150) return -20;
        return -30;
    }
}

// --- Score LTC ---
function scoreLTC(LTC, type) {
    if (LTC == null) return 0;
    const v = clampRatio(LTC);

    if (type === "MDB") {
        if (v < 70) return 20;
        if (v < 85) return 12;
        if (v < 100) return 5;
        if (v < 120) return -5;
        return -15;
    } else {
        if (v < 70) return 20;
        if (v < 85) return 12;
        if (v < 100) return 5;
        if (v < 115) return -10;
        return -20;
    }
}

// --- Score marge ---
function scoreMarge(marge, type) {
    if (marge == null) return 0;
    const v = clampRatio(marge);

    if (type === "MDB") {
        if (v > 20) return 15;
        if (v >= 10) return 8;
        if (v >= 5) return 2;
        return -10;
    } else {
        if (v > 5) return 10;
        if (v >= 3) return 5;
        if (v >= 1) return 2;
        return -5;
    }
}

// --- Score pré-commercialisation ---
function scorePrecomm(precomm, type) {
    if (precomm == null) return 0;
    const v = clampRatio(precomm);

    if (type === "MDB") {
        if (v > 50) return 8;
        if (v >= 30) return 4;
        if (v >= 15) return 1;
        return -8;
    } else {
        if (v > 60) return 8;
        if (v >= 40) return 4;
        if (v >= 20) return 1;
        return -6;
    }
}

// --- Score liquidité ---
function scoreLiquidite(liq, type) {
    if (liq == null) return 0;
    const v = Math.max(1, Math.min(10, liq));

    if (v >= 8) return 5;
    if (v >= 5) return 3;
    if (v >= 3) return 1;
    return -5;
}

// --- Score garanties ---
function scoreGaranties(couverture) {
    if (couverture == null) return 0;
    const v = Math.max(0, Math.min(100, couverture));

    if (v >= 100) return 20;
    if (v >= 80) return 12;
    if (v >= 60) return 6;
    if (v >= 40) return 2;
    return -8;
}

// --- Clamp score ---
function clampScore(s) {
    return Math.max(0, Math.min(100, s));
}

// --- Risque LPB v6 PRO ---
function deriveRisque(score) {
    if (score >= 80) return "PREMIUM";
    if (score >= 60) return "SAFE";
    if (score >= 40) return "TENDU";
    return "CRITIQUE";
}

// --- Ticket IA (plage en euros, indépendant de la mise) ---
function deriveTicketIA(score) {
    let min = 0;
    let max = 0;

    if (score < 40) {
        min = 0;
        max = 0;
    } else if (score < 60) {
        min = 10;
        max = 100;
    } else if (score < 80) {
        min = 100;
        max = 500;
    } else {
        min = 500;
        max = 1000;
    }

    return {
        plage: {
            min,
            max
        }
    };
}

// --- Calcul du score global LPB v6 PRO ---
function computeScoreGlobal(valeurs, garanties, type) {
    const LTV  = clampRatio(valeurs.LTV);
    const LTA  = clampRatio(valeurs.LTA);
    const LTC  = clampRatio(valeurs.LTC);
    const marge = clampRatio(valeurs.marge);
    const precomm = clampRatio(valeurs.precomm);
    const liq  = valeurs.liquidite != null ? valeurs.liquidite : null;

    const couverture = computeGaranties(garanties, valeurs);
    const LTV_net = computeLTVNet(LTV, couverture, LTA, LTC);

    let score = 0;
    score += scoreLTV(LTV, type);
    score += scoreLTA(LTA, type);
    score += scoreLTC(LTC, type);
    score += scoreMarge(marge, type);
    score += scorePrecomm(precomm, type);
    score += scoreLiquidite(liq, type);
    score += scoreGaranties(couverture);

    score = clampScore(score);

    const risqueLPB = deriveRisque(score);
    const ticketIA = deriveTicketIA(score);

    return {
        score,
        ratios: {
            LTV_brut: LTV,
            LTV_net,
            LTA,
            LTC,
            marge,
            precomm,
            liquidite: liq,
            couvertureGaranties: couverture
        },
        meta: {
            risqueLPB,
            type
        },
        ticketIA
    };
}

// --- Fonction principale ---
export function runLPBEngine(input) {
    if (!input || typeof input !== "object") {
        console.warn("runLPBEngine: input invalide");
        return null;
    }

    const type = input.type === "LDT" ? "LDT" : "MDB";

    const valeurs = {
        LTV: readNumber(input.valeurs?.LTV),
        LTA: readNumber(input.valeurs?.LTA),
        LTC: readNumber(input.valeurs?.LTC),
        marge: readNumber(input.valeurs?.marge),
        precomm: readNumber(input.valeurs?.precomm),
        liquidite: readNumber(input.valeurs?.liquidite),

        fiducie_pct: readNumber(input.valeurs?.fiducie_pct),
        g1d_pct: readNumber(input.valeurs?.g1d_pct),
        hyp1_pct: readNumber(input.valeurs?.hyp1_pct),
        nantissement_pct: readNumber(input.valeurs?.nantissement_pct),
        caution_eur: readNumber(input.valeurs?.caution_eur)
    };

    const garanties = {
        fiducie: !!input.garanties?.fiducie,
        g1d: !!input.garanties?.g1d,
        hyp1: !!input.garanties?.hyp1,
        nantissement: !!input.garanties?.nantissement,
        caution: !!input.garanties?.caution
    };

    const result = computeScoreGlobal(valeurs, garanties, type);

    return {
        score: result.score,
        ratios: result.ratios,
        ticketIA: result.ticketIA,
        meta: result.meta
    };
}

// --- Export global ---
export default {
    runLPBEngine,
    readNumber
};
