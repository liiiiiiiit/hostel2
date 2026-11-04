// Apply the saved appearance before styles and React load, avoiding a light flash.
(() => {
  let preference = null;
  try { preference = localStorage.getItem('yerevanhub_theme'); } catch {}
  const dark = preference === 'dark' || (preference !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
})();
