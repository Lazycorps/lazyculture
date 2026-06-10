/**
 * Effectue un appel $fetch en injectant le token Supabase dans le header Authorization.
 */
export function useAuthFetch() {
  const supabase = useSupabaseClient();

  async function authFetch<T>(url: string, options: Record<string, any> = {}): Promise<T> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Cast en signature simple : l'URL générique (string) fait exploser la
    // résolution des routes typées de Nitro (TS2321 excessive stack depth)
    const fetcher = $fetch as unknown as (url: string, options?: Record<string, any>) => Promise<T>;

    return fetcher(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }

  return { authFetch };
}
