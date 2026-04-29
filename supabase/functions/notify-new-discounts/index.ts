import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

serve(async (req) => {
  try {
    const body = await req.json();
    const discountId: string = body.record?.id;

    if (!discountId) {
      return new Response('No discount id', { status: 400 });
    }

    // Get discount info
    const { data: discount } = await supabase
      .from('discounts')
      .select('title, percentage, category, discount_cards(card_id)')
      .eq('id', discountId)
      .single();

    if (!discount) {
      return new Response('Discount not found', { status: 404 });
    }

    const cardIds = discount.discount_cards?.map((dc: any) => dc.card_id) ?? [];

    if (cardIds.length === 0) {
      return new Response('No cards linked', { status: 200 });
    }

    // Find users that have at least one of these cards
    const { data: userCards } = await supabase
      .from('user_cards')
      .select('user_id')
      .in('card_id', cardIds);

    if (!userCards || userCards.length === 0) {
      return new Response('No users to notify', { status: 200 });
    }

    const userIds = [...new Set(userCards.map((uc: any) => uc.user_id))];

    // Get push tokens for those users
    const { data: tokenRows } = await supabase
      .from('user_push_tokens')
      .select('token')
      .in('user_id', userIds);

    if (!tokenRows || tokenRows.length === 0) {
      return new Response('No push tokens', { status: 200 });
    }

    const tokens = tokenRows.map((t: any) => t.token);
    const title = `Nuevo ${discount.percentage ?? ''}% en ${discount.category ?? 'descuentos'}`;
    const body_text = discount.title;

    // Send via Expo Push API
    const messages = tokens.map((token) => ({
      to: token,
      title,
      body: body_text,
      data: { discountId },
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    return new Response(JSON.stringify({ sent: tokens.length, result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
});
