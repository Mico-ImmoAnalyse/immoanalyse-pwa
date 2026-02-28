const COEFFS = {
  fiducie: 1.40,
  gpd: 1.30,
  hyp1: 1.15,
  nantissement: 0.90,
  caution: 0.70,
  aucune: 0.30
};

export function computeGaranties(input) {
  const active = Object.entries(input || {})
    .filter(([_, v]) => v)
    .map(([k]) => k);

  if (active.length === 0) active.push('aucune');

  const coefs = active.map(g => COEFFS[g] || 0.30);
  const maxCoef = Math.max(...coefs);
  const bonus = computeBonus(active);
  const coefGlobal = Math.min(maxCoef + bonus, 1.50);

  return {
    coefGlobal,
    details: {
      liste: active,
      maxCoef,
      bonus
    }
  };
}

function computeBonus(active) {
  const set = new Set(active);
  const has = g => set.has(g);

  if ((has('fiducie') && has('gpd')) ||
      (has('fiducie') && has('hyp1')) ||
      (has('gpd') && has('hyp1'))) {
    return 0.15;
  }

  if ((has('hyp1') && has('nantissement')) ||
      (has('gpd') && has('nantissement')) ||
      (has('fiducie') && has('nantissement'))) {
    return 0.10;
  }

  if ((has('caution') && has('nantissement')) ||
      (has('caution') && has('hyp1')) ||
      (has('caution') && has('gpd'))) {
    return 0.05;
  }

  return 0;
}
