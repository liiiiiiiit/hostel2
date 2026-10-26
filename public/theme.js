/* Parser-blocking bootstrap and shared store: keep theme resolution in one place. */
(function () {
  var key = 'yerevanhub_theme';
  var listeners = new Set();
  var media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function valid(value) { return value === 'light' || value === 'dark' || value === 'system'; }
  function read() {
    try { var saved = window.localStorage.getItem(key); return valid(saved) ? saved : 'system'; }
    catch (_) { return 'system'; }
  }
  var preference = read();
  function apply() {
    var theme = preference === 'system' ? (media && media.matches ? 'dark' : 'light') : preference;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    listeners.forEach(function (listener) { listener(); });
  }
  window.YerevanTheme = {
    getPreference: function () { return preference; },
    getResolved: function () { return document.documentElement.dataset.theme; },
    subscribe: function (listener) { listeners.add(listener); return function () { listeners.delete(listener); }; },
    setPreference: function (value) {
      if (!valid(value)) return;
      preference = value;
      try { window.localStorage.setItem(key, value); } catch (_) { /* Session-only when storage is blocked/full. */ }
      apply();
    }
  };
  if (media) {
    var changed = function () { if (preference === 'system') apply(); };
    if (media.addEventListener) media.addEventListener('change', changed);
    else if (media.addListener) media.addListener(changed);
  }
  window.addEventListener('storage', function (event) {
    if (event.key === key || event.key === null) {
      // Ignore unrelated storage areas; accessing localStorage can itself throw.
      try { if (event.storageArea && event.storageArea !== window.localStorage) return; } catch (_) { return; }
      preference = read();
      apply();
    }
  });
  apply();
})();
