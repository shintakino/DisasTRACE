export type InitialTriageClassification =
  | 'HIGH_CONFIDENCE_EMERGENCY'
  | 'HIGH_CONFIDENCE_NON_EMERGENCY'
  | 'UNCERTAIN_INCOMPLETE'
  | 'SUSPICIOUS_POSSIBLE_PRANK';

export type ReportNature = 'EMERGENCY' | 'NON-EMERGENCY';

const NON_EMERGENCY_TYPES = new Set([
  'Patient Transport',
  'Other / non-emergency request',
]);

export interface InitialTriageInput {
  incidentType: string;
  requestedNature?: string | null;
  answersConsistent?: boolean;
  suspicious?: boolean;
}

export interface InitialTriageDecision {
  nature: ReportNature;
  classification: InitialTriageClassification;
  reasons: string[];
}

/** Server-authoritative initial triage shared by every report intake path. */
export function deriveInitialTriage(input: InitialTriageInput): InitialTriageDecision {
  if (input.incidentType === 'Unknown Cause') {
    return {
      nature: 'NON-EMERGENCY',
      classification: 'UNCERTAIN_INCOMPLETE',
      reasons: ['The incident cause and appropriate coordinating agency are unknown. PACC review is required.'],
    };
  }

  const nature: ReportNature = NON_EMERGENCY_TYPES.has(input.incidentType)
    ? 'NON-EMERGENCY'
    : 'EMERGENCY';

  if (input.suspicious) {
    return { nature, classification: 'SUSPICIOUS_POSSIBLE_PRANK', reasons: [] };
  }
  if (input.answersConsistent === false) {
    return {
      nature,
      classification: 'UNCERTAIN_INCOMPLETE',
      reasons: ['The incident answers need clarification.'],
    };
  }
  return {
    nature,
    classification: nature === 'EMERGENCY'
      ? 'HIGH_CONFIDENCE_EMERGENCY'
      : 'HIGH_CONFIDENCE_NON_EMERGENCY',
    reasons: [],
  };
}

export const deriveAuthoritativeInitialTriage = deriveInitialTriage;

export function createPublicRequestId(id: string, year = new Date().getFullYear()): string {
  const compactId = id.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return `REQ-${year}-${compactId.slice(0, 10).padEnd(10, '0')}`;
}
