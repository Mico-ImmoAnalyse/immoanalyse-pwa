import { computeRatios } from './ratios.js';
import { computeGaranties } from './garanties.js';
import { getTypeConfig } from './types.js';
import { runCrossAnalysis } from './crossAnalysis.js';
import { computeScore } from './scoring.js';
import { buildDiagnostic } from './diagnostic.js';
import { computeTicketIA } from './ticket.js';

function deriveSecurityLevel(score, alertes) {
  const nbCritiques = alertes.filter(a => a.niveau === 'critique').length;

  if (score >= 80 && nbCritiques === 0) return 'forte';
  if (score >= 60 && nbCritiques <= 1) return 'moyenne';
  if (score >= 40) return 'faible';
  return 'critique';
}

export function runLPBEngine(input) {
  const { type, besoin, valeurs, garanties: garantiesInput } = input;

  const typeConfig = getTypeConfig(type);
  const garanties = computeGaranties(garantiesInput);
  const ratios = computeRatios(valeurs, garanties);
  const alertes = runCrossAnalysis(ratios, garanties, typeConfig, type);
  const score = computeScore(ratios, typeConfig, alertes, garanties);
  const diagnostic = buildDiagnostic(ratios, alertes, score, type);
  const ticketIA = computeTicketIA(score, ratios, garanties, alertes, besoin, type);

  return {
    ratios,
    score,
    diagnostic,
    ticketIA,
    meta: {
      type,
      securiteGlobale: deriveSecurityLevel(score, alertes)
    }
  };
}
