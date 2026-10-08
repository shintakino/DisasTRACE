import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { users } from "@/db/schema/users";

export const MOBILE_APPROVAL_ROLES = ["public_user", "ambulance_responder"] as const;

export type AccountStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED" | "PENDING";
export type AccountVerificationStatus = "PENDING" | "APPROVED" | "REJECTED";
export type UserVerificationState =
  | "NOT_REQUIRED"
  | "AWAITING_ID"
  | "READY_FOR_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "DEACTIVATED";

export interface ApprovalAccount {
  role: string;
  status: AccountStatus;
  verificationStatus: AccountVerificationStatus;
  idImageUrl: string | null;
}

export function isMobileApprovalRole(role: string): role is (typeof MOBILE_APPROVAL_ROLES)[number] {
  return MOBILE_APPROVAL_ROLES.includes(role as (typeof MOBILE_APPROVAL_ROLES)[number]);
}

/**
 * The single business rule for records that may enter CDRRMO's actionable
 * registration queue. Accounts still awaiting an ID remain pending, but are
 * not reviewable and must never be counted as queue work.
 */
export function isApprovalEligible(account: ApprovalAccount): boolean {
  return isMobileApprovalRole(account.role)
    && account.status === "PENDING"
    && account.verificationStatus === "PENDING"
    && Boolean(account.idImageUrl);
}

/**
 * An admin decision is valid only for the exact identity document they
 * reviewed. Applicants may replace a pending document at any time.
 */
export function isApprovalEligibleForDocument(
  account: ApprovalAccount,
  reviewedDocumentPath: string,
): boolean {
  return isApprovalEligible(account) && account.idImageUrl === reviewedDocumentPath;
}

/** Shared database predicate for listing and conditionally reviewing applicants. */
export function approvalEligibilityWhere(reviewedDocumentPath?: string) {
  const baseConditions = [
    inArray(users.role, MOBILE_APPROVAL_ROLES),
    eq(users.status, "PENDING"),
    eq(users.verificationStatus, "PENDING"),
    isNotNull(users.idImageUrl),
  ];

  return and(
    ...baseConditions,
    ...(reviewedDocumentPath ? [eq(users.idImageUrl, reviewedDocumentPath)] : []),
  );
}

export function deriveUserVerificationState(account: ApprovalAccount): UserVerificationState {
  if (account.status === "SUSPENDED") return "SUSPENDED";
  if (account.status === "DEACTIVATED") return "DEACTIVATED";
  if (!isMobileApprovalRole(account.role)) return "NOT_REQUIRED";
  if (account.verificationStatus === "REJECTED") return "REJECTED";
  if (account.verificationStatus === "APPROVED") return "APPROVED";
  return account.idImageUrl ? "READY_FOR_APPROVAL" : "AWAITING_ID";
}
