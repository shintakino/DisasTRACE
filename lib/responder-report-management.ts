import { z } from 'zod';

const optionalTrimmedText = (maxLength: number) => z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().max(maxLength).optional(),
);

const ResponderReportListQuerySchema = z.object({
  search: optionalTrimmedText(80),
  type: optionalTrimmedText(80),
  status: z.enum(['all', 'ongoing', 'completed']).default('all'),
  archive: z.enum(['active', 'archived']).default('active'),
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

const ResponderReportArchivePayloadSchema = z.object({
  archived: z.boolean(),
}).strict();

export type ResponderReportListQuery = z.infer<typeof ResponderReportListQuerySchema>;

export function parseResponderReportListQuery(searchParams: URLSearchParams): ResponderReportListQuery {
  return ResponderReportListQuerySchema.parse({
    search: searchParams.get('search') ?? undefined,
    type: searchParams.get('type') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    archive: searchParams.get('archive') ?? undefined,
    sort: searchParams.get('sort') ?? undefined,
    createdAfter: searchParams.get('createdAfter') ?? undefined,
    createdBefore: searchParams.get('createdBefore') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  });
}

export function parseResponderReportArchivePayload(payload: unknown): { archived: boolean } {
  return ResponderReportArchivePayloadSchema.parse(payload);
}
