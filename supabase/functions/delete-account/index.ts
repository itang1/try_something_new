// Deletes the signed-in account: its photos, then the user, which cascades to every synced row.
// The app calls this from Settings with the user's session. Apple and Google both require in-app account deletion.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) return json({ error: 'Sign in first.' }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json({ error: 'Sign in first.' }, 401);
  const userId = data.user.id;

  // Storage files don't cascade from the user, so they go first, a page at a time.
  const photos = admin.storage.from('photos');
  for (;;) {
    const { data: files, error: listError } = await photos.list(userId, { limit: 1000 });
    if (listError) return json({ error: listError.message }, 500);
    if (!files?.length) break;
    const { error: removeError } = await photos.remove(files.map((f) => `${userId}/${f.name}`));
    if (removeError) return json({ error: removeError.message }, 500);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return json({ error: deleteError.message }, 500);
  return json({ deleted: true });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
