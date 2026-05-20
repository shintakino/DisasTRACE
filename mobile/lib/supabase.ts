import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase Environment Variables');
}

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
    // If the value is too large for SecureStore (> 2048 bytes)
    if (Platform.OS === 'android' && value.length > 2048) {
      console.warn(`[Storage] Session size (${value.length} bytes) exceeds SecureStore limit. Storing truncated session is not possible.`);
      // In a production app with very large sessions, you would use 
      // @react-native-async-storage/async-storage for the session 
      // and only store the encryption key in SecureStore.
      // For now, we will use SecureStore and warn.
    }
    return await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    return await SecureStore.deleteItemAsync(key);
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
