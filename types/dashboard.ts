export interface KpiData {
  totalIncidentsToday: number;
  totalResponders: number;
  totalResolvedToday: number;
  avgResponseTime: string;
}

export interface IncidentTrend {
  month: string;
  vehicular: number;
  medical: number;
  fire: number;
  other: number;
}

export interface IncidentDistribution {
  name: string;
  value: number;
  fill: string;
}

export interface RecentReport {
  id: string;
  vehicleId: string;
  origin: string;
  destination: string;
  timestamp: string;
}

export interface Responder {
  id: string;
  name: string;
  status: string;
  initials: string;
}

export interface DashboardData {
  kpis: KpiData;
  trends: IncidentTrend[];
  distribution: IncidentDistribution[];
  reports: RecentReport[];
  responders: Responder[];
}
