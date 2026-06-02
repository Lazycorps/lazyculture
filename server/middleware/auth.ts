import { serverSupabaseClient } from "#supabase/server";

export default defineEventHandler(async (event) => {
  try {
    const client = await serverSupabaseClient(event);
    const {
      data: { user },
    } = await client.auth.getUser();
    event.context.supabaseClient = client;
    event.context.user = user || null;
  } catch (error) {
    event.context.supabaseClient = null;
    event.context.user = null;
  }
});
