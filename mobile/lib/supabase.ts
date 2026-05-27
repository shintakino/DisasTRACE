import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase Environment Variables');
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
    writeLock = writeLock.then(async () => {
      // If the value is too large for SecureStore (> 2048 bytes)
      if (Platform.OS === 'android' && value.length > 2048) {
        console.warn(`[Storage] Session size (${value.length} bytes) exceeds SecureStore limit. Storing truncated session is not possible.`);
      }
      await SecureStore.setItemAsync(key, value);
    }).catch(console.error) as Promise<void>;
    return writeLock;
  },
  removeItem: async (key: string) => {
    writeLock = writeLock.then(async () => {
      await SecureStore.deleteItemAsync(key);
    }).catch(console.error) as Promise<void>;
    return writeLock;
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
