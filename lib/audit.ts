import { AuditLogEntry, AuditLogEntrySchema } from "@/types/audit";

/**
 * Utility to log system actions.
 * In a real application, this would write to a database.
 * For this implementation, we simulate the audit trail.
 */
export async function logAuditAction(params: {
  userName: string;
  action: string;
  contextPath: string;
}) {
  const timestamp = new Date().toISOString();
  const date = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());
  
  const time = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(new Date());

  const entry: AuditLogEntry = {
    id: `LOG-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    userName: params.userName,
    action: params.action,
    contextPath: params.contextPath,
    timestamp,
    date,
    time,
  };

  // Validate with Zod
  const validated = AuditLogEntrySchema.parse(entry);

  console.log(`[AUDIT LOG]: ${validated.userName} - ${validated.action} (${validated.contextPath})`);
  
  return validated;
}
