import { sanitizeSlug, isSlugDuplicate } from '../utils/seo';
import {
  Product,
  ProductCategory,
  Post,
  PostCategory,
  ContactMessage,
  Order,
  TelegramConfig,
  BotActivityLog,
  SiteContent,
  SlugRedirect,
} from '../types';
import {
  FullOnivalCloudState,
  createInitialSeedState,
  DEFAULT_ADMIN_CREDENTIALS,
  DEFAULT_PRODUCTS,
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_POSTS,
  DEFAULT_POST_CATEGORIES,
  DEFAULT_CONTACT_MESSAGES,
  DEFAULT_ORDERS,
  DEFAULT_TELEGRAM_CONFIG,
  DEFAULT_BOT_LOGS,
  DEFAULT_SITE_CONTENT,
} from './seedData';

const LOCAL_BACKUP_KEY = 'onival_host_persistent_state_v1';
const ADMIN_SESSION_STORAGE_KEY = 'onival_admin_session_token_v1';

let memoryCache: FullOnivalCloudState | null = null;

export function getAdminSessionToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setAdminSessionToken(token: string) {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function clearAdminSessionToken() {
  setAdminSessionToken('');
}

export function hasAdminSession(): boolean {
  return Boolean(getAdminSessionToken());
}

function normalizeState(partial?: Partial<FullOnivalCloudState> | null): FullOnivalCloudState {
  const seed = createInitialSeedState();
  if (!partial || typeof partial !== 'object') return seed;

  return {
    products:
      Array.isArray(partial.products) && partial.products.length > 0
        ? partial.products
        : seed.products,
    productCategories:
      Array.isArray(partial.productCategories) && partial.productCategories.length > 0
        ? partial.productCategories
        : seed.productCategories,
    posts:
      Array.isArray(partial.posts) && partial.posts.length > 0
        ? partial.posts
        : seed.posts,
    postCategories:
      Array.isArray(partial.postCategories) && partial.postCategories.length > 0
        ? partial.postCategories
        : seed.postCategories,
    contactMessages: Array.isArray(partial.contactMessages)
      ? partial.contactMessages
      : seed.contactMessages,
    orders: Array.isArray(partial.orders) ? partial.orders : seed.orders,
    telegramConfig: {
      ...DEFAULT_TELEGRAM_CONFIG,
      ...(partial.telegramConfig || {}),
    },
    botActivityLogs:
      Array.isArray(partial.botActivityLogs) && partial.botActivityLogs.length > 0
        ? partial.botActivityLogs
        : DEFAULT_BOT_LOGS,
    siteContent: {
      ...DEFAULT_SITE_CONTENT,
      ...(partial.siteContent || {}),
      paymentConfig: {
        ...DEFAULT_SITE_CONTENT.paymentConfig,
        ...(partial.siteContent?.paymentConfig || {}),
      },
      consultationConfig: {
        ...DEFAULT_SITE_CONTENT.consultationConfig,
        ...(partial.siteContent?.consultationConfig || {}),
      },
    },
    adminCredentials: {
      ...DEFAULT_ADMIN_CREDENTIALS,
      ...(partial.adminCredentials || {}),
    },
    slugRedirects: Array.isArray(partial.slugRedirects) ? partial.slugRedirects : [],
  };
}

export function readLocalBackup(): FullOnivalCloudState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch {
    return null;
  }
}

export function writeLocalBackup(state: FullOnivalCloudState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function getCachedLocalState(): FullOnivalCloudState {
  if (!memoryCache) {
    memoryCache = readLocalBackup() || createInitialSeedState();
  }
  return memoryCache;
}

/**
 * ذخیره کل وضعیت سایت در سرور هاست
 */
export async function saveStateToHostServer(state: FullOnivalCloudState): Promise<boolean> {
  memoryCache = state;
  writeLocalBackup(state);

  try {
    const token = getAdminSessionToken();
    const res = await window.fetch('/api/host/import-state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(state),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * اطمینان از وجود داده‌ها در سرور هاست به محض لود شدن برنامه
 */
export async function ensureHostSeededOnBoot(): Promise<{
  state: FullOnivalCloudState;
  wasSeededNow: boolean;
  source: 'host' | 'seeded' | 'local';
}> {
  try {
    // تلاش برای دریافت وضعیت کامل از سرور اختصاصی هاست
    const token = getAdminSessionToken();
    const res = await window.fetch('/api/host/export-state', {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (res.ok) {
      const serverState = await res.json();
      if (serverState && Array.isArray(serverState.products) && serverState.products.length > 0) {
        const normalized = normalizeState(serverState);
        memoryCache = normalized;
        writeLocalBackup(normalized);
        return { state: normalized, wasSeededNow: false, source: 'host' };
      }
    }

    // در صورتی که سرور هنوز دیتایی نداشت، از seed اولیه استفاده کرده و آن را در سرور ذخیره می‌کنیم
    const local = readLocalBackup() || createInitialSeedState();
    memoryCache = local;
    writeLocalBackup(local);
    await saveStateToHostServer(local);
    return { state: local, wasSeededNow: true, source: 'seeded' };
  } catch {
    const fallback = readLocalBackup() || createInitialSeedState();
    memoryCache = fallback;
    return { state: fallback, wasSeededNow: false, source: 'local' };
  }
}

/**
 * بازنشانی دستی دیتابیس یا تزریق مجدد محصولات پیش‌فرض روی سرور هاست
 */
export async function runManualSeedDatabase(options?: {
  resetAllToDefault?: boolean;
}): Promise<{ ok: boolean; state: FullOnivalCloudState; message: string }> {
  const current = memoryCache || readLocalBackup() || createInitialSeedState();
  let nextState: FullOnivalCloudState;

  if (options?.resetAllToDefault) {
    nextState = createInitialSeedState();
  } else {
    const existingIds = new Set(current.products.filter((p) => !p.isDelete).map((p) => p.id));
    const mergedProducts = [...current.products.filter((p) => !p.isDelete)];
    for (const defProd of DEFAULT_PRODUCTS) {
      if (!existingIds.has(defProd.id)) {
        mergedProducts.push(defProd);
      }
    }

    nextState = {
      ...current,
      products: mergedProducts.length > 0 ? mergedProducts : DEFAULT_PRODUCTS,
      productCategories:
        current.productCategories.length > 0
          ? current.productCategories
          : DEFAULT_PRODUCT_CATEGORIES,
      posts: current.posts.length > 0 ? current.posts : DEFAULT_POSTS,
      postCategories:
        current.postCategories.length > 0 ? current.postCategories : DEFAULT_POST_CATEGORIES,
      adminCredentials: {
        username: current.adminCredentials?.username || DEFAULT_ADMIN_CREDENTIALS.username,
        email: current.adminCredentials?.email || DEFAULT_ADMIN_CREDENTIALS.email,
        password: current.adminCredentials?.password || DEFAULT_ADMIN_CREDENTIALS.password,
        name: current.adminCredentials?.name || DEFAULT_ADMIN_CREDENTIALS.name,
      },
    };
  }

  const saved = await saveStateToHostServer(nextState);

  return {
    ok: true,
    state: nextState,
    message: saved
      ? 'داده‌های اولیه و محصولات پیش‌فرض با موفقیت در دیسک هاست شما ذخیره شدند.'
      : 'داده‌های اولیه ایجاد و در حافظه موقت محلی ذخیره شدند.',
  };
}

/**
 * تابع اصلی فراخوانی API متصل مستقیم به سرور Express هاست لینوکسی
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlStr =
    typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  if (!urlStr.startsWith('/api/')) {
    return window.fetch(input, init);
  }

  const token = getAdminSessionToken();
  const headers = new Headers(init?.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const enrichedInit: RequestInit = {
    ...init,
    headers,
  };

  const response = await window.fetch(input, enrichedInit);

  // در صورت موفقیت لاگین یا تغییر رمز، توکن را ذخیره می‌کنیم
  if (
    response.ok &&
    (urlStr.startsWith('/api/admin/login') || urlStr.startsWith('/api/account/change-credentials'))
  ) {
    try {
      const cloned = await response.clone().json();
      if (cloned?.token) {
        setAdminSessionToken(cloned.token);
      }
    } catch {
      // ignore
    }
  }

  return response;
}
