// supabase/functions/send-notification/index.ts
//
// Supabase Edge Function: send-notification
//
// Sends Expo push notifications to users who visited a specific cafe
// in the last 30 days. Called from the PerkUp Business app's
// Marketing screen.
//
// Deploy with: supabase functions deploy send-notification
//
// Environment variables needed (set via Supabase Dashboard):
//   - SUPABASE_URL (auto-injected)
//   - SUPABASE_SERVICE_ROLE_KEY (auto-injected)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface RequestBody {
  cafe_id: string;
  title: string;
  message: string;
}

serve(async (req: Request) => {
  // Only POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { cafe_id, title, message } = (await req.json()) as RequestBody;

    if (!cafe_id || !title || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing cafe_id, title, or message' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Create admin client (using service role key)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify the caller owns this cafe (check JWT from Authorization header)
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const { data: cafe } = await supabase
        .from('cafes')
        .select('id')
        .eq('id', cafe_id)
        .eq('owner_id', user.id)
        .single();

      if (!cafe) {
        return new Response(JSON.stringify({ error: 'You do not own this cafe' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Find users who visited this cafe in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: visitors } = await supabase
      .from('transactions')
      .select('user_id')
      .eq('cafe_id', cafe_id)
      .eq('status', 'success')
      .gte('created_at', thirtyDaysAgo);

    if (!visitors || visitors.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No recent visitors found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Deduplicate user IDs
    const uniqueUserIds = [...new Set(visitors.map((v) => v.user_id))];

    // Get push tokens for these users
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .in('user_id', uniqueUserIds);

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No push tokens found for recent visitors' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Send via Expo Push API (batch up to 100 per request)
    const messages = tokens.map((t) => ({
      to: t.token,
      sound: 'default',
      title,
      body: message,
      data: { cafe_id },
    }));

    const batches = [];
    for (let i = 0; i < messages.length; i += 100) {
      batches.push(messages.slice(i, i + 100));
    }

    let totalSent = 0;
    for (const batch of batches) {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      if (response.ok) {
        totalSent += batch.length;
      }
    }

    return new Response(
      JSON.stringify({ sent: totalSent, total_tokens: tokens.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
