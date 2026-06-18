import { useState, useEffect } from 'react';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

const VerificationStatusSchema = z.enum(['pending', 'approved', 'rejected']);
type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export function useAuthStatus() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | 'loading' | 'unauthorized_platform'>('loading');
  const [role, setRole] = useState<string>('public_user');
  const [profile, setProfile] = useState<{ fullName: string; address: string; dutyStatus?: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkVerification = async (currentUser: User, currentSession: Session) => {
    if (!currentSession) {
      setVerificationStatus('loading');
      return;
    }

    try {
      // Direct Supabase query is more robust than a separate API call for mobile
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('role, verification_status, full_name, address, duty_status')
        .eq('id', currentUser.id)
        .single();

      if (dbError) throw dbError;
      
      const role = dbUser.role;
      const status = dbUser.verification_status;

      // Platform Restriction: Deny Web Admins on Mobile
      if (role === 'cdrrmo_super_admin' || role === 'pacc_admin') {
        setVerificationStatus('unauthorized_platform');
        return;
      }

      setRole(role);
      setVerificationStatus(VerificationStatusSchema.parse(status.toLowerCase()));
      setProfile({
        fullName: dbUser.full_name,
        address: dbUser.address || '',
        dutyStatus: dbUser.duty_status || 'OFF_DUTY',
      });
    } catch (error) {
      console.error('Error checking verification status via Supabase:', error);
      
      // Secondary fallback to JWT metadata if direct query fails
      const role = currentUser.app_metadata?.role;
      if (role) setRole(role);
      
      if (role === 'cdrrmo_super_admin' || role === 'pacc_admin') {
        setVerificationStatus('unauthorized_platform');
        return;
      }

      // Check if we can preserve the current verification status if it is already approved
      // to prevent random resets due to transient offline query failures
      setVerificationStatus((prev) => {
        if (prev === 'approved') return 'approved';
        
        // Otherwise, inspect app_metadata status
        const appStatus = currentUser.app_metadata?.status;
        if (appStatus === 'ACTIVE' || appStatus === 'active') {
          return 'approved';
        }
        
        const metaStatus = currentUser.app_metadata?.verification_status;
        const normalizedStatus = typeof metaStatus === 'string'
          ? metaStatus.toLowerCase() as VerificationStatus
          : undefined;
          
        return normalizedStatus || 'pending';
      });
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
    }).catch(err => {
      console.error('[useAuthStatus] Failed to restore session on startup:', err);
      setIsLoaded(true);
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

  // Real-time status synchronizer
  useEffect(() => {
    if (!user) return;

    // Use a unique channel name per hook instance to avoid collisions
    // when multiple components use useAuthStatus()
    const instanceId = Math.random().toString(36).substring(7);
    const channel = supabase
      .channel(`status_sync_${user.id}_${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Real-time profile update received:', payload.new);
          const newStatus = payload.new.verification_status;
          const newRole = payload.new.role;

          // Platform Restriction: Deny Web Admins on Mobile
          if (newRole === 'cdrrmo_super_admin' || newRole === 'pacc_admin') {
            setVerificationStatus('unauthorized_platform');
            return;
          }

          if (newRole) {
            setRole(newRole);
          }

          if (newStatus) {
            setVerificationStatus(VerificationStatusSchema.parse(newStatus.toLowerCase()));
          }
          
          if (payload.new.full_name || payload.new.address || payload.new.duty_status) {
            setProfile({
              fullName: payload.new.full_name || '',
              address: payload.new.address || '',
              dutyStatus: payload.new.duty_status || 'OFF_DUTY',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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
    role,
    profile,
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
