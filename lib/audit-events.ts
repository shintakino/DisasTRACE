export const PACC_AUDIT_ACTIONS = {
  rejected: 'PACC_REPORT_REJECTED',
  classification: 'PACC_CLASSIFICATION_OVERRIDDEN',
  coordination: 'PACC_COORDINATION_UPDATED',
  dispatch: 'PACC_MANUAL_DISPATCH_OFFERED',
  merged: 'PACC_REPORT_MERGED_DUPLICATE',
} as const;

export interface AuditActor {
  id: string;
  name: string;
  role: string;
}

export function createAuditActor(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}): AuditActor {
  const fullName = user.user_metadata?.full_name;
  const role = user.app_metadata?.role;
  return {
    id: user.id,
    name: typeof fullName === 'string' && fullName.trim() ? fullName.trim() : user.email ?? 'Authenticated administrator',
    role: typeof role === 'string' ? role : 'unknown',
  };
}

export function createAuditEvent(input: {
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
}) {
  return {
    id: crypto.randomUUID(),
    userId: input.actor.id,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    details: input.details ?? {},
    createdAt: new Date(),
  };
}
