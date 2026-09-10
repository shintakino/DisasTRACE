import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_MOBILE_API_URL || 'http://192.168.1.8:3000/api';

export type BaliwagLocation = {
  city: 'Baliwag City';
  barangay: string;
  barangayPsgcCode: string;
};

function displayBarangayName(barangay: string) {
  const value = barangay.trim();
  // Registration values are historically uppercase, while official boundary
  // values already carry their canonical capitalization.
  if (value !== value.toUpperCase()) return value;
  return value.toLocaleLowerCase('en-PH').replace(/(^|[\s-])(\p{L})/gu, (_match, prefix: string, letter: string) => (
    `${prefix}${letter.toLocaleUpperCase('en-PH')}`
  ));
}

export function formatBaliwagLocation(barangay: string | null | undefined) {
  return barangay?.trim() ? `${displayBarangayName(barangay)}, Baliwag City` : null;
}

export async function resolveBaliwagLocation(latitude: number, longitude: number): Promise<BaliwagLocation | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${API_URL}/location/barangay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ latitude, longitude }),
  });
  const payload = await response.json() as {
    data?: { city: 'Baliwag City' | null; barangay: string | null; barangayPsgcCode: string | null };
  };
  if (!response.ok) throw new Error('Official barangay lookup failed');
  if (!payload.data?.city || !payload.data.barangay || !payload.data.barangayPsgcCode) return null;
  return {
    city: payload.data.city,
    barangay: payload.data.barangay,
    barangayPsgcCode: payload.data.barangayPsgcCode,
  };
}
