export const INCIDENT_PRESENTATION = [
  { type: 'Vehicular Collision', label: 'Vehicular Collision', color: '#203F91' },
  { type: 'Medical Emergency', label: 'Medical Emergency', color: '#2F6FED' },
  { type: 'Structural Failure', label: 'Structural Failure', color: '#7C3AED' },
  { type: 'Fire Emergency', label: 'Fire / Explosion', color: '#E52421' },
  { type: 'Flood/Water', label: 'Flood / Water', color: '#119C91' },
  { type: 'Unknown Cause', label: 'Unknown Cause', color: '#64748B' },
  { type: 'Patient Transport', label: 'Patient Transport', color: '#E2E5EC' },
  { type: 'Other / non-emergency request', label: 'Other', color: '#E2E5EC' },
] as const;

export function incidentPresentationForType(type: string) {
  return INCIDENT_PRESENTATION.find((incident) => incident.type === type)
    ?? INCIDENT_PRESENTATION.find((incident) => incident.type === 'Unknown Cause')!;
}

export function formatDurationMinutes(value: number | string | null | undefined) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder} min`;
}
