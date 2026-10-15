import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-key') {
  console.error('CRITICAL: Missing or invalid Supabase Environment Variables in mobile/.env');
}

// Queue to prevent concurrent SecureStore operations on Android which cause "Another write batch..." errors
let writeLock = Promise.resolve();

/**
 * Custom Storage Adapter for Supabase Auth.
 * 
 * SecureStore has a 2048-byte limit on Android. 
 * Supabase sessions can exceed this if they contain many claims or large metadata.
 */
const LargeSecureStoreAdapter = {
  getItem: async (key: string) => {
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    const operation = writeLock.then(async () => {
      // If the value is too large for SecureStore (> 2048 bytes)
      if (Platform.OS === 'android' && value.length > 2048) {
        console.warn(`[Storage] Session size (${value.length} bytes) exceeds SecureStore limit. Storing truncated session is not possible.`);
      }
      await SecureStore.setItemAsync(key, value);
    });
    // Keep the queue usable after a failed write, but return the original
    // operation so Auth cannot report success when its PKCE verifier was not
    // actually persisted.
    writeLock = operation.catch(() => undefined);
    return operation;
  },
  removeItem: async (key: string) => {
    const operation = writeLock.then(async () => {
      await SecureStore.deleteItemAsync(key);
    });
    writeLock = operation.catch(() => undefined);
    return operation;
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: LargeSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Keep password recovery isolated from the primary auth client. Enabling PKCE
// globally would also change sign-up confirmation links; this client gives the
// recovery flow its own encrypted verifier/session namespace instead.
export const passwordRecoverySupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: LargeSecureStoreAdapter,
    storageKey: 'disastrace-mobile-password-recovery',
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
