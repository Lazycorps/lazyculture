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

    console.log("[admin middleware] user.id:", user.value?.id);
    console.log("[admin middleware] /api/user/current ->", data);
    console.log("[admin middleware] admin flag:", data?.admin);

    if (!data?.admin) {
      console.warn("[admin middleware] not admin, redirecting to /themes");
      return navigateTo("/themes");
    }
  } catch (e) {
    console.error("[admin middleware] error fetching current user:", e);
    return navigateTo("/themes");
  }
});
