export function runCrossAnalysis(ratios, garanties, typeConfig, type) {
  const alertes = [];

  const { LTV, LTA_pondere, marge, precom, liq, liquidite, couverture } = ratios;
  const coefGlobal = garanties.coefGlobal;

  if (coefGlobal < 0.70) {
    alertes.push({
      niveau: 'warning',
      code: 'GARANTIES_FAIBLES',
      message: 'Niveau de garanties faible, protection du capital limitée.',
      type: 'GLOBAL'
    });
  }

  if (coefGlobal > 1.30) {
    alertes.push({
      niveau: 'info',
      code: 'GARANTIES_FORTES',
      message: 'Niveau de garanties élevé, bonne protection du capital.',
      type: 'GLOBAL'
    });
  }

  if (LTA_pondere > 1.50) {
    alertes.push({
      niveau: 'critique',
      code: 'LTA_PONDERE_CRITIQUE',
      message: 'LTA pondéré très élevé, risque majeur sur la qualité d’achat.',
      type: 'GLOBAL'
    });
  }

  if (type === 'MDB') {
    if (LTV < 0.75 && LTA_pondere > 1.00) {
      alertes.push({
        niveau: 'warning',
        code: 'MDB_LTV_BON_LTA_MAUVAIS',
        message: 'LTV correct mais LTA pondéré élevé : incohérence achat/valeur.',
        type: 'MDB'
      });
    }

    if (marge > 0.20 && precom < 0.25) {
      alertes.push({
        niveau: 'warning',
        code: 'MDB_MARGE_HAUTE_PRECOM_FAIBLE',
        message: 'Marge élevée mais pré-commercialisation faible : risque commercial.',
        type: 'MDB'
      });
    }

    if (marge < 0.10 && precom < 0.25) {
      alertes.push({
        niveau: 'critique',
        code: 'MDB_MARGE_FAIBLE_PRECOM_FAIBLE',
        message: 'Marge faible et pré-commercialisation faible : double risque.',
        type: 'MDB'
      });
    }

    if (liq > 24 && marge < 0.10) {
      alertes.push({
        niveau: 'critique',
        code: 'MDB_LIQ_LONGUE_MARGE_FAIBLE',
        message: 'Durée longue et marge faible : exposition prolongée sans coussin.',
        type: 'MDB'
      });
    }

    if (LTA_pondere > 1.20) {
      alertes.push({
        niveau: 'warning',
        code: 'MDB_LTA_PONDERE_ELEVE',
        message: 'LTA pondéré élevé : qualité d’achat fragile.',
        type: 'MDB'
      });
    }
  }

  if (type === 'LDT') {
    if (liquidite < 0.40 && couverture < 1.00) {
      alertes.push({
        niveau: 'critique',
        code: 'LDT_LIQUIDITE_COUVERTURE_FAIBLES',
        message: 'Liquidité faible et couverture insuffisante : risque de perte.',
        type: 'LDT'
      });
    }

    if (liquidite < 0.50 && coefGlobal <= 0.30) {
      alertes.push({
        niveau: 'critique',
        code: 'LDT_LIQUIDITE_FAIBLE_SANS_GARANTIES',
        message: 'Liquidité faible et absence de garanties : risque majeur.',
        type: 'LDT'
      });
    }

    if (liq > 24 && liquidite < 0.40) {
      alertes.push({
        niveau: 'warning',
        code: 'LDT_LIQ_LONGUE_LIQUIDITE_FAIBLE',
        message: 'Durée longue sur un marché peu liquide.',
        type: 'LDT'
      });
    }

    if (LTV > 0.80 && couverture < 1.00) {
      alertes.push({
        niveau: 'warning',
        code: 'LDT_LTV_ELEVE_COUVERTURE_FAIBLE',
        message: 'LTV élevé et couverture insuffisante.',
        type: 'LDT'
      });
    }
  }

  return alertes;
}
