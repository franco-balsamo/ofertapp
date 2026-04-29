import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email || !password) {
      setError('Completá los campos');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-primary-600 mb-2">Ofertapp</Text>
        <Text className="text-gray-500 mb-8">Descuentos de todos tus bancos</Text>

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <Text className="text-red-600 text-sm">{error}</Text>
          </View>
        )}

        <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-900"
          placeholder="tu@email.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <Text className="text-sm font-medium text-gray-700 mb-1">Contraseña</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 mb-6 text-gray-900"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          className="bg-primary-600 rounded-xl py-4 items-center"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">Iniciar sesión</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-500">¿No tenés cuenta? </Text>
          <Link href="/(auth)/register">
            <Text className="text-primary-600 font-medium">Registrate</Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
