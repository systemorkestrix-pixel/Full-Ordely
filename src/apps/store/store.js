import { DEMO_STOREFRONT_CONTEXT } from '../demo/demo-store.js';
import { STORE_UI_TEXT } from '../../shared/constants/ui-text.ar.js';
import { renderIcon } from '../../shared/ui/visual/icons.js';
import { hydrateStorePageCopy } from './store.copy.js';
import { runtimeGuard, state, setState } from './store.state.js';
import {
  buildContactLink,
  createOrder,
  generateMessage,
  getStoreSlugFromPath,
  hasSupabaseConfig,
  loadStorefrontContext,
  normalizePhoneNumber,
  trackProductClick,
  trackSiteVisit,
} from '../../features/storefront/storefront.service.js';
const ALL_CATEGORY_KEY = '__all__';
const VISIT_SESSION_KEY = 'ordely-site-visit-tracked-v2';
const SOCIAL_PLATFORMS = STORE_UI_TEXT.socialPlatforms;
const ACTION_PLATFORMS = STORE_UI_TEXT.actionPlatforms;
const ORDER_CHANNEL_PRIORITY = ['whatsapp_url', 'phone_number', 'messenger_url', 'telegram_url'];
const ORDER_CHANNEL_LABELS = STORE_UI_TEXT.orderChannelLabels;
const heroSection = document.getElementById('heroSection');
const heroImage = document.getElementById('heroImage');
const categoryBar = document.querySelector('.store-categories');
const categoryContainer = document.getElementById('categoryContainer');
const productsContainer = document.getElementById('productsContainer');
const socialLinksContainer = document.getElementById('socialLinks');
const stickyBottomBar = document.getElementById('stickyBottomBar');
const serviceAreaBanner = document.getElementById('serviceAreaBanner');
const serviceAreaText = document.getElementById('serviceAreaText');
const siteToastStack = document.getElementById('siteToastStack');
const orderModal = document.getElementById('orderModal');
const btnCloseOrderModal = document.getElementById('btnCloseOrderModal');
const orderForm = document.getElementById('orderForm');
const orderProductIdInput = document.getElementById('orderProductId');
const orderProductName = document.getElementById('orderProductName');
const orderProductMeta = document.getElementById('orderProductMeta');
const orderMessagePreview = document.getElementById('orderMessagePreview');
const orderMessageText = document.getElementById('orderMessageText');
const orderCustomerName = document.getElementById('orderCustomerName');
const orderCustomerPhone = document.getElementById('orderCustomerPhone');
const orderQuantity = document.getElementById('orderQuantity');
const orderCustomerNameError = document.getElementById('orderCustomerNameError');
const orderCustomerPhoneError = document.getElementById('orderCustomerPhoneError');
const orderQuantityError = document.getElementById('orderQuantityError');
const btnSubmitOrder = document.getElementById('btnSubmitOrder');
hydrateStorePageCopy();
runtimeGuard.assertUiConsistency('store', ['.store-shell', '#productsContainer']);
function createIconSpan(iconName) {
  const iconSpan = document.createElement('span');
  iconSpan.className = 'store-platform-icon';
  iconSpan.setAttribute('aria-hidden', 'true');
  iconSpan.innerHTML = renderIcon(iconName, 'ui-icon');
  return iconSpan;
}
function formatPrice(value) {
  const parsedValue = Number(value) || 0;
  return STORE_UI_TEXT.price(parsedValue);
}
function getProductUrl(product) {
  const slug = state.session.tenant?.slug || 'demo';
  const productUrl = new URL(`/s/${slug}`, window.location.origin);
  if (product?.id) {
    productUrl.searchParams.set('product', String(product.id));
  }
  return productUrl.toString();
}
function getPrimaryOrderChannel() {
  return ORDER_CHANNEL_PRIORITY
    .map((key) => ACTION_PLATFORMS.find((platform) => platform.key === key))
    .find((platform) => platform && buildContactLink(platform.key, state.entities.siteSettings[platform.key]));
}
function getPrimaryOrderChannelLabel() {
  const primaryChannel = getPrimaryOrderChannel();
  return primaryChannel ? ORDER_CHANNEL_LABELS[primaryChannel.key] || primaryChannel.label : '';
}
function getOrderButtonText() {
  const channelLabel = getPrimaryOrderChannelLabel();
  return STORE_UI_TEXT.orderButton(channelLabel);
}
function getOrderSubmitLabel() {
  const channelLabel = getPrimaryOrderChannelLabel();
  return STORE_UI_TEXT.orderSubmitLabel(channelLabel);
}
function buildOrderMessage(product) {
  return generateMessage('', {
    product_name: product?.name || '',
    product_price: formatPrice(product?.price),
    product_url: getProductUrl(product),
  });
}
function updateOrderMessagePreview(product) {
  const message = buildOrderMessage(product);
  if (!message || !orderMessagePreview || !orderMessageText) {
    return;
  }
  orderMessageText.textContent = message;
  orderMessagePreview.hidden = false;
}
function openPrimaryOrderChannel(message) {
  const primaryChannel = getPrimaryOrderChannel();
  if (!primaryChannel) {
    return false;
  }
  const href = buildContactLink(primaryChannel.key, state.entities.siteSettings[primaryChannel.key], { message });
  if (!href) {
    return false;
  }
  window.open(href, primaryChannel.key === 'phone_number' ? '_self' : '_blank', 'noopener,noreferrer');
  return true;
}
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  const toastTitle = document.createElement('strong');
  const toastMessage = document.createElement('p');
  toast.className = `store-toast store-toast--${type}`;
  toastTitle.textContent = STORE_UI_TEXT.toastTitle(type);
  toastMessage.textContent = message;
  toast.append(toastTitle, toastMessage);
  siteToastStack.appendChild(toast);
  window.setTimeout(() => {
    toast.remove();
  }, 3200);
}

function setFieldError(input, slot, message = '') {
  if (!input || !slot) return;
  const hasError = Boolean(message);
  input.setAttribute('aria-invalid', String(hasError));
  slot.hidden = !hasError;
  slot.textContent = message;
}

function clearOrderFieldErrors() {
  setFieldError(orderCustomerName, orderCustomerNameError, '');
  setFieldError(orderCustomerPhone, orderCustomerPhoneError, '');
  setFieldError(orderQuantity, orderQuantityError, '');
}
function applyHeroSettings() {
  const heroImageUrl = state.entities.siteSettings.hero_image_url || '';
  if (!heroImage) {
    return;
  }
  if (!heroImageUrl) {
    heroImage.hidden = true;
    heroImage.removeAttribute('src');
    heroSection.classList.remove('store-hero--has-media');
    return;
  }
  heroImage.src = heroImageUrl;
  heroImage.hidden = false;
  heroSection.classList.add('store-hero--has-media');
}
function renderServiceArea() {
  const locationParts = [state.entities.siteSettings.service_country, state.entities.siteSettings.service_region].filter(Boolean);
  if (!locationParts.length) {
    serviceAreaBanner.hidden = true;
    serviceAreaText.textContent = '';
    return;
  }
  serviceAreaBanner.hidden = false;
  serviceAreaText.textContent = STORE_UI_TEXT.serviceArea(locationParts.join(' - '));
}
function renderSocialLinks() {
  socialLinksContainer.replaceChildren();
  const visiblePlatforms = SOCIAL_PLATFORMS
    .map((platform) => ({
      ...platform,
      href: buildContactLink(platform.key, state.entities.siteSettings[platform.key]),
    }))
    .filter((platform) => platform.href);
  if (visiblePlatforms.length === 0) {
    socialLinksContainer.hidden = true;
    return;
  }
  visiblePlatforms.forEach((platform) => {
    const link = document.createElement('a');
    link.href = platform.href;
    link.className = `store-social-link store-social-link--${platform.className}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('aria-label', platform.label);
    link.title = platform.label;
    link.appendChild(createIconSpan(platform.icon));
    socialLinksContainer.appendChild(link);
  });
  socialLinksContainer.hidden = false;
}
function renderActionButtons() {
  stickyBottomBar.replaceChildren();
  const actions = ACTION_PLATFORMS
    .map((platform) => {
      const href = buildContactLink(platform.key, state.entities.siteSettings[platform.key]);
      if (!href) {
        return null;
      }
      return {
        href,
        label: platform.label,
        className: platform.className,
        icon: platform.icon,
        external: platform.key !== 'phone_number',
      };
    })
    .filter(Boolean);
  document.body.classList.toggle('store-has-sticky-actions', actions.length > 0);
  if (actions.length === 0) {
    stickyBottomBar.hidden = true;
    return;
  }
  actions.forEach((action) => {
    const link = document.createElement('a');
    link.href = action.href;
    link.className = `store-btn store-action-button store-btn--${action.icon}`;
    link.setAttribute('aria-label', action.label);
    link.title = action.label;
    if (action.external) {
      link.target = '_blank';
      link.rel = 'noopener';
    }
    link.appendChild(createIconSpan(action.icon));
    stickyBottomBar.appendChild(link);
  });
  stickyBottomBar.hidden = false;
}
function renderCategories() {
  categoryContainer.replaceChildren();
  if (!state.entities.categories.length) {
    categoryBar.hidden = true;
    return;
  }
  categoryBar.hidden = false;
  const categoryItems = [
    { id: ALL_CATEGORY_KEY, name: STORE_UI_TEXT.allCategory, icon: '🏠' },
    ...state.entities.categories,
  ];
  categoryItems.forEach((category) => {
    const categoryValue = category.id === ALL_CATEGORY_KEY ? ALL_CATEGORY_KEY : category.name;
    const item = document.createElement('div');
    const icon = document.createElement('div');
    const label = document.createElement('span');
    item.className = `store-category-item ${categoryValue === state.ui.activeCategory ? 'store-category-item--active' : ''}`;
    item.addEventListener('click', () => {
      runtimeGuard.trackEvent('store.category.select');
      runtimeGuard.trace('STORE_CATEGORY_SELECTED', { category: categoryValue });
      setState({ ui: { activeCategory: categoryValue } });
      document.querySelectorAll('.store-category-item').forEach((node) => node.classList.remove('store-category-item--active'));
      item.classList.add('store-category-item--active');
      renderProducts();
    });
    icon.className = 'store-category-icon';
    icon.textContent = category.icon || '🍽️';
    label.className = 'store-category-label';
    label.textContent = category.name;
    item.append(icon, label);
    categoryContainer.appendChild(item);
  });
}
function buildProductCard(product) {
  const card = document.createElement('div');
  const imageWrap = document.createElement('div');
  const priceBadge = document.createElement('div');
  const info = document.createElement('div');
  const title = document.createElement('h3');
  card.className = 'store-product-card';
  imageWrap.className = 'store-product-image-wrap';
  priceBadge.className = 'store-product-price';
  priceBadge.textContent = formatPrice(product.price);
  info.className = 'store-product-info';
  title.className = 'store-product-name';
  title.textContent = product.name;
  if (product.image_url) {
    const image = document.createElement('img');
    image.className = 'store-product-image';
    image.src = product.image_url;
    image.alt = product.name;
    image.loading = 'lazy';
    imageWrap.appendChild(image);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'store-product-image-placeholder';
    placeholder.textContent = STORE_UI_TEXT.noImage;
    imageWrap.appendChild(placeholder);
  }
  imageWrap.prepend(priceBadge);
  info.appendChild(title);
  if (state.entities.siteSettings.orders_enabled) {
    const orderButton = document.createElement('button');
    orderButton.type = 'button';
    orderButton.className = 'store-btn store-product-button';
    orderButton.textContent = getOrderButtonText();
    orderButton.addEventListener('click', () => {
      openOrderModal(product.id);
    });
    info.appendChild(orderButton);
  }
  card.append(imageWrap, info);
  return card;
}
function renderProducts() {
  productsContainer.replaceChildren();
  const filteredProducts = state.ui.activeCategory && state.ui.activeCategory !== ALL_CATEGORY_KEY
    ? state.entities.products.filter((product) => product.category === state.ui.activeCategory)
    : state.entities.products;
  if (filteredProducts.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'store-empty-state';
    emptyState.textContent = state.ui.activeCategory && state.ui.activeCategory !== ALL_CATEGORY_KEY
      ? STORE_UI_TEXT.noProductsInCategory
      : STORE_UI_TEXT.noProductsAvailable;
    productsContainer.appendChild(emptyState);
    return;
  }
  filteredProducts.forEach((product) => {
    productsContainer.appendChild(buildProductCard(product));
  });
}
function renderStorefront() {
  setState({ ui: { activeCategory: state.entities.categories.length ? ALL_CATEGORY_KEY : null } });
  applyHeroSettings();
  renderServiceArea();
  renderSocialLinks();
  renderActionButtons();
  renderCategories();
  renderProducts();
}
function renderStoreNotFound() {
  if (heroImage) {
    heroImage.hidden = true;
    heroImage.removeAttribute('src');
  }
  heroSection.classList.remove('store-hero--has-media');
  categoryBar.hidden = true;
  socialLinksContainer.hidden = true;
  stickyBottomBar.hidden = true;
  serviceAreaBanner.hidden = true;
  productsContainer.replaceChildren();
  const emptyState = document.createElement('div');
  emptyState.className = 'store-empty-state';
  emptyState.innerHTML = `
    <div class="store-empty-state-content">
      <p>${STORE_UI_TEXT.storeNotFound}</p>
      <div class="store-empty-state-actions">
        <a href="/" class="store-empty-state-link">العودة للرئيسية</a>
        <a href="/s/demo" class="store-empty-state-link">عرض متجر تجريبي</a>
      </div>
    </div>
  `;
  productsContainer.appendChild(emptyState);
}
function setOrderStep(stepNumber) {
  const step1 = document.getElementById('orderStep1');
  const step2 = document.getElementById('orderStep2');
  if (!step1 || !step2) return;
  step1.classList.remove('active', 'is-done');
  step2.classList.remove('active', 'is-done');
  if (stepNumber === 1) {
    step1.classList.add('active');
  } else if (stepNumber === 2) {
    step1.classList.add('is-done');
    step2.classList.add('active');
  }
}

function openOrderModal(productId) {
  const product = state.entities.products.find((item) => String(item.id) === String(productId));
  if (!product || !state.entities.siteSettings.orders_enabled) {
    return;
  }
  runtimeGuard.trace('ORDER_MODAL_OPENED', { productId: product.id });
  setState({ ui: { currentOrderProduct: product } });
  orderProductIdInput.value = String(product.id);
  orderProductName.textContent = product.name;
  orderProductMeta.textContent = `${formatPrice(product.price)} • ${product.category}`;
  btnSubmitOrder.textContent = getOrderSubmitLabel();
  clearOrderFieldErrors();
  updateOrderMessagePreview(product);
  orderQuantity.value = '1';
  setOrderStep(1);
  orderModal.classList.remove('hidden');
  orderModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('store-order-modal-open');
  window.requestAnimationFrame(() => {
    orderCustomerName.focus();
  });
  if (hasSupabaseConfig && state.session.tenant?.slug) {
    trackProductClick({
      store_slug: state.session.tenant.slug,
      target_product_id: product.id,
    }).then(() => {
      runtimeGuard.trace('PRODUCT_CLICK_TRACKED', { productId: product.id });
    }).catch((error) => {
      console.error('Error tracking product click:', error);
    });
  }
}
function closeOrderModal({ reset = false } = {}) {
  orderModal.classList.add('hidden');
  orderModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('store-order-modal-open');
  if (reset) {
    orderForm.reset();
    orderQuantity.value = '1';
    orderMessagePreview.hidden = true;
    orderMessageText.textContent = '';
    setState({ ui: { currentOrderProduct: null } });
    orderProductIdInput.value = '';
    clearOrderFieldErrors();
  }
}
async function trackSiteVisitOnce() {
  if (!hasSupabaseConfig || !state.session.tenant?.slug || state.session.tenant.id === 'demo-tenant') {
    return;
  }
  const visitKey = `${VISIT_SESSION_KEY}:${state.session.tenant.slug}`;
  if (window.sessionStorage.getItem(visitKey)) {
    return;
  }
  await trackSiteVisit({
    store_slug: state.session.tenant.slug,
  });
  window.sessionStorage.setItem(visitKey, '1');
}
async function loadStore() {
  const slug = getStoreSlugFromPath();
  if (slug === 'demo') {
    setState({
      session: { tenant: DEMO_STOREFRONT_CONTEXT.tenant },
      entities: {
        siteSettings: DEMO_STOREFRONT_CONTEXT.siteSettings,
        categories: [...DEMO_STOREFRONT_CONTEXT.categories],
        products: [...DEMO_STOREFRONT_CONTEXT.products],
      },
    });
    runtimeGuard.trace('STOREFRONT_DEMO_LOADED', {
      products: state.entities.products.length,
      categories: state.entities.categories.length,
    });
    renderStorefront();
    return;
  }
  if (!hasSupabaseConfig && window.location.pathname !== '/s/demo') {
    renderStoreNotFound();
    return;
  }
  try {
    const storefrontContext = await loadStorefrontContext();
    setState({
      session: { tenant: storefrontContext.tenant },
      entities: {
        siteSettings: storefrontContext.siteSettings,
        categories: storefrontContext.categories,
        products: storefrontContext.products,
      },
    });
    runtimeGuard.trace('STOREFRONT_LOADED', {
      tenantId: state.session.tenant?.id || null,
      products: state.entities.products.length,
      categories: state.entities.categories.length,
    });
    renderStorefront();
  } catch (error) {
    console.error('Error loading storefront:', error);
    renderStoreNotFound();
  }
}
function isValidCustomerName(value) {
  const trimmedValue = String(value || '').trim();
  return trimmedValue.length >= 2 && trimmedValue.length <= 120;
}
function isValidCustomerPhone(value) {
  return /^\+?\d{8,16}$/.test(value);
}
function getOrderErrorMessage(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('invalid_customer_name')) {
    return STORE_UI_TEXT.invalidCustomerName;
  }
  if (message.includes('invalid_customer_phone')) {
    return STORE_UI_TEXT.invalidCustomerPhone;
  }
  if (message.includes('invalid_quantity')) {
    return STORE_UI_TEXT.invalidQuantity;
  }
  return STORE_UI_TEXT.orderCreateError;
}
orderModal.addEventListener('click', (event) => {
  if (event.target.dataset.closeOrderModal === 'true') {
    closeOrderModal();
  }
});
btnCloseOrderModal.addEventListener('click', () => {
  runtimeGuard.trackEvent('store.order.close');
  closeOrderModal();
});
orderForm.addEventListener('submit', async (event) => {
  runtimeGuard.trackEvent('store.order.submit');
  event.preventDefault();
  if (!hasSupabaseConfig || !state.entities.siteSettings.orders_enabled || !state.ui.currentOrderProduct || !state.session.tenant?.slug) {
    showToast(STORE_UI_TEXT.orderCreateError, 'error');
    return;
  }
  const customerName = orderCustomerName.value.trim();
  const customerPhone = normalizePhoneNumber(orderCustomerPhone.value);
  const quantityValue = Number.parseInt(orderQuantity.value, 10);
  clearOrderFieldErrors();
  if (!customerName || !customerPhone || Number.isNaN(quantityValue) || quantityValue < 1) {
    if (!customerName) {
      setFieldError(orderCustomerName, orderCustomerNameError, STORE_UI_TEXT.completeInfoBeforeConfirm);
    }
    if (!customerPhone) {
      setFieldError(orderCustomerPhone, orderCustomerPhoneError, STORE_UI_TEXT.completeInfoBeforeConfirm);
    }
    if (Number.isNaN(quantityValue) || quantityValue < 1) {
      setFieldError(orderQuantity, orderQuantityError, STORE_UI_TEXT.completeInfoBeforeConfirm);
    }
    showToast(STORE_UI_TEXT.completeInfoBeforeConfirm, 'error');
    return;
  }
  if (!isValidCustomerName(customerName)) {
    setFieldError(orderCustomerName, orderCustomerNameError, STORE_UI_TEXT.invalidNameBeforeConfirm);
    showToast(STORE_UI_TEXT.invalidNameBeforeConfirm, 'error');
    return;
  }
  if (!isValidCustomerPhone(customerPhone)) {
    setFieldError(orderCustomerPhone, orderCustomerPhoneError, STORE_UI_TEXT.invalidPhoneBeforeConfirm);
    showToast(STORE_UI_TEXT.invalidPhoneBeforeConfirm, 'error');
    return;
  }
  if (quantityValue > 99) {
    setFieldError(orderQuantity, orderQuantityError, STORE_UI_TEXT.quantityRange);
    showToast(STORE_UI_TEXT.quantityRange, 'error');
    return;
  }
  const defaultButtonLabel = getOrderSubmitLabel();
  btnSubmitOrder.disabled = true;
  btnSubmitOrder.textContent = STORE_UI_TEXT.sendingOrder;
  try {
    const { error } = await createOrder({
      store_slug: state.session.tenant.slug,
      target_product_id: state.ui.currentOrderProduct.id,
      customer_name_input: customerName,
      customer_phone_input: customerPhone,
      order_quantity: quantityValue,
    });
    if (error) {
      throw error;
    }
    runtimeGuard.trace('ORDER_CREATED', {
      productId: state.ui.currentOrderProduct.id,
      storeSlug: state.session.tenant.slug,
    });
    const orderMessage = buildOrderMessage(state.ui.currentOrderProduct);
    const hasOpenedChannel = openPrimaryOrderChannel(orderMessage);
    showToast(
      hasOpenedChannel
        ? STORE_UI_TEXT.orderRegisteredWithChannel
        : STORE_UI_TEXT.orderSent(state.ui.currentOrderProduct.name)
    );
    closeOrderModal({ reset: true });
  } catch (error) {
    console.error('Error creating order:', error);
    showToast(getOrderErrorMessage(error), 'error');
  } finally {
    btnSubmitOrder.disabled = false;
    btnSubmitOrder.textContent = defaultButtonLabel;
  }
});
document.addEventListener('keydown', (event) => {
  runtimeGuard.trackEvent('store.keydown');
  if (event.key === 'Escape' && !orderModal.classList.contains('hidden')) {
    closeOrderModal();
  }
});
document.addEventListener('DOMContentLoaded', async () => {
  await loadStore();
  trackSiteVisitOnce().catch((error) => {
    console.error('Error tracking site visit:', error);
  });
});
