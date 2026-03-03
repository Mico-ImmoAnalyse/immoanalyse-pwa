// ======================================================
//  ENGINE LPB v6 PRO — BLOC 1/4
//  Structure, outils, normalisation, lecture des valeurs
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
    return Math.max(0, Math.min(500, v)); // bornes larges pour MDB
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
        // Caution = montant → converti en équivalent %
        const pct = Math.min(100, valeurs.caution_eur / 10000); 
        couverture += GARANTIES_PRO.caution * pct;
    }

    return Math.min(100, couverture);
}

// --- LTV net pondéré garanties + structure ---
function computeLTVNet(LTV, couverture, LTA, LTC) {
    if (LTV == null) return null;

    let ltv = LTV;

    // Impact garanties
    const bonus = (couverture / 100) * 0.25; // 25% max d'amélioration
    ltv = ltv * (1 - bonus);

    // Impact structure (LTA/LTC)
    if (LTA != null) ltv *= (1 + (LTA - 100) / 600);
    if (LTC != null) ltv *= (1 + (LTC - 100) / 600);

    return Math.max(0, ltv);
}
// ======================================================
//  ENGINE LPB v6 PRO — BLOC 2/4
//  Score, LTA/LTC différenciés MDB/LDT, risque, ticket IA
// ======================================================

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
    } else { // LDT
        if (v < 50) return 35;
        if (v < 65) return 25;
        if (v < 80) return 15;
        if (v < 90) return 5;
        return -15;
    }
}

// --- Score LTA différencié MDB / LDT ---
function scoreLTA(LTA, type) {
    if (LTA == null) return 0;
    const v = clampRatio(LTA);

    if (type === "MDB") {
        if (v < 80) return 20;       // très bon
        if (v < 120) return 12;      // normal
        if (v < 150) return 5;       // acceptable
        if (v < 200) return -5;      // tension
        return -15;                  // risque élevé
    } else { // LDT
        if (v < 70) return 20;       // solide
        if (v < 85) return 12;       // acceptable
        if (v < 100) return 5;       // fragile
        if (v < 130) return -10;     // surendetté
        if (v < 150) return -20;     // très fragile
        return -30;                  // critique
    }
}

// --- Score LTC différencié MDB / LDT ---
function scoreLTC(LTC, type) {
    if (LTC == null) return 0;
    const v = clampRatio(LTC);

    if (type === "MDB") {
        if (v < 70) return 20;       // excellent
        if (v < 85) return 12;       // normal
        if (v < 100) return 5;       // tension
        if (v < 120) return -5;      // risque
        return -15;                  // critique
    } else { // LDT
        if (v < 70) return 20;       // très bon
        if (v < 85) return 12;       // acceptable
        if (v < 100) return 5;       // fragile
        if (v < 115) return -10;     // très fragile
        return -20;                  // critique
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
    } else { // LDT : marge = marge de taux / spread
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
    } else { // LDT
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

// --- Sécurité globale (forte / moyenne / faible) ---
function deriveSecuriteGlobale(score, LTV_net, couverture, type) {
    if (score >= 80 && LTV_net != null && LTV_net < 70 && couverture >= 80) {
        return "forte";
    }
    if (score >= 55 && LTV_net != null && LTV_net < 85 && couverture >= 60) {
        return "moyenne";
    }
    return "faible";
}

// --- Ticket IA (plage en euros) ---
function deriveTicketIA(score, mise, type) {
    if (mise == null || mise <= 0) {
        return { plage: { min: null, max: null } };
    }

    let factorMin = 0.1;
    let factorMax = 0.3;

    if (score >= 80) {
        factorMin = 0.3;
        factorMax = 0.6;
    } else if (score >= 60) {
        factorMin = 0.2;
        factorMax = 0.4;
    } else if (score >= 40) {
        factorMin = 0.1;
        factorMax = 0.25;
    } else {
        factorMin = 0.05;
        factorMax = 0.15;
    }

    const min = Math.round(mise * factorMin);
    const max = Math.round(mise * factorMax);

    return {
        plage: {
            min: Math.max(0, min),
            max: Math.max(min, max)
        }
    };
}
// ======================================================
//  ENGINE LPB v6 PRO — BLOC 3/4
//  Agrégation du score, ratios, méta, sortie principale
// ======================================================

function clampScore(s) {
    return Math.max(0, Math.min(100, s));
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

    const securiteGlobale = deriveSecuriteGlobale(score, LTV_net, couverture, type);
    const ticketIA = deriveTicketIA(score, valeurs.mise, type);

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
            securiteGlobale,
            type
        },
        ticketIA
    };
}

// --- Fonction principale appelée depuis l’interface ---
export function runLPBEngine(input) {
    const type = input.type === "LDT" ? "LDT" : "MDB";

    const valeurs = {
        LTV: readNumber(input.valeurs?.LTV),
        LTA: readNumber(input.valeurs?.LTA),
        LTC: readNumber(input.valeurs?.LTC),
        marge: readNumber(input.valeurs?.marge),
        precomm: readNumber(input.valeurs?.precomm),
        liquidite: readNumber(input.valeurs?.liquidite),
        mise: readNumber(input.valeurs?.mise),

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
// ======================================================
//  ENGINE LPB v6 PRO — BLOC 4/4
//  Export final, cohérence, sécurité
// ======================================================

// --- Vérification de cohérence interne ---
function validateInput(input) {
    if (!input || typeof input !== "object") {
        console.warn("runLPBEngine: input invalide");
        return false;
    }
    return true;
}

// --- Export principal déjà défini dans le bloc 3 ---
// export function runLPBEngine(input) { ... }

// --- Export global (sécurité) ---
export default {
    runLPBEngine,
    readNumber
};
