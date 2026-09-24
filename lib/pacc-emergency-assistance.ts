import type { IncidentType } from "@/types/reports"

export interface PaccEmergencyAssistance {
  agency: string
  purpose: string
  hotline: string
  telHref: string
}

const HOTLINE = "09364294078"

const assistanceByIncidentType: Record<IncidentType, Omit<PaccEmergencyAssistance, "hotline" | "telHref">> = {
  "Fire Emergency": { agency: "BFP · Bureau of Fire Protection", purpose: "Fire suppression and rescue coordination" },
  "Vehicular Collision": { agency: "PNP · Baliwag", purpose: "Traffic incident and scene safety coordination" },
  "Medical Emergency": { agency: "CDRRMO Emergency Medical Service", purpose: "Medical response coordination" },
  "Structural Failure": { agency: "CDRRMO Operations", purpose: "Structural safety and rescue coordination" },
  "Flood/Water": { agency: "CDRRMO Operations", purpose: "Water rescue and evacuation coordination" },
  "Unknown Cause": { agency: "CDRRMO Operations", purpose: "Initial emergency coordination" },
  "Patient Transport": { agency: "CDRRMO Emergency Medical Service", purpose: "Patient transport coordination" },
  "Other / non-emergency request": { agency: "CDRRMO Operations", purpose: "Incident coordination" },
}

export function getPaccEmergencyAssistance(type: IncidentType): PaccEmergencyAssistance {
  return { ...assistanceByIncidentType[type], hotline: HOTLINE, telHref: `tel:${HOTLINE}` }
}
