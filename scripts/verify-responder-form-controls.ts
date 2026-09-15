import assert from 'node:assert/strict';
import {
  sanitizeBloodPressureInput,
  sanitizeBoundedIntegerInput,
  sanitizeDecimalInput,
  sanitizeDigitsInput,
  sanitizePhoneInput,
  validateIncidentReportForSubmission,
  validatePatientCareForm,
  validateTripTicketForm,
} from '../mobile/lib/responder-form-controls';
import { DriverTripTicketPayloadSchema, PatientCareReportPayloadSchema } from '../types/reports';

function check(name: string, assertion: () => void) {
  try {
    assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

check('numeric formatters remove pasted letters and enforce lengths or bounds', () => {
  assert.equal(sanitizeDigitsInput('12 people', 3), '12');
  assert.equal(sanitizeBoundedIntegerInput('999', 100), '999');
  assert.equal(sanitizeDecimalInput('12a.34.56', 4, 2), '12.34');
  assert.equal(sanitizeBloodPressureInput('120 over 80'), '120/80');
  assert.equal(sanitizePhoneInput('09ab17-123-456789'), '09171234567');
});

check('incident report requires dispatch, location, and valid optional vitals', () => {
  assert.equal(validateIncidentReportForSubmission({ activeDispatchId: '', location: '', patients: [] }).valid, false);
  assert.deepEqual(
    validateIncidentReportForSubmission({
      activeDispatchId: 'incident-1',
      location: 'Baliwag',
      patients: [{ bp: '120/80', hr: '80', spo2: '98' }],
    }),
    { valid: true, errors: [] },
  );
  assert.equal(
    validateIncidentReportForSubmission({
      activeDispatchId: 'incident-1',
      location: 'Baliwag',
      patients: [{ bp: '120/', hr: '0', spo2: '101' }],
    }).valid,
    false,
  );
});

check('patient care save requires identity and validates entered clinical numbers', () => {
  assert.equal(validatePatientCareForm({ patientName: ' ', patientAge: '', patientContact: '', gcsPoints: '', lpm: '', painSeverity: '', vitalsLogs: [] }).valid, false);
  assert.equal(validatePatientCareForm({ patientName: 'Patient One', patientAge: '', patientContact: '', gcsPoints: '', lpm: '', painSeverity: '', vitalsLogs: [] }).valid, true);
  assert.equal(validatePatientCareForm({ patientName: 'Patient One', patientAge: '131', patientContact: '09171234567', gcsPoints: '16', lpm: '2.5', painSeverity: '11', vitalsLogs: [] }).valid, false);
});

check('trip ticket requires identifying fields and validates optional quantities', () => {
  assert.equal(validateTripTicketForm({ driverName: '', date: '', vehiclePlate: '', driverPhone: '', quantities: [] }).valid, false);
  assert.equal(validateTripTicketForm({ driverName: 'Driver', date: '2026-09-15', vehiclePlate: 'SGG-123', driverPhone: '', quantities: ['', '12.5'] }).valid, true);
  assert.equal(validateTripTicketForm({ driverName: 'Driver', date: '2026-09-15', vehiclePlate: 'SGG-123', driverPhone: '0917', quantities: ['..'] }).valid, false);
});

check('API schemas accept legacy blanks but reject malformed numeric fields', () => {
  assert.equal(PatientCareReportPayloadSchema.safeParse({ patientName: 'Patient', patientContact: '', patientAge: null, gcsPoints: null }).success, true);
  assert.equal(PatientCareReportPayloadSchema.safeParse({ patientName: '   ' }).success, false);
  assert.equal(PatientCareReportPayloadSchema.safeParse({ patientName: 'Patient', patientContact: '0917', gcsPoints: 18 }).success, false);
  assert.equal(PatientCareReportPayloadSchema.safeParse({ patientName: 'Patient', vitalsLogs: [{ bp: '120x80', o2_sat: '110' }] }).success, false);
  assert.equal(DriverTripTicketPayloadSchema.safeParse({ date: '2026-09-16', driverName: 'Driver', vehiclePlate: 'SGG-123', tripLog: { distance: '' } }).success, true);
  assert.equal(DriverTripTicketPayloadSchema.safeParse({ date: '2026-09-16', driverName: 'Driver', vehiclePlate: 'SGG-123', tripLog: { distance: '12km' } }).success, false);
  assert.equal(DriverTripTicketPayloadSchema.safeParse({ date: '', driverName: '', vehiclePlate: '' }).success, false);
});
