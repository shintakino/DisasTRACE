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

export const REPORT_DATE_PRESET_LABELS = {
  all: "All Time",
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  this_year: "This Year",
} as const;
