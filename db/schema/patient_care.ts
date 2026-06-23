import { pgTable, text, varchar, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { incidents } from './incidents';

export const patientCareReports = pgTable('patient_care_reports', {
  id: varchar('id', { length: 255 }).primaryKey(), // e.g. PCR-2026-0047-1
  incidentId: varchar('incident_id', { length: 255 }).references(() => incidents.id, { onDelete: 'cascade' }).notNull(),
  patientName: varchar('patient_name', { length: 255 }),
  patientAddress: text('patient_address'),
  patientContact: varchar('patient_contact', { length: 50 }),
  patientAge: integer('patient_age'),
  patientGender: varchar('patient_gender', { length: 50 }),
  dispatchInfo: jsonb('dispatch_info'), // Date, Unit, Head Quarters/Scene/Hospital Departure/Arrival times
  emergencyType: jsonb('emergency_type'), // Medical, Trauma, Transfer Incident, person available upon arrival
  incidentInfo: jsonb('incident_info'), // Site of incident, Chief complaints
  initialAssessment: jsonb('initial_assessment'), // LOC, Circulation, Airway, Trachea, Spinal Injury, Bleeding, Control
  vitalsLogs: jsonb('vitals_logs'), // Array of logs (time, bp, pr, o2_sat, rr, temp, pupil, skin, pain)
  sampleHistory: jsonb('sample_history'), // Allergies, Medications, Past Medical History, Last Oral Intake, Events leading to injury
  traumaMarkers: jsonb('trauma_markers'), // Body diagram injury coordinates/regions
  narrativeReport: text('narrative_report'), // Multiline narrative text
  handoffSignatures: jsonb('handoff_signatures'), // PCR Accomplished by, Receiving Hospital, Referred to, Receiving Physician details
  liabilityRelease: jsonb('liability_release'), // Release of liability (refusal of treatment/transport text and signatures)
  respondingTeam: jsonb('responding_team'), // Team leader, team members, driver
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const driverTripTickets = pgTable('driver_trip_tickets', {
  id: varchar('id', { length: 255 }).primaryKey(), // e.g. DTT-2026-0047
  incidentId: varchar('incident_id', { length: 255 }).references(() => incidents.id, { onDelete: 'cascade' }).notNull(),
  driverName: varchar('driver_name', { length: 255 }),
  vehiclePlate: varchar('vehicle_plate', { length: 50 }),
  passengerName: varchar('passenger_name', { length: 255 }),
  placesVisited: text('places_visited'),
  purpose: text('purpose'),
  tripLog: jsonb('trip_log'), // departure, arrival times
  gasolineConsumed: jsonb('gasoline_consumed'), // balance, issued, purchase, total, deduction, balance end
  lubricants: jsonb('lubricants'), // car oil, lube oil, grease
  speedometer: jsonb('speedometer'), // beginning reading, remarks
  remarks: text('remarks'),
  signatures: jsonb('signatures'), // driver signature, authorized rep signature
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
