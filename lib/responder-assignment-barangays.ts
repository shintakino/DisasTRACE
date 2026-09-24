/** Official City of Baliwag Barangays that may be assigned to a responder. */
export const RESPONDER_ASSIGNMENT_BARANGAYS = [
  'Bagong Nayon', 'Barangca', 'Calantipay', 'Catulinan', 'Concepcion',
  'Hinukay', 'Makinabang', 'Matang Tubig', 'Pagala', 'Paitan', 'Piel',
  'Pinagbarilan', 'Poblacion', 'Sabang', 'San Jose', 'San Roque', 'Subic',
  'Sulivan', 'Tangos', 'Tarcan', 'Tiaong', 'Tibag', 'Tilapayong',
] as const;

const responderAssignmentBarangaySet = new Set<string>(RESPONDER_ASSIGNMENT_BARANGAYS);

export function isResponderAssignmentBarangay(value: string | undefined): boolean {
  return value !== undefined && responderAssignmentBarangaySet.has(value);
}
