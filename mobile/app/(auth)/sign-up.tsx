import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSignUp, useClerk } from '@clerk/expo';
import { useRouter, Link, useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { UserPlus, User, ShieldCheck, Ambulance } from 'lucide-react-native';

const SignUpSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(['public_user', 'ambulance_responder']),
});

const RoleSchema = z.enum(['public_user', 'ambulance_responder']).optional();

export default function SignUpScreen() {
  const { signUp, fetchStatus } = useSignUp();
  const { loaded: isLoaded } = useClerk();
  const router = useRouter();
  const params = useLocalSearchParams<{ role: string }>();
  
  const roleResult = RoleSchema.safeParse(params.role);
  const initialRole = roleResult.success ? roleResult.data : 'public_user';

  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [role, setRole] = React.useState<'public_user' | 'ambulance_responder'>(initialRole as any);
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSignUpPress = async () => {
    if (!isLoaded || !signUp) return;
    setLoading(true);
    setError(null);

    try {
      const result = SignUpSchema.safeParse({ fullName, email, password, role });
      if (!result.success) {
        setError(result.error.issues[0].message);
        setLoading(false);
        return;
      }

      const { error: signUpError } = await signUp.create({
        emailAddress: email,
        password,
        unsafeMetadata: {
          fullName,
          role,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded || !signUp) return;
    setLoading(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (result.status === 'complete') {
        router.replace('/');
      } else {
        setError(`Sign up status: ${result.status}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const isResponder = role === 'ambulance_responder';

  if (pendingVerification) {
    return (
      <View className="flex-1 bg-background p-6 justify-center">
        <View className="items-center mb-8">
          <ShieldCheck color={isResponder ? '#EF4444' : '#1E3A8A'} size={60} />
          <Text className={`text-2xl font-bold mt-4 ${isResponder ? 'text-secondary' : 'text-primary'}`}>Verify your email</Text>
          <Text className="text-dark-grey text-center mt-2">
            We've sent a 6-digit code to {email}
          </Text>
        </View>

        <TextInput
          value={code}
          placeholder="Enter 6-digit code"
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          className="bg-surface p-4 rounded-input border border-gray-200 text-center text-2xl font-bold tracking-widest"
        />

        <TouchableOpacity
          onPress={onPressVerify}
          disabled={loading}
          className={`${isResponder ? 'bg-secondary' : 'bg-primary'} mt-6 p-4 rounded-button items-center ${loading ? 'opacity-70' : ''}`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Verify Email</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background p-6" showsVerticalScrollIndicator={false}>
      <View className="py-10">
        <View className="items-center mb-10">
          <View className={`${isResponder ? 'bg-secondary' : 'bg-primary'} w-16 h-16 rounded-full items-center justify-center mb-4`}>
            {isResponder ? (
              <Ambulance color="white" size={32} />
            ) : (
              <UserPlus color="white" size={32} />
            )}
          </View>
          <Text className={`text-3xl font-bold ${isResponder ? 'text-secondary' : 'text-primary'}`}>
            {isResponder ? 'Responder Registration' : 'Create Account'}
          </Text>
          <Text className="text-dark-grey text-center mt-2">
            {isResponder 
              ? 'Join the Baliwag emergency response team.'
              : 'Join the DisasTRACE emergency network.'}
          </Text>
        </View>

        <View className="space-y-4">
          <View>
            <Text className={`${isResponder ? 'text-secondary' : 'text-primary'} font-bold mb-2 ml-1`}>Full Name</Text>
            <TextInput
              placeholder="John Doe"
              value={fullName}
              onChangeText={setFullName}
              className="bg-surface p-4 rounded-input border border-gray-200"
            />
          </View>

          <View className="mt-4">
            <Text className={`${isResponder ? 'text-secondary' : 'text-primary'} font-bold mb-2 ml-1`}>Email Address</Text>
            <TextInput
              placeholder="john@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              className="bg-surface p-4 rounded-input border border-gray-200"
            />
          </View>

          <View className="mt-4">
            <Text className={`${isResponder ? 'text-secondary' : 'text-primary'} font-bold mb-2 ml-1`}>Password</Text>
            <TextInput
              placeholder="At least 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              className="bg-surface p-4 rounded-input border border-gray-200"
            />
          </View>
        </View>

        <View className="mt-8">
          <Text className={`font-bold mb-4 ${isResponder ? 'text-secondary' : 'text-primary'} ml-1`}>Registering as:</Text>
          <View className="flex-row gap-4">
            <TouchableOpacity
              onPress={() => setRole('public_user')}
              className={`flex-1 p-4 rounded-card border-2 ${role === 'public_user' ? 'bg-primary/5 border-primary' : 'bg-surface border-gray-200'}`}
            >
              <View className="items-center">
                <User color={role === 'public_user' ? '#1E3A8A' : '#4B5563'} size={24} />
                <Text className={`font-bold mt-2 ${role === 'public_user' ? 'text-primary' : 'text-dark-grey'}`}>
                  Resident
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setRole('ambulance_responder')}
              className={`flex-1 p-4 rounded-card border-2 ${role === 'ambulance_responder' ? 'bg-secondary/5 border-secondary' : 'bg-surface border-gray-200'}`}
            >
              <View className="items-center">
                <Ambulance color={role === 'ambulance_responder' ? '#EF4444' : '#4B5563'} size={24} />
                <Text className={`font-bold mt-2 ${role === 'ambulance_responder' ? 'text-secondary' : 'text-dark-grey'}`}>
                  Responder
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {error && (
          <View className="bg-red-50 p-3 rounded-lg mt-6 border border-red-200">
            <Text className="text-red-600 text-center">{error}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={onSignUpPress}
          disabled={loading}
          className={`${isResponder ? 'bg-secondary' : 'bg-primary'} mt-10 p-4 rounded-button items-center shadow-sm ${loading ? 'opacity-70' : ''}`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Create Account</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-8 mb-10">
          <Text className="text-dark-grey">Already have an account? </Text>
          <Link href={{ pathname: "/(auth)/sign-in", params: { role } }} asChild>
            <TouchableOpacity>
              <Text className={`${isResponder ? 'text-secondary' : 'text-primary'} font-bold`}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
