import { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { supabase } from '../../lib/supabase';
import { Card, NETWORK_LABELS } from '../../lib/types';
import { useSession } from '../../hooks/useSession';

interface UserCard {
  card_id: string;
  card: Card & { bank: { name: string } | null };
}

export default function ProfileScreen() {
  const { session } = useSession();
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [availableCards, setAvailableCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showAddCards, setShowAddCards] = useState(false);

  useEffect(() => {
    if (session?.user) loadData();
  }, [session]);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadUserCards(), loadAllCards(), checkNotificationStatus()]);
    setLoading(false);
  }

  async function loadUserCards() {
    if (!session?.user) return;
    const { data } = await supabase
      .from('user_cards')
      .select('card_id, card:cards(*, bank:banks(name))')
      .eq('user_id', session.user.id);
    if (data) setUserCards(data as any);
  }

  async function loadAllCards() {
    const { data } = await supabase
      .from('cards')
      .select('*, bank:banks(name)')
      .order('name');
    if (data) setAvailableCards(data as any);
  }

  async function checkNotificationStatus() {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationsEnabled(status === 'granted');
  }

  async function toggleNotifications(value: boolean) {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        const token = await Notifications.getExpoPushTokenAsync();
        if (session?.user) {
          await supabase.from('user_push_tokens').upsert({
            user_id: session.user.id,
            token: token.data,
          });
        }
        setNotificationsEnabled(true);
      } else {
        Alert.alert('Permisos requeridos', 'Habilitá las notificaciones en configuración del sistema.');
      }
    } else {
      setNotificationsEnabled(false);
    }
  }

  async function addCard(cardId: string) {
    if (!session?.user) return;
    await supabase.from('user_cards').upsert({ user_id: session.user.id, card_id: cardId });
    await loadUserCards();
  }

  async function removeCard(cardId: string) {
    if (!session?.user) return;
    Alert.alert('Quitar tarjeta', '¿Querés quitar esta tarjeta de tu perfil?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          await supabase
            .from('user_cards')
            .delete()
            .eq('user_id', session.user.id)
            .eq('card_id', cardId);
          await loadUserCards();
        },
      },
    ]);
  }

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Seguro que querés salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  const userCardIds = new Set(userCards.map((uc) => uc.card_id));
  const unaddedCards = availableCards.filter((c) => !userCardIds.has(c.id));

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <FlatList
        data={userCards}
        keyExtractor={(item) => item.card_id}
        ListHeaderComponent={
          <View className="px-4 pt-4">
            <Text className="text-2xl font-bold text-gray-900 mb-1">Perfil</Text>
            <Text className="text-gray-500 text-sm mb-6">
              {session?.user?.email}
            </Text>

            {/* Notifications toggle */}
            <View className="bg-white rounded-2xl p-4 mb-4 flex-row items-center justify-between">
              <View>
                <Text className="text-gray-900 font-medium">Notificaciones</Text>
                <Text className="text-gray-500 text-xs mt-0.5">Nuevos descuentos para tus tarjetas</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ true: '#2563eb' }}
              />
            </View>

            {/* My cards header */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold text-gray-900">Mis tarjetas</Text>
              <TouchableOpacity
                onPress={() => setShowAddCards(!showAddCards)}
                className="bg-primary-600 rounded-lg px-3 py-1.5"
              >
                <Text className="text-white text-sm font-medium">
                  {showAddCards ? 'Cerrar' : '+ Agregar'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Add cards panel */}
            {showAddCards && unaddedCards.length > 0 && (
              <View className="bg-blue-50 rounded-2xl p-3 mb-4">
                <Text className="text-primary-700 font-medium mb-2 text-sm">Seleccioná tus tarjetas</Text>
                {unaddedCards.map((card) => (
                  <TouchableOpacity
                    key={card.id}
                    onPress={() => addCard(card.id)}
                    className="flex-row items-center py-2 border-b border-blue-100"
                  >
                    <View className="flex-1">
                      <Text className="text-gray-900 text-sm">{card.name}</Text>
                      <Text className="text-gray-500 text-xs">
                        {(card as any).bank?.name} · {card.card_type === 'credit' ? 'Crédito' : 'Débito'} · {NETWORK_LABELS[card.network]}
                      </Text>
                    </View>
                    <Text className="text-primary-600 font-medium text-sm">+ Agregar</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => removeCard(item.card_id)}
            className="mx-4 mb-2 bg-white rounded-xl p-3 flex-row items-center"
          >
            <View className="flex-1">
              <Text className="text-gray-900 font-medium">{(item.card as any)?.name}</Text>
              <Text className="text-gray-500 text-xs">
                {(item.card as any)?.bank?.name} · {item.card?.card_type === 'credit' ? 'Crédito' : 'Débito'} · {NETWORK_LABELS[item.card?.network ?? 'none']}
              </Text>
            </View>
            <Text className="text-red-400 text-sm">Quitar</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !showAddCards ? (
            <View className="mx-4 items-center py-8">
              <Text className="text-gray-400 text-center text-sm">
                No tenés tarjetas agregadas. Tocá "+ Agregar" para empezar.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <TouchableOpacity
            onPress={handleLogout}
            className="mx-4 mt-8 mb-8 border border-red-200 rounded-xl py-3 items-center"
          >
            <Text className="text-red-500 font-medium">Cerrar sesión</Text>
          </TouchableOpacity>
        }
      />
    </SafeAreaView>
  );
}
