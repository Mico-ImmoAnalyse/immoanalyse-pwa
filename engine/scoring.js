export function computeScore(ratios, typeConfig, alertes, garanties) {
  const { weights } = typeConfig;

  const scores = {};
  for (const ratioName of Object.keys(weights)) {
    const value = ratioName === 'garanties'
      ? garanties.coefGlobal
      : ratios[ratioName];

    scores[ratioName] = scoreRatio(ratioName, value);
  }

  let score = 0;
  let totalWeight = 0;
  for (const [ratioName, weight] of Object.entries(weights)) {
    score += (scores[ratioName] || 0) * weight;
    totalWeight += weight;
  }
  const scoreBrut = totalWeight > 0 ? score / totalWeight : 0;

  let scoreAjuste = scoreBrut;
  const coefGlobal = garanties.coefGlobal;
  if (coefGlobal > 1.30) scoreAjuste += 5;
  if (coefGlobal < 0.70) scoreAjuste -= 5;

  const nbWarnings = alertes.filter(a => a.niveau === 'warning').length;
  const nbCritiques = alertes.filter(a => a.niveau === 'critique').length;

  scoreAjuste -= nbWarnings * 5;
  scoreAjuste -= nbCritiques * 15;

  return Math.max(0, Math.min(100, Math.round(scoreAjuste)));
}

function scoreRatio(name, value) {
  switch (name) {
    case 'LTA_pondere':
      if (value < 0.80) return 95;
      if (value < 1.00) return 80;
      if (value < 1.20) return 55;
      if (value < 1.50) return 25;
      return 5;

    case 'marge':
      if (value > 0.20) return 95;
      if (value > 0.15) return 80;
      if (value > 0.10) return 55;
      if (value > 0.05) return 25;
      return 5;

    case 'liquidite':
      if (value > 0.70) return 95;
      if (value > 0.50) return 80;
      if (value > 0.40) return 55;
      if (value > 0.30) return 25;
      return 5;

    case 'couverture':
      if (value >= 1.20) return 95;
      if (value >= 1.00) return 80;
      if (value >= 0.90) return 55;
      if (value >= 0.80) return 25;
      return 5;

    case 'LTV':
      if (value < 0.60) return 95;
      if (value < 0.75) return 80;
      if (value < 0.85) return 55;
      if (value < 1.00) return 25;
      return 5;

    case 'LTC':
      if (value < 0.70) return 95;
      if (value < 0.80) return 80;
      if (value < 0.90) return 55;
      if (value < 1.00) return 25;
      return 5;

    case 'precom':
      if (value > 0.80) return 95;
      if (value > 0.50) return 80;
      if (value > 0.25) return 55;
      if (value > 0.10) return 25;
      return 5;

    case 'liq':
      if (value <= 12) return 95;
      if (value <= 18) return 80;
      if (value <= 24) return 55;
      if (value <= 30) return 25;
      return 5;

    case 'garanties':
      if (value > 1.30) return 95;
      if (value > 1.15) return 80;
      if (value > 1.00) return 55;
      if (value > 0.70) return 25;
      return 5;

    default:
      return 50;
  }
}
