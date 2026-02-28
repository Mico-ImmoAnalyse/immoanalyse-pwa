export function computeTicketIA(score, ratios, garanties, alertes, besoin, type) {
  const { LTA_pondere, liquidite, liq } = ratios;
  const coefGlobal = garanties.coefGlobal;

  const [minBase, maxBase] = getBaseRange(score);
  let montant = (minBase + maxBase) / 2;

  const facteurs = [];

  if (LTA_pondere < 0.80) {
    montant *= 1.20;
    facteurs.push("LTA pondéré très favorable.");
  } else if (LTA_pondere < 1.00) {
    montant *= 1.10;
    facteurs.push("LTA pondéré correct.");
  } else if (LTA_pondere < 1.20) {
    montant *= 0.80;
    facteurs.push("LTA pondéré tendu.");
  } else if (LTA_pondere < 1.50) {
    montant *= 0.60;
    facteurs.push("LTA pondéré élevé, prudence renforcée.");
  } else {
    facteurs.push("LTA pondéré critique, ticket nul.");
    return {
      montant: 0,
      niveau: 'refusé',
      justification: "LTA pondéré critique, risque majeur sur la qualité d'achat.",
      facteurs
    };
  }

  if (coefGlobal > 1.30) {
    montant *= 1.15;
    facteurs.push("Garanties fortes, protection élevée.");
  } else if (coefGlobal < 0.70) {
    montant *= 0.70;
    facteurs.push("Garanties faibles, protection limitée.");
  }

  if (liq > 36) {
    montant *= 0.60;
    facteurs.push("Durée très longue, exposition élevée.");
  } else if (liq > 24) {
    montant *= 0.80;
    facteurs.push("Durée longue, prudence nécessaire.");
  }

  if (type === 'LDT') {
    if (liquidite < 0.30) {
      montant *= 0.50;
      facteurs.push("Marché très peu liquide.");
    } else if (liquidite < 0.40) {
      montant *= 0.70;
      facteurs.push("Marché peu liquide.");
    }
  }

  const nbWarnings = alertes.filter(a => a.niveau === 'warning').length;
  const nbCritiques = alertes.filter(a => a.niveau === 'critique').length;

  if (nbCritiques >= 2) {
    facteurs.push("Multiples alertes critiques, ticket nul.");
    return {
      montant: 0,
      niveau: 'refusé',
      justification: "Plusieurs alertes critiques identifiées.",
      facteurs
    };
  }

  if (nbWarnings > 0) {
    montant *= Math.pow(0.90, nbWarnings);
    facteurs.push(`${nbWarnings} alerte(s) de niveau warning.`);
  }

  if (nbCritiques > 0) {
    montant *= Math.pow(0.60, nbCritiques);
    facteurs.push(`${nbCritiques} alerte(s) de niveau critique.`);
  }

  if (LTA_pondere > 1.20 && montant > 100) {
    montant = 100;
    facteurs.push("Plafond de sécurité lié à un LTA pondéré élevé.");
  }

  if (type === 'LDT' && liquidite < 0.40 && coefGlobal <= 0.30) {
    facteurs.push("Liquidité faible et absence de garanties : ticket nul.");
    return {
      montant: 0,
      niveau: 'refusé',
      justification: "Liquidité faible et garanties insuffisantes.",
      facteurs
    };
  }

  montant = Math.max(0, Math.min(montant, besoin, 1000));
  const niveau = getNiveau(montant);
  const justification = buildJustification(niveau, score, type);

  return {
    montant: Math.round(montant),
    niveau,
    justification,
    facteurs
  };
}

function getBaseRange(score) {
  if (score >= 80) return [700, 1000];
  if (score >= 60) return [400, 800];
  if (score >= 40) return [200, 500];
  if (score >= 20) return [50, 200];
  return [0, 100];
}

function getNiveau(montant) {
  if (montant === 0) return 'refusé';
  if (montant <= 100) return 'minimal';
  if (montant <= 300) return 'prudent';
  if (montant <= 700) return 'standard';
  return 'renforcé';
}

function buildJustification(niveau, score, type) {
  if (niveau === 'refusé') return "Risque jugé trop élevé au regard du profil du projet.";
  if (niveau === 'minimal') return "Ticket minimal en raison d'un profil de risque élevé.";
  if (niveau === 'prudent') return "Ticket prudent, projet présentant plusieurs points de vigilance.";
  if (niveau === 'standard') return "Ticket standard, projet globalement équilibré.";
  return "Ticket renforcé, projet jugé solide avec un risque maîtrisé.";
}
