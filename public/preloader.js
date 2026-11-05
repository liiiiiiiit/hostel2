(() => {
  const overlay = document.getElementById('site-preloader');
  if (!overlay) return;
  const labels = { fa: ['در حال آماده‌سازی سایت', 'تلاش دوباره'], en: ['Preparing your stay', 'Try again'], ru: ['Загрузка сайта', 'Попробовать снова'], hy: ['Կայքը բեռնվում է', 'Փորձել կրկին'] };
  let language = location.pathname.split('/')[1];
  if (!labels[language]) {
    try { language = localStorage.getItem('yerevanhub_lang') || 'fa'; } catch { language = 'fa'; }
  }
  const label = labels[language] || labels.fa;
  document.getElementById('preloader-label').textContent = label[0];
  const retry = document.getElementById('preloader-retry');
  retry.textContent = label[1];
  retry.href = location.href;
  const retryTimer = setTimeout(() => { retry.hidden = false; }, 12000);
  let finishing = false;
  const imageReady = image => image.complete ? Promise.resolve() : new Promise(resolve => {
    image.addEventListener('load', resolve, { once: true });
    image.addEventListener('error', resolve, { once: true });
  });
  document.addEventListener('yerevanhub:ready', async () => {
    if (finishing) return;
    finishing = true;
    let assetTimer;
    const assets = [
      document.fonts ? document.fonts.ready : Promise.resolve(),
      ...Array.from(document.querySelectorAll('#root img[loading="eager"], #root .discovery-photo img')).map(imageReady)
    ];
    await Promise.race([
      Promise.allSettled(assets),
      new Promise(resolve => { assetTimer = setTimeout(resolve, 4000); })
    ]);
    clearTimeout(assetTimer);
    clearTimeout(retryTimer);
    overlay.remove();
  }, { once: true });
})();
