import { createContext, createElement, useCallback, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { verifyMobileSession } from '../lib/mobile-auth';
import { shouldResetResponderSession } from '../lib/auth-session-policy';
import { useResponderDutyStore } from '../stores/useResponderDutyStore';
import { useResponderStore } from '../stores/useResponderStore';

const VerificationStatusSchema = z.enum(['pending', 'approved', 'rejected']);
type VerificationStatus = z.infer<typeof VerificationStatusSchema>;
type MobileVerificationStatus = VerificationStatus | 'loading' | 'banned' | 'unauthorized_platform';

// Zustand stores outlive a Supabase auth session in a running Expo process.
// Track the account globally so remounting the root provider does not clear
// a valid in-progress dispatch, while a genuine account switch always removes
// the previous responder's in-memory dispatch UI.
let activeMobileAccountId: string | null = null;
let hasHydratedInitialMobileSession = false;

function reconcileResponderStoreAccount(nextAccountId: string | null, clearTransientDispatch = false) {
  if (
    clearTransientDispatch
    || (activeMobileAccountId && activeMobileAccountId !== nextAccountId)
  ) {
    useResponderStore.getState().clearTransientDispatch();
    useResponderStore.getState().clearReportFormSession();
  }
  activeMobileAccountId = nextAccountId;
}

function useAuthStatusState() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<MobileVerificationStatus>('loading');
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ fullName: string; address: string; barangay?: string; phone?: string; dutyStatus?: string; unitId?: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionVersion, setSessionVersion] = useState(0);
  const verificationRequestRef = useRef(0);
  const currentTokenRef = useRef<string | null>(null);

  const checkVerification = useCallback(async (currentUser: User, currentSession: Session) => {
    const request = ++verificationRequestRef.current;
    const isCurrent = () => request === verificationRequestRef.current
      && currentTokenRef.current === currentSession.access_token;
    if (!currentSession) {
      setVerificationStatus('loading');
      return;
    }

    try {
      const active = await verifyMobileSession(currentSession.access_token);
      if (!isCurrent()) return;
      if (!active) {
        await supabase.auth.signOut({ scope: 'local' });
        // SIGNED_OUT is applied by the single auth subscription. A delayed
        // verification request must not clear a subsequently signed-in user.
        return;
      }

      // Direct Supabase query is more robust than a separate API call for mobile
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('role, verification_status, status, full_name, address, barangay, phone, duty_status, unit_id')
        .eq('id', currentUser.id)
        .single();

      if (!isCurrent()) return;
      if (dbError) throw dbError;
      
      const role = dbUser.role;
      const status = dbUser.verification_status;
      const accountStanding = dbUser.status;

      // Publish the resolved role before applying the platform gate. The
      // unauthorized screen uses this value to distinguish a web-only admin
      // from a mobile account still completing its verification refresh.
      setRole(role);

      // Platform Restriction: Deny Web Admins on Mobile
      if (role === 'cdrrmo_super_admin' || role === 'pacc_admin') {
        setVerificationStatus('unauthorized_platform');
        return;
      }
      
      if (accountStanding === 'SUSPENDED' || accountStanding === 'DEACTIVATED') {
        // Residents need an explicit account-ban prompt, not the document
        // verification rejection flow (which incorrectly offered resubmission).
        setVerificationStatus(role === 'public_user' ? 'banned' : 'rejected');
        return;
      }

      setVerificationStatus(VerificationStatusSchema.parse(status.toLowerCase()));
      
      const userProfile = {
        fullName: dbUser.full_name,
        address: dbUser.address || '',
        barangay: dbUser.barangay || '',
        phone: dbUser.phone || '',
        dutyStatus: dbUser.duty_status || 'OFF_DUTY',
        unitId: dbUser.unit_id || '',
      };
      setProfile(userProfile);
      useResponderDutyStore.getState().setDutyStatus(userProfile.dutyStatus);
      
      // Save profile to local cache for offline use
      SecureStore.setItemAsync(`profile_${currentUser.id}`, JSON.stringify(userProfile)).catch(() => {});
    } catch (error) {
      if (!isCurrent()) return;
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

      // Load cached profile during offline failure
      SecureStore.getItemAsync(`profile_${currentUser.id}`).then((cached) => {
        if (!isCurrent()) return;
        if (cached) {
          try {
            const cachedProfile = JSON.parse(cached);
            setProfile(cachedProfile);
            useResponderDutyStore.getState().setDutyStatus(cachedProfile.dutyStatus);
          } catch (e) {
            setProfile({
              fullName: currentUser.user_metadata?.full_name || 'Resident',
              address: currentUser.user_metadata?.address || '',
              barangay: currentUser.user_metadata?.barangay || '',
              phone: currentUser.user_metadata?.phone || '', dutyStatus: 'OFF_DUTY',
              unitId: currentUser.user_metadata?.unit_id || '',
            });
            useResponderDutyStore.getState().setDutyStatus('OFF_DUTY');
          }
        } else {
          setProfile({
            fullName: currentUser.user_metadata?.full_name || 'Resident',
            address: currentUser.user_metadata?.address || '',
            barangay: currentUser.user_metadata?.barangay || '',
            phone: currentUser.user_metadata?.phone || '', dutyStatus: 'OFF_DUTY',
            unitId: currentUser.user_metadata?.unit_id || '',
          });
          useResponderDutyStore.getState().setDutyStatus('OFF_DUTY');
        }
      }).catch(() => {
        if (!isCurrent()) return;
        setProfile({
          fullName: currentUser.user_metadata?.full_name || 'Resident',
          address: currentUser.user_metadata?.address || '',
          barangay: currentUser.user_metadata?.barangay || '',
          phone: currentUser.user_metadata?.phone || '', dutyStatus: 'OFF_DUTY',
          unitId: currentUser.user_metadata?.unit_id || '',
        });
        useResponderDutyStore.getState().setDutyStatus('OFF_DUTY');
      });
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    let observedAuthEvent = false;
    const applySession = (session: Session | null) => {
      if (disposed) return;
      const nextId = session?.user.id ?? null;
      const accountChanged = activeMobileAccountId !== nextId;
      currentTokenRef.current = session?.access_token ?? null;
      verificationRequestRef.current += 1;
      setSession(session);
      setSessionVersion(version => version + 1);
      setUser(session?.user ?? null);
      reconcileResponderStoreAccount(nextId, shouldResetResponderSession(activeMobileAccountId, nextId, hasHydratedInitialMobileSession));
      hasHydratedInitialMobileSession = true;
      if (accountChanged || !session) {
        setProfile(null);
        setRole(null);
        useResponderDutyStore.getState().setDutyStatus('OFF_DUTY');
        setVerificationStatus('loading');
      }
      if (!session) {
        setIsLoaded(true);
      }
    };
    // One app-owned subscription; screen navigation cannot create another
    // auth check or clear a same-account dispatch on repeated SIGNED_IN events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      observedAuthEvent = true;
      applySession(session);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!observedAuthEvent) applySession(data.session);
    }).catch(err => {
      console.error('[useAuthStatus] Failed to restore session on startup:', err);
      if (!disposed && !observedAuthEvent) setIsLoaded(true);
    });

    return () => {
      disposed = true;
      currentTokenRef.current = null;
      verificationRequestRef.current += 1;
      subscription.unsubscribe();
    };
  }, []);

  // Run outside the Auth callback/lock. Session events only publish state.
  useEffect(() => {
    if (session?.user) void checkVerification(session.user, session);
  }, [session, sessionVersion, checkVerification]);

  // Real-time status synchronizer
  useEffect(() => {
    const accountId = user?.id;
    if (!accountId) return;
    let active = true;

    const channel = supabase
      .channel(`status_sync_${accountId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${accountId}`,
        },
        (payload) => {
          if (!active || activeMobileAccountId !== accountId) return;
          verificationRequestRef.current += 1;
          const newStatus = payload.new.verification_status;
          const newRole = payload.new.role;
          const newAccountStanding = payload.new.status;

          // Platform Restriction: Deny Web Admins on Mobile
          if (newRole === 'cdrrmo_super_admin' || newRole === 'pacc_admin') {
            setVerificationStatus('unauthorized_platform');
            return;
          }

          if (newRole) {
            setRole(newRole);
          }

          if (newAccountStanding === 'SUSPENDED' || newAccountStanding === 'DEACTIVATED') {
            setVerificationStatus(newRole === 'public_user' ? 'banned' : 'rejected');
            return;
          }

          if (newStatus) {
            const parsed = VerificationStatusSchema.safeParse(String(newStatus).toLowerCase());
            if (parsed.success) setVerificationStatus(parsed.data);
          }
          
          if (payload.new.full_name || payload.new.address || payload.new.barangay || payload.new.phone || payload.new.duty_status || payload.new.unit_id) {
            const updatedProfile = {
              fullName: payload.new.full_name || '',
              address: payload.new.address || '',
              barangay: payload.new.barangay || '',
              phone: payload.new.phone || '',
              dutyStatus: payload.new.duty_status || 'OFF_DUTY',
              unitId: payload.new.unit_id || '',
            };
            setProfile(updatedProfile);
            useResponderDutyStore.getState().setDutyStatus(updatedProfile.dutyStatus);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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
    session,
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

const AuthStatusContext = createContext<ReturnType<typeof useAuthStatusState> | null>(null);

export function AuthStatusProvider({ children }: { children: ReactNode }) {
  const value = useAuthStatusState();
  return createElement(AuthStatusContext.Provider, { value }, children);
}

export function useAuthStatus() {
  const value = useContext(AuthStatusContext);
  if (!value) throw new Error('useAuthStatus must be used inside AuthStatusProvider');
  return value;
}
