import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity } from 'react-native';
import { signOutFromMobile } from '../../lib/mobile-auth';
import { Clock, ShieldAlert } from 'lucide-react-native';
import { getGovernmentIDStatus } from '../../lib/storage';
import { IdentityDocumentUploader } from '../../components/auth/IdentityDocumentUploader';

export default function PendingVerificationScreen() {
  const [hasDocument, setHasDocument] = useState<boolean | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [isCheckingDocument, setIsCheckingDocument] = useState(true);
  const [documentLookupFailed, setDocumentLookupFailed] = useState(false);

  const loadDocumentStatus = useCallback(async () => {
    setIsCheckingDocument(true);
    setDocumentLookupFailed(false);
    try {
      const result = await getGovernmentIDStatus();
      setHasDocument(result.hasDocument);
    } catch {
      // Avoid claiming that a document is under review when the state could
      // not be confirmed; give the applicant an explicit retry instead.
      setHasDocument(null);
      setDocumentLookupFailed(true);
    } finally {
      setIsCheckingDocument(false);
    }
  }, []);

  useEffect(() => {
    void loadDocumentStatus();
  }, [loadDocumentStatus]);

  const handleSignOut = async () => {
    await signOutFromMobile();
  };

  if (showUploader) {
    return <IdentityDocumentUploader onComplete={() => { setShowUploader(false); setHasDocument(true); }} onCancel={() => setShowUploader(false)} />;
  }

  return (
    <View className="flex-1 bg-background p-6 items-center justify-center">
      <View className="bg-warning/10 p-8 rounded-full mb-6">
        <Clock color="#F97316" size={80} />
      </View>
      
      <Text className="text-3xl font-bold text-primary text-center">
        Verification Pending
      </Text>
      
      <Text className="text-dark-grey text-center mt-4 text-lg">
        {hasDocument === false
          ? 'Complete your ID verification so CDRRMO Super Admin can begin reviewing your registration.'
          : documentLookupFailed
            ? 'We could not confirm your ID-verification status. Please retry when you have a connection.'
          : 'CDRRMO Super Admin is reviewing your registration and identity document. This process typically takes 24-48 hours.'}
      </Text>

      {hasDocument === false ? (
        <TouchableOpacity onPress={() => setShowUploader(true)} className="bg-primary mt-8 p-4 w-full rounded-button items-center justify-center min-h-[56px]">
          <Text className="text-white font-bold text-lg">Upload Identity Document</Text>
        </TouchableOpacity>
      ) : isCheckingDocument ? <ActivityIndicator className="mt-8" color="#1E3A8A" /> : documentLookupFailed ? (
        <TouchableOpacity onPress={() => void loadDocumentStatus()} className="mt-8 p-4 w-full border border-primary rounded-button items-center justify-center min-h-[56px]">
          <Text className="text-primary font-bold text-lg">Retry Verification Check</Text>
        </TouchableOpacity>
      ) : null}

      <View className="bg-surface p-6 rounded-card mt-10 w-full border border-gray-100 shadow-sm">
        <View className="flex-row items-center mb-4">
          <ShieldAlert color="#F97316" size={24} />
          <Text className="text-primary font-bold ml-2 text-lg">What happens next?</Text>
        </View>
        <Text className="text-dark-grey leading-6">
          {hasDocument === false
            ? "1. Upload your government-issued ID.\n2. CDRRMO Super Admin reviews your registration.\n3. You'll receive a notification after approval."
            : "1. CDRRMO Super Admin reviews your identity documents.\n2. You'll receive a notification once approved.\n3. You can then access the full features of DisasTRACE."}
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleSignOut}
        className="mt-12 p-4 w-full border border-primary rounded-button items-center"
      >
        <Text className="text-primary font-bold text-lg">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
