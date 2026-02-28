export function buildDiagnostic(ratios, alertes, score, type) {
  const pointsForts = [];
  const pointsFaibles = [];

  const { LTA_pondere, marge, precom, liquidite, couverture, LTV, liq } = ratios;

  if (LTA_pondere < 0.80) pointsForts.push("Très bonne qualité d'achat.");
  if (marge > 0.20) pointsForts.push("Marge élevée, bon potentiel de rentabilité.");
  if (precom > 0.50) pointsForts.push("Bonne traction commerciale.");
  if (liquidite > 0.70) pointsForts.push("Marché très liquide.");
  if (couverture > 1.20) pointsForts.push("Couverture excellente.");
  if (LTV < 0.60) pointsForts.push("Structure financière solide.");
  if (liq <= 12) pointsForts.push("Exposition courte.");

  if (LTA_pondere > 1.20) pointsFaibles.push("Qualité d'achat fragile.");
  if (marge < 0.10) pointsFaibles.push("Rentabilité faible.");
  if (precom < 0.25) pointsFaibles.push("Traction commerciale insuffisante.");
  if (liquidite < 0.40) pointsFaibles.push("Marché peu liquide.");
  if (couverture < 1.00) pointsFaibles.push("Couverture insuffisante.");
  if (LTV > 0.85) pointsFaibles.push("Exposition financière élevée.");
  if (liq > 24) pointsFaibles.push("Durée longue, exposition prolongée.");

  let synthese = "";
  const nbWarnings = alertes.filter(a => a.niveau === 'warning').length;
  const nbCritiques = alertes.filter(a => a.niveau === 'critique').length;

  if (score > 80 && nbCritiques === 0) {
    synthese = "Projet solide, bien structuré, avec un niveau de risque maîtrisé.";
  } else if (score > 60 && nbCritiques === 0) {
    synthese = "Projet globalement cohérent mais présentant plusieurs points de vigilance.";
  } else if (score > 40 || nbCritiques > 0) {
    synthese = "Projet fragile, nécessitant une attention particulière sur certains risques.";
  } else {
    synthese = "Projet très risqué, structure fragile et exposition élevée.";
  }

  let recommandationIA = "";
  if (score > 80 && nbCritiques === 0) recommandationIA = "Recommandation positive.";
  else if (score > 60 && nbCritiques === 0) recommandationIA = "Recommandation prudente.";
  else if (score > 40) recommandationIA = "Recommandation réservée.";
  else recommandationIA = "Recommandation négative.";

  return {
    pointsForts,
    pointsFaibles,
    alertes,
    synthese,
    recommandationIA
  };
}
