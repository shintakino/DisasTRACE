import * as React from 'react';
import { Text, TextInput, TouchableOpacity, View, ScrollView, Alert } from 'react-native';
import { useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '@/services/api';

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [role, setRole] = React.useState<'public_user' | 'ambulance_responder'>('public_user');
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const loadRole = async () => {
      try {
        const savedRole = await SecureStore.getItemAsync('selected_role');
        if (savedRole === 'resident') {
          setRole('public_user');
        } else if (savedRole === 'responder') {
          setRole('ambulance_responder');
        }
      } catch (error) {
        console.error('Error loading role from SecureStore', error);
      }
    };
    loadRole();
  }, []);

  const onSignUpPress = async () => {
    if (!isLoaded) {
      return;
    }
    setLoading(true);

    try {
      await signUp.create({
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

      setPendingVerification(true);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert("Error", err.errors?.[0]?.message || "An error occurred during sign up");
    } finally {
      setLoading(false);
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) {
      return;
    }
    setLoading(true);

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      await setActive({ session: completeSignUp.createdSessionId });
      
      // Note: Role is sent to backend which will update Clerk's publicMetadata
      try {
        // We might need to wait a tiny bit for the session to be fully propagated
        // or just use the createdSessionId to get a token if we had a helper for that.
        // For now, let's try calling the backend.
        await apiClient.post('/users/me', { role });
      } catch (error) {
        console.error("Failed to sync role with backend", error);
        // We don't block the user if this fails, they can still sign in
      }
      
      router.replace('/');
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert("Error", err.errors?.[0]?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6">
        {!pendingVerification ? (
          <View className="flex-1 justify-center py-10">
            <Text className="text-3xl font-bold text-primary mb-2" style={{ fontFamily: 'Inter_700Bold' }}>
              Create Account
            </Text>
            <Text className="text-gray-500 mb-10" style={{ fontFamily: 'Inter_400Regular' }}>
              Join DisasTRACE to stay safe and informed
            </Text>

            <View className="gap-y-6">
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-3" style={{ fontFamily: 'Inter_600SemiBold' }}>
                  I am a...
                </Text>
                <View className="flex-row gap-x-4">
                  <TouchableOpacity
                    onPress={() => setRole('public_user')}
                    className={`flex-1 py-4 rounded-xl border items-center ${
                      role === 'public_user' ? 'bg-primary border-primary' : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text className={`font-semibold ${role === 'public_user' ? 'text-white' : 'text-gray-700'}`} style={{ fontFamily: 'Inter_600SemiBold' }}>
                      Public User
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setRole('ambulance_responder')}
                    className={`flex-1 py-4 rounded-xl border items-center ${
                      role === 'ambulance_responder' ? 'bg-primary border-primary' : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text className={`font-semibold ${role === 'ambulance_responder' ? 'text-white' : 'text-gray-700'}`} style={{ fontFamily: 'Inter_600SemiBold' }}>
                      Responder
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Inter_600SemiBold' }}>
                  Email Address
                </Text>
                <TextInput
                  autoCapitalize="none"
                  value={emailAddress}
                  placeholder="Email..."
                  placeholderTextColor="#9CA3AF"
                  onChangeText={(email) => setEmailAddress(email)}
                  className="bg-white px-4 py-3 rounded-lg border border-gray-200 text-gray-900"
                  style={{ fontFamily: 'Inter_400Regular' }}
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Inter_600SemiBold' }}>
                  Password
                </Text>
                <TextInput
                  value={password}
                  placeholder="Password..."
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={true}
                  onChangeText={(pass) => setPassword(pass)}
                  className="bg-white px-4 py-3 rounded-lg border border-gray-200 text-gray-900"
                  style={{ fontFamily: 'Inter_400Regular' }}
                />
              </View>

              <TouchableOpacity
                onPress={onSignUpPress}
                disabled={loading}
                className={`bg-primary py-4 rounded-xl items-center mt-4 ${loading ? 'opacity-70' : ''}`}
              >
                <Text className="text-white font-bold text-lg" style={{ fontFamily: 'Inter_700Bold' }}>
                  {loading ? "Creating Account..." : "Sign Up"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="flex-1 justify-center">
            <Text className="text-3xl font-bold text-primary mb-2" style={{ fontFamily: 'Inter_700Bold' }}>
              Verify Email
            </Text>
            <Text className="text-gray-500 mb-10" style={{ fontFamily: 'Inter_400Regular' }}>
              We've sent a 6-digit code to {emailAddress}
            </Text>

            <View>
              <TextInput
                value={code}
                placeholder="000000"
                placeholderTextColor="#9CA3AF"
                onChangeText={(code) => setCode(code)}
                className="bg-white px-4 py-4 rounded-xl border border-gray-200 text-gray-900 mb-6 text-center text-3xl font-bold tracking-widest"
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                onPress={onPressVerify}
                disabled={loading}
                className={`bg-primary py-4 rounded-xl items-center ${loading ? 'opacity-70' : ''}`}
              >
                <Text className="text-white font-bold text-lg" style={{ fontFamily: 'Inter_700Bold' }}>
                  {loading ? "Verifying..." : "Verify"}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setPendingVerification(false)}
                className="mt-6 items-center"
              >
                <Text className="text-primary font-semibold" style={{ fontFamily: 'Inter_600SemiBold' }}>
                  Back to Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
