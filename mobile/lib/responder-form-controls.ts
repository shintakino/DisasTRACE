export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

const isBlank = (value: unknown) => typeof value !== 'string' || value.trim().length === 0;

export function sanitizeDigitsInput(value: string, maxLength = Number.POSITIVE_INFINITY): string {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

export function sanitizeBoundedIntegerInput(value: string, max: number, maxLength = String(max).length): string {
  return sanitizeDigitsInput(value, maxLength);
}

export function sanitizeDecimalInput(value: string, maxIntegerDigits = 6, maxFractionDigits = 2): string {
  const filtered = value.replace(/[^0-9.]/g, '');
  const [integerPart = '', ...fractionParts] = filtered.split('.');
  const integer = integerPart.slice(0, maxIntegerDigits);
  if (fractionParts.length === 0) return integer;
  const fraction = fractionParts.join('').slice(0, maxFractionDigits);
  return `${integer || '0'}.${fraction}`;
}

export function sanitizeBloodPressureInput(value: string): string {
  const normalized = value.replace(/\bover\b/gi, '/').replace(/[-\\]/g, '/');
  const filtered = normalized.replace(/[^0-9/]/g, '');
  const [systolic = '', ...diastolicParts] = filtered.split('/');
  const systolicDigits = systolic.slice(0, 3);
  if (diastolicParts.length === 0) return systolicDigits;
  return `${systolicDigits}/${diastolicParts.join('').slice(0, 3)}`;
}

export function sanitizePhoneInput(value: string): string {
  return sanitizeDigitsInput(value, 11);
}

export function isValidOptionalPhone(value: unknown): boolean {
  return isBlank(value) || /^09\d{9}$/.test(String(value));
}

export function isValidOptionalInteger(value: unknown, min: number, max: number): boolean {
  if (isBlank(value)) return true;
  const text = String(value);
  if (!/^\d+$/.test(text)) return false;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max;
}

export function isValidOptionalDecimal(value: unknown, min = 0, max = 999999.99): boolean {
  if (isBlank(value)) return true;
  const text = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return false;
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max;
}

export function isValidOptionalBloodPressure(value: unknown): boolean {
  if (isBlank(value)) return true;
  const match = /^(\d{1,3})\/(\d{1,3})$/.exec(String(value));
  if (!match) return false;
  const systolic = Number(match[1]);
  const diastolic = Number(match[2]);
  return systolic >= 1 && systolic <= 300 && diastolic >= 1 && diastolic <= 300;
}

type IncidentPatientValues = {
  bp?: string | null;
  hr?: string | null;
  spo2?: string | null;
};

export function validateIncidentReportForSubmission(input: {
  activeDispatchId?: string | null;
  location?: string | null;
  patients?: IncidentPatientValues[] | null;
}): ValidationResult {
  const errors: string[] = [];
  if (!input.activeDispatchId?.trim()) errors.push('An active dispatch is required.');
  if (!input.location?.trim()) errors.push('Incident location is required.');
  if (!input.patients?.length) errors.push('At least one patient is required.');

  input.patients?.forEach((patient, index) => {
    if (!isValidOptionalBloodPressure(patient.bp)) errors.push(`Patient ${index + 1}: enter blood pressure as 120/80.`);
    if (!isValidOptionalInteger(patient.hr, 1, 300)) errors.push(`Patient ${index + 1}: heart rate must be 1-300.`);
    if (!isValidOptionalInteger(patient.spo2, 1, 100)) errors.push(`Patient ${index + 1}: SpO2 must be 1-100.`);
  });

  return { valid: errors.length === 0, errors };
}

type VitalValues = {
  bp?: string | null;
  pr?: string | null;
  o2_sat?: string | null;
  rr?: string | null;
  temp?: string | null;
};

export function validatePatientCareForm(input: {
  patientName?: string | null;
  patientAge?: string | null;
  patientContact?: string | null;
  gcsPoints?: string | null;
  lpm?: string | null;
  painSeverity?: string | null;
  vitalsLogs?: VitalValues[] | null;
}): ValidationResult {
  const errors: string[] = [];
  if (!input.patientName?.trim()) errors.push('Patient name is required. Use “Unknown” when identity is not available.');
  if (!isValidOptionalInteger(input.patientAge, 0, 130)) errors.push('Age must be between 0 and 130.');
  if (!isValidOptionalPhone(input.patientContact)) errors.push('Contact number must be an 11-digit Philippine mobile number starting with 09.');
  if (!isValidOptionalInteger(input.gcsPoints, 3, 15)) errors.push('GCS must be between 3 and 15.');
  if (!isValidOptionalDecimal(input.lpm, 0, 25)) errors.push('Oxygen flow must be between 0 and 25 LPM.');
  if (!isValidOptionalInteger(input.painSeverity, 0, 10)) errors.push('Pain severity must be between 0 and 10.');

  input.vitalsLogs?.forEach((log, index) => {
    if (!isValidOptionalBloodPressure(log.bp)) errors.push(`Vital log ${index + 1}: enter blood pressure as 120/80.`);
    if (!isValidOptionalInteger(log.pr, 1, 300)) errors.push(`Vital log ${index + 1}: pulse rate must be 1-300.`);
    if (!isValidOptionalInteger(log.o2_sat, 1, 100)) errors.push(`Vital log ${index + 1}: O2 saturation must be 1-100.`);
    if (!isValidOptionalInteger(log.rr, 1, 200)) errors.push(`Vital log ${index + 1}: respiratory rate must be 1-200.`);
    if (!isValidOptionalDecimal(log.temp, 20, 50)) errors.push(`Vital log ${index + 1}: temperature must be 20-50 °C.`);
  });

  return { valid: errors.length === 0, errors };
}

export function validateTripTicketForm(input: {
  driverName?: string | null;
  date?: string | null;
  vehiclePlate?: string | null;
  driverPhone?: string | null;
  quantities?: Array<string | null | undefined> | null;
}): ValidationResult {
  const errors: string[] = [];
  if (!input.driverName?.trim()) errors.push('Driver name is required.');
  if (!input.date?.trim()) errors.push('Date of travel is required.');
  if (!input.vehiclePlate?.trim()) errors.push('Vehicle plate number is required.');
  if (!isValidOptionalPhone(input.driverPhone)) errors.push('Driver phone must be an 11-digit Philippine mobile number starting with 09.');
  if (input.quantities?.some((value) => !isValidOptionalDecimal(value))) {
    errors.push('Distance, fuel, lubricant, and speedometer values must be valid non-negative numbers.');
  }
  return { valid: errors.length === 0, errors };
}
