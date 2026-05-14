import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSignUp, useClerk } from '@clerk/expo';
import { useRouter, Link } from 'expo-router';
import { z } from 'zod';
import { UserPlus, User, ShieldCheck } from 'lucide-react-native';

const SignUpSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(['public_user', 'ambulance_responder']),
});

export default function SignUpScreen() {
  const { signUp, fetchStatus } = useSignUp();
  const { loaded: isLoaded } = useClerk();
  const router = useRouter();
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [role, setRole] = React.useState<'public_user' | 'ambulance_responder'>('public_user');
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

      await signUp.verifications.sendEmailCode();
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
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({
        code,
      });

      if (verifyError) {
        setError(verifyError.message);
        setLoading(false);
        return;
      }

      if (signUp.status === 'complete') {
        await signUp.finalize();
        router.replace('/');
      } else {
        setError(`Sign up status: ${signUp.status}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <View className="flex-1 bg-background p-6 justify-center">
        <View className="items-center mb-8">
          <ShieldCheck color="#1E3A8A" size={60} />
          <Text className="text-2xl font-bold text-primary mt-4">Verify your email</Text>
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
          className={`bg-primary mt-6 p-4 rounded-button items-center ${loading ? 'opacity-70' : ''}`}
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
          <View className="bg-primary w-16 h-16 rounded-full items-center justify-center mb-4">
            <UserPlus color="white" size={32} />
          </View>
          <Text className="text-3xl font-bold text-primary">Create Account</Text>
          <Text className="text-dark-grey text-center mt-2">
            Join the DisasTRACE emergency network
          </Text>
        </View>

        <View className="space-y-4">
          <View>
            <Text className="text-primary font-bold mb-2 ml-1">Full Name</Text>
            <TextInput
              placeholder="John Doe"
              value={fullName}
              onChangeText={setFullName}
              className="bg-surface p-4 rounded-input border border-gray-200"
            />
          </View>

          <View className="mt-4">
            <Text className="text-primary font-bold mb-2 ml-1">Email Address</Text>
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
            <Text className="text-primary font-bold mb-2 ml-1">Password</Text>
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
          <Text className="font-bold mb-4 text-primary ml-1">I am registering as:</Text>
          <View className="flex-row gap-4">
            <TouchableOpacity
              onPress={() => setRole('public_user')}
              className={`flex-1 p-4 rounded-card border-2 ${role === 'public_user' ? 'bg-primary/5 border-primary' : 'bg-surface border-gray-200'}`}
            >
              <View className="items-center">
                <User color={role === 'public_user' ? '#1E3A8A' : '#4B5563'} size={24} />
                <Text className={`font-bold mt-2 ${role === 'public_user' ? 'text-primary' : 'text-dark-grey'}`}>
                  Public User
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setRole('ambulance_responder')}
              className={`flex-1 p-4 rounded-card border-2 ${role === 'ambulance_responder' ? 'bg-primary/5 border-primary' : 'bg-surface border-gray-200'}`}
            >
              <View className="items-center">
                <ShieldCheck color={role === 'ambulance_responder' ? '#1E3A8A' : '#4B5563'} size={24} />
                <Text className={`font-bold mt-2 ${role === 'ambulance_responder' ? 'text-primary' : 'text-dark-grey'}`}>
                  Responder
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {error && (
          <View className="bg-secondary/10 p-3 rounded-lg mt-6 border border-secondary/20">
            <Text className="text-secondary text-center">{error}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={onSignUpPress}
          disabled={loading}
          className={`bg-primary mt-10 p-4 rounded-button items-center shadow-sm ${loading ? 'opacity-70' : ''}`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Create Account</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-8 mb-10">
          <Text className="text-dark-grey">Already have an account? </Text>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity>
              <Text className="text-primary font-bold">Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
