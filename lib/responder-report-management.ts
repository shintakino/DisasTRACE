import { z } from 'zod';
import { BALIWAG_BARANGAYS } from '@/lib/barangay-boundaries';

const optionalTrimmedText = (maxLength: number) => z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().max(maxLength).optional(),
);

const officialBarangayNames = new Set(BALIWAG_BARANGAYS.map(({ name }) => name));

const optionalOfficialBarangay = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().refine(
    (value) => officialBarangayNames.has(value),
    'barangay must be an official City of Baliwag barangay.',
  ).optional(),
);

const ResponderReportListQuerySchema = z.object({
  search: optionalTrimmedText(80),
  type: optionalTrimmedText(80),
  barangay: optionalOfficialBarangay,
  status: z.enum(['all', 'ongoing', 'completed']).default('all'),
  sort: z.enum(['newest', 'oldest']).default('newest'),
  createdAfter: z.string().datetime({ offset: true }).optional(),
  createdBefore: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(15),
}).strict().superRefine((query, context) => {
  if (Boolean(query.createdAfter) !== Boolean(query.createdBefore)) {
    context.addIssue({ code: 'custom', message: 'Both date bounds are required.' });
  }
  if (
    query.createdAfter
    && query.createdBefore
    && new Date(query.createdAfter).getTime() >= new Date(query.createdBefore).getTime()
  ) {
    context.addIssue({ code: 'custom', message: 'Date range must be ordered.' });
  }
});

export type ResponderReportListQuery = z.infer<typeof ResponderReportListQuerySchema>;

export function parseResponderReportListQuery(searchParams: URLSearchParams): ResponderReportListQuery {
  if (searchParams.has('archive')) {
    throw new Error('The responder report archive is no longer supported.');
  }
  return ResponderReportListQuerySchema.parse({
    search: searchParams.get('search') ?? undefined,
    type: searchParams.get('type') ?? undefined,
    barangay: searchParams.get('barangay') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    sort: searchParams.get('sort') ?? undefined,
    createdAfter: searchParams.get('createdAfter') ?? undefined,
    createdBefore: searchParams.get('createdBefore') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  });
}
