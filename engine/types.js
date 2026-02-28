export function getTypeConfig(type) {
  if (type === 'MDB') {
    return {
      weights: {
        LTA_pondere: 0.25,
        marge: 0.20,
        LTV: 0.15,
        LTC: 0.15,
        precom: 0.10,
        liq: 0.10,
        liquidite: 0.05
      },
      ratiosUsed: [
        'LTA_pondere',
        'marge',
        'LTV',
        'LTC',
        'precom',
        'liq',
        'liquidite'
      ],
      criticalThresholds: {
        LTA_pondere: 1.20,
        marge: 0.10,
        precom: 0.25,
        liq: 24,
        LTV: 0.85
      },
      modulators: {
        garanties: true,
        duree: true,
        liquidite: true
      }
    };
  }

  if (type === 'LDT') {
    return {
      weights: {
        liquidite: 0.30,
        couverture: 0.25,
        garanties: 0.20,
        LTV: 0.10,
        liq: 0.10,
        LTA_pondere: 0.05
      },
      ratiosUsed: [
        'liquidite',
        'couverture',
        'garanties',
        'LTV',
        'liq',
        'LTA_pondere'
      ],
      criticalThresholds: {
        liquidite: 0.40,
        couverture: 1.00,
        LTV: 0.80,
        liq: 24
      },
      modulators: {
        garanties: true,
        duree: true,
        liquidite: true
      }
    };
  }

  throw new Error(`Type d'investissement inconnu : ${type}`);
}
