export const STATUS_LOG_FILTER_LABELS = {
  all: "All",
  DISPATCHED: "Dispatched",
  STANDBY: "Standby",
  "ON-SCENE": "On Scene",
  "OFF-DUTY": "Off Duty",
} as const;

export const OPERATIONAL_ROLE_FILTER_LABELS = {
  all: "All",
  cdrrmo_super_admin: "Super Admin",
  pacc_admin: "PACC Admin",
  ambulance_responder: "Responder",
  public_user: "Public User",
} as const;

export const ACCOUNT_STATUS_FILTER_LABELS = {
  all: "All",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  DEACTIVATED: "Deactivated",
  PENDING: "Pending",
} as const;

export const USER_VERIFICATION_STATE_LABELS = {
  NOT_REQUIRED: "Not Required",
  AWAITING_ID: "Awaiting ID",
  READY_FOR_APPROVAL: "Ready for Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
  DEACTIVATED: "Deactivated",
} as const;

export const REPORT_DATE_PRESET_LABELS = {
  all: "All Time",
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  this_year: "This Year",
} as const;
