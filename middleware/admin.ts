export default defineNuxtRouteMiddleware(async (to, from) => {
  const client = useSupabaseClient();
  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    return navigateTo('/login');
  }

  const { data: userDetails } = await client
    .from('User')
    .select('admin')
    .eq('id', user.id)
    .single();

  if (!userDetails?.admin) {
    return navigateTo('/themes');
  }
});