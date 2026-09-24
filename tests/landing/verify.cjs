/* Local browser acceptance checks. Run: node tests/landing/verify.cjs
 * Uses an existing Playwright install; override PLAYWRIGHT_MODULE if needed.
 * Network fixtures validate integrations without contacting checkout or Meta.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
function loadPlaywright() {
  try { return require(process.env.PLAYWRIGHT_MODULE || 'playwright'); }
  catch (error) {
    if (process.env.PLAYWRIGHT_MODULE) throw error;
    return require(path.join(os.homedir(), '.claude/skills/gstack/node_modules/playwright'));
  }
}
const { chromium } = loadPlaywright();

const root = path.resolve(__dirname, '../..');
const publicRoot = path.join(root, 'deploy');
const artifacts = path.join(__dirname, 'artifacts');
const checks = [];
const baselineConfig = {
  CHECKOUT_URL: '', VSL_URL: '', VSL_ASPECT_RATIO: '16:9', META_PIXEL_ID: '',
  SHOW_TESTIMONIALS: false, TESTIMONIALS: [], TERMS_URL: '', PRIVACY_URL: '',
  EBOOK_PREVIEW_IMAGES: { capa: '', 'dia-1': '', 'dia-2-tabela': '', 'dia-7-mapa': '' },
};
const ebookSlots = ['capa', 'dia-1', 'dia-2-tabela', 'dia-7-mapa'];
const blockOrder = ['topbar', 'hero', 'identification', 'mechanism', 'proof', 'benefits', 'value-stack', 'offer', 'recap', 'guarantee', 'faq', 'closing', 'site-footer'];
const copyPath = path.join(root, 'Ebook/Copy Página de Vendas - Ebook Bia.txt');
// Visitor-facing lines of the copy: drops editorial markers (block headers, comments, rules) and markdown syntax.
function copyLines() {
  return fs.readFileSync(copyPath, 'utf8').split(/\r?\n/).map(line => line.trim()).filter(line =>
    line && line !== '---' && line !== '**Rodapé**'
    && !/^# Copy da Página/.test(line) && !/^## \d{2} · /.test(line) && !/^Estrutura:/.test(line) && !/^<!--/.test(line)
  ).map(line => line
    .replace(/^>\s*/, '').replace(/^#{1,6}\s+/, '').replace(/^-\s+/, '')
    .replace(/\[BOTÃO\]\s*/, '').replace(/\*\*/g, '').replace(/\*/g, ''));
}
const normalize = value => value.replace(/\s+/g, ' ').trim();
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png', '.jpg': 'image/jpeg', '.txt': 'text/plain; charset=utf-8' };

function findAxe() {
  if (process.env.AXE_SCRIPT) return process.env.AXE_SCRIPT;
  try { return require.resolve('axe-core/axe.min.js'); } catch {}
  const cache = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData/Local'), 'npm-cache/_npx');
  if (!fs.existsSync(cache)) return null;
  return fs.readdirSync(cache).map(name => path.join(cache, name, 'node_modules/axe-core/axe.min.js')).find(filename => fs.existsSync(filename)) || null;
}

async function scanAxe(page, filename) {
  const script = findAxe();
  assert.ok(script, 'axe-core unavailable: set AXE_SCRIPT to an existing axe.min.js');
  await page.addScriptTag({ path: script });
  const result = await page.evaluate(() => window.axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
  }));
  fs.writeFileSync(path.join(artifacts, filename), JSON.stringify({ version: result.testEngine.version, violations: result.violations, incomplete: result.incomplete }, null, 2));
  assert.deepEqual(result.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })), []);
  return { version: result.testEngine.version, violations: result.violations.length, manualReview: result.incomplete.map(item => item.id) };
}

async function check(name, action) {
  try { const details = await action(); checks.push({ name, ok: true, ...(details ? { details } : {}) }); console.log(`PASS ${name}`); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
}

function serve(req, res) {
  let filename;
  try {
    const url = new URL(req.url, 'http://localhost');
    filename = path.resolve(publicRoot, `.${decodeURIComponent(url.pathname)}`);
    if (filename !== publicRoot && !filename.startsWith(publicRoot + path.sep)) throw Error('Invalid path');
    if (fs.statSync(filename).isDirectory()) filename = path.join(filename, 'index.html');
    res.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
    res.end(fs.readFileSync(filename));
  } catch { res.writeHead(404); res.end('Not found'); }
}

async function fixture(browser, base, overrides = null, viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  const requests = [];
  const errors = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  if (overrides !== null) {
    await page.route('**/config.js', route => route.fulfill({
      contentType: 'text/javascript',
      body: `window.BIA_CONFIG=Object.freeze(${JSON.stringify({ ...baselineConfig, ...overrides })});`,
    }));
  }
  await page.route('**/connect.facebook.net/**', route => route.fulfill({ contentType: 'text/javascript', body: `
    window.__metaCalls=(window.fbq?.queue||[]).map(value=>Array.from(value));
    window.fbq=function(...args){window.__metaCalls.push(args);};
  ` }));
  await page.route('https://www.youtube.com/iframe_api', route => route.fulfill({ contentType: 'text/javascript', body: `
    window.YT={PlayerState:{PLAYING:1},Player:function(element, options){
      window.__youtubeStateChange=options.events.onStateChange;
      this.getIframe=()=>document.querySelector('#vsl-player iframe');
      this.destroy=()=>{};
    }};
    window.onYouTubeIframeAPIReady?.();
  ` }));
  await page.route(/https:\/\/(www\.)?youtube(-nocookie)?\.com\/embed\//, route => route.fulfill({ contentType: 'text/html', body: '<html><body>Video fixture</body></html>' }));
  await page.route('https://player.vimeo.com/api/player.js', route => route.fulfill({ contentType: 'text/javascript', body: `
    window.Vimeo={Player:function(){
      this.on=(name,callback)=>{(window.__vimeoListeners??={})[name]=callback;};
      this.ready=()=>Promise.resolve();this.setMuted=value=>{window.__vimeoMuted=value;return Promise.resolve();};
      this.play=()=>Promise.resolve();this.destroy=()=>{};
    }};
  ` }));
  await page.route('https://player.vimeo.com/video/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body>Video fixture</body></html>' }));
  await page.route('https://player-vz-test.tv.pandavideo.com.br/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body>Video fixture</body></html>' }));
  // Test-only e-book page image; real files live in deploy/mais-perto-de-voce/assets/ebook/.
  await page.route('**/assets/ebook/qa-capa.webp', route => route.fulfill({ contentType: 'image/webp', body: fs.readFileSync(path.join(publicRoot, 'mais-perto-de-voce/assets/bia-480.webp')) }));
  await page.route('https://checkout.example.test/**', route => route.fulfill({ contentType: 'text/html', body: 'Checkout fixture' }));
  const suffix = '?utm_source=instagram&utm_medium=paid&utm_campaign=sete%20dias&utm_content=criativo-a&utm_content=criativo-b&unrelated=private';
  await page.goto(`${base}/mais-perto-de-voce/${suffix}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  return { context, page, requests, errors };
}

async function run() {
  fs.mkdirSync(artifacts, { recursive: true });
  const server = http.createServer(serve);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const defaultCase = await fixture(browser, base);
    const { page, requests, errors } = defaultCase;
    await check('Default placeholders do not load Meta or video providers', async () => {
      assert.deepEqual(await page.evaluate(() => ({
        CHECKOUT_URL: window.BIA_CONFIG.CHECKOUT_URL,
        VSL_URL: window.BIA_CONFIG.VSL_URL,
        META_PIXEL_ID: window.BIA_CONFIG.META_PIXEL_ID,
        SHOW_TESTIMONIALS: window.BIA_CONFIG.SHOW_TESTIMONIALS,
      })), { CHECKOUT_URL: '', VSL_URL: '', META_PIXEL_ID: '', SHOW_TESTIMONIALS: false });
      assert.equal(requests.filter(url => /facebook|youtube|vimeo|pandavideo|\/assets\/ebook\//i.test(url)).length, 0);
      assert.equal(await page.locator('iframe').count(), 0);
      assert.equal(await page.locator('#testimonials-mount').innerText(), '');
      assert.equal(await page.locator('#testimonials-mount blockquote').count(), 0);
      for (const link of await page.locator('[data-checkout]').all()) {
        assert.equal(await link.getAttribute('href'), null);
        assert.equal(await link.getAttribute('aria-disabled'), 'true');
      }
      assert.deepEqual(errors, []);
    });
    await check('Approved copy is present literally and in order, excluding editorial markers and hidden social proof', async () => {
      await page.locator('details').evaluateAll(elements => elements.forEach(element => { element.open = true; }));
      const body = normalize(await page.locator('body').innerText());
      await page.locator('details').evaluateAll(elements => elements.forEach(element => { element.open = false; }));
      const expected = copyLines();
      const missing = expected.filter(line => !body.includes(normalize(line)));
      assert.deepEqual(missing, []);
      // Order: every line after the byline must appear after the previous one.
      let cursor = 0;
      const outOfOrder = [];
      for (const line of expected.slice(1)) {
        const index = body.indexOf(normalize(line), cursor);
        if (index < 0) outOfOrder.push(line); else cursor = index + normalize(line).length;
      }
      assert.deepEqual(outOfOrder, []);
      for (const removed of ['Talvez você se reconheça aqui', 'Não é para você se', 'Sete dias. Uma lente por dia.', '— R$37,90', 'O que dizem as primeiras leitoras']) {
        assert.equal(body.includes(removed), false, `Outdated copy still visible: ${removed}`);
      }
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(normalize(await page.locator('h1').innerText()), 'Você sabe que não deveria reagir daquele jeito. Mas, na hora, reage.');
      assert.equal(await page.locator('html').getAttribute('lang'), 'pt-BR');
      assert.ok(await page.title());
      for (const image of await page.locator('img').all()) assert.notEqual(await image.getAttribute('alt'), null);
      return { lines: expected.length };
    });
    await check('Twelve copy blocks in order with stable classes, landmarks and heading hierarchy', async () => {
      const structure = await page.evaluate(() => ({
        blocks: [...document.querySelectorAll('.topbar, main > section, .site-footer')].map(element => element.classList[0]),
        landmarks: ['header', 'main', 'footer'].map(tag => document.querySelectorAll(tag).length),
        headings: [...document.querySelectorAll('h1, h2, h3, h4')].filter(element => element.getClientRects().length).map(element => Number(element.tagName[1])),
        proofParts: ['.proof .ebook-preview', '.proof .proof-note', '.proof .author', '.proof #testimonials-mount'].map(selector => document.querySelectorAll(selector).length),
        offerId: document.querySelector('.offer')?.id,
        ctas: [...document.querySelectorAll('[data-checkout]')].map(element => ({ block: element.closest('section, aside')?.classList[0], text: element.textContent.replace(/\s+/g, ' ').trim() })),
      }));
      assert.deepEqual(structure.blocks, blockOrder);
      assert.deepEqual(structure.landmarks, [1, 1, 1]);
      assert.deepEqual(structure.proofParts, [1, 1, 1, 1]);
      assert.equal(structure.offerId, 'oferta');
      structure.headings.forEach((level, index) => {
        if (index) assert.ok(level <= structure.headings[index - 1] + 1, `Heading level jumps to h${level} at position ${index}`);
      });
      assert.deepEqual(structure.ctas, [
        { block: 'hero', text: 'QUERO COMEÇAR OS 7 DIAS' },
        { block: 'value-stack', text: 'QUERO COMEÇAR OS 7 DIAS' },
        { block: 'offer', text: 'QUERO COMEÇAR OS 7 DIAS' },
        { block: 'closing', text: 'TIREI MINHAS DÚVIDAS, QUERO COMEÇAR' },
        { block: 'sticky-cta', text: 'QUERO COMEÇAR OS 7 DIAS' },
      ]);
      const footer = normalize(await page.locator('.site-footer').innerText());
      assert.ok(footer.includes('© 2026 Beatriz Machado. Todos os direitos reservados. · Termos de uso · Política de privacidade'));
      assert.ok(footer.endsWith('Este site não é afiliado ao Facebook ou à Meta.'));
      return structure;
    });
    await check('E-book gallery shows four page frames without images or fake status text by default', async () => {
      const slots = await page.locator('.ebook-page').evaluateAll(elements => elements.map(element => ({
        slot: element.dataset.ebookPage,
        placeholder: element.querySelectorAll('.ebook-page-placeholder').length,
        placeholderHidden: element.querySelector('.ebook-page-placeholder')?.getAttribute('aria-hidden'),
        label: element.querySelector('.ebook-page-label')?.textContent,
        caption: element.querySelector('figcaption')?.textContent,
        images: element.querySelectorAll('img').length,
        visible: element.getBoundingClientRect().height > 0,
      })));
      assert.deepEqual(slots.map(slot => slot.slot), ebookSlots);
      assert.deepEqual(slots.map(slot => slot.label), ['Capa', 'Dia 1', 'Dia 2', 'Dia 7']);
      assert.deepEqual(slots.map(slot => slot.caption), ['Capa', 'Dia 1 · Do rótulo para a cena', 'Dia 2 · Tabela', 'Dia 7 · Mapa Pessoal']);
      for (const slot of slots) {
        assert.equal(slot.placeholder, 1);
        assert.equal(slot.placeholderHidden, 'true');
        assert.equal(slot.images, 0);
        assert.equal(slot.visible, true);
      }
      assert.equal(/em breve|imagem indispon/i.test(await page.locator('.ebook-preview').innerText()), false);
      return slots;
    });
    for (const [width, height] of [[360, 800], [390, 844], [768, 1024], [1280, 900], [360, 640]]) {
      await check(`Responsive layout ${width}x${height}`, async () => {
        await page.setViewportSize({ width, height });
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForTimeout(120);
        const dimensions = await page.evaluate(() => ({
          viewportWidth: innerWidth, scrollWidth: document.documentElement.scrollWidth,
          hero: document.querySelector('#hero').getBoundingClientRect().toJSON(),
          headline: document.querySelector('h1').getBoundingClientRect().toJSON(),
          video: document.querySelector('#vsl-shell').getBoundingClientRect().toJSON(),
          cta: document.querySelector('#hero [data-checkout]').getBoundingClientRect().toJSON(),
          brokenImages: [...document.images].filter(image => image.complete && !image.naturalWidth).map(image => image.src),
        }));
        assert.ok(dimensions.scrollWidth <= width, `Horizontal overflow: ${dimensions.scrollWidth}px`);
        assert.deepEqual(dimensions.brokenImages, []);
        assert.ok(dimensions.headline.top >= 0 && dimensions.video.bottom <= height && dimensions.cta.bottom <= height,
          `Headline, VSL and CTA must fit the first viewport; CTA ends at ${dimensions.cta.bottom}px for height ${height}px`);
        await page.screenshot({ path: path.join(artifacts, `viewport-${width}x${height}.png`) });
        if (width === 390 || width === 1280) {
          // Visit images so native lazy loading is represented in the full-page artifact.
          for (const image of await page.locator('img[loading="lazy"]').all()) {
            await image.scrollIntoViewIfNeeded();
            await image.evaluate(element => element.decode().catch(() => {}));
          }
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({ path: path.join(artifacts, `full-${width}x${height}.png`), fullPage: true });
        }
        return { ...dimensions, headlineVideoCtaInFirstViewport: dimensions.headline.top >= 0 && dimensions.cta.bottom <= height && dimensions.video.bottom <= height };
      });
    }
    await check('FAQ supports keyboard and visible focus', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      const summary = page.locator('details summary').first();
      assert.equal(await page.locator('details').count(), 8);
      await summary.focus();
      await page.keyboard.press('Enter');
      assert.equal(await summary.evaluate(element => element.parentElement.open), true);
      await page.keyboard.press('Enter');
      assert.equal(await summary.evaluate(element => element.parentElement.open), false);
      const focus = await summary.evaluate(element => { const style = getComputedStyle(element); return { style: style.outlineStyle, width: style.outlineWidth }; });
      assert.ok(focus.style !== 'none' && parseFloat(focus.width) >= 2);
    });
    await check('WCAG AA automated scan with empty production configuration', () => scanAxe(page, 'axe-default.json'));
    await defaultCase.context.close();

    await check('Marketing content and native FAQ remain usable without JavaScript', async () => {
      const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
      const noJS = await context.newPage();
      await noJS.goto(`${base}/mais-perto-de-voce/`);
      assert.equal(await noJS.locator('h1').count(), 1);
      assert.ok((await noJS.locator('body').innerText()).includes('Beatriz Machado · Psicóloga Clínica · CRP 09/16582'));
      assert.equal(await noJS.locator('details').count(), 8);
      assert.equal(await noJS.locator('.ebook-page-placeholder').count(), 4);
      assert.ok((await noJS.locator('.site-footer').innerText()).includes('Este site não é afiliado ao Facebook ou à Meta.'));
      await noJS.locator('details summary').first().click();
      assert.equal(await noJS.locator('details').first().getAttribute('open'), '');
      assert.ok((await noJS.locator('details').first().innerText()).includes('não substitui acompanhamento psicológico'));
      assert.equal(await noJS.locator('#hero [data-checkout]').getAttribute('href'), null);
      assert.equal(await noJS.locator('#sticky-cta').isVisible(), false);
      await context.close();
    });

    const configured = await fixture(browser, base, {
      CHECKOUT_URL: 'https://checkout.example.test/product?offer=A&utm_source=old#payment', META_PIXEL_ID: '123456789012345',
      VSL_URL: 'https://www.youtube.com/watch?v=abcDEF12345',
      TERMS_URL: 'https://example.test/terms', PRIVACY_URL: 'https://example.test/privacy',
    });
    const cp = configured.page;
    await cp.screenshot({ path: path.join(artifacts, 'configured-390x844.png') });
    await check('Configured checkout preserves repeated UTMs, existing query and fragment', async () => {
      for (const element of await cp.locator('[data-checkout]').all()) {
        const url = new URL(await element.getAttribute('href'));
        assert.equal(url.origin, 'https://checkout.example.test');
        assert.equal(url.searchParams.get('offer'), 'A');
        assert.equal(url.hash, '#payment');
        assert.deepEqual(url.searchParams.getAll('utm_source'), ['instagram']);
        assert.deepEqual(url.searchParams.getAll('utm_content'), ['criativo-a', 'criativo-b']);
        assert.equal(url.searchParams.get('utm_campaign'), 'sete dias');
        assert.equal(url.searchParams.has('unrelated'), false);
        assert.notEqual(await element.getAttribute('aria-disabled'), 'true');
      }
    });
    await check('Sticky mobile CTA appears past hero, hides while price is visible and on desktop', async () => {
      const sticky = cp.locator('#sticky-cta');
      await cp.evaluate(() => scrollTo(0, 0));
      await cp.waitForTimeout(120);
      assert.equal(await sticky.isVisible(), false);
      await cp.evaluate(() => scrollTo(0, document.querySelector('#hero').getBoundingClientRect().bottom + scrollY + 16));
      await cp.waitForTimeout(120);
      assert.equal(await sticky.isVisible(), true);
      await cp.locator('#oferta').scrollIntoViewIfNeeded();
      await cp.waitForTimeout(120);
      assert.equal(await sticky.isVisible(), false);
      await cp.setViewportSize({ width: 1280, height: 900 });
      await cp.evaluate(() => scrollTo(0, document.querySelector('#hero').getBoundingClientRect().bottom + scrollY + 16));
      await cp.waitForTimeout(120);
      assert.equal(await sticky.isVisible(), false);
    });
    await check('Mobile footer legal links remain above the fixed purchase bar at page bottom', async () => {
      await cp.setViewportSize({ width: 390, height: 844 });
      await cp.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await cp.waitForTimeout(120);
      assert.equal(await cp.locator('#sticky-cta').isVisible(), true);
      const geometry = await cp.evaluate(() => ({
        stickyTop: document.querySelector('#sticky-cta').getBoundingClientRect().top,
        legal: [...document.querySelectorAll('[data-legal]')].map(element => ({ text: element.textContent, top: element.getBoundingClientRect().top, bottom: element.getBoundingClientRect().bottom })),
      }));
      for (const link of geometry.legal) {
        assert.ok(link.top >= 0 && link.bottom <= geometry.stickyTop, `Covered legal link: ${link.text}`);
      }
      await cp.screenshot({ path: path.join(artifacts, 'footer-390x844.png') });
      return geometry;
    });
    await check('WCAG AA automated scan with configured links, visible sticky CTA and expanded FAQ', async () => {
      await cp.locator('details').evaluateAll(elements => elements.forEach(element => { element.open = true; }));
      const results = await scanAxe(cp, 'axe-configured.json');
      await cp.locator('details').evaluateAll(elements => elements.forEach(element => { element.open = false; }));
      return results;
    });
    await check('Meta PageView once; facade activation does not fire ViewContent; playback does once', async () => {
      const eventCount = name => cp.evaluate(eventName => (window.__metaCalls || []).filter(call => call[0] === 'track' && call[1] === eventName).length, name);
      assert.equal(await eventCount('PageView'), 1);
      assert.equal(await cp.locator('#vsl-player iframe').count(), 0);
      await cp.locator('#vsl-facade').click();
      await cp.waitForFunction(() => typeof window.__youtubeStateChange === 'function');
      assert.equal(await eventCount('ViewContent'), 0);
      const embed = new URL(await cp.locator('#vsl-player iframe').getAttribute('src'));
      assert.notEqual(embed.searchParams.get('autoplay'), '1');
      assert.notEqual(embed.searchParams.get('controls'), '0');
      await cp.evaluate(() => window.__youtubeStateChange({ data: 1 }));
      assert.equal(await eventCount('ViewContent'), 1);
      await cp.evaluate(() => window.__youtubeStateChange({ data: 1 }));
      assert.equal(await eventCount('ViewContent'), 1);
      await cp.evaluate(() => document.addEventListener('click', event => {
        if (event.target.closest('[data-checkout]')) event.preventDefault();
      }));
      await cp.locator('#hero [data-checkout]').click();
      assert.equal(await eventCount('InitiateCheckout'), 1);
    });
    await check('Configured legal links are correct', async () => {
      assert.equal(await cp.locator('[data-legal="terms"]').getAttribute('href'), 'https://example.test/terms');
      assert.equal(await cp.locator('[data-legal="privacy"]').getAttribute('href'), 'https://example.test/privacy');
      assert.deepEqual(configured.errors, []);
    });
    await configured.context.close();

    await check('Vimeo unlisted URL keeps privacy hash and tracks playing rather than click', async () => {
      const vimeo = await fixture(browser, base, { VSL_URL: 'https://vimeo.com/123456789/abc123def', META_PIXEL_ID: '123456789012345', VSL_ASPECT_RATIO: '9:16' });
      assert.equal(await vimeo.page.locator('#vsl-shell').getAttribute('data-aspect'), '9:16');
      await vimeo.page.locator('#vsl-facade').click();
      await vimeo.page.waitForFunction(() => typeof window.__vimeoListeners?.playing === 'function');
      const source = new URL(await vimeo.page.locator('#vsl-embed').getAttribute('src'));
      assert.equal(source.searchParams.get('h'), 'abc123def');
      assert.equal(await vimeo.page.evaluate(() => window.__metaCalls.filter(call => call[1] === 'ViewContent').length), 0);
      await vimeo.page.evaluate(() => window.__vimeoListeners.playing());
      assert.equal(await vimeo.page.evaluate(() => window.__metaCalls.filter(call => call[1] === 'ViewContent').length), 1);
      assert.equal(await vimeo.page.evaluate(() => window.__vimeoMuted), true);
      assert.deepEqual(vimeo.errors, []);
      await vimeo.context.close();
    });

    await check('Panda playback tracking accepts only the configured iframe origin and source', async () => {
      const panda = await fixture(browser, base, { VSL_URL: 'https://player-vz-test.tv.pandavideo.com.br/embed/?v=00000000-1111-2222-3333-444444444444', META_PIXEL_ID: '123456789012345' });
      await panda.page.locator('#vsl-facade').click();
      assert.equal(await panda.page.evaluate(() => window.__metaCalls.filter(call => call[1] === 'ViewContent').length), 0);
      await panda.page.evaluate(() => {
        const frame = document.querySelector('#vsl-embed');
        window.dispatchEvent(new MessageEvent('message', { origin: 'https://untrusted.example.test', source: frame.contentWindow, data: { message: 'panda_play' } }));
        window.dispatchEvent(new MessageEvent('message', { origin: 'https://player-vz-test.tv.pandavideo.com.br', source: window, data: { message: 'panda_play' } }));
      });
      assert.equal(await panda.page.evaluate(() => window.__metaCalls.filter(call => call[1] === 'ViewContent').length), 0);
      await panda.page.evaluate(() => {
        const frame = document.querySelector('#vsl-embed');
        window.dispatchEvent(new MessageEvent('message', { origin: 'https://player-vz-test.tv.pandavideo.com.br', source: frame.contentWindow, data: { message: 'panda_play' } }));
      });
      assert.equal(await panda.page.evaluate(() => window.__metaCalls.filter(call => call[1] === 'ViewContent').length), 1);
      assert.deepEqual(panda.errors, []);
      await panda.context.close();
    });

    await check('Invalid configuration leaves checkout and video inactive', async () => {
      const invalid = await fixture(browser, base, { CHECKOUT_URL: 'javascript:alert(1)', VSL_URL: 'https://untrusted.example.test/video', META_PIXEL_ID: 'invalid' });
      assert.equal(await invalid.page.locator('#vsl-facade').isVisible(), false);
      assert.equal(await invalid.page.locator('#vsl-placeholder').isVisible(), true);
      assert.equal(await invalid.page.locator('iframe').count(), 0);
      assert.equal(await invalid.page.locator('#hero [data-checkout]').getAttribute('href'), null);
      assert.equal(invalid.requests.filter(url => /facebook|untrusted\.example/i.test(url)).length, 0);
      await invalid.context.close();
    });

    await check('E-book gallery swaps a frame only after its configured image loads', async () => {
      const gallery = await fixture(browser, base, { EBOOK_PREVIEW_IMAGES: {
        capa: 'assets/ebook/qa-capa.webp', 'dia-1': 'assets/ebook/qa-ausente.webp', 'dia-2-tabela': 'javascript:alert(1)', 'dia-7-mapa': '',
      } });
      const gp = gallery.page;
      await gp.locator('.ebook-preview').scrollIntoViewIfNeeded();
      await gp.waitForSelector('[data-ebook-page="capa"][data-loaded="true"]');
      await gp.waitForLoadState('networkidle');
      const slots = await gp.locator('.ebook-page').evaluateAll(elements => elements.map(element => ({
        slot: element.dataset.ebookPage,
        placeholder: element.querySelectorAll('.ebook-page-placeholder').length,
        image: element.querySelector('img') ? { alt: element.querySelector('img').alt, expected: element.dataset.alt, width: element.querySelector('img').naturalWidth } : null,
      })));
      assert.equal(slots[0].placeholder, 0);
      assert.ok(slots[0].image && slots[0].image.width > 0);
      assert.equal(slots[0].image.alt, slots[0].image.expected);
      assert.ok(slots[0].image.alt.length > 10);
      for (const slot of slots.slice(1)) { assert.equal(slot.placeholder, 1); assert.equal(slot.image, null); }
      assert.equal(gallery.requests.filter(url => /\/assets\/ebook\//.test(url)).length, 2);
      assert.deepEqual(gallery.errors, []);
      await gp.screenshot({ path: path.join(artifacts, 'ebook-preview-configured.png') });
      await gallery.context.close();
      return slots;
    });

    await check('Testimonials require approved real entries and are rendered safely', async () => {
      const testimonials = Array.from({ length: 3 }, (_, i) => ({ text: `<strong>QA testimony ${i + 1}</strong>`, name: `QA ${i + 1}`, authorized: true }));
      const shown = await fixture(browser, base, { SHOW_TESTIMONIALS: true, TESTIMONIALS: testimonials });
      assert.ok((await shown.page.locator('#testimonials-mount').innerText()).includes(testimonials[0].text));
      assert.equal(await shown.page.locator('#testimonials-mount strong').count(), 0);
      await shown.context.close();
      const unsafe = await fixture(browser, base, { SHOW_TESTIMONIALS: true, TESTIMONIALS: [{ text: 'QA', name: 'QA', authorized: false }] });
      assert.equal(await unsafe.page.locator('#testimonials-mount').innerText(), '');
      await unsafe.context.close();
    });
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(artifacts, 'report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), checks }, null, 2));
  }
  console.log(`${checks.filter(check => check.ok).length}/${checks.length} checks passed`);
  if (checks.some(check => !check.ok)) process.exitCode = 1;
}

run().catch(error => { console.error(error); process.exitCode = 1; });
