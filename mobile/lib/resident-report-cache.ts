import * as FileSystem from 'expo-file-system/legacy';

export interface CachedResidentReport {
  id: string;
  requestId?: string;
  type?: string;
  date?: string;
  createdAt?: string;
  status?: string;
  incidentStatus?: string | null;
  barangay?: string | null;
  location?: string | null;
  natureOfCall?: string | null;
  peopleInvolved?: number;
  residentPhotoUrl?: string | null;
}

export interface ResidentReportCache {
  savedAt: string;
  reports: CachedResidentReport[];
}

const MAX_CACHED_REPORTS = 50;
const cachePath = (userId: string) => `${FileSystem.documentDirectory}disastrace-resident-reports-${encodeURIComponent(userId)}.json`;

export async function readResidentReportCache(userId: string): Promise<ResidentReportCache | null> {
  try {
    const file = cachePath(userId);
    const info = await FileSystem.getInfoAsync(file);
    if (!info.exists) return null;
    const parsed = JSON.parse(await FileSystem.readAsStringAsync(file)) as Partial<ResidentReportCache>;
    if (!Array.isArray(parsed.reports) || typeof parsed.savedAt !== 'string') return null;
    return { savedAt: parsed.savedAt, reports: parsed.reports.slice(0, MAX_CACHED_REPORTS) };
  } catch {
    return null;
  }
}

export async function writeResidentReportCache(userId: string, reports: CachedResidentReport[]) {
  const entry: ResidentReportCache = {
    savedAt: new Date().toISOString(),
    reports: reports.slice(0, MAX_CACHED_REPORTS).map((report) => ({
      id: report.id,
      requestId: report.requestId,
      type: report.type,
      date: report.date,
      createdAt: report.createdAt,
      status: report.status,
      incidentStatus: report.incidentStatus,
      barangay: report.barangay,
      location: report.location,
      natureOfCall: report.natureOfCall,
      peopleInvolved: report.peopleInvolved,
      residentPhotoUrl: report.residentPhotoUrl,
    })),
  };
  try {
    await FileSystem.writeAsStringAsync(cachePath(userId), JSON.stringify(entry));
  } catch (error) {
    console.warn('[ResidentReports] Unable to save offline cache:', error);
  }
}
