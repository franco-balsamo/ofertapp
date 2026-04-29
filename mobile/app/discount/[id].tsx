import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Discount, DAYS_LABELS, NETWORK_LABELS } from '../../lib/types';
import { useSession } from '../../hooks/useSession';

export default function DiscountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadDiscount();
  }, [id]);

  async function loadDiscount() {
    setLoading(true);
    const [{ data }, { data: fav }] = await Promise.all([
      supabase
        .from('discounts')
        .select(`
          *,
          banks:discount_banks(bank:banks(*)),
          cards:discount_cards(card:cards(*))
        `)
        .eq('id', id)
        .single(),
      session?.user
        ? supabase
            .from('user_favorites')
            .select('discount_id')
            .eq('user_id', session.user.id)
            .eq('discount_id', id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (data) {
      setDiscount({
        ...data,
        banks: data.banks?.map((b: any) => b.bank).filter(Boolean) ?? [],
        cards: data.cards?.map((c: any) => c.card).filter(Boolean) ?? [],
      });
    }
    setIsFavorite(!!fav);
    setLoading(false);
  }

  async function toggleFavorite() {
    if (!session?.user || !discount) return;
    if (isFavorite) {
      await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', session.user.id)
        .eq('discount_id', discount.id);
      setIsFavorite(false);
    } else {
      await supabase
        .from('user_favorites')
        .insert({ user_id: session.user.id, discount_id: discount.id });
      setIsFavorite(true);
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  if (!discount) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-500">Descuento no encontrado.</Text>
      </SafeAreaView>
    );
  }

  const bank = discount.banks?.[0];
  const isExpired = discount.valid_to ? new Date(discount.valid_to) < new Date() : false;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 py-6 mb-3">
        <View className="flex-row items-start justify-between">
          <View className="flex-row items-center flex-1">
            {bank?.logo_url ? (
              <Image source={{ uri: bank.logo_url }} className="w-14 h-14 rounded-full mr-4" resizeMode="contain" />
            ) : (
              <View className="w-14 h-14 rounded-full bg-primary-100 mr-4 items-center justify-center">
                <Text className="text-primary-700 font-bold text-lg">
                  {bank?.name?.slice(0, 2).toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="text-gray-900 font-bold text-xl">{discount.title}</Text>
              {bank && <Text className="text-gray-500 mt-0.5">{bank.name}</Text>}
            </View>
          </View>
          <TouchableOpacity onPress={toggleFavorite} className="p-2">
            <Text className="text-3xl">{isFavorite ? '★' : '☆'}</Text>
          </TouchableOpacity>
        </View>

        {discount.percentage !== null && (
          <View className="bg-green-100 rounded-2xl px-5 py-3 mt-4 self-start">
            <Text className="text-green-700 font-bold text-4xl">{discount.percentage}%</Text>
            <Text className="text-green-600 text-sm">de descuento</Text>
          </View>
        )}

        {discount.max_reintegro && (
          <Text className="text-gray-500 mt-2">
            Tope de reintegro: ${discount.max_reintegro.toLocaleString('es-AR')}
          </Text>
        )}
      </View>

      {/* Info cards */}
      <View className="mx-4 mb-3 bg-white rounded-2xl p-4">
        {discount.category && (
          <Row label="Categoría" value={discount.category} />
        )}

        {discount.days_of_week && discount.days_of_week.length > 0 && (
          <View className="flex-row items-start py-2 border-b border-gray-100">
            <Text className="text-gray-500 w-28 text-sm">Días</Text>
            <View className="flex-row flex-wrap flex-1">
              {discount.days_of_week.map((d) => (
                <View key={d} className="bg-primary-100 rounded px-2 py-0.5 mr-1 mb-1">
                  <Text className="text-primary-700 text-xs font-medium">{DAYS_LABELS[d]}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {discount.valid_from && (
          <Row
            label="Desde"
            value={new Date(discount.valid_from).toLocaleDateString('es-AR')}
          />
        )}
        {discount.valid_to && (
          <Row
            label="Hasta"
            value={new Date(discount.valid_to).toLocaleDateString('es-AR')}
            valueStyle={isExpired ? 'text-red-500' : undefined}
          />
        )}
      </View>

      {/* Cards */}
      {discount.cards && discount.cards.length > 0 && (
        <View className="mx-4 mb-3 bg-white rounded-2xl p-4">
          <Text className="text-gray-900 font-semibold mb-2">Tarjetas</Text>
          {discount.cards.map((card) => (
            <View key={card.id} className="flex-row items-center py-1">
              <View className={`w-2 h-2 rounded-full mr-2 ${
                card.network === 'visa' ? 'bg-blue-600' :
                card.network === 'mastercard' ? 'bg-orange-500' :
                card.network === 'amex' ? 'bg-green-600' : 'bg-gray-400'
              }`} />
              <Text className="text-gray-700 text-sm">
                {card.name} · {card.card_type === 'credit' ? 'Crédito' : 'Débito'} · {NETWORK_LABELS[card.network]}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Description & terms */}
      {discount.description && (
        <View className="mx-4 mb-3 bg-white rounded-2xl p-4">
          <Text className="text-gray-900 font-semibold mb-2">Descripción</Text>
          <Text className="text-gray-600 text-sm leading-relaxed">{discount.description}</Text>
        </View>
      )}

      {discount.terms && (
        <View className="mx-4 mb-3 bg-white rounded-2xl p-4">
          <Text className="text-gray-900 font-semibold mb-2">Términos y condiciones</Text>
          <Text className="text-gray-500 text-xs leading-relaxed">{discount.terms}</Text>
        </View>
      )}

      {discount.source_url && (
        <TouchableOpacity
          onPress={() => Linking.openURL(discount.source_url!)}
          className="mx-4 mb-8 bg-primary-50 rounded-2xl p-4 flex-row items-center justify-between"
        >
          <Text className="text-primary-600 font-medium">Ver en el sitio del banco</Text>
          <Text className="text-primary-600">→</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function Row({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: string;
}) {
  return (
    <View className="flex-row items-center py-2 border-b border-gray-100">
      <Text className="text-gray-500 w-28 text-sm">{label}</Text>
      <Text className={`flex-1 text-gray-900 text-sm capitalize ${valueStyle ?? ''}`}>{value}</Text>
    </View>
  );
}
