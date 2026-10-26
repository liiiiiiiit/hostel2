import type { Plugin } from 'vite';

export function previewSocketsDisabled(env: NodeJS.ProcessEnv = process.env) {
  return env.DISABLE_HMR === 'true' || (env.DISABLE_HMR !== 'false' && Boolean(env.K_SERVICE));
}

// Vite 8 still injects its client when hmr/ws are false. Keep its CSS and
// module helpers, but do not start the unavailable socket in hosted previews.
export function previewSocketPlugin(disabled = previewSocketsDisabled()): Plugin {
  return {
    name: 'hosted-preview-without-sockets',
    apply: 'serve',
    enforce: 'post',
    transform(code, id) {
      if (!disabled || !id.replaceAll('\\', '/').split('?')[0].endsWith('/vite/dist/client/client.mjs')) return;
      const connect = 'transport.connect(createHMRHandler(handleMessage));';
      if (!code.includes(connect)) throw new Error('Vite client changed: review hosted preview socket compatibility.');
      return { code: code.replace(connect, '/* Hosted preview: socket transport disabled. */'), map: null };
    },
  };
}
