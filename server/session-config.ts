export function sessionCookiePolicy(env: NodeJS.ProcessEnv = process.env) {
  const production = env.NODE_ENV === 'production' || Boolean(env.VERCEL);
  const httpTest = env.HTTP_TEST_MODE === 'true';
  if (httpTest) {
    let url: URL;
    try { url = new URL(env.APP_URL ?? ''); }
    catch { throw new Error('HTTP_TEST_MODE requires an explicit http:// APP_URL.'); }
    if (env.VERCEL || url.protocol !== 'http:' || url.username || url.password) {
      throw new Error('HTTP_TEST_MODE is only for a temporary HTTP VPS test, not Vercel or HTTPS.');
    }
  }
  const secure = production && !httpTest;
  return { secure, name: secure ? '__Host-yh_session' : 'yh_session' };
}
