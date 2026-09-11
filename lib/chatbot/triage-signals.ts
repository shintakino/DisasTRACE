import type { CHATBOT_INCIDENT_TYPES } from '@/lib/chatbot/contracts';

type IncidentType = typeof CHATBOT_INCIDENT_TYPES[number];
type Nature = 'EMERGENCY' | 'NON-EMERGENCY';

export type TriageClassification = {
  incidentType: IncidentType;
  nature: Nature;
};

const EXPECTED_NATURE: Record<IncidentType, Nature> = {
  'Medical Emergency': 'EMERGENCY',
  'Vehicular Collision': 'EMERGENCY',
  'Fire Emergency': 'EMERGENCY',
  'Structural Failure': 'EMERGENCY',
  'Flood/Water': 'EMERGENCY',
  'Unknown Cause': 'NON-EMERGENCY',
  'Patient Transport': 'NON-EMERGENCY',
  'Other / non-emergency request': 'NON-EMERGENCY',
};

/** Reject an AI suggestion unless it exactly matches the approved type/nature policy. */
export function validateSuggestedClassification(value: TriageClassification): TriageClassification | undefined {
  return EXPECTED_NATURE[value.incidentType] === value.nature ? value : undefined;
}

/**
 * Reviewed, high-signal phrases distilled from chat-bot-addtional-data-feed.md.
 *
 * These rules make a safe initial classification from a report message. They do
 * not diagnose a patient, submit a report, or bypass the server-side triage and
 * PACC review workflow. Critical signals deliberately take precedence over a
 * routine symptom or transport request occurring in the same message.
 */
const CRITICAL_MEDICAL_PATTERN = /\b(?:not\s+(?:breathing|responsive|responding)|difficulty\s+breathing|cannot\s+breathe|chest\s+pain|heart\s+attack|unconscious|collapsed?|seizure|convuls(?:ion|ing)|heavy\s+bleeding|bleeding\s+(?:a\s+)?lot|blood\s+in\s+(?:vomit|stool)|stroke|cannot\s+(?:speak|move|stand)|severe(?:ly)?\s+injured|overdose|poison(?:ed|ing)|drowning|electrocut(?:ed|ion)|stabbed|shot|trapped|nahihirapan\s+huminga|(?:hindi\s+(?:siya\s+)?)?makahinga|humihingal|nabulunan|(?:masakit|mabigat)\s+(?:ang\s+)?dibdib|(?:nawalan|walang)\s+(?:siya\s+ng\s+)?malay|hindi\s+(?:siya\s+)?tumutu(?:gon|gon)|nag-?seizure|nagkikisay|dumudugo\s+nang\s+malakas|may\s+dugo\s+sa\s+(?:suka|dumi)|hindi\s+makapagsalita|hindi\s+maigalaw\s+(?:ang\s+)?(?:kalahating\s+katawan|buong\s+katawan)|hindi\s+makatayo|nabalian|nalason|na-?overdose|nalulunod|nakuryente|sinaksak|binarel)\b/i;

const PATIENT_TRANSPORT_PATTERN = /\b(?:patient\s+transport|transport(?:ing)?\s+(?:a\s+)?patient|hospital\s+(?:transfer|transport)|(?:need|kailangan)\s+(?:ng\s+)?transport(?:ation)?\s+(?:to|papuntang)\s+(?:the\s+)?(?:hospital|ospital)|(?:need|kailangan)\s+(?:ng\s+)?(?:ambulansya|ambulance)\s+(?:para\s+)?(?:ihatid|to\s+bring)|ihatid(?:in)?\s+(?:ang\s+)?(?:pasyente|patient)\s+(?:sa|papuntang)\s+(?:ospital|hospital)|(?:pasyente(?:ng)?|patient)\s+(?:na\s+)?(?:kailangang\s+)?(?:dalhin|bring)\s+(?:sa|to)\s+(?:ospital|hospital)|kailangan\s+(?:ng\s+)?(?:ambulansya|ambulance|transport).{0,80}\b(?:stable|matatag|routine|checkup|appointment)\b)\b/i;

const ROUTINE_NON_EMERGENCY_PATTERN = /\b(?:non[- ]?emergency|other\s+request|general\s+assistance|medical\s+advice|checkup|routine\s+(?:consultation|transport)|stable\s+(?:patient|pasyente)|lagnat|nilalagnat|nahihilo|nanlalabo(?:\s+ang)?\s+(?:mata|paningin)|nahihirapan\s+(?:(?:ako|siya)ng\s+)?lunukin|hindi\s+makalunok|hindi\s+makakain|masakit\s+(?:ang\s+)?(?:tiyan|tyan|ulo)|pagtatae|nagsusuka|namamaga\s+(?:ang\s+)?(?:kamay|paa|mata)|pantal|nangangati|panic|nagpapanic|naipit\s+(?:ang\s+)?(?:kamay|daliri)\s+sa\s+pinto|(?:na)?gasgas|minor\s+(?:injury|wound)|sprain|pilay|hindi\s+maigalaw\s+(?:ang\s+)?(?:tuhod|balikat)|nasugatan\s+sa\s+(?:baso|kutsilyo)|nasunog\s+(?:ang\s+)?balat)\b/i;

export function classifyReportedIncident(message: string): TriageClassification | undefined {
  // Hazard/event categories have stronger operational meaning than symptoms.
  if (/\b(?:fire|sunog|nasusunog|may\s+apoy)\b/i.test(message)) {
    return { incidentType: 'Fire Emergency', nature: 'EMERGENCY' };
  }
  if (/\b(?:crash|collision|vehicular|car\s+accident|motor(?:cycle)?\s+accident|bangga|nabangga|naaksidente(?:\s+sa\s+(?:kotse|motor|sasakyan))?|natamaan\s+ng\s+sasakyan)\b/i.test(message)) {
    return { incidentType: 'Vehicular Collision', nature: 'EMERGENCY' };
  }
  if (/\b(?:structural|collapse|collapsed|building\s+damage|gumuho|guho|bumagsak\s+(?:ang\s+)?(?:bubong|pader|gusali)|trapped\s+(?:inside|sa\s+loob))\b/i.test(message)) {
    return { incidentType: 'Structural Failure', nature: 'EMERGENCY' };
  }
  if (/\b(?:flood|flooding|baha|floodwater|water\s+rescue|umaapaw\s+na\s+ang\s+ilog|mataas\s+na\s+(?:ang\s+)?tubig)\b/i.test(message)) {
    return { incidentType: 'Flood/Water', nature: 'EMERGENCY' };
  }
  if (CRITICAL_MEDICAL_PATTERN.test(message)) {
    return { incidentType: 'Medical Emergency', nature: 'EMERGENCY' };
  }
  if (PATIENT_TRANSPORT_PATTERN.test(message)) {
    return { incidentType: 'Patient Transport', nature: 'NON-EMERGENCY' };
  }
  if (ROUTINE_NON_EMERGENCY_PATTERN.test(message)) {
    return { incidentType: 'Other / non-emergency request', nature: 'NON-EMERGENCY' };
  }
  return undefined;
}
