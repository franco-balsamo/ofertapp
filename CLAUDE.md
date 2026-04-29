# Ofertapp

App mobile Argentina: agrega descuentos de bancos y billeteras. Usuario registra tarjetas → ve descuentos personalizados → recibe push notifications.

## Stack

- Mobile: React Native + Expo SDK 54 + Expo Router v3 + NativeWind v4 + Supabase JS
- Backend: Supabase (Postgres + Auth + RLS + Edge Functions)
- Push: Expo Push API + DB Webhook → Edge Function `notify-new-discounts`
- Scraper: Python + Playwright → Railway (cron cada 4h)

## Estructura

```
mobile/           ← Expo app
  app/
    _layout.tsx           ← root layout, SessionProvider, push notification setup
    (auth)/login.tsx      ← email/password login
    (auth)/register.tsx
    (tabs)/index.tsx      ← Home: descuentos filtrados por tarjetas del usuario
    (tabs)/explore.tsx    ← filtros banco/red/tipo
    (tabs)/favorites.tsx
    (tabs)/profile.tsx    ← mis tarjetas + toggle notificaciones + logout
    discount/[id].tsx     ← detalle descuento
  lib/supabase.ts         ← cliente Supabase singleton
  lib/types.ts            ← tipos: Bank, Card, Discount, UserCard, UserFavorite
  lib/useSession.ts       ← hook auth session
  components/DiscountCard.tsx

scraper/
  main.py                 ← runner: lee DB → corre scrapers → upsert discounts
  scrapers/base.py        ← BaseScraper + Discount dataclass
  scrapers/galicia.py     ← implementado
  scrapers/santander.py   ← implementado (selectores genéricos, ajustar con DOM real)
  scrapers/bbva.py        ← implementado (ídem)
  scrapers/macro.py       ← implementado (ídem)
  scrapers/naranjax.py    ← implementado (ídem)
  scrapers/modo.py        ← implementado (ídem)

supabase/
  migrations/20240101000000_init.sql   ← schema completo con RLS
  migrations/20240101000001_seed.sql   ← 10 bancos, tarjetas base, 3 descuentos ejemplo
  functions/notify-new-discounts/index.ts  ← Edge Function push notifications
```

## DB schema (tablas principales)

`banks` · `cards` · `discounts` · `discount_banks` · `discount_cards`
`user_cards` · `user_favorites` · `push_tokens` · `scraper_runs`

## Env vars requeridas

```
# mobile/.env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

# scraper (Railway)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## Comandos frecuentes

```bash
cd mobile && npm start          # dev server
cd mobile && npm run android    # emulador Android
cd mobile && npm run ios        # simulador iOS
cd scraper && python3 main.py   # correr scrapers manualmente
```

## Bancos soportados (slugs)

`galicia` `santander` `bbva` `macro` `ciudad` `bapro` `icbc` `naranja-x` `modo` `mercado-pago`

## Categorías

`gastronomia` `supermercado` `farmacia` `combustible` `indumentaria` `viajes` `electronica` `entretenimiento` `otros`

## Convenciones

- Estilos: NativeWind (Tailwind clases) únicamente. No StyleSheet.
- Queries Supabase: siempre con `.select()` tipado contra `lib/types.ts`.
- Scraper: heredar `BaseScraper`, implementar `run() -> list[Discount]`. Hash = `bank_slug|title|valid_from|valid_to`.
- No mock DB en tests — usar Supabase real (staging branch si existe).
- Idioma UI: español argentino.

## Pendientes críticos (etapa 2)

1. Configurar `.env` mobile con proyecto Supabase real
2. Ajustar selectores HTML de cada scraper con DOM real (correr headful)
3. Deploy Edge Function + webhook en Supabase
4. Deploy scraper a Railway
