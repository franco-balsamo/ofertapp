import { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Bank, CardNetwork, Discount } from '../../lib/types';
import { DiscountCard } from '../../components/DiscountCard';
import { useSession } from '../../hooks/useSession';

const NETWORKS: { label: string; value: CardNetwork | 'all' }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Visa', value: 'visa' },
  { label: 'Mastercard', value: 'mastercard' },
  { label: 'Amex', value: 'amex' },
];

const CARD_TYPES = [
  { label: 'Todos', value: 'all' },
  { label: 'Crédito', value: 'credit' },
  { label: 'Débito', value: 'debit' },
];

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`px-3 py-1.5 rounded-full mr-2 border ${
        selected ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-300'
      }`}
    >
      <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-gray-700'}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ExploreScreen() {
  const { session } = useSession();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [filtered, setFiltered] = useState<Discount[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [selectedNetwork, setSelectedNetwork] = useState<CardNetwork | 'all'>('all');
  const [selectedCardType, setSelectedCardType] = useState<'all' | 'credit' | 'debit'>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [discounts, search, selectedBank, selectedNetwork, selectedCardType]);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadDiscounts(), loadBanks(), loadFavorites()]);
    setLoading(false);
  }

  async function loadDiscounts() {
    const { data } = await supabase
      .from('discounts')
      .select(`
        *,
        banks:discount_banks(bank:banks(*)),
        cards:discount_cards(card:cards(*))
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (data) {
      setDiscounts(data.map(normalizeDiscount));
    }
  }

  async function loadBanks() {
    const { data } = await supabase.from('banks').select('*').order('name');
    if (data) setBanks(data);
  }

  async function loadFavorites() {
    if (!session?.user) return;
    const { data } = await supabase
      .from('user_favorites')
      .select('discount_id')
      .eq('user_id', session.user.id);
    if (data) setFavorites(new Set(data.map((f) => f.discount_id)));
  }

  function applyFilters() {
    let result = [...discounts];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.category?.toLowerCase().includes(q) ||
          d.banks?.some((b) => b.name.toLowerCase().includes(q))
      );
    }

    if (selectedBank !== 'all') {
      result = result.filter((d) => d.banks?.some((b) => b.id === selectedBank));
    }

    if (selectedNetwork !== 'all') {
      result = result.filter((d) =>
        d.cards?.some((c) => c.network === selectedNetwork)
      );
    }

    if (selectedCardType !== 'all') {
      result = result.filter((d) =>
        d.cards?.some((c) => c.card_type === selectedCardType)
      );
    }

    setFiltered(result);
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

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-900 mb-3">Explorar</Text>

        <TextInput
          className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 mb-3"
          placeholder="Buscar descuento, banco, categoría..."
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />

        {/* Red filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          {NETWORKS.map((n) => (
            <FilterChip
              key={n.value}
              label={n.label}
              selected={selectedNetwork === n.value}
              onPress={() => setSelectedNetwork(n.value)}
            />
          ))}
        </ScrollView>

        {/* Card type filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          {CARD_TYPES.map((t) => (
            <FilterChip
              key={t.value}
              label={t.label}
              selected={selectedCardType === t.value}
              onPress={() => setSelectedCardType(t.value as any)}
            />
          ))}
        </ScrollView>

        {/* Bank filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1">
          <FilterChip
            label="Todos los bancos"
            selected={selectedBank === 'all'}
            onPress={() => setSelectedBank('all')}
          />
          {banks.map((b) => (
            <FilterChip
              key={b.id}
              label={b.name}
              selected={selectedBank === b.id}
              onPress={() => setSelectedBank(b.id)}
            />
          ))}
        </ScrollView>

        <Text className="text-gray-400 text-xs mt-2 mb-1">
          {filtered.length} descuento{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DiscountCard
            discount={item}
            isFavorite={favorites.has(item.id)}
            onToggleFavorite={toggleFavorite}
          />
        )}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-gray-400 text-center">No hay descuentos con esos filtros.</Text>
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
