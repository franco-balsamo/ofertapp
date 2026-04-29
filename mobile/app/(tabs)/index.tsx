import { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Discount } from '../../lib/types';
import { DiscountCard } from '../../components/DiscountCard';
import { useSession } from '../../hooks/useSession';

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [hasCards, setHasCards] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      loadData();
    }
  }, [session]);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadDiscounts(), loadFavorites()]);
    setLoading(false);
  }

  async function loadDiscounts() {
    if (!session?.user) return;

    // Check if user has cards
    const { data: userCards } = await supabase
      .from('user_cards')
      .select('card_id')
      .eq('user_id', session.user.id);

    if (!userCards || userCards.length === 0) {
      setHasCards(false);
      return;
    }
    setHasCards(true);

    const cardIds = userCards.map((uc) => uc.card_id);

    // Get discounts that match user's cards
    const { data } = await supabase
      .from('discounts')
      .select(`
        *,
        banks:discount_banks(bank:banks(*)),
        cards:discount_cards(card:cards(*))
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      // Filter to discounts that include at least one of user's cards
      const filtered = data.filter((d) => {
        const discountCardIds = d.cards?.map((dc: any) => dc.card?.id).filter(Boolean) ?? [];
        return discountCardIds.some((cid: string) => cardIds.includes(cid));
      });
      // Normalize nested joins
      setDiscounts(filtered.map(normalizeDiscount));
    }
  }

  async function loadFavorites() {
    if (!session?.user) return;
    const { data } = await supabase
      .from('user_favorites')
      .select('discount_id')
      .eq('user_id', session.user.id);
    if (data) setFavorites(new Set(data.map((f) => f.discount_id)));
  }

  async function toggleFavorite(discountId: string) {
    if (!session?.user) return;
    if (favorites.has(discountId)) {
      await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', session.user.id)
        .eq('discount_id', discountId);
      setFavorites((prev) => { const next = new Set(prev); next.delete(discountId); return next; });
    } else {
      await supabase
        .from('user_favorites')
        .insert({ user_id: session.user.id, discount_id: discountId });
      setFavorites((prev) => new Set(prev).add(discountId));
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  if (hasCards === false) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-gray-900">Mis descuentos</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">💳</Text>
          <Text className="text-gray-900 font-semibold text-lg text-center mb-2">
            Agregá tus tarjetas
          </Text>
          <Text className="text-gray-500 text-center mb-6">
            Registrá tus tarjetas para ver los descuentos que te aplican.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile')}
            className="bg-primary-600 rounded-xl px-6 py-3"
          >
            <Text className="text-white font-semibold">Ir a mi perfil</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-900">Mis descuentos</Text>
        <Text className="text-gray-500 text-sm mt-1">Según tus tarjetas registradas</Text>
      </View>
      <FlatList
        data={discounts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DiscountCard
            discount={item}
            isFavorite={favorites.has(item.id)}
            onToggleFavorite={toggleFavorite}
          />
        )}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-gray-400 text-center">
              Sin descuentos activos para tus tarjetas por ahora.
            </Text>
          </View>
        }
        onRefresh={loadData}
        refreshing={loading}
      />
    </SafeAreaView>
  );
}

function normalizeDiscount(d: any): Discount {
  return {
    ...d,
    banks: d.banks?.map((b: any) => b.bank).filter(Boolean) ?? [],
    cards: d.cards?.map((c: any) => c.card).filter(Boolean) ?? [],
  };
}
