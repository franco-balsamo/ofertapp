import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    if (!name || !email || !password) {
      setError('Completá todos los campos');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // Navigation handled by useSession hook in root layout
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 justify-center px-6 py-12">
          <Text className="text-3xl font-bold text-primary-600 mb-2">Crear cuenta</Text>
          <Text className="text-gray-500 mb-8">Registrate para ver tus descuentos</Text>

          {error && (
            <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          )}

          <Text className="text-sm font-medium text-gray-700 mb-1">Nombre</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-900"
            placeholder="Juan García"
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />

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
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            className="bg-primary-600 rounded-xl py-4 items-center"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Crear cuenta</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-500">¿Ya tenés cuenta? </Text>
            <Link href="/(auth)/login">
              <Text className="text-primary-600 font-medium">Iniciá sesión</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
