export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser();

  if (!user.value) {
    return navigateTo("/login");
  }

  try {
    // Forward the request cookies so the internal call is authenticated
    // during SSR (cookies are not forwarded automatically). On the client
    // this returns {} and the browser sends cookies itself.
    const headers = useRequestHeaders(["cookie"]);

    const data = await $fetch<{ admin?: boolean } | null>("/api/user/current", { headers });

    if (!data?.admin) {
      return navigateTo("/themes");
    }
  } catch (e) {
    return navigateTo("/themes");
  }
});
