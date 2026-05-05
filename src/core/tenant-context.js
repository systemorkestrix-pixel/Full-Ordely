import { BASE_SITE_SETTINGS, normalizeSiteSettings } from './site-settings.js';
import {
  getCategories,
} from "../features/categories/category.service.js";
import {
  getProducts,
} from "../features/products/product.service.js";
import {
  ensureSiteSettingsRow,
  ensureSiteStatsRow,
  getSettings,
} from "../features/settings/settings.service.js";
import {
  createTenant,
  getStorefrontBySlug,
  getTenantByOwner,
  getTenantBySlug,
  provisionTenantContext,
} from "../features/tenant/tenant.service.js";

let cachedStorefrontContext = null;
let cachedAdminTenant = null;

function isMissingRpcError(error, functionName) {
  const message = String(error?.message || '');
  const details = String(error?.details || '');
  return error?.code === 'PGRST202'
    || message.includes(functionName)
    || details.includes(functionName);
}

function createSchemaNotReadyError(sourceError) {
  const error = new Error('tenant_schema_not_ready');
  error.cause = sourceError;
  return error;
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeTenantSlug(value) {
  return slugify(value);
}

export function getStoreSlugFromPath(pathname = window.location.pathname) {
  const pathParts = String(pathname || '')
    .split('/')
    .filter(Boolean);

  if (pathParts[0] === 's' && pathParts[1]) {
    return decodeURIComponent(pathParts[1]).trim().toLowerCase();
  }

  const querySlug = new URLSearchParams(window.location.search).get('slug');
  return querySlug ? normalizeTenantSlug(querySlug) : '';
}

export function clearTenantContextCache() {
  cachedStorefrontContext = null;
  cachedAdminTenant = null;
}

async function ensureTenantSupportRowsDirect({ tenantId }) {
  const basePayload = {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
  };

  const { error: settingsError } = await ensureSiteSettingsRow(basePayload);

  if (settingsError) {
    throw settingsError;
  }

  const { error: statsError } = await ensureSiteStatsRow(basePayload);

  if (statsError) {
    throw statsError;
  }
}

async function reserveTenantSlug({ ownerUserId, baseSlug }) {
  let candidateSlug = baseSlug || 'store';
  let slugSuffix = 0;

  while (slugSuffix < 50) {
    const { data, error } = await createTenant({ owner_user_id: ownerUserId, slug: candidateSlug });

    if (!error) {
      return data;
    }

    const errorMessage = String(error?.message || '').toLowerCase();
    const errorDetails = String(error?.details || '').toLowerCase();
    const isSlugConflict = error?.code === '23505'
      || errorMessage.includes('duplicate key')
      || errorDetails.includes('slug');

    if (!isSlugConflict) {
      throw error;
    }

    slugSuffix += 1;
    candidateSlug = `${baseSlug || 'store'}-${slugSuffix}`;
  }

  throw new Error('tenant_slug_unavailable');
}

async function loadStorefrontContextDirect({ normalizedSlug }) {
  const { data: tenant, error: tenantError } = await getTenantBySlug(normalizedSlug);

  if (tenantError) {
    throw tenantError;
  }

  if (!tenant) {
    throw new Error('store_not_found');
  }

  const [settingsRes, categoriesRes, productsRes] = await Promise.all([
    getSettings(tenant.id),
    getCategories(tenant.id),
    getProducts(tenant.id),
  ]);

  if (settingsRes.error) {
    throw settingsRes.error;
  }

  if (categoriesRes.error) {
    throw categoriesRes.error;
  }

  if (productsRes.error) {
    throw productsRes.error;
  }

  return {
    tenant,
    slug: normalizedSlug,
    siteSettings: normalizeSiteSettings(settingsRes.data || BASE_SITE_SETTINGS),
    categories: Array.isArray(categoriesRes.data) ? categoriesRes.data : [],
    products: Array.isArray(productsRes.data) ? productsRes.data : [],
  };
}

async function loadAdminTenantContextDirect({ session, requestedSlug, force = false }) {
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error('not_authenticated');
  }

  if (!force && cachedAdminTenant?.owner_user_id === userId) {
    return cachedAdminTenant;
  }

  const { data: existingTenant, error: tenantLookupError } = await getTenantByOwner(userId);

  if (tenantLookupError) {
    throw tenantLookupError;
  }

  const tenant = existingTenant || await reserveTenantSlug({
    ownerUserId: userId,
    baseSlug: requestedSlug,
  });

  await ensureTenantSupportRowsDirect({
    tenantId: tenant.id,
  });

  cachedAdminTenant = tenant;
  return tenant;
}

export async function loadStorefrontContext({ slug = getStoreSlugFromPath(), force = false } = {}) {
  const normalizedSlug = normalizeTenantSlug(slug);
  if (!normalizedSlug) {
    throw new Error('store_slug_required');
  }

  if (!force && cachedStorefrontContext?.tenant?.slug === normalizedSlug) {
    return cachedStorefrontContext;
  }

  let context;

  try {
    const { data, error } = await getStorefrontBySlug(normalizedSlug);

    if (error) {
      throw error;
    }

    context = {
      tenant: data?.tenant || null,
      slug: normalizedSlug,
      siteSettings: normalizeSiteSettings(data?.site_settings || BASE_SITE_SETTINGS),
      categories: Array.isArray(data?.categories) ? data.categories : [],
      products: Array.isArray(data?.products) ? data.products : [],
    };
  } catch (error) {
    if (!isMissingRpcError(error, 'get_storefront')) {
      throw error;
    }

    try {
      context = await loadStorefrontContextDirect({ normalizedSlug });
    } catch (fallbackError) {
      throw createSchemaNotReadyError(fallbackError);
    }
  }

  cachedStorefrontContext = context;
  return context;
}

export async function loadAdminTenantContext({
  session,
  slugHint = '',
  force = false,
}) {
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error('not_authenticated');
  }

  if (!force && cachedAdminTenant?.owner_user_id === userId) {
    return cachedAdminTenant;
  }

  const emailLocalPart = String(session.user.email || '')
    .split('@')[0]
    .trim();
  const requestedSlug = normalizeTenantSlug(slugHint || emailLocalPart || `store-${userId.slice(0, 8)}`);

  try {
    const { data, error } = await provisionTenantContext({
      requested_slug: requestedSlug,
    });

    if (error) {
      throw error;
    }

    cachedAdminTenant = data || null;
    return cachedAdminTenant;
  } catch (error) {
    if (!isMissingRpcError(error, 'provision_tenant_context')) {
      throw error;
    }

    try {
      return await loadAdminTenantContextDirect({
        session,
        requestedSlug,
        force,
      });
    } catch (fallbackError) {
      throw createSchemaNotReadyError(fallbackError);
    }
  }
}
