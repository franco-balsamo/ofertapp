# Ofertapp

App mobile para Argentina que agrega descuentos de bancos y billeteras digitales. El usuario registra sus tarjetas y ve los descuentos que le aplican, con push notifications cuando aparecen nuevas ofertas.

## Stack

| Capa | Tecnología |
|------|-----------|
| Mobile | React Native + Expo SDK 54 + Expo Router v3 |
| Estilos | NativeWind v4 (Tailwind) |
| Backend | Supabase (Postgres + Auth + RLS + Edge Functions) |
| Push | Expo Push API + DB Webhook → Edge Function |
| Scraper | Python + Playwright → Railway (cron cada 4h) |
| Build/Deploy | EAS Build + EAS Update |

---

## Estructura del monorepo

```
ofertapp/
├── mobile/           ← App Expo
│   ├── app/
│   │   ├── _layout.tsx           ← Root layout, SessionProvider, push setup
│   │   ├── (auth)/login.tsx
│   │   ├── (auth)/register.tsx
│   │   ├── (tabs)/index.tsx      ← Home: descuentos filtrados por tarjetas
│   │   ├── (tabs)/explore.tsx    ← Filtros banco/red/tipo
│   │   ├── (tabs)/favorites.tsx
│   │   ├── (tabs)/profile.tsx    ← Mis tarjetas + notificaciones + logout
│   │   └── discount/[id].tsx     ← Detalle de descuento
│   ├── components/DiscountCard.tsx
│   ├── lib/
│   │   ├── supabase.ts           ← Cliente Supabase singleton
│   │   └── types.ts              ← Bank, Card, Discount, UserCard, UserFavorite
│   └── hooks/useSession.ts
├── scraper/          ← Python scraper
│   ├── main.py                   ← Runner principal
│   ├── scrapers/base.py          ← BaseScraper + Discount dataclass
│   ├── scrapers/galicia.py
│   ├── scrapers/santander.py
│   ├── scrapers/bbva.py
│   ├── scrapers/macro.py
│   ├── scrapers/naranjax.py
│   └── scrapers/modo.py
└── supabase/
    ├── migrations/
    │   ├── 20240101000000_init.sql   ← Schema completo con RLS
    │   └── 20240101000001_seed.sql   ← 10 bancos, tarjetas base, 3 descuentos
    └── functions/notify-new-discounts/index.ts
```

---

## Qué está implementado

### Mobile (Expo)
- [x] Auth completa: login, registro, logout (Supabase Auth)
- [x] Home con descuentos filtrados por tarjetas del usuario
- [x] Pantalla Explore con filtros (banco / red / tipo)
- [x] Pantalla Favoritos
- [x] Pantalla Perfil: gestión de tarjetas + toggle notificaciones
- [x] Detalle de descuento (`/discount/[id]`)
- [x] Push notifications: registro de token, manejo de permisos
- [x] Estilos 100% NativeWind
- [x] Expo Router v3 + typedRoutes
- [x] EAS Build configurado (development / preview / production)
- [x] EAS Update configurado (projectId linkeado)

### Backend (Supabase)
- [x] Schema Postgres completo: `banks`, `cards`, `discounts`, `discount_banks`, `discount_cards`, `user_cards`, `user_favorites`, `push_tokens`, `scraper_runs`
- [x] RLS activado en todas las tablas
- [x] Seed: 10 bancos, tarjetas base, 3 descuentos de ejemplo
- [x] Edge Function `notify-new-discounts` (push via Expo API)

### Scraper (Python)
- [x] Runner principal con lógica de upsert y hash deduplicación
- [x] `BaseScraper` + `Discount` dataclass
- [x] 6 scrapers: Galicia, Santander, BBVA, Macro, Naranja X, Modo
- [x] `railway.toml` configurado para deploy con Nixpacks

---

## Estado actual (Etapa 2 — Backend funcional)

### Completado
- [x] Proyecto Supabase prod activo (región `sa-east-1`)
- [x] `mobile/.env` configurado con URL + anon key
- [x] Migraciones aplicadas: schema completo + seed (10 bancos, 14 tarjetas, 11 descuentos de prueba)
- [x] Edge Function `notify-new-discounts` deployada y activa
- [x] `scraper/railway.toml` configurado para Nixpacks

### Pendiente
- [ ] Ajustar selectores HTML de cada scraper (actualmente 0 descuentos — DOM real difiere)
- [ ] Deploy scraper a Railway con env vars + cron `0 */4 * * *`
- [ ] Configurar DB Webhook → Edge Function en Supabase dashboard
- [ ] Verificar run end-to-end

### Etapa 3 — Stores
- [ ] Build de producción: `eas build --platform android --profile production`
- [ ] Submit a Play Store (internal track): `eas submit --platform android`
- [ ] Configurar Apple Developer + build iOS

---

## Cómo levantar la app en desarrollo

### Prerequisitos
- Node.js 20+
- Expo CLI: `npm install -g expo-cli`
- Para Android: Android Studio + emulador configurado, o dispositivo físico
- Para iOS: Xcode (solo macOS)

### 1. Instalar dependencias

```bash
cd mobile
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `mobile/.env` con los valores del proyecto Supabase:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Iniciar el servidor de desarrollo

```bash
# Expo Go (cualquier dispositivo)
npm start

# Emulador Android
npm run android

# Simulador iOS (solo macOS)
npm run ios
```

---

## Cómo correr el scraper localmente

### Prerequisitos
- Python 3.11+
- Playwright instalado con browsers

```bash
cd scraper
pip install -r requirements.txt
playwright install chromium
```

### Variables de entorno

```bash
cp .env.example .env
```

Editar con:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

### Correr

```bash
python main.py
```

---

## Base de datos

### Aplicar migraciones en Supabase prod

```bash
# Con Supabase CLI
supabase db push

# O correr manualmente en el SQL Editor de Supabase dashboard:
# 1. supabase/migrations/20240101000000_init.sql
# 2. supabase/migrations/20240101000001_seed.sql
```

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `banks` | Bancos y billeteras (galicia, santander, modo, etc.) |
| `cards` | Tarjetas por banco (Visa, Mastercard, Amex, débito) |
| `discounts` | Descuentos scrapeados |
| `discount_banks` | Relación descuento ↔ banco |
| `discount_cards` | Relación descuento ↔ tarjeta |
| `user_cards` | Tarjetas registradas por usuario |
| `user_favorites` | Descuentos favoritos por usuario |
| `push_tokens` | Tokens Expo para notificaciones |
| `scraper_runs` | Log de ejecuciones del scraper |

---

## Build con EAS

```bash
# Development build (con devtools)
eas build --platform android --profile development

# Preview APK (para testing interno)
eas build --platform android --profile preview

# Producción (AAB para Play Store)
eas build --platform android --profile production

# Publicar OTA update
eas update --branch production --message "descripción del update"
```

EAS Project ID: `59c70c7f-40cf-4679-a6d8-c2615be3c8fe`

---

## Bancos soportados

`galicia` `santander` `bbva` `macro` `ciudad` `bapro` `icbc` `naranja-x` `modo` `mercado-pago`

## Categorías de descuentos

`gastronomia` `supermercado` `farmacia` `combustible` `indumentaria` `viajes` `electronica` `entretenimiento` `otros`
