import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

const summary = source('components/dashboard/cdrrmo-incident-summary.tsx');
assert.match(summary, /lg:grid-cols-\[220px_1fr\]/);
assert.match(summary, /PieChart width=\{176\} height=\{176\}/);
assert.match(summary, /REPORT_DATE_PRESET_LABELS/);
assert.doesNotMatch(summary, /This week|This month|This year/);

const analytics = source('components/analytics/analytics-dashboard.tsx');
assert.match(analytics, />All Barangays<\/option>/);

const verificationDetails = source('components/verification/verification-details.tsx');
assert.doesNotMatch(verificationDetails, /Advanced review controls|Expand when needed/);
assert.match(verificationDetails, /onOverrideClassification/);
assert.match(verificationDetails, /onUpdateCoordination/);

const messages = source('app/(dashboard)/messages/page.tsx');
assert.match(messages, />\s*View\s*<\/Button>/);
assert.doesNotMatch(messages, /\bEye\b/);

const auditPreview = source('components/dashboard/cdrrmo-audit-preview.tsx');
assert.match(auditPreview, /Audit Log Preview/);
assert.doesNotMatch(auditPreview, /ShieldCheck/);

const mapMarker = source('components/map/map-marker.tsx');
const mapPanel = source('components/map/incident-panel.tsx');
assert.match(mapMarker, /grid size-9 place-items-center/);
assert.match(mapMarker, /strokeWidth=\{2\.75\}/);
assert.match(mapPanel, /RESOLVED: "bg-\[#047857\]"/);

const signIn = source('app/(auth)/sign-in/[[...sign-in]]/page.tsx');
assert.match(signIn, /"Log in"/);

const userActions = source('components/users/user-action-dialogs.tsx');
const createUserDialog = userActions.slice(userActions.indexOf('export function CreateUserDialog'));
assert.match(createUserDialog, /showCloseButton=\{false\}/);

const roster = source('app/(dashboard)/roster/page.tsx');
assert.match(roster, /const \[actionReasons, setActionReasons\]/);
assert.match(roster, /rejectionReason: responderActionReason/);
assert.match(roster, /disabled=\{!responderActionReason\}/);
assert.match(roster, /City \/ Municipality<\/label>/);

const usersRoute = source('app/api/users/route.ts');
const usersGetRoute = usersRoute.slice(usersRoute.indexOf('export async function GET'), usersRoute.indexOf('export async function POST'));
assert.match(usersGetRoute, /currentUserRole !== 'cdrrmo_super_admin'/);
assert.match(usersRoute, /A reason is required when suspending or blocking an account\./);

const proxy = source('proxy.ts');
assert.match(proxy, /pathname\.startsWith\("\/users"\)/);

console.log('CDRRMO UI refinements and User Management access checks passed.');
