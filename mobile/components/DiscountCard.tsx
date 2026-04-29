import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Discount, DAYS_LABELS } from '../lib/types';

interface Props {
  discount: Discount;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

function DayBadge({ day }: { day: number }) {
  return (
    <View className="bg-primary-100 rounded px-1.5 py-0.5 mr-1">
      <Text className="text-primary-700 text-xs font-medium">{DAYS_LABELS[day]}</Text>
    </View>
  );
}

export function DiscountCard({ discount, isFavorite = false, onToggleFavorite }: Props) {
  const router = useRouter();
  const bank = discount.banks?.[0];

  const isExpired = discount.valid_to
    ? new Date(discount.valid_to) < new Date()
    : false;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/discount/${discount.id}`)}
      className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100"
      activeOpacity={0.7}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-row items-center flex-1">
          {bank?.logo_url ? (
            <Image
              source={{ uri: bank.logo_url }}
              className="w-10 h-10 rounded-full mr-3"
              resizeMode="contain"
            />
          ) : (
            <View className="w-10 h-10 rounded-full bg-primary-100 mr-3 items-center justify-center">
              <Text className="text-primary-600 font-bold text-sm">
                {bank?.name?.slice(0, 2).toUpperCase() ?? '??'}
              </Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="text-gray-900 font-semibold text-base" numberOfLines={2}>
              {discount.title}
            </Text>
            {bank && (
              <Text className="text-gray-500 text-xs mt-0.5">{bank.name}</Text>
            )}
          </View>
        </View>

        <View className="items-end ml-2">
          {discount.percentage !== null && (
            <View className="bg-green-100 rounded-xl px-3 py-1">
              <Text className="text-green-700 font-bold text-lg">{discount.percentage}%</Text>
            </View>
          )}
          {onToggleFavorite && (
            <TouchableOpacity
              onPress={() => onToggleFavorite(discount.id)}
              className="mt-2 p-1"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-xl">{isFavorite ? '★' : '☆'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {discount.category && (
        <View className="mt-2 flex-row items-center">
          <View className="bg-gray-100 rounded-full px-2.5 py-0.5">
            <Text className="text-gray-600 text-xs capitalize">{discount.category}</Text>
          </View>
          {discount.max_reintegro && (
            <Text className="text-gray-400 text-xs ml-2">
              tope ${discount.max_reintegro.toLocaleString('es-AR')}
            </Text>
          )}
        </View>
      )}

      {discount.days_of_week && discount.days_of_week.length > 0 && (
        <View className="flex-row mt-2 flex-wrap">
          {discount.days_of_week.map((d) => (
            <DayBadge key={d} day={d} />
          ))}
        </View>
      )}

      {discount.valid_to && (
        <Text className={`text-xs mt-2 ${isExpired ? 'text-red-400' : 'text-gray-400'}`}>
          {isExpired ? 'Vencido' : `Hasta ${new Date(discount.valid_to).toLocaleDateString('es-AR')}`}
        </Text>
      )}
    </TouchableOpacity>
  );
}
