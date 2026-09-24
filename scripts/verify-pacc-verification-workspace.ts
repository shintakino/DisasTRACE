import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { classifyVerificationWorkspaceFilter } from "@/lib/rejected-report-workflow"

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

function expectIncludes(path: string, expected: string) {
  if (!source(path).includes(expected)) throw new Error(`${path} is missing: ${expected}`)
}

const queue = "components/verification/verification-queue.tsx"
for (const label of ["For Action", "For Review", "Closed", "Rejected", "Search reports..."]) expectIncludes(queue, label)
expectIncludes(queue, 'alt="Submitted report evidence"')
expectIncludes(queue, "classifyVerificationWorkspaceFilter")

function expectEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`)
}

expectEqual(classifyVerificationWorkspaceFilter({ requestStatus: "PENDING", triageClassification: "HIGH_CONFIDENCE_EMERGENCY" }), "ACTION", "high-confidence pending report")
expectEqual(classifyVerificationWorkspaceFilter({ requestStatus: "VERIFIED", incidentStatus: "DISPATCHED", currentOfferResponderId: "offer" }), "REVIEW", "awaiting responder report")
expectEqual(classifyVerificationWorkspaceFilter({ requestStatus: "VERIFIED", incidentStatus: "EN_ROUTE", responderId: "responder" }), null, "assigned in-progress incident")
expectEqual(classifyVerificationWorkspaceFilter({ requestStatus: "DUPLICATE" }), "CLOSED", "merged duplicate")

const panel = "components/verification/resident-panel.tsx"
for (const label of ["PACC actions", "External emergency assistance", "Dispatch log", "Call"]) expectIncludes(panel, label)
expectIncludes(panel, "getPaccEmergencyAssistance")
expectIncludes(panel, "assistance.telHref")
expectIncludes(panel, "overflow-hidden")
expectIncludes(panel, "Reporter context")

const assistance = "lib/pacc-emergency-assistance.ts"
expectIncludes(assistance, 'const HOTLINE = "09364294078"')
for (const agency of ["BFP · Bureau of Fire Protection", "PNP · Baliwag", "CDRRMO Emergency Medical Service", "CDRRMO Operations"]) expectIncludes(assistance, agency)

expectIncludes("components/verification/reject-incident-dialog.tsx", "w-[min(96vw,72rem)]")
expectIncludes("components/account/settings-view.tsx", "PasswordInput")
expectIncludes("components/map/command-map-overlays.tsx", "INCIDENT_PRESENTATION")
expectIncludes("components/verification/verification-details.tsx", "Advanced review controls")
expectIncludes("components/verification/verification-details.tsx", "overflow-hidden")

console.log("PACC verification workspace checks passed.")
