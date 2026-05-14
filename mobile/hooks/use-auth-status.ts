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
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | 'loading'>('loading');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkVerification = async () => {
    if (!isSignedIn || !user) {
      setVerificationStatus('loading');
      return;
    }

    try {
      const token = await getToken();
      const response = await axios.get(`${MOBILE_API_URL}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const status = VerificationStatusSchema.parse(response.data.verification_status);
      setVerificationStatus(status);
    } catch (error) {
      console.error('Error checking verification status:', error);
      // Fallback to metadata
      const metaStatus = user.publicMetadata.verification_status as VerificationStatus;
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
