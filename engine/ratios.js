export function computeRatios(valeurs, garanties) {
  const {
    prixAchat,
    valeurActif,
    travaux,
    frais,
    chiffreAffaires,
    precommercialisation,
    dureeProjetMois,
    liquiditeMarche,
    couverture,
    fondsPropres,
    dette
  } = valeurs;

  const LTV = valeurActif > 0 ? dette / valeurActif : 0;
  const LTA = prixAchat > 0 ? dette / prixAchat : 0;
  const LTC = (prixAchat + travaux + frais) > 0 ? dette / (prixAchat + travaux + frais) : 0;

  const marge = chiffreAffaires > 0
    ? (chiffreAffaires - (prixAchat + travaux + frais)) / chiffreAffaires
    : 0;

  const precom = precommercialisation / 100;
  const liquidite = liquiditeMarche / 100;
  const liq = dureeProjetMois;
  const couvertureRatio = couverture / 100;

  let facteurLTV = 1;
  if (LTV < 0.60) facteurLTV = 0.85;
  else if (LTV < 0.75) facteurLTV = 1.00;
  else if (LTV < 0.85) facteurLTV = 1.10;
  else if (LTV <= 1.00) facteurLTV = 1.20;
  else facteurLTV = 1.40;

  const coefGlobal = garanties.coefGlobal || 1;
  const LTA_pondere = (LTA / coefGlobal) * facteurLTV;

  return {
    LTV,
    LTA,
    LTA_pondere,
    LTC,
    marge,
    precom,
    liquidite,
    liq,
    couverture: couvertureRatio
  };
}
