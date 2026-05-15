import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSignIn } from '@clerk/expo';
import { useRouter, Link, useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { LogIn, Ambulance, User } from 'lucide-react-native';

const SignInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const RoleSchema = z.enum(['public_user', 'ambulance_responder']).optional();

export default function SignInScreen() {
  const { signIn, fetchStatus } = useSignIn();
  const isLoaded = fetchStatus === 'idle';
  const router = useRouter();
  const params = useLocalSearchParams<{ role: string }>();
  
  const roleResult = RoleSchema.safeParse(params.role);
  const role = roleResult.success ? roleResult.data : 'public_user';

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSignInPress = async () => {
    if (!isLoaded || !signIn) return;
    setLoading(true);
    setError(null);

    try {
      const result = SignInSchema.safeParse({ email, password });
      if (!result.success) {
        setError(result.error.issues[0].message);
        setLoading(false);
        return;
      }

      const { createdSessionId, error: signInError } = await signIn.create({
        identifier: email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (createdSessionId) {
        router.replace('/');
      } else {
        setError(`Sign in status: ${signIn.status}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const isResponder = role === 'ambulance_responder';

  return (
    <View className="flex-1 bg-background p-6 justify-center">
      <View className="items-center mb-10">
        <View className={`${isResponder ? 'bg-secondary' : 'bg-primary'} w-20 h-20 rounded-full items-center justify-center mb-4`}>
          {isResponder ? (
            <Ambulance color="white" size={40} />
          ) : (
            <User color="white" size={40} />
          )}
        </View>
        <Text className={`text-3xl font-bold ${isResponder ? 'text-secondary' : 'text-primary'}`}>
          {isResponder ? 'Responder Sign In' : 'Resident Sign In'}
        </Text>
        <Text className="text-dark-grey text-center mt-2 px-6">
          {isResponder 
            ? 'Access the emergency response coordination portal.'
            : 'Report incidents and receive assistance in Baliwag.'}
        </Text>
      </View>

      <View className="space-y-4">
        <View>
          <Text className={`${isResponder ? 'text-secondary' : 'text-primary'} font-bold mb-2 ml-1`}>Email Address</Text>
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
          <Text className={`${isResponder ? 'text-secondary' : 'text-primary'} font-bold mb-2 ml-1`}>Password</Text>
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
        <View className="bg-red-50 p-3 rounded-lg mt-4 border border-red-200">
          <Text className="text-red-600 text-center">{error}</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={onSignInPress}
        disabled={loading}
        className={`${isResponder ? 'bg-secondary' : 'bg-primary'} mt-8 p-4 rounded-button flex-row items-center justify-center ${loading ? 'opacity-70' : ''}`}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-lg">Sign In</Text>
        )}
      </TouchableOpacity>

      <View className="flex-row justify-center mt-8">
        <Text className="text-dark-grey">Don't have an account? </Text>
        <Link href={{ pathname: "/(auth)/sign-up", params: { role } }} asChild>
          <TouchableOpacity>
            <Text className={`${isResponder ? 'text-secondary' : 'text-primary'} font-bold`}>Sign Up</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}
