import { useState, useEffect } from 'react';
import axios from 'axios';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

const MOBILE_API_URL = process.env.EXPO_PUBLIC_MOBILE_API_URL;

const VerificationStatusSchema = z.enum(['pending', 'approved', 'rejected']);
type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export function useAuthStatus() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | 'loading' | 'unauthorized_platform'>('loading');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkVerification = async (currentUser: User, currentSession: Session) => {
    if (!currentSession) {
      setVerificationStatus('loading');
      return;
    }

    try {
      const token = currentSession.access_token;
      // Ensure we don't have double /api if the env var already includes it
      const baseUrl = MOBILE_API_URL?.endsWith('/api') 
        ? MOBILE_API_URL.slice(0, -4) 
        : MOBILE_API_URL;

      const response = await axios.get(`${baseUrl}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const role = response.data.role;
      const status = response.data.verification_status;

      // Platform Restriction: Deny Web Admins on Mobile
      if (role === 'cdrrmo_super_admin' || role === 'pacc_admin') {
        setVerificationStatus('unauthorized_platform');
        return;
      }

      setVerificationStatus(VerificationStatusSchema.parse(status.toLowerCase()));
    } catch (error) {
      console.error('Error checking verification status:', error);
      
      // Fallback to JWT metadata if API fails
      const role = currentUser.app_metadata?.role;
      if (role === 'cdrrmo_super_admin' || role === 'pacc_admin') {
        setVerificationStatus('unauthorized_platform');
        return;
      }

      const metaStatus = currentUser.app_metadata?.verification_status as VerificationStatus | undefined;
      setVerificationStatus(metaStatus || 'pending');
    }
  };

  useEffect(() => {
    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkVerification(session.user, session);
      } else {
        setIsLoaded(true);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkVerification(session.user, session);
      } else {
        setVerificationStatus('loading');
        setIsLoaded(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Update isLoaded once verification check completes
  useEffect(() => {
    if (user && verificationStatus !== 'loading') {
      setIsLoaded(true);
    }
  }, [user, verificationStatus]);

  return {
    isSignedIn: !!user,
    isLoaded,
    verificationStatus,
    user,
    refreshStatus: async () => {
      if (user && session) {
        setIsRefreshing(true);
        await checkVerification(user, session);
        setIsRefreshing(false);
      }
    },
    isRefreshing,
  };
}
