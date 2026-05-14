import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSignIn } from '@clerk/expo';
import { useRouter, Link } from 'expo-router';
import { z } from 'zod';
import { LogIn } from 'lucide-react-native';

const SignInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSignInPress = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError(null);

    try {
      const result = SignInSchema.safeParse({ email, password });
      if (!result.success) {
        setError(result.error.errors[0].message);
        setLoading(false);
        return;
      }

      const completeSignIn = await signIn.create({
        identifier: email,
        password,
      });

      await setActive({ session: completeSignIn.createdSessionId });
      router.replace('/');
    } catch (err) {
      if (err && typeof err === 'object' && 'errors' in err && Array.isArray(err.errors)) {
        setError(err.errors[0]?.message || 'Sign in failed');
      } else {
        setError('Sign in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background p-6 justify-center">
      <View className="items-center mb-10">
        <View className="bg-primary w-20 h-20 rounded-full items-center justify-center mb-4">
          <LogIn color="white" size={40} />
        </View>
        <Text className="text-4xl font-bold text-primary">DisasTRACE</Text>
        <Text className="text-dark-grey text-center mt-2">
          Baliwag Incident Response & Management
        </Text>
      </View>

      <View className="space-y-4">
        <View>
          <Text className="text-primary font-bold mb-2 ml-1">Email Address</Text>
          <TextInput
            placeholder="your@email.com"
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
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            className="bg-surface p-4 rounded-input border border-gray-200"
          />
        </View>
      </View>

      {error && (
        <View className="bg-secondary/10 p-3 rounded-lg mt-4 border border-secondary/20">
          <Text className="text-secondary text-center">{error}</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={onSignInPress}
        disabled={loading}
        className={`bg-primary mt-8 p-4 rounded-button flex-row items-center justify-center ${loading ? 'opacity-70' : ''}`}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-lg">Sign In</Text>
        )}
      </TouchableOpacity>

      <View className="flex-row justify-center mt-8">
        <Text className="text-dark-grey">Don't have an account? </Text>
        <Link href="/(auth)/sign-up" asChild>
          <TouchableOpacity>
            <Text className="text-primary font-bold">Sign Up</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}
