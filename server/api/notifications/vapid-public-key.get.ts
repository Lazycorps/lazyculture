export default defineEventHandler(() => {
  const config = useRuntimeConfig();
  const publicKey = config.public.vapidPublicKey;

  if (!publicKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "VAPID Public Key not configured in runtimeConfig",
    });
  }

  return { publicKey };
});
