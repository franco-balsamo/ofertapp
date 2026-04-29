import { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Discount } from '../../lib/types';
import { DiscountCard } from '../../components/DiscountCard';
import { useSession } from '../../hooks/useSession';

export default function FavoritesScreen() {
  const { session } = useSession();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) loadData();
  }, [session]);

  async function loadData() {
    setLoading(true);
    if (!session?.user) return;

    const { data } = await supabase
      .from('user_favorites')
      .select(`
        discount_id,
        discount:discounts(
          *,
          banks:discount_banks(bank:banks(*)),
          cards:discount_cards(card:cards(*))
        )
      `)
      .eq('user_id', session.user.id);

    if (data) {
      const favoriteIds = new Set(data.map((f) => f.discount_id));
      setFavorites(favoriteIds);
      setDiscounts(
        data
          .map((f) => f.discount)
          .filter(Boolean)
          .map(normalizeDiscount)
      );
    }
    setLoading(false);
  }

  async function toggleFavorite(discountId: string) {
    if (!session?.user) return;
    await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', session.user.id)
      .eq('discount_id', discountId);
    setDiscounts((prev) => prev.filter((d) => d.id !== discountId));
    setFavorites((prev) => { const next = new Set(prev); next.delete(discountId); return next; });
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-900">Favoritos</Text>
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
          <View className="items-center py-16">
            <Text className="text-4xl mb-4">☆</Text>
            <Text className="text-gray-500 text-center">
              Todavía no guardaste favoritos. Explorá descuentos y tocá la estrella.
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
