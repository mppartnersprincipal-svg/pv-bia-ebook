(() => {
  'use strict';

  const config = window.BIA_CONFIG || {};
  const scriptRequests = new Map();
  const pixelId = typeof config.META_PIXEL_ID === 'string' ? config.META_PIXEL_ID.trim() : '';
  const pixelEnabled = /^\d+$/.test(pixelId);
  let videoTracked = false;

  function httpsURL(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value.trim());
      return url.protocol === 'https:' && !url.username && !url.password ? url : null;
    } catch {
      return null;
    }
  }

  function loadScript(src) {
    if (scriptRequests.has(src)) return scriptRequests.get(src);
    const request = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Script indisponível: ' + src));
      document.head.append(script);
    });
    scriptRequests.set(src, request);
    return request;
  }

  function track(event) {
    if (pixelEnabled && typeof window.fbq === 'function') {
      try {
        window.fbq('track', event);
      } catch {
        // Uma falha de rastreamento não deve interromper a navegação.
      }
    }
  }

  function setupPixel() {
    if (!pixelEnabled) return;
    if (typeof window.fbq !== 'function') {
      const fbq = function () {
        if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
        else fbq.queue.push(arguments);
      };
      fbq.queue = [];
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = '2.0';
      window.fbq = fbq;
      window._fbq = window._fbq || fbq;
      loadScript('https://connect.facebook.net/en_US/fbevents.js').catch(() => {});
    }
    window.fbq('init', pixelId);
    track('PageView');
  }

  function trackPlayback() {
    if (videoTracked) return;
    videoTracked = true;
    track('ViewContent');
  }

  function disableLink(link) {
    link.removeAttribute('href');
    link.setAttribute('aria-disabled', 'true');
    link.setAttribute('tabindex', '-1');
  }

  function enableLink(link, url) {
    link.href = url.href;
    link.removeAttribute('aria-disabled');
    link.removeAttribute('tabindex');
    link.removeAttribute('role');
  }

  function setupCheckout() {
    const checkout = httpsURL(config.CHECKOUT_URL);
    if (checkout) {
      const incoming = new URLSearchParams(window.location.search);
      const utmKeys = new Set([...incoming.keys()].filter((key) => /^utm_/i.test(key)));
      utmKeys.forEach((key) => {
        checkout.searchParams.delete(key);
        incoming.getAll(key).forEach((value) => checkout.searchParams.append(key, value));
      });
    }

    document.querySelectorAll('[data-checkout]').forEach((link) => {
      if (checkout) enableLink(link, checkout);
      else disableLink(link);
      const onClick = (event) => {
        if (!checkout) {
          event.preventDefault();
          return;
        }
        if (event.type !== 'auxclick' || event.button === 1) track('InitiateCheckout');
      };
      link.addEventListener('click', onClick);
      link.addEventListener('auxclick', onClick);
    });
  }

  function setupLegalLinks() {
    document.querySelectorAll('[data-legal]').forEach((link) => {
      const key = link.dataset.legal === 'terms' ? 'TERMS_URL' : 'PRIVACY_URL';
      const url = httpsURL(config[key]);
      if (url) enableLink(link, url);
      else disableLink(link);
    });
  }

  function setupTestimonials() {
    const mount = document.getElementById('testimonials-mount');
    const template = document.getElementById('testimonials-template');
    if (!mount || !template || config.SHOW_TESTIMONIALS !== true) return;
    const testimonials = Array.isArray(config.TESTIMONIALS)
      ? config.TESTIMONIALS.filter((item) => item && item.authorized === true
        && typeof item.text === 'string' && item.text.trim()
        && typeof item.name === 'string' && item.name.trim()).slice(0, 5)
      : [];
    if (testimonials.length < 3) return;
    const section = template.content.cloneNode(true);
    const grid = section.querySelector('.testimonials-grid');
    if (!grid) return;
    testimonials.forEach((item) => {
      const card = document.createElement('figure');
      card.className = 'testimonial-card';
      const quote = document.createElement('blockquote');
      quote.className = 'testimonial-quote';
      quote.textContent = item.text;
      const name = document.createElement('figcaption');
      name.className = 'testimonial-name';
      name.textContent = item.name;
      card.append(quote, name);
      grid.append(card);
    });
    mount.replaceChildren(section);
  }

  // Aceita caminho relativo dentro do site (ex.: assets/ebook/capa.webp) ou URL HTTPS.
  function imageSource(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    const trimmed = value.trim();
    if (/^[\w-]+(?:\/[\w.-]+)*\.(?:webp|avif|jpe?g|png)$/i.test(trimmed) && !trimmed.includes('..')) return trimmed;
    const url = httpsURL(trimmed);
    return url ? url.href : null;
  }

  function setupEbookPreview() {
    const images = config.EBOOK_PREVIEW_IMAGES && typeof config.EBOOK_PREVIEW_IMAGES === 'object'
      ? config.EBOOK_PREVIEW_IMAGES : {};
    const slots = [...document.querySelectorAll('[data-ebook-page]')].map((figure) => ({
      figure,
      src: imageSource(images[figure.dataset.ebookPage])
    })).filter((slot) => slot.src);
    if (!slots.length) return;

    // A moldura só é trocada depois que a imagem carrega; se o arquivo faltar, ela permanece.
    function load({ figure, src }) {
      const placeholder = figure.querySelector('.ebook-page-placeholder');
      if (!placeholder) return;
      const image = new Image();
      image.className = 'ebook-page-image';
      image.width = 600;
      image.height = 800;
      image.decoding = 'async';
      image.alt = figure.dataset.alt || '';
      image.addEventListener('load', () => {
        placeholder.replaceWith(image);
        figure.dataset.loaded = 'true';
      }, { once: true });
      image.src = src;
    }

    if (!('IntersectionObserver' in window)) {
      slots.forEach(load);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const slot = slots.find((item) => item.figure === entry.target);
        if (slot) load(slot);
      });
    }, { rootMargin: '600px 0px' });
    slots.forEach((slot) => observer.observe(slot.figure));
  }

  function setupStickyCTA() {
    const hero = document.getElementById('hero');
    const offer = document.getElementById('oferta');
    const sticky = document.getElementById('sticky-cta');
    if (!hero || !offer || !sticky) return;
    // O CSS adapta a reserva ao breakpoint sem esperar pelo próximo frame de JS.
    document.body.classList.add('has-sticky-cta');
    const mobile = window.matchMedia('(max-width: 767px)');
    let scheduled = false;
    function update() {
      scheduled = false;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const heroBottom = hero.getBoundingClientRect().bottom;
      const offerRect = offer.getBoundingClientRect();
      const offerVisible = offerRect.top < viewportHeight && offerRect.bottom > 0;
      sticky.hidden = !(mobile.matches && heroBottom <= 0 && !offerVisible);
    }
    function schedule() {
      if (!scheduled) {
        scheduled = true;
        window.requestAnimationFrame(update);
      }
    }
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(schedule, { threshold: 0 });
      observer.observe(hero);
      observer.observe(offer);
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('pageshow', schedule);
    if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
    update();
  }

  function videoSource(value) {
    const url = httpsURL(value);
    if (!url) return null;
    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split('/').filter(Boolean);
    const youtubeHosts = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'];
    if (youtubeHosts.includes(host) || host === 'youtu.be') {
      const id = host === 'youtu.be' ? parts[0]
        : parts[0] === 'watch' ? url.searchParams.get('v')
          : ['embed', 'shorts', 'live'].includes(parts[0]) ? parts[1] : '';
      if (/^[\w-]{11}$/.test(id || '')) return { provider: 'youtube', id };
    }
    if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)) {
      const idIndex = parts[0] === 'video' ? 1 : 0;
      const id = parts[idIndex];
      const hash = url.searchParams.get('h') || parts[idIndex + 1] || '';
      if (/^\d+$/.test(id || '') && /^[a-zA-Z0-9]*$/.test(hash)) {
        return { provider: 'vimeo', id, hash };
      }
    }
    if (/^player-[a-z0-9-]+\.tv\.pandavideo\.com\.br$/.test(host)) {
      const id = url.searchParams.get('v');
      if (/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id || '')) {
        return { provider: 'panda', id, origin: url.origin };
      }
    }
    return null;
  }

  function youtubeReady() {
    if (window.YT && typeof window.YT.Player === 'function') return Promise.resolve();
    return new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      const timer = window.setTimeout(() => reject(new Error('YouTube API indisponível')), 15000);
      window.onYouTubeIframeAPIReady = () => {
        window.clearTimeout(timer);
        resolve();
        if (typeof previous === 'function') previous();
      };
      loadScript('https://www.youtube.com/iframe_api').catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
    });
  }

  function embedURL(source) {
    let url;
    if (source.provider === 'youtube') {
      url = new URL('https://www.youtube-nocookie.com/embed/' + source.id);
      url.search = new URLSearchParams({ enablejsapi: '1', autoplay: '0', mute: '1', controls: '1', playsinline: '1', rel: '0' });
      if (/^https?:$/.test(window.location.protocol)) url.searchParams.set('origin', window.location.origin);
    } else if (source.provider === 'vimeo') {
      url = new URL('https://player.vimeo.com/video/' + source.id);
      url.search = new URLSearchParams({ autoplay: '0', muted: '1', controls: '1', playsinline: '1', dnt: '1' });
      if (source.hash) url.searchParams.set('h', source.hash);
    } else {
      url = new URL('/embed/', source.origin);
      url.search = new URLSearchParams({
        v: source.id, autoplay: 'true', muted: 'true', smartAutoplay: 'false',
        controls: 'play-large,play,progress,current-time,volume,captions,settings,fullscreen',
        hideControlsOnStart: 'false', alternativeProgress: 'false', color: '#0E3452'
      });
    }
    return url;
  }

  function setupVideo() {
    const shell = document.getElementById('vsl-shell');
    const facade = document.getElementById('vsl-facade');
    const placeholder = document.getElementById('vsl-placeholder');
    const container = document.getElementById('vsl-player');
    if (!shell || !facade || !placeholder || !container) return;
    shell.dataset.aspect = config.VSL_ASPECT_RATIO === '9:16' ? '9:16' : '16:9';
    const source = videoSource(config.VSL_URL);
    facade.hidden = !source;
    placeholder.hidden = Boolean(source);
    if (!source) return;

    facade.addEventListener('click', async () => {
      const iframe = document.createElement('iframe');
      iframe.id = 'vsl-embed';
      iframe.title = 'Mais perto de você — Beatriz Machado';
      iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.tabIndex = 0;
      const url = embedURL(source);

      if (source.provider === 'panda') {
        const receivePandaEvent = (event) => {
          if (event.origin !== url.origin || event.source !== iframe.contentWindow) return;
          if (event.data && typeof event.data === 'object' && event.data.message === 'panda_play') {
            trackPlayback();
            window.removeEventListener('message', receivePandaEvent);
          }
        };
        window.addEventListener('message', receivePandaEvent);
      }

      iframe.src = url.href;
      container.replaceChildren(iframe);
      shell.dataset.playing = 'true';
      facade.hidden = true;
      iframe.focus({ preventScroll: true });

      try {
        if (source.provider === 'youtube') {
          await youtubeReady();
          new window.YT.Player(iframe, {
            events: {
              onReady: ({ target }) => {
                target.mute();
                target.playVideo();
              },
              onStateChange: ({ data }) => { if (data === 1) trackPlayback(); }
            }
          });
        } else if (source.provider === 'vimeo') {
          if (!window.Vimeo || typeof window.Vimeo.Player !== 'function') {
            await loadScript('https://player.vimeo.com/api/player.js');
          }
          const player = new window.Vimeo.Player(iframe);
          player.on('playing', trackPlayback);
          await player.ready();
          await player.setMuted(true);
          await player.play();
        }
      } catch {
        // Os controles nativos continuam disponíveis se a API ou o autoplay falhar.
      }
    }, { once: true });
  }

  // Entrada suave ao rolar. Só esconde algo quando o JS e o IntersectionObserver estão
  // disponíveis e não há preferência por movimento reduzido; sem JS, tudo fica visível.
  function setupReveal() {
    const items = document.querySelectorAll('[data-reveal]');
    if (!items.length || !('IntersectionObserver' in window)) return;
    if (!window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
    items.forEach((item) => {
      if (item.getBoundingClientRect().top < viewportHeight) item.classList.add('is-visible');
      else observer.observe(item);
    });
    document.documentElement.classList.add('reveal-ready');
  }

  setupPixel();
  setupCheckout();
  setupLegalLinks();
  setupTestimonials();
  setupEbookPreview();
  setupVideo();
  setupStickyCTA();
  setupReveal();
})();
