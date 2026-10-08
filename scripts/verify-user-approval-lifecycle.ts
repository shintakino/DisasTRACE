import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  deriveUserVerificationState,
  isApprovalEligible,
  isApprovalEligibleForDocument,
  type ApprovalAccount,
} from "../lib/account-approval";

function account(overrides: Partial<ApprovalAccount>): ApprovalAccount {
  return {
    role: "public_user",
    status: "PENDING",
    verificationStatus: "PENDING",
    idImageUrl: null,
    ...overrides,
  };
}

function check(name: string, callback: () => void) {
  try {
    callback();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

check("awaiting-ID accounts stay pending but never enter the approval queue", () => {
  const applicant = account({ idImageUrl: null });
  assert.equal(deriveUserVerificationState(applicant), "AWAITING_ID");
  assert.equal(isApprovalEligible(applicant), false);
});

check("only pending mobile applicants with an ID are actionable", () => {
  const applicant = account({ idImageUrl: "ids/applicant/government-id.jpg" });
  assert.equal(deriveUserVerificationState(applicant), "READY_FOR_APPROVAL");
  assert.equal(isApprovalEligible(applicant), true);
});

check("an approval cannot apply to an ID document that was replaced after review", () => {
  const reviewedDocumentPath = "ids/applicant/reviewed-document.jpg";
  const replacementDocumentPath = "ids/applicant/replacement-document.jpg";
  const applicant = account({ idImageUrl: replacementDocumentPath });

  assert.equal(isApprovalEligibleForDocument(applicant, reviewedDocumentPath), false);
  assert.equal(isApprovalEligibleForDocument(applicant, replacementDocumentPath), true);
});

check("a rejected application is never mislabeled as ready for approval", () => {
  const applicant = account({
    idImageUrl: "ids/applicant/government-id.jpg",
    verificationStatus: "REJECTED",
  });
  assert.equal(deriveUserVerificationState(applicant), "REJECTED");
  assert.equal(isApprovalEligible(applicant), false);
});

check("suspended and deactivated accounts are never actionable", () => {
  const suspended = account({
    idImageUrl: "ids/applicant/government-id.jpg",
    status: "SUSPENDED",
  });
  const deactivated = account({
    idImageUrl: "ids/applicant/government-id.jpg",
    status: "DEACTIVATED",
  });
  assert.equal(deriveUserVerificationState(suspended), "SUSPENDED");
  assert.equal(deriveUserVerificationState(deactivated), "DEACTIVATED");
  assert.equal(isApprovalEligible(suspended), false);
  assert.equal(isApprovalEligible(deactivated), false);
});

check("administrative accounts do not enter the mobile approval lifecycle", () => {
  const administrator = account({
    role: "pacc_admin",
    idImageUrl: "ids/admin/government-id.jpg",
  });
  assert.equal(deriveUserVerificationState(administrator), "NOT_REQUIRED");
  assert.equal(isApprovalEligible(administrator), false);
});

check("list and mutation routes reuse the server-side eligibility predicate", () => {
  const listRoute = readFileSync(join(process.cwd(), "app/api/users/approval/route.ts"), "utf8");
  const mutationRoute = readFileSync(join(process.cwd(), "app/api/users/approval/[id]/route.ts"), "utf8");
  const approvalTypes = readFileSync(join(process.cwd(), "types/approval.ts"), "utf8");
  const approvalPage = readFileSync(join(process.cwd(), "app/(dashboard)/users/approval/page.tsx"), "utf8");
  assert.match(listRoute, /\.where\(approvalEligibilityWhere\(\)\)/);
  assert.match(mutationRoute, /and\(eq\(users\.id, id\), approvalEligibilityWhere\(result\.data\.documentPath\)\)/);
  assert.match(approvalTypes, /documentPath: z\.string\(\)\.trim\(\)\.min\(1\)/);
  assert.match(approvalPage, /response\.status === 409/);
  assert.match(approvalPage, /const handleApprovalConflict = async \(\) => \{[\s\S]*await fetchApplicantsSilent\(\)/);
  assert.match(mutationRoute, /status: 409/);
});

check("User Management receives and renders the separate verification state", () => {
  const usersRoute = readFileSync(join(process.cwd(), "app/api/users/route.ts"), "utf8");
  const table = readFileSync(join(process.cwd(), "components/users/users-table.tsx"), "utf8");
  const header = readFileSync(join(process.cwd(), "components/users/users-header.tsx"), "utf8");
  assert.match(usersRoute, /verificationState: deriveUserVerificationState\(u\)/);
  assert.match(usersRoute, /Pending mobile registrations must be approved from Users Approval/);
  assert.match(table, /header: "ACCOUNT STATUS"/);
  assert.match(table, /header: "VERIFICATION"/);
  assert.match(header, /Ready for Approval/);
});

console.log("User approval lifecycle checks passed.");
