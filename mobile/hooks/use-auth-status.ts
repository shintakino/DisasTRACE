import { useUser, useAuth } from '@clerk/expo';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { z } from 'zod';

const MOBILE_API_URL = process.env.EXPO_PUBLIC_MOBILE_API_URL;

const VerificationStatusSchema = z.enum(['pending', 'approved', 'rejected']);
type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export function useAuthStatus() {
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | 'loading' | 'unauthorized_platform'>('loading');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkVerification = async () => {
    if (!isSignedIn || !user) {
      setVerificationStatus('loading');
      return;
    }

    try {
      const token = await getToken();
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

      setVerificationStatus(VerificationStatusSchema.parse(status));
    } catch (error) {
      console.error('Error checking verification status:', error);
      
      // Fallback to metadata
      const role = user.publicMetadata.role;
      if (role === 'cdrrmo_super_admin' || role === 'pacc_admin') {
        setVerificationStatus('unauthorized_platform');
        return;
      }

      const metaStatus = user.publicMetadata.verification_status as VerificationStatus | undefined;
      setVerificationStatus(metaStatus || 'pending');
    }
  };

  useEffect(() => {
    if (isUserLoaded && isSignedIn) {
      checkVerification();
    } else if (isUserLoaded && !isSignedIn) {
      setVerificationStatus('loading');
    }
  }, [isSignedIn, isUserLoaded, user?.id]);

  return {
    isSignedIn,
    isLoaded: isUserLoaded && (isSignedIn ? verificationStatus !== 'loading' : true),
    verificationStatus,
    user,
    refreshStatus: async () => {
      setIsRefreshing(true);
      await checkVerification();
      setIsRefreshing(false);
    },
    isRefreshing,
  };
}
