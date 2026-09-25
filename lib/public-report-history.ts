import { z } from 'zod';
import { BALIWAG_BARANGAYS } from '@/lib/barangay-boundaries';
import { IncidentTypeSchema } from '@/types/reports';

export const PublicReportDateRangeSchema = z.enum(['all', 'today', 'last_7_days', 'last_30_days']);
export type PublicReportDateRange = z.infer<typeof PublicReportDateRangeSchema>;

const officialBarangayNames = new Set(BALIWAG_BARANGAYS.map(({ name }) => name));

const optionalOfficialBarangay = z.preprocess(
  (value) => typeof value === 'string' && value.trim() ? value.trim() : undefined,
  z.string().refine(
    (barangay) => officialBarangayNames.has(barangay),
    'barangay must be an official City of Baliwag barangay.',
  ).optional(),
);

const optionalIncidentType = z.preprocess(
  (value) => typeof value === 'string' && value.trim() ? value.trim() : undefined,
  IncidentTypeSchema.optional(),
);

export const PublicReportHistoryQuerySchema = z.object({
  type: optionalIncidentType,
  barangay: optionalOfficialBarangay,
  dateRange: PublicReportDateRangeSchema.default('all'),
}).strict();

export type PublicReportHistoryQuery = z.infer<typeof PublicReportHistoryQuerySchema>;

export function parsePublicReportHistoryQuery(searchParams: URLSearchParams): PublicReportHistoryQuery {
  return PublicReportHistoryQuerySchema.parse({
    type: searchParams.get('type') ?? undefined,
    barangay: searchParams.get('barangay') ?? undefined,
    dateRange: searchParams.get('dateRange') ?? undefined,
  });
}
