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
let currentConnectionStatus: 'connected' | 'offline_fallback' = 'offline_fallback';
const statusListeners = new Set<(status: 'connected' | 'offline_fallback') => void>();

export function getServerConnectionStatus(): 'connected' | 'offline_fallback' {
  return currentConnectionStatus;
}

export function subscribeServerConnectionStatus(
  listener: (status: 'connected' | 'offline_fallback') => void
): () => void {
  statusListeners.add(listener);
  listener(currentConnectionStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

function setConnectionStatus(status: 'connected' | 'offline_fallback') {
  if (currentConnectionStatus !== status) {
    currentConnectionStatus = status;
    statusListeners.forEach((fn) => {
      try {
        fn(status);
      } catch {
        // ignore listener errors
      }
    });
  }
}

export function getAdminSessionToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return (
      window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY) ||
      window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY) ||
      ''
    );
  } catch {
    return '';
  }
}

export function setAdminSessionToken(token: string) {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, token);
      window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
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

export function normalizeState(partial?: Partial<FullOnivalCloudState> | null): FullOnivalCloudState {
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
      productImageSettings: {
        ...DEFAULT_SITE_CONTENT.productImageSettings,
        ...(partial.siteContent?.productImageSettings || {}),
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
    memoryCache = state;
    window.localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function getCachedLocalState(): FullOnivalCloudState {
  if (!memoryCache) {
    const fromDisk = readLocalBackup();
    if (fromDisk) {
      memoryCache = fromDisk;
    } else {
      memoryCache = createInitialSeedState();
      writeLocalBackup(memoryCache);
    }
  }
  return memoryCache;
}

/**
 * ذخیره کل وضعیت سایت در سرور هاست (با ذخیره موازی در LocalStorage)
 */
export async function saveStateToHostServer(state: FullOnivalCloudState): Promise<boolean> {
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
    if (res.ok) {
      setConnectionStatus('connected');
      return true;
    }
  } catch {
    // fallback gracefully to local storage
  }
  return false;
}

/**
 * همگام‌سازی و ارسال فوری کلیه اطلاعات و تغییرات مرورگر به دیتابیس هاست
 * جهت حل مشکل عدم نمایش تغییرات ادمین به سایر مشتریان و دستگاه‌ها
 */
export async function syncAllLocalChangesToHost(): Promise<{ ok: boolean; message: string }> {
  const current = getCachedLocalState();
  const success = await saveStateToHostServer(current);
  if (success) {
    return {
      ok: true,
      message: 'تمامی محصولات، تصاویر، دسته‌بندی‌ها و تنظیمات با موفقیت به سرور هاست ارسال و در دیتابیس پایدار هاست ذخیره شدند. اکنون تمام مشتریان و بازدیدکنندگان روی تمام دستگاه‌ها این تغییرات را به صورت زنده مشاهده می‌کنند.',
    };
  }
  return {
    ok: false,
    message: 'خطا در ارسال مستقیم به سرور هاست. مطمئن شوید فایل api/index.php یا وب‌سرور روی هاست آپلود شده است. داده‌ها موقتاً در مرورگر شما نگهداری می‌شوند.',
  };
}

/**
 * اطمینان از وجود داده‌ها در سرور هاست به محض لود شدن برنامه
 * اگر سرور هاست فعال باشد داده‌ها بارگذاری می‌شوند وگرنه بلافاصله از دیتابیس لوکال استفاده می‌گردد.
 */
export async function ensureHostSeededOnBoot(): Promise<{
  state: FullOnivalCloudState;
  wasSeededNow: boolean;
  source: 'host' | 'seeded' | 'local';
}> {
  // ۱. گارانتی اینکه حافظه محلی همیشه دارای مقادیر پیش‌فرض کامل است
  const local = getCachedLocalState();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const token = getAdminSessionToken();
    const res = await window.fetch('/api/host/export-state', {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const serverState = await res.json();
      if (serverState && Array.isArray(serverState.products) && serverState.products.length > 0) {
        const normalized = normalizeState(serverState);
        writeLocalBackup(normalized);
        setConnectionStatus('connected');
        return { state: normalized, wasSeededNow: false, source: 'host' };
      }
    }

    // اگر سرور پاسخ داد اما هنوز دیتایی نداشت، دیتای اولیه را برای سرور ارسال می‌کنیم
    if (res.ok) {
      await saveStateToHostServer(local);
      setConnectionStatus('connected');
      return { state: local, wasSeededNow: true, source: 'seeded' };
    }
  } catch {
    // اگر سرور در دسترس نبود یا هاست استاتیک بود
    setConnectionStatus('offline_fallback');
  }

  setConnectionStatus('offline_fallback');
  return { state: local, wasSeededNow: false, source: 'local' };
}

/**
 * تست آنلاین بودن سرور اختصاصی هاست
 */
export async function testServerConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const token = getAdminSessionToken();

    // 1. Try public lightweight health endpoint
    const res = await window.fetch('/api/health', {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    }).catch(() => null);

    if (res && res.ok) {
      clearTimeout(timeoutId);
      setConnectionStatus('connected');
      return { connected: true, message: 'ارتباط مستقیم با سرور هاست اختصاصی برقرار و کاملاً فعال است.' };
    }

    // 2. Fallback check on public products
    const resProd = await window.fetch('/api/products', { signal: controller.signal }).catch(() => null);
    clearTimeout(timeoutId);

    if (resProd && resProd.ok) {
      setConnectionStatus('connected');
      return { connected: true, message: 'ارتباط با وب‌سرویس محصولات هاست اختصاصی برقرار و فعال است.' };
    }
  } catch {
    // ignore
  }
  setConnectionStatus('offline_fallback');
  return {
    connected: false,
    message: 'سرور هاست در این لحظه پاسخ نداد. سیستم به صورت خودکار و امن روی دیتابیس مستقل محلی (LocalStorage) فعال است.',
  };
}

/**
 * بازنشانی دستی دیتابیس یا تزریق مجدد محصولات پیش‌فرض
 */
export async function runManualSeedDatabase(options?: {
  resetAllToDefault?: boolean;
}): Promise<{ ok: boolean; state: FullOnivalCloudState; message: string }> {
  const current = getCachedLocalState();
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

  writeLocalBackup(nextState);
  const savedOnHost = await saveStateToHostServer(nextState);

  return {
    ok: true,
    state: nextState,
    message: savedOnHost
      ? 'داده‌های اولیه و محصولات پیش‌فرض با موفقیت در دیسک هاست شما ذخیره شدند.'
      : 'داده‌های اولیه و محصولات پیش‌فرض در حافظه محلی و پایدار مرورگر (LocalStorage) فعال شدند.',
  };
}

/**
 * روتر و شبیه‌ساز مستقل داده‌های کلاینت (Self-Contained Local Storage API Router)
 * این موتور در صورتی که سرور Node در هاست فعال نباشد یا درخواست‌ها ۴۰۴/خطا شوند، تمام عملیات‌های
 * خواندن، نوشتن، ویرایش، حذف، احراز هویت و ذخیره سفارش را مستقیماً روی دیتابیس لوکال بدون توقف انجام می‌دهد.
 */
function handleLocalApiRoute(
  path: string,
  method: string,
  bodyData: any
): { status: number; data: any } {
  const state = getCachedLocalState();
  const cleanPath = path.split('?')[0].replace(/\/+$/, '') || '/';
  const urlParams = new URLSearchParams(path.includes('?') ? path.split('?')[1] : '');

  // 1. ورود ادمین (Admin Login)
  if (cleanPath === '/api/admin/login' && method === 'POST') {
    const { username, password } = bodyData || {};
    const u = String(username || '').trim().toLowerCase();
    const p = String(password || '').trim();

    const currentCreds = state.adminCredentials || DEFAULT_ADMIN_CREDENTIALS;
    const validUser = (currentCreds.username || 'admin').trim().toLowerCase();
    const validEmail = (currentCreds.email || 'admin@onival.com').trim().toLowerCase();
    const validPass = (currentCreds.password || 'admin').trim();

    const isUserMatch = u === validUser || u === validEmail;
    const isPassMatch = isUserMatch && Boolean(validPass) && p === validPass;

    if (isUserMatch && isPassMatch) {
      const token = `local_session_${btoa(`${currentCreds.username}:${Date.now()}`).replace(/=/g, '')}`;
      setAdminSessionToken(token);
      return {
        status: 200,
        data: {
          ok: true,
          success: true,
          token,
          profile: {
            username: currentCreds.username,
            name: currentCreds.name,
            email: currentCreds.email,
          },
          source: 'local_storage',
          message: 'ورود به پنل مدیریت با موفقیت انجام شد.',
        },
      };
    }
    return {
      status: 401,
      data: { ok: false, error: 'نام کاربری یا رمز عبور مدیریت اشتباه است.' },
    };
  }

  // 2. تغییر مشخصات ورود ادمین (Change Credentials)
  if (cleanPath === '/api/account/change-credentials' && method === 'POST') {
    const { username, newUsername, newPassword, password, email, newEmail, name } = bodyData || {};
    const targetUser = (username || newUsername || '').trim();
    const targetPass = (newPassword || password || '').trim();
    const targetEmail = (email || newEmail || '').trim();

    if (!state.adminCredentials) {
      state.adminCredentials = { ...DEFAULT_ADMIN_CREDENTIALS };
    }

    if (targetUser) state.adminCredentials.username = targetUser;
    if (targetPass) state.adminCredentials.password = targetPass;
    if (targetEmail) state.adminCredentials.email = targetEmail;
    if (name) state.adminCredentials.name = String(name).trim();

    writeLocalBackup(state);
    const token = `local_session_${btoa(`${state.adminCredentials.username}:${Date.now()}`).replace(/=/g, '')}`;
    setAdminSessionToken(token);
    return {
      status: 200,
      data: {
        ok: true,
        success: true,
        token,
        profile: {
          username: state.adminCredentials.username,
          email: state.adminCredentials.email,
          name: state.adminCredentials.name,
        },
        message: 'مشخصات حساب مدیریت با موفقیت در دیتابیس محلی ذخیره شد.',
      },
    };
  }

  // 3. پروفایل ادمین (Admin Profile)
  if (cleanPath === '/api/account/profile' && method === 'GET') {
    const creds = state.adminCredentials || DEFAULT_ADMIN_CREDENTIALS;
    return {
      status: 200,
      data: {
        username: creds.username,
        email: creds.email,
        name: creds.name,
      },
    };
  }

  // 4. محصولات (Products)
  if (cleanPath === '/api/products') {
    if (method === 'GET') {
      const activeProds = state.products.filter((p) => !p.isDelete);
      return { status: 200, data: activeProds.length > 0 ? activeProds : DEFAULT_PRODUCTS };
    }
    if (method === 'POST') {
      const maxId = state.products.reduce((acc, p) => Math.max(acc, Number(p.id) || 0), 0);
      const newProduct: Product = {
        ...bodyData,
        id: maxId + 1,
        slug: bodyData.slug || sanitizeSlug(bodyData.title || `product-${maxId + 1}`),
        creationTime: new Date().toLocaleDateString('fa-IR'),
        isDelete: false,
      };
      state.products.push(newProduct);
      writeLocalBackup(state);
      return { status: 200, data: { ok: true, product: newProduct } };
    }
  }

  const productMatch = cleanPath.match(/^\/api\/products\/(\d+)$/);
  if (productMatch) {
    const id = Number(productMatch[1]);
    const idx = state.products.findIndex((p) => p.id === id);
    if (idx !== -1) {
      if (method === 'PUT') {
        state.products[idx] = { ...state.products[idx], ...bodyData, id };
        writeLocalBackup(state);
        return { status: 200, data: { ok: true, product: state.products[idx] } };
      }
      if (method === 'DELETE') {
        state.products[idx].isDelete = true;
        writeLocalBackup(state);
        return { status: 200, data: { ok: true, message: 'محصول حذف شد' } };
      }
    }
    return { status: 404, data: { error: 'محصول یافت نشد' } };
  }

  // 5. دسته‌بندی محصولات (Product Categories)
  if (cleanPath === '/api/product-categories') {
    if (method === 'GET') {
      return {
        status: 200,
        data: state.productCategories.length > 0 ? state.productCategories : DEFAULT_PRODUCT_CATEGORIES,
      };
    }
    if (method === 'POST') {
      const maxId = state.productCategories.reduce((acc, c) => Math.max(acc, Number(c.id) || 0), 0);
      const newCat: ProductCategory = {
        ...bodyData,
        id: maxId + 1,
        slug: bodyData.slug || sanitizeSlug(bodyData.title || `category-${maxId + 1}`),
      };
      state.productCategories.push(newCat);
      writeLocalBackup(state);
      return { status: 200, data: { ok: true, category: newCat } };
    }
  }

  const catMatch = cleanPath.match(/^\/api\/product-categories\/(\d+)$/);
  if (catMatch) {
    const id = Number(catMatch[1]);
    const idx = state.productCategories.findIndex((c) => c.id === id);
    if (idx !== -1) {
      if (method === 'PUT') {
        state.productCategories[idx] = { ...state.productCategories[idx], ...bodyData, id };
        writeLocalBackup(state);
        return { status: 200, data: { ok: true, category: state.productCategories[idx] } };
      }
      if (method === 'DELETE') {
        state.productCategories.splice(idx, 1);
        writeLocalBackup(state);
        return { status: 200, data: { ok: true } };
      }
    }
  }

  // 6. مقالات وبلاگ (Posts)
  if (cleanPath === '/api/posts') {
    if (method === 'GET') {
      const activePosts = state.posts.filter((p) => !p.isDelete);
      return { status: 200, data: activePosts.length > 0 ? activePosts : DEFAULT_POSTS };
    }
    if (method === 'POST') {
      const maxId = state.posts.reduce((acc, p) => Math.max(acc, Number(p.id) || 0), 0);
      const newPost: Post = {
        ...bodyData,
        id: maxId + 1,
        slug: bodyData.slug || sanitizeSlug(bodyData.title || `post-${maxId + 1}`),
        creationTime: new Date().toLocaleDateString('fa-IR'),
        isDelete: false,
      };
      state.posts.push(newPost);
      writeLocalBackup(state);
      return { status: 200, data: { ok: true, post: newPost } };
    }
  }

  const postMatch = cleanPath.match(/^\/api\/posts\/(\d+)$/);
  if (postMatch) {
    const id = Number(postMatch[1]);
    const idx = state.posts.findIndex((p) => p.id === id);
    if (idx !== -1) {
      if (method === 'PUT') {
        state.posts[idx] = { ...state.posts[idx], ...bodyData, id };
        writeLocalBackup(state);
        return { status: 200, data: { ok: true, post: state.posts[idx] } };
      }
      if (method === 'DELETE') {
        state.posts[idx].isDelete = true;
        writeLocalBackup(state);
        return { status: 200, data: { ok: true } };
      }
    }
  }

  // 7. دسته‌بندی مقالات (Post Categories)
  if (cleanPath === '/api/post-categories') {
    if (method === 'GET') {
      return {
        status: 200,
        data: state.postCategories.length > 0 ? state.postCategories : DEFAULT_POST_CATEGORIES,
      };
    }
    if (method === 'POST') {
      const maxId = state.postCategories.reduce((acc, c) => Math.max(acc, Number(c.id) || 0), 0);
      const newCat: PostCategory = {
        ...bodyData,
        id: maxId + 1,
        slug: bodyData.slug || sanitizeSlug(bodyData.title || `post-cat-${maxId + 1}`),
      };
      state.postCategories.push(newCat);
      writeLocalBackup(state);
      return { status: 200, data: { ok: true, category: newCat } };
    }
  }

  const postCatMatch = cleanPath.match(/^\/api\/post-categories\/(\d+)$/);
  if (postCatMatch && method === 'DELETE') {
    const id = Number(postCatMatch[1]);
    state.postCategories = state.postCategories.filter((c) => c.id !== id);
    writeLocalBackup(state);
    return { status: 200, data: { ok: true } };
  }

  // 8. محتوای سایت و تنظیمات (Site Content)
  if (cleanPath === '/api/site-content') {
    if (method === 'GET') {
      return { status: 200, data: state.siteContent || DEFAULT_SITE_CONTENT };
    }
    if (method === 'PUT') {
      state.siteContent = {
        ...DEFAULT_SITE_CONTENT,
        ...(state.siteContent || {}),
        ...bodyData,
        paymentConfig: {
          ...DEFAULT_SITE_CONTENT.paymentConfig,
          ...(state.siteContent?.paymentConfig || {}),
          ...(bodyData?.paymentConfig || {}),
        },
        consultationConfig: {
          ...DEFAULT_SITE_CONTENT.consultationConfig,
          ...(state.siteContent?.consultationConfig || {}),
          ...(bodyData?.consultationConfig || {}),
        },
      };
      writeLocalBackup(state);
      return { status: 200, data: { ok: true, siteContent: state.siteContent } };
    }
  }

  if (cleanPath === '/api/site-content/reset' && method === 'POST') {
    state.siteContent = JSON.parse(JSON.stringify(DEFAULT_SITE_CONTENT));
    writeLocalBackup(state);
    return { status: 200, data: { ok: true, siteContent: state.siteContent } };
  }

  // 9. آمار داشبورد (Stats)
  if (cleanPath === '/api/stats' && method === 'GET') {
    const totalProducts = state.products.filter((p) => !p.isDelete).length;
    const totalPosts = state.posts.filter((p) => !p.isDelete).length;
    const unreadMessages = state.contactMessages.filter((m) => !m.isRead).length;
    const pendingOrders = state.orders.filter(
      (o: any) => o.status === 'Pending' || o.paymentStatus === 'Unpaid' || o.paymentStatus === 'PendingVerification' || o.status === 'ثبت شده' || o.status === 'در انتظار پرداخت'
    ).length;
    const totalRevenue = state.orders.reduce((acc, o) => acc + (Number(o.totalPrice) || 0), 0);
    return {
      status: 200,
      data: {
        totalProducts,
        totalPosts,
        unreadMessages,
        pendingOrders,
        totalRevenue,
      },
    };
  }

  // 10. پیام‌های تماس (Contact Messages)
  if (cleanPath === '/api/contact') {
    if (method === 'GET') {
      return { status: 200, data: state.contactMessages };
    }
    if (method === 'POST') {
      const maxId = state.contactMessages.reduce((acc, m) => Math.max(acc, Number(m.id) || 0), 0);
      const newMsg: ContactMessage = {
        ...bodyData,
        id: maxId + 1,
        creationTime: new Date().toLocaleDateString('fa-IR'),
        isRead: false,
      };
      state.contactMessages.unshift(newMsg);
      writeLocalBackup(state);
      return { status: 200, data: { ok: true, message: 'پیام با موفقیت ثبت شد', contact: newMsg } };
    }
  }

  const contactMatch = cleanPath.match(/^\/api\/contact\/(\d+)$/);
  if (contactMatch && method === 'DELETE') {
    const id = Number(contactMatch[1]);
    state.contactMessages = state.contactMessages.filter((m) => m.id !== id);
    writeLocalBackup(state);
    return { status: 200, data: { ok: true } };
  }

  const contactRespondMatch = cleanPath.match(/^\/api\/contact\/(\d+)\/respond$/);
  if (contactRespondMatch && method === 'PUT') {
    const id = Number(contactRespondMatch[1]);
    const idx = state.contactMessages.findIndex((m) => m.id === id);
    if (idx !== -1) {
      state.contactMessages[idx].isRead = true;
      state.contactMessages[idx].adminReply = bodyData.reply || bodyData.adminReply;
      state.contactMessages[idx].replyTime = new Date().toLocaleDateString('fa-IR');
      writeLocalBackup(state);
      return { status: 200, data: { ok: true } };
    }
  }

  // 11. سفارشات و پرداخت‌ها (Orders)
  if (cleanPath === '/api/orders') {
    if (method === 'GET') {
      return { status: 200, data: state.orders };
    }
    if (method === 'POST') {
      const maxId = state.orders.reduce((acc, o) => Math.max(acc, Number(o.id) || 0), 0);
      const trackingCode = bodyData?.trackingCode || `ONV-${Math.floor(100000 + Math.random() * 900000)}`;
      const newOrder: Order = {
        ...bodyData,
        id: maxId + 1,
        trackingCode,
        creationTime: new Date().toLocaleDateString('fa-IR'),
        status: bodyData?.status || 'ثبت شده',
        paymentStatus: bodyData?.paymentStatus || 'Unpaid',
        items: Array.isArray(bodyData?.items) ? bodyData.items : [],
      };
      state.orders.unshift(newOrder);
      writeLocalBackup(state);
      return {
        status: 200,
        data: {
          ...newOrder,
          ok: true,
          order: newOrder,
          trackingCode: newOrder.trackingCode,
        },
      };
    }
  }

  const orderMatch = cleanPath.match(/^\/api\/orders\/(\d+)\/status$/);
  if (orderMatch && method === 'PUT') {
    const id = Number(orderMatch[1]);
    const idx = state.orders.findIndex((o) => o.id === id);
    if (idx !== -1) {
      state.orders[idx].status = bodyData.status;
      writeLocalBackup(state);
      return { status: 200, data: { ok: true } };
    }
  }

  const orderVerifyMatch = cleanPath.match(/^\/api\/orders\/(\d+)\/verify-receipt$/);
  if (orderVerifyMatch && method === 'PUT') {
    const id = Number(orderVerifyMatch[1]);
    const idx = state.orders.findIndex((o) => o.id === id);
    if (idx !== -1) {
      state.orders[idx].receiptApproved = bodyData.approved;
      state.orders[idx].status = bodyData.approved ? 'Processing' : 'Cancelled';
      state.orders[idx].paymentStatus = bodyData.approved ? 'Paid' : 'Failed';
      writeLocalBackup(state);
      return { status: 200, data: { ok: true } };
    }
  }

  const uploadReceiptMatch = cleanPath.match(/^\/api\/orders\/([^/]+)\/upload-receipt$/);
  if (uploadReceiptMatch && method === 'POST') {
    const trackingCode = decodeURIComponent(uploadReceiptMatch[1]);
    const idx = state.orders.findIndex((o) => o.trackingCode === trackingCode);
    if (idx !== -1) {
      state.orders[idx].receiptImage = bodyData.receiptImage;
      state.orders[idx].paymentStatus = 'PendingVerification';
      state.orders[idx].status = 'Pending';
      writeLocalBackup(state);
      return { status: 200, data: { ok: true, message: 'فیش واریزی با موفقیت ثبت شد.' } };
    }
    return { status: 404, data: { error: 'سفارش یافت نشد' } };
  }

  const confirmGatewayMatch = cleanPath.match(/^\/api\/orders\/([^/]+)\/confirm-(gateway|bale)-payment$/);
  if (confirmGatewayMatch && method === 'POST') {
    const trackingCode = decodeURIComponent(confirmGatewayMatch[1]);
    const idx = state.orders.findIndex((o) => o.trackingCode === trackingCode);
    if (idx !== -1) {
      state.orders[idx].status = 'Processing';
      state.orders[idx].paymentStatus = 'Paid';
      state.orders[idx].paymentMethod = confirmGatewayMatch[2] === 'bale' ? 'bale_bot' : 'gateway';
      writeLocalBackup(state);
      return { status: 200, data: { ok: true, message: 'پرداخت با موفقیت ثبت شد.' } };
    }
  }

  const trackMatch = cleanPath.match(/^\/api\/orders\/track\/([^/]+)$/);
  if (trackMatch && method === 'GET') {
    const code = decodeURIComponent(trackMatch[1]).trim().toLowerCase();
    const order = state.orders.find(
      (o) => (o.trackingCode || '').toLowerCase() === code || String(o.id) === code
    );
    if (order) {
      return { status: 200, data: { ok: true, order } };
    }
    return { status: 404, data: { ok: false, error: 'سفارشی با این کد رهگیری یافت نشد.' } };
  }

  // 12. رزرو مشاوره (Consultation Booking)
  if (cleanPath === '/api/consultations/book' && method === 'POST') {
    const maxId = state.contactMessages.reduce((acc, m) => Math.max(acc, Number(m.id) || 0), 0);
    const consultationMsg: ContactMessage = {
      id: maxId + 1,
      fullName: bodyData.name || 'متقاضی مشاوره',
      name: bodyData.name || 'متقاضی مشاوره',
      phoneNumber: bodyData.phoneNumber || bodyData.contactValue || '',
      trackingCode: bodyData.trackingCode || `ONV-CNS-${Date.now().toString().slice(-4)}`,
      message: `درخواست مشاوره ثبت شد. موضوع: ${bodyData.topicTitle || 'عمومی'} - مبلغ: ${bodyData.amount || 0} تومان`,
      creationTime: new Date().toLocaleDateString('fa-IR'),
      isRead: false,
      isResponded: false,
      isConsultation: true,
    };
    state.contactMessages.unshift(consultationMsg);
    writeLocalBackup(state);
    return { status: 200, data: { ok: true, message: 'رزرو مشاوره با موفقیت ثبت شد.' } };
  }

  // 13. ربات و اعلان‌ها (Bot Settings & Logs)
  if (cleanPath === '/api/bot/config') {
    if (method === 'GET') {
      return {
        status: 200,
        data: {
          config: state.telegramConfig || DEFAULT_TELEGRAM_CONFIG,
          logs: state.botActivityLogs || DEFAULT_BOT_LOGS,
        },
      };
    }
    if (method === 'PUT' || method === 'POST') {
      state.telegramConfig = {
        ...DEFAULT_TELEGRAM_CONFIG,
        ...(state.telegramConfig || {}),
        ...bodyData,
      };
      writeLocalBackup(state);
      return { status: 200, data: { ok: true, config: state.telegramConfig } };
    }
  }

  if (cleanPath === '/api/bot/test-admin-welcome' && method === 'POST') {
    return {
      status: 503,
      data: {
        ok: false,
        delivered: false,
        message: 'عدم برقراری ارتباط با سرور هاست جهت ارسال پیام واقعی به بله',
        description: 'لطفاً از فعال بودن سرور Node.js یا وضعیت اینترنت خود اطمینان حاصل فرمایید.'
      }
    };
  }

  if (
    (cleanPath === '/api/bot/test-connection' ||
      cleanPath === '/api/bot/send-test-message' ||
      cleanPath === '/api/bot/simulate-event' ||
      cleanPath === '/api/bot/test-send-invoice' ||
      cleanPath === '/api/bot/simulate-bale-payment-cycle' ||
      cleanPath === '/api/bot/webhook-action') &&
    method === 'POST'
  ) {
    const isSim = cleanPath.includes('simulate');
    const newLog: BotActivityLog = {
      id: Date.now(),
      time: new Date().toLocaleTimeString('fa-IR'),
      timestamp: new Date().toLocaleTimeString('fa-IR'),
      type: 'test_event',
      platform: 'bale',
      text: isSim ? 'شبیه‌سازی رویداد در محیط محلی انجام شد.' : 'تلاش برای تست در حالت آفلاین کلاینت ثبت شد.',
      status: isSim ? 'success' : 'warning',
      details: isSim ? 'شبیه‌سازی محلی کلاینت' : 'عدم دسترسی به وب‌سرویس واقعی در حالت آفلاین',
    };
    state.botActivityLogs = [newLog, ...(state.botActivityLogs || [])].slice(0, 50);
    writeLocalBackup(state);
    return {
      status: 200,
      data: {
        ok: isSim,
        message: isSim ? 'رویداد آزمایشی شبیه‌سازی شد.' : 'سرور در حالت آفلاین محلی است. لطفاً اتصال سرور هاست را بررسی نمایید.',
        logs: state.botActivityLogs,
      },
    };
  }

  if (cleanPath === '/api/bot/logs' && method === 'DELETE') {
    state.botActivityLogs = [];
    writeLocalBackup(state);
    return { status: 200, data: { ok: true } };
  }

  // 14. سئو و ریدایرکت‌ها (SEO Redirects)
  if (cleanPath === '/api/seo/redirects') {
    if (method === 'GET') {
      return { status: 200, data: state.slugRedirects || [] };
    }
    if (method === 'POST') {
      state.slugRedirects = state.slugRedirects || [];
      const newRedirect: SlugRedirect = {
        id: Date.now(),
        fromPath: bodyData.fromSlug || bodyData.fromPath || '',
        toPath: bodyData.toSlug || bodyData.toPath || '',
        entityType: bodyData.entityType || 'product',
        entityId: bodyData.entityId || 0,
        createdAt: new Date().toISOString(),
      };
      state.slugRedirects.push(newRedirect);
      writeLocalBackup(state);
      return { status: 200, data: { ok: true, redirect: newRedirect } };
    }
  }

  const redirectMatch = cleanPath.match(/^\/api\/seo\/redirects\/(\d+)$/);
  if (redirectMatch && method === 'DELETE') {
    const id = Number(redirectMatch[1]);
    state.slugRedirects = (state.slugRedirects || []).filter((r) => r.id !== id);
    writeLocalBackup(state);
    return { status: 200, data: { ok: true } };
  }

  // 15. پشتیبان‌گیری و همگام‌سازی هاست (Host State Export & Import)
  if (
    cleanPath === '/api/host/export-state' ||
    cleanPath === '/api/firebase/export-state'
  ) {
    return { status: 200, data: state };
  }

  if (
    (cleanPath === '/api/host/import-state' || cleanPath === '/api/firebase/import-state') &&
    method === 'POST'
  ) {
    if (bodyData && typeof bodyData === 'object') {
      const normalized = normalizeState(bodyData);
      writeLocalBackup(normalized);
      return {
        status: 200,
        data: { ok: true, message: 'اطلاعات در حافظه مستقل محلی ذخیره گردید.' },
      };
    }
  }

  if (cleanPath === '/api/host/seed' && method === 'POST') {
    const seeded = createInitialSeedState();
    writeLocalBackup(seeded);
    return {
      status: 200,
      data: {
        ok: true,
        state: seeded,
        message: 'داده‌های اولیه و محصولات پیش‌فرض در حافظه محلی ذخیره شدند.',
      },
    };
  }

  // اگر اندپوینت مشخصی نبود:
  return {
    status: 200,
    data: { ok: true, message: `عملیات شبیه‌سازی محلی روی مسیر ${cleanPath} موفق بود.` },
  };
}

/**
 * تابع اصلی فراخوانی API:
 * ۱. ابتدا تلاش می‌کند با سرور Node.js هاست صحبت کند.
 * ۲. اگر سرور پاسخ نداد، خطای شبکه داد، ۴۰۴ شد، یا محتوای غیر JSON (مثل صفحه خطای آپاچی یا پوسته HTML) برگرداند:
 *    به طور کاملاً خودکار و نامحسوس به «موتور محلی مستقل LocalStorage» سوئیچ می‌کند تا سایت و پنل ادمین
 *    تحت هیچ شرایطی خالی یا سفید نشوند.
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

  const method = (enrichedInit.method || 'GET').toUpperCase();
  let bodyData: any = null;
  if (enrichedInit.body && typeof enrichedInit.body === 'string') {
    try {
      bodyData = JSON.parse(enrichedInit.body);
    } catch {
      bodyData = enrichedInit.body;
    }
  }

  try {
    // تایم‌اوت ۱۵ ثانیه‌ای برای پاسخ‌های وب‌سرویس‌های خارجی نظیر بله و تلگرام
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const serverResponse = await window.fetch(input, {
      ...enrichedInit,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = serverResponse.headers.get('content-type') || '';

    // اگر سرور پاسخ داد و محتوا JSON بود (چه موفق ۲۰۰ و چه خطای معتبر ۴۰۰ یا ۴۰۱)، پاسخ واقعی سرور را برمی‌گردانیم
    if (contentType.includes('application/json')) {
      setConnectionStatus('connected');

      // ذخیره توکن احراز هویت در صورت موفقیت
      if (
        serverResponse.ok &&
        (urlStr.startsWith('/api/admin/login') ||
          urlStr.startsWith('/api/account/change-credentials'))
      ) {
        try {
          const cloned = await serverResponse.clone().json();
          if (cloned?.token) {
            setAdminSessionToken(cloned.token);
          }
        } catch {
          // ignore
        }
      }

      return serverResponse;
    }

    // اگر سرور فعال بود و پاسخ دیگری غیر از JSON داد (مثلا فایل یا باینری)
    if (serverResponse.ok) {
      setConnectionStatus('connected');
      return serverResponse;
    }

    // اگر سرور پاسخ داد ولی صفحه HTML برگرداند (مورد شایع در هاست‌های بدون Node.js)
    console.warn(
      `[Onival Resilient Fallback] API endpoint ${urlStr} returned status ${serverResponse.status} (content-type: ${contentType}). Switching to self-contained client-side data engine.`
    );
  } catch (netErr) {
    // خطای شبکه یا قطعی اینترنت
    console.warn(
      `[Onival Resilient Fallback] Network request to ${urlStr} failed. Activating instant LocalStorage fallback.`,
      netErr
    );
  }

  // سوئیچ خودکار به موتور پردازش داده کلاینت و بازگرداندن Response استاندارد مرورگر
  setConnectionStatus('offline_fallback');
  const localResult = handleLocalApiRoute(urlStr, method, bodyData);

  return new Response(JSON.stringify(localResult.data), {
    status: localResult.status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Onival-Data-Engine': 'local-storage-fallback',
    },
  });
}
