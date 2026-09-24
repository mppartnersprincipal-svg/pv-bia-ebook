/* Preencha os endereços definitivos antes de divulgar a página. */
window.BIA_CONFIG = Object.freeze({
  CHECKOUT_URL: '',
  VSL_URL: '',
  VSL_ASPECT_RATIO: '16:9', // '16:9' ou '9:16'
  META_PIXEL_ID: '',
  SHOW_TESTIMONIALS: false,
  // Somente depoimentos reais, com autorização: { text, name, authorized: true }.
  // O bloco aparece apenas com 3 a 5 depoimentos válidos e a flag ativada.
  TESTIMONIALS: [],
  // Páginas do e-book na seção "Veja por dentro". Deixe '' enquanto a imagem não existir:
  // o slot mostra uma moldura de página. Ex.: capa: 'assets/ebook/capa.webp'. Ver assets/ebook/LEIAME.txt.
  EBOOK_PREVIEW_IMAGES: Object.freeze({
    capa: '',
    'dia-1': '',
    'dia-2-tabela': '',
    'dia-7-mapa': ''
  }),
  TERMS_URL: '',
  PRIVACY_URL: ''
});
