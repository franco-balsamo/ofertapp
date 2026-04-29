export type BankType = 'bank' | 'wallet';
export type CardType = 'debit' | 'credit';
export type CardNetwork = 'visa' | 'mastercard' | 'amex' | 'none';

export interface Bank {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  type: BankType;
  created_at: string;
}

export interface Card {
  id: string;
  bank_id: string;
  name: string;
  card_type: CardType;
  network: CardNetwork;
  created_at: string;
  bank?: Bank;
}

export interface Discount {
  id: string;
  title: string;
  description: string | null;
  percentage: number | null;
  max_reintegro: number | null;
  category: string | null;
  days_of_week: number[] | null;
  valid_from: string | null;
  valid_to: string | null;
  terms: string | null;
  source_url: string | null;
  created_at: string;
  banks?: Bank[];
  cards?: Card[];
}

export interface UserCard {
  user_id: string;
  card_id: string;
  card?: Card;
}

export interface UserFavorite {
  user_id: string;
  discount_id: string;
  discount?: Discount;
}

export const DAYS_LABELS: Record<number, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
};

export const NETWORK_LABELS: Record<CardNetwork, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  none: 'Propia',
};

export const CATEGORY_LABELS: Record<string, string> = {
  gastronomia: 'Gastronomía',
  supermercado: 'Supermercado',
  farmacia: 'Farmacia',
  combustible: 'Combustible',
  indumentaria: 'Indumentaria',
  viajes: 'Viajes',
  electronica: 'Electrónica',
  entretenimiento: 'Entretenimiento',
  otros: 'Otros',
};
