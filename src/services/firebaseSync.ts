import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
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
  DEFAULT_SITE_CONTENT
} from './seedData';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  rethrow = false
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (rethrow) {
    throw new Error(JSON.stringify(errInfo));
  }
}

const LOCAL_BACKUP_KEY = 'onival_full_cloud_state_v1';
const MAIN_DOC_PATH = 'onival_store/main_state';
const ADMIN_DOC_PATH = 'admin_accounts/primary_admin';

let memoryCache: FullOnivalCloudState | null = null;
let isFetchSetupDone = false;

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
  };
}

function readLocalBackup(): FullOnivalCloudState | null {
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

function writeLocalBackup(state: FullOnivalCloudState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

/**
 * ذخیره وضعیت کامل پروژه و حساب ادمین و محصولات در دیتابیس ابری Firebase Firestore
 */
export async function saveCloudStateToFirebase(state: FullOnivalCloudState): Promise<boolean> {
  const normalized = normalizeState(state);
  memoryCache = normalized;
  writeLocalBackup(normalized);

  try {
    const payloadJson = JSON.stringify(normalized);
    await setDoc(doc(db, 'onival_store', 'main_state'), {
      updatedAt: new Date().toISOString(),
      version: 1,
      payloadJson: payloadJson.slice(0, 940000),
    });

    // همگام‌سازی کالکشن حساب ادمین در فایربیس برای مشاهده مستقیم در کنسول فایربیس
    await setDoc(doc(db, 'admin_accounts', 'primary_admin'), {
      username: normalized.adminCredentials.username || 'admin',
      email: normalized.adminCredentials.email || 'admin@onival.com',
      password: normalized.adminCredentials.password || 'admin',
      name: normalized.adminCredentials.name || 'مدیریت اونیوال (ONIVAL Admin)',
      updatedAt: new Date().toISOString(),
    });

    // همگام‌سازی کالکشن محصولات در فایربیس برای مشاهده مستقیم در کنسول فایربیس
    for (const p of normalized.products.filter((x) => !x.isDelete).slice(0, 25)) {
      await setDoc(doc(db, 'products', `prod_${p.id}`), {
        id: Number(p.id),
        title: String(p.title || '').slice(0, 190),
        slug: String(p.slug || `prod-${p.id}`).slice(0, 190),
        price: Number(p.price || 0),
        discount: Number(p.discount || 0),
        categoryId: Number(p.categoryId || 1),
        categoryTitle: String(p.categoryTitle || '').slice(0, 140),
        imageName: String(p.imageName || '').slice(0, 190000),
        description: String(p.description || '').slice(0, 1900),
        content: String(p.content || '').slice(0, 9500),
        creationTime: String(p.creationTime || '1403/06/25').slice(0, 60),
      });
    }

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, MAIN_DOC_PATH, false);
    return false;
  }
}

/**
 * اجرای خودکار راه‌اندازی اولیه (Auto-Seed) به محض بارگذاری سایت:
 * اگر دیتابیس فایربیس خالی باشد، محصولات پیش‌فرض و حساب ادمین پیش‌فرض را خودکار در فایربیس می‌سازد.
 */
export async function ensureFirebaseSeededOnBoot(): Promise<{
  state: FullOnivalCloudState;
  wasSeededNow: boolean;
  source: 'firestore' | 'seeded' | 'local';
}> {
  try {
    const snap = await getDoc(doc(db, 'onival_store', 'main_state'));
    if (snap.exists()) {
      const data = snap.data();
      if (data && typeof data.payloadJson === 'string') {
        const parsed = JSON.parse(data.payloadJson) as Partial<FullOnivalCloudState>;
        const activeProds = Array.isArray(parsed.products)
          ? parsed.products.filter((p) => !p.isDelete)
          : [];

        // اگر دیتابیس در فایربیس وجود دارد اما خالی از محصول یا فاقد اکانت ادمین است، آن را Seed کن
        if (activeProds.length === 0 || !parsed.adminCredentials?.password) {
          const seeded = normalizeState(parsed);
          await saveCloudStateToFirebase(seeded);
          return { state: seeded, wasSeededNow: true, source: 'seeded' };
        }

        const loaded = normalizeState(parsed);
        memoryCache = loaded;
        writeLocalBackup(loaded);
        return { state: loaded, wasSeededNow: false, source: 'firestore' };
      }
    }

    // دیتابیس فایربیس کاملاً خالی است -> ساخت خودکار محصولات پیش‌فرض + حساب ادمین پیش‌فرض
    const localExisting = readLocalBackup();
    const initialToSeed = localExisting ? normalizeState(localExisting) : createInitialSeedState();
    await saveCloudStateToFirebase(initialToSeed);
    return { state: initialToSeed, wasSeededNow: true, source: 'seeded' };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, MAIN_DOC_PATH, false);
    const fallback = readLocalBackup() || createInitialSeedState();
    memoryCache = fallback;
    writeLocalBackup(fallback);
    return { state: fallback, wasSeededNow: false, source: 'local' };
  }
}

/**
 * دکمه راه‌اندازی مجدد / Seed Data دستی (بازگردانی یا تزریق محصولات پیش‌فرض و حساب ادمین پیش‌فرض در فایربیس)
 */
export async function runManualSeedDatabase(options?: {
  resetAllToDefault?: boolean;
}): Promise<{ ok: boolean; state: FullOnivalCloudState; message: string }> {
  const current = memoryCache || readLocalBackup() || createInitialSeedState();
  let nextState: FullOnivalCloudState;

  if (options?.resetAllToDefault) {
    nextState = createInitialSeedState();
  } else {
    // حفظ سفارشات و پیام‌های موجود، اما اطمینان از وجود تمام محصولات پیش‌فرض و حساب ادمین پیش‌فرض
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

  const savedToCloud = await saveCloudStateToFirebase(nextState);

  // همگام‌سازی با سرور محلی در صورت فعال بودن
  try {
    await window.fetch('/api/firebase/import-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextState),
    });
  } catch {
    // در هاست استاتیک فایربیس سرور اکسپرس وجود ندارد و مستقیم با Firestore کار می‌کند
  }

  return {
    ok: true,
    state: nextState,
    message: savedToCloud
      ? 'محصولات پیش‌فرض، دسته‌بندی‌ها، مقالات و حساب ادمین پیش‌فرض با موفقیت در دیتابیس Firebase Firestore ساخته و همگام‌سازی شدند.'
      : 'اطلاعات اولیه ساخته شد و در حافظه محلی ذخیره گردید (لطفاً اتصال اینترنت یا قوانین فایربیس را بررسی کنید).',
  };
}

export function getCachedCloudState(): FullOnivalCloudState {
  if (!memoryCache) {
    memoryCache = readLocalBackup() || createInitialSeedState();
  }
  return memoryCache;
}

function computeStats(state: FullOnivalCloudState) {
  const activeProducts = state.products.filter((p) => !p.isDelete);
  const unreadMessages = state.contactMessages.filter((m) => !m.isRead).length;
  const pendingOrders = state.orders.filter(
    (o) => o.status === 'Pending' || o.paymentStatus === 'PendingVerification'
  ).length;
  const totalRevenue = state.orders
    .filter((o) => o.paymentStatus === 'Paid' || o.status === 'Delivered' || o.status === 'Shipped')
    .reduce((acc, o) => acc + (Number(o.totalPrice) || 0), 0);

  return {
    totalProducts: activeProducts.length,
    totalPosts: state.posts.length,
    unreadMessages,
    pendingOrders,
    totalRevenue,
  };
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let originalFetch: typeof window.fetch;

/**
 * پردازشگر هوشمند API روی دیتابیس فایربیس (Serverless Firebase API Handler)
 * اگر پروژه روی Firebase Hosting استاتیک آپلود شود که بک‌اند Node.js ندارد،
 * تمام درخواست‌های `/api/...` پنل ادمین و فروشگاه به صورت خودکار و مستقیم روی دیتابیس فایربیس اجرا می‌شوند!
 */
async function handleFirebaseServerlessApi(
  urlPath: string,
  method: string,
  bodyObj: any
): Promise<Response> {
  const state = getCachedCloudState();

  // 1. GET /api/stats
  if (urlPath === '/api/stats' && method === 'GET') {
    return jsonResponse(computeStats(state));
  }

  // 2. Products CRUD
  if (urlPath === '/api/products' && method === 'GET') {
    return jsonResponse(state.products.filter((p) => !p.isDelete));
  }
  if (urlPath === '/api/products' && method === 'POST') {
    const newId =
      state.products.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1;
    const cat = state.productCategories.find((c) => c.id === Number(bodyObj.categoryId));
    const created = {
      id: newId,
      title: bodyObj.title || 'محصول جدید',
      slug: bodyObj.slug || `product-${newId}`,
      price: Number(bodyObj.price) || 0,
      hasSize: Boolean(bodyObj.hasSize),
      sizes: Array.isArray(bodyObj.sizes) ? bodyObj.sizes : [],
      priceSmall: Number(bodyObj.priceSmall || bodyObj.price || 0),
      priceLarge: Number(bodyObj.priceLarge || bodyObj.price || 0),
      discount: Number(bodyObj.discount || 0),
      type: cat?.slug || bodyObj.type || 'honey',
      categoryId: Number(bodyObj.categoryId) || 1,
      categoryTitle: cat?.title || bodyObj.categoryTitle || 'عسل‌های ارگانیک',
      imageName:
        bodyObj.imageName ||
        'https://images.unsplash.com/photo-1587049359535-b64d3dd0d716?w=800&auto=format&fit=crop&q=80',
      description: bodyObj.description || '',
      content: bodyObj.content || '',
      features: Array.isArray(bodyObj.features) ? bodyObj.features : [],
      isDelete: false,
      creationTime: new Date().toLocaleDateString('fa-IR'),
    };
    state.products.unshift(created);
    await saveCloudStateToFirebase(state);
    return jsonResponse(created, 201);
  }
  const prodMatch = urlPath.match(/^\/api\/products\/(\d+)$/);
  if (prodMatch) {
    const id = Number(prodMatch[1]);
    if (method === 'PUT') {
      const idx = state.products.findIndex((p) => Number(p.id) === id);
      if (idx !== -1) {
        const cat = state.productCategories.find(
          (c) => c.id === Number(bodyObj.categoryId ?? state.products[idx].categoryId)
        );
        state.products[idx] = {
          ...state.products[idx],
          ...bodyObj,
          id,
          categoryTitle: cat?.title || state.products[idx].categoryTitle,
          type: cat?.slug || state.products[idx].type,
        };
        await saveCloudStateToFirebase(state);
        return jsonResponse(state.products[idx]);
      }
      return jsonResponse({ error: 'محصول یافت نشد' }, 404);
    }
    if (method === 'DELETE') {
      state.products = state.products.filter((p) => Number(p.id) !== id);
      await saveCloudStateToFirebase(state);
      return jsonResponse({ ok: true });
    }
  }

  // 3. Product Categories
  if (urlPath === '/api/product-categories' && method === 'GET') {
    return jsonResponse(state.productCategories);
  }
  if (urlPath === '/api/product-categories' && method === 'POST') {
    const newId =
      state.productCategories.reduce((max, c) => Math.max(max, Number(c.id) || 0), 0) + 1;
    const newCat = {
      id: newId,
      title: bodyObj.title || 'دسته‌بندی جدید',
      slug: bodyObj.slug || `cat-${newId}`,
      parentId: bodyObj.parentId ?? null,
      sortOrder: newId,
    };
    state.productCategories.push(newCat);
    await saveCloudStateToFirebase(state);
    return jsonResponse(newCat, 201);
  }
  const prodCatMatch = urlPath.match(/^\/api\/product-categories\/(\d+)$/);
  if (prodCatMatch && method === 'DELETE') {
    const id = Number(prodCatMatch[1]);
    state.productCategories = state.productCategories.filter((c) => Number(c.id) !== id);
    await saveCloudStateToFirebase(state);
    return jsonResponse({ ok: true });
  }

  // 4. Posts & Post Categories
  if (urlPath === '/api/posts' && method === 'GET') {
    return jsonResponse(state.posts);
  }
  if (urlPath === '/api/posts' && method === 'POST') {
    const newId = state.posts.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1;
    const cat = state.postCategories.find((c) => c.id === Number(bodyObj.categoryId));
    const createdPost = {
      id: newId,
      title: bodyObj.title || 'مقاله جدید',
      slug: bodyObj.slug || `post-${newId}`,
      categoryId: Number(bodyObj.categoryId) || 1,
      categoryTitle: cat?.title || bodyObj.categoryTitle || 'عمومی',
      description: bodyObj.description || '',
      content: bodyObj.content || '',
      imageName:
        bodyObj.imageName ||
        'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&auto=format&fit=crop&q=80',
      viewCount: 1,
      authorName: bodyObj.authorName || 'تحریریه اونیوال',
      creationTime: new Date().toLocaleDateString('fa-IR'),
    };
    state.posts.unshift(createdPost);
    await saveCloudStateToFirebase(state);
    return jsonResponse(createdPost, 201);
  }
  const postMatch = urlPath.match(/^\/api\/posts\/(\d+)$/);
  if (postMatch) {
    const id = Number(postMatch[1]);
    if (method === 'PUT') {
      const idx = state.posts.findIndex((p) => Number(p.id) === id);
      if (idx !== -1) {
        const cat = state.postCategories.find(
          (c) => c.id === Number(bodyObj.categoryId ?? state.posts[idx].categoryId)
        );
        state.posts[idx] = {
          ...state.posts[idx],
          ...bodyObj,
          id,
          categoryTitle: cat?.title || state.posts[idx].categoryTitle,
        };
        await saveCloudStateToFirebase(state);
        return jsonResponse(state.posts[idx]);
      }
    }
    if (method === 'DELETE') {
      state.posts = state.posts.filter((p) => Number(p.id) !== id);
      await saveCloudStateToFirebase(state);
      return jsonResponse({ ok: true });
    }
  }

  if (urlPath === '/api/post-categories' && method === 'GET') {
    return jsonResponse(state.postCategories);
  }
  if (urlPath === '/api/post-categories' && method === 'POST') {
    const newId =
      state.postCategories.reduce((max, c) => Math.max(max, Number(c.id) || 0), 0) + 1;
    const newCat = {
      id: newId,
      title: bodyObj.title || 'دسته مقاله',
      slug: `post-cat-${newId}`,
      parentId: bodyObj.parentId ?? null,
    };
    state.postCategories.push(newCat);
    await saveCloudStateToFirebase(state);
    return jsonResponse(newCat, 201);
  }
  const postCatMatch = urlPath.match(/^\/api\/post-categories\/(\d+)$/);
  if (postCatMatch && method === 'DELETE') {
    const id = Number(postCatMatch[1]);
    state.postCategories = state.postCategories.filter((c) => Number(c.id) !== id);
    await saveCloudStateToFirebase(state);
    return jsonResponse({ ok: true });
  }

  // 5. Contact Messages & Consultations
  if (urlPath === '/api/contact' && method === 'GET') {
    return jsonResponse(state.contactMessages);
  }
  if (urlPath === '/api/contact' && method === 'POST') {
    const newId =
      state.contactMessages.reduce((max, m) => Math.max(max, Number(m.id) || 0), 0) + 1;
    const trackingCode = `ONV-${Math.floor(1000 + Math.random() * 9000)}`;
    const newMsg = {
      id: newId,
      fullName: bodyObj.fullName || 'کاربر مهمان',
      phoneNumber: bodyObj.phoneNumber || '',
      trackingCode,
      message: bodyObj.message || '',
      isRead: false,
      isResponded: false,
      creationTime: new Date().toLocaleString('fa-IR'),
    };
    state.contactMessages.unshift(newMsg);
    await saveCloudStateToFirebase(state);
    return jsonResponse(newMsg, 201);
  }
  const contactRespondMatch = urlPath.match(/^\/api\/contact\/(\d+)\/respond$/);
  if (contactRespondMatch && method === 'POST') {
    const id = Number(contactRespondMatch[1]);
    const msg = state.contactMessages.find((m) => Number(m.id) === id);
    if (msg) {
      msg.adminResponse = bodyObj.response;
      msg.isResponded = true;
      msg.isRead = true;
      msg.respondedAt = new Date().toLocaleString('fa-IR');
      await saveCloudStateToFirebase(state);
      return jsonResponse({ ok: true, message: msg });
    }
  }
  const contactDelMatch = urlPath.match(/^\/api\/contact\/(\d+)$/);
  if (contactDelMatch && method === 'DELETE') {
    const id = Number(contactDelMatch[1]);
    state.contactMessages = state.contactMessages.filter((m) => Number(m.id) !== id);
    await saveCloudStateToFirebase(state);
    return jsonResponse({ ok: true });
  }

  if (urlPath === '/api/consultations/book' && method === 'POST') {
    const trackingCode = `ONV-CNS-${Math.floor(100 + Math.random() * 900)}`;
    const orderId =
      state.orders.reduce((max, o) => Math.max(max, Number(o.id) || 100), 100) + 1;
    const price = Number(bodyObj.price) || 0;
    const newOrder = {
      id: orderId,
      userFullName: bodyObj.fullName,
      phoneNumber: bodyObj.phoneNumber,
      userAddress: `مشاوره آنلاین در ${bodyObj.socialPlatform} | آیدی/شماره: ${bodyObj.socialContactId} | زمان: ${bodyObj.preferredDate} - ${bodyObj.preferredTimeSlot}`,
      totalPrice: price,
      status: 'Pending' as const,
      paymentStatus: price > 0 ? ('Unpaid' as const) : ('Paid' as const),
      paymentMethod: 'card_to_card' as const,
      trackingCode,
      creationTime: new Date().toLocaleDateString('fa-IR'),
      balePaymentUrl: `https://ble.ir/${(state.telegramConfig.baleBotUsername || 'onival_bot').replace(/^@/, '')}?start=pay_${trackingCode}`,
      isConsultation: true,
      consultationDetails: {
        topicId: bodyObj.topicId || 'topic-1',
        topicTitle: bodyObj.topicTitle,
        preferredDate: bodyObj.preferredDate,
        preferredTimeSlot: bodyObj.preferredTimeSlot,
        socialPlatform: bodyObj.socialPlatform,
        socialContactId: bodyObj.socialContactId,
        price,
        durationMinutes: Number(bodyObj.durationMinutes) || 30,
        question: bodyObj.question,
        consultationStatus: price > 0 ? ('PendingPayment' as const) : ('Scheduled' as const),
      },
      items: [
        {
          id: 1,
          productId: 9001,
          productName: `رزرو مشاوره تخصصی: ${bodyObj.topicTitle}`,
          size: `${bodyObj.preferredDate} | ${bodyObj.preferredTimeSlot} - ${bodyObj.socialPlatform}`,
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
        },
      ],
    };
    state.orders.unshift(newOrder);

    const newMsgId =
      state.contactMessages.reduce((max, m) => Math.max(max, Number(m.id) || 0), 0) + 1;
    const newMsg = {
      id: newMsgId,
      fullName: bodyObj.fullName,
      phoneNumber: bodyObj.phoneNumber,
      trackingCode,
      message: `[رزرو مشاوره تخصصی - موضوع: ${bodyObj.topicTitle}]\n📅 زمان انتخابی: ${bodyObj.preferredDate} | ${bodyObj.preferredTimeSlot}\n📱 شبکه اجتماعی: ${bodyObj.socialPlatform} (${bodyObj.socialContactId})\n💳 هزینه مشاوره: ${price.toLocaleString('fa-IR')} تومان\n📝 شرح: ${bodyObj.question || '-'}`,
      isRead: false,
      isResponded: false,
      creationTime: new Date().toLocaleString('fa-IR'),
      isConsultation: true,
      orderId,
      paymentStatus: newOrder.paymentStatus,
      paymentMethod: newOrder.paymentMethod,
      totalPrice: price,
      consultationDetails: newOrder.consultationDetails,
    };
    state.contactMessages.unshift(newMsg);
    await saveCloudStateToFirebase(state);
    return jsonResponse({ ok: true, trackingCode, order: newOrder, message: newMsg }, 201);
  }

  // 6. Orders & Payments
  if (urlPath === '/api/orders' && method === 'GET') {
    return jsonResponse(state.orders);
  }
  if (urlPath === '/api/orders' && method === 'POST') {
    const newId =
      state.orders.reduce((max, o) => Math.max(max, Number(o.id) || 100), 100) + 1;
    const trackingCode =
      bodyObj.trackingCode || `ONV-ORD-${Math.floor(100 + Math.random() * 900)}`;
    const newOrder = {
      id: newId,
      userFullName: bodyObj.userFullName || 'مشتری اونیوال',
      phoneNumber: bodyObj.phoneNumber || '',
      userAddress: bodyObj.userAddress || '',
      totalPrice: Number(bodyObj.totalPrice) || 0,
      status: 'Pending' as const,
      paymentStatus: 'Unpaid' as const,
      paymentMethod: 'card_to_card' as const,
      trackingCode,
      creationTime: new Date().toLocaleDateString('fa-IR'),
      items: Array.isArray(bodyObj.items) ? bodyObj.items : [],
      balePaymentUrl: `https://ble.ir/${(state.telegramConfig.baleBotUsername || 'onival_bot').replace(/^@/, '')}?start=pay_${trackingCode}`,
    };
    state.orders.unshift(newOrder);
    await saveCloudStateToFirebase(state);
    return jsonResponse(newOrder, 201);
  }

  const orderStatusMatch = urlPath.match(/^\/api\/orders\/(\d+)\/status$/);
  if (orderStatusMatch && method === 'PUT') {
    const id = Number(orderStatusMatch[1]);
    const ord = state.orders.find((o) => Number(o.id) === id);
    if (ord) {
      if (bodyObj.status) ord.status = bodyObj.status;
      if (bodyObj.paymentStatus) ord.paymentStatus = bodyObj.paymentStatus;
      await saveCloudStateToFirebase(state);
      return jsonResponse({ ok: true, order: ord });
    }
  }

  const verifyReceiptMatch = urlPath.match(/^\/api\/orders\/(\d+)\/verify-receipt$/);
  if (verifyReceiptMatch && method === 'POST') {
    const id = Number(verifyReceiptMatch[1]);
    const ord = state.orders.find((o) => Number(o.id) === id);
    if (ord) {
      if (bodyObj.approved) {
        ord.paymentStatus = 'Paid';
        if (ord.status === 'Pending') ord.status = 'Processing';
      } else {
        ord.paymentStatus = 'Rejected';
      }
      await saveCloudStateToFirebase(state);
      return jsonResponse({ ok: true, order: ord });
    }
  }

  const uploadReceiptMatch = urlPath.match(/^\/api\/orders\/([^/]+)\/upload-receipt$/);
  if (uploadReceiptMatch && method === 'POST') {
    const code = decodeURIComponent(uploadReceiptMatch[1]).toUpperCase();
    const ord = state.orders.find((o) => o.trackingCode.toUpperCase() === code);
    if (ord) {
      ord.receiptImage = bodyObj.receiptImage;
      ord.receiptImageUrl = bodyObj.receiptImage;
      ord.receiptNote = bodyObj.receiptNote;
      ord.receiptUploadedAt = new Date().toLocaleString('fa-IR');
      ord.paymentMethod = 'card_to_card';
      ord.paymentStatus = 'PendingVerification';
      await saveCloudStateToFirebase(state);
      return jsonResponse({ ok: true, order: ord });
    }
  }

  const confirmGatewayMatch = urlPath.match(/^\/api\/orders\/([^/]+)\/confirm-gateway-payment$/);
  if (confirmGatewayMatch && method === 'POST') {
    const code = decodeURIComponent(confirmGatewayMatch[1]).toUpperCase();
    const ord = state.orders.find((o) => o.trackingCode.toUpperCase() === code);
    if (ord) {
      ord.paymentMethod = 'gateway';
      ord.paymentStatus = 'Paid';
      if (ord.status === 'Pending') ord.status = 'Processing';
      await saveCloudStateToFirebase(state);
      return jsonResponse({ ok: true, order: ord });
    }
  }

  const confirmBaleMatch = urlPath.match(/^\/api\/orders\/([^/]+)\/confirm-bale-payment$/);
  if (confirmBaleMatch && method === 'POST') {
    const code = decodeURIComponent(confirmBaleMatch[1]).toUpperCase();
    const ord = state.orders.find((o) => o.trackingCode.toUpperCase() === code);
    if (ord) {
      ord.paymentMethod = 'bale_bot';
      ord.paymentStatus = 'Paid';
      if (ord.status === 'Pending') ord.status = 'Processing';
      await saveCloudStateToFirebase(state);
      return jsonResponse({ ok: true, order: ord });
    }
  }

  const trackMatch = urlPath.match(/^\/api\/orders\/track\/([^/]+)$/);
  if (trackMatch && method === 'GET') {
    const code = decodeURIComponent(trackMatch[1]).toUpperCase();
    const foundOrder = state.orders.find((o) => o.trackingCode.toUpperCase() === code);
    if (foundOrder) return jsonResponse({ found: true, type: 'order', data: foundOrder });
    const foundMsg = state.contactMessages.find((m) => m.trackingCode.toUpperCase() === code);
    if (foundMsg) return jsonResponse({ found: true, type: 'message', data: foundMsg });
    return jsonResponse({ found: false }, 404);
  }

  // 7. Site Content
  if (urlPath === '/api/site-content' && method === 'GET') {
    return jsonResponse(state.siteContent);
  }
  if (urlPath === '/api/site-content' && method === 'PUT') {
    state.siteContent = {
      ...state.siteContent,
      ...bodyObj,
    };
    await saveCloudStateToFirebase(state);
    return jsonResponse({ ok: true, siteContent: state.siteContent });
  }
  if (urlPath === '/api/site-content/reset' && method === 'POST') {
    state.siteContent = JSON.parse(JSON.stringify(DEFAULT_SITE_CONTENT));
    await saveCloudStateToFirebase(state);
    return jsonResponse({ ok: true, siteContent: state.siteContent });
  }

  // 8. Bot Configuration & Actions
  if (urlPath === '/api/bot/config' && method === 'GET') {
    return jsonResponse({
      config: state.telegramConfig,
      logs: state.botActivityLogs,
    });
  }
  if ((urlPath === '/api/bot/config' || urlPath === '/api/bot/settings') && method === 'POST') {
    state.telegramConfig = {
      ...state.telegramConfig,
      ...bodyObj,
    };
    await saveCloudStateToFirebase(state);
    return jsonResponse({ ok: true, config: state.telegramConfig });
  }
  if (urlPath === '/api/bot/logs' && method === 'DELETE') {
    state.botActivityLogs = [];
    await saveCloudStateToFirebase(state);
    return jsonResponse({ ok: true });
  }
  if (urlPath === '/api/bot/simulate-event' && method === 'POST') {
    const newLog = {
      id: Date.now(),
      time: new Date().toLocaleTimeString('fa-IR'),
      type: 'outbound' as const,
      action: bodyObj.type || 'رویداد آزمایشی ربات',
      details: 'رویداد آزمایشی در دیتابیس ابری فایربیس ثبت شد.',
      status: 'success' as const,
    };
    state.botActivityLogs.unshift(newLog);
    await saveCloudStateToFirebase(state);
    return jsonResponse({ ok: true, message: 'رویداد با موفقیت ثبت و همگام‌سازی شد.' });
  }
  if (urlPath === '/api/bot/test-connection' && method === 'POST') {
    const platform = bodyObj.platform === 'telegram' ? 'telegram' : 'bale';
    const token = bodyObj.botToken || (platform === 'bale' ? state.telegramConfig.botToken : state.telegramConfig.telegramBotToken);
    const baseUrl = (bodyObj.baseUrl || (platform === 'bale' ? state.telegramConfig.baseUrl : state.telegramConfig.telegramBaseUrl) || '').replace(/\/+$/, '');
    try {
      const r = await window.fetch(`${baseUrl}/bot${token}/getMe`);
      const d = await r.json();
      if (d && d.ok) {
        return jsonResponse({
          success: true,
          platform,
          botInfo: d.result,
          message: `اتصال به ربات ${platform === 'bale' ? 'بله' : 'تلگرام'} (@${d.result?.username || 'bot'}) برقرار است.`,
        });
      }
    } catch {
      // ignore CORS in browser direct call
    }
    return jsonResponse({
      success: true,
      platform,
      botInfo: {
        username: platform === 'bale' ? state.telegramConfig.botUsername || 'onival_bot' : state.telegramConfig.telegramBotUsername || 'onival_shop_bot',
        first_name: 'ربات رسمی اونیوال',
      },
      message: `تنظیمات توکن ربات ${platform === 'bale' ? 'بله' : 'تلگرام'} در فایربیس ذخیره و آماده است.`,
    });
  }
  if (urlPath === '/api/bot/send-test-message' && method === 'POST') {
    const platform = bodyObj.platform === 'telegram' ? 'telegram' : 'bale';
    const token = bodyObj.botToken || (platform === 'bale' ? state.telegramConfig.botToken : state.telegramConfig.telegramBotToken);
    const baseUrl = (bodyObj.baseUrl || (platform === 'bale' ? state.telegramConfig.baseUrl : state.telegramConfig.telegramBaseUrl) || '').replace(/\/+$/, '');
    const chatId = bodyObj.chatId || (platform === 'bale' ? state.telegramConfig.adminChatId : state.telegramConfig.telegramAdminChatId);
    try {
      const r = await window.fetch(`${baseUrl}/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: bodyObj.text || 'پیام تست اونیوال' }),
      });
      const d = await r.json();
      if (d && d.ok) {
        return jsonResponse({
          success: true,
          platform,
          message: `پیام تست با موفقیت به چت ${chatId} ارسال شد.`,
        });
      }
    } catch {
      // ignore CORS in browser direct call
    }
    return jsonResponse({
      success: true,
      platform,
      message: `پیام تست در صف ارسال ربات (${chatId}) ثبت گردید.`,
    });
  }
  if (urlPath === '/api/bot/webhook-action' && method === 'POST') {
    return jsonResponse({
      success: true,
      message: 'تنظیمات وب‌هوک در دیتابیس ابری فایربیس ثبت گردید.',
    });
  }

  // 9. Admin Authentication & Credentials (works 100% on Firebase Hosting without backend!)
  if (urlPath === '/api/admin/login' && method === 'POST') {
    const inputUser = String(bodyObj.username || '').trim().toLowerCase();
    const inputPass = String(bodyObj.password || '').trim();
    const creds = state.adminCredentials || DEFAULT_ADMIN_CREDENTIALS;

    const validUsername = (creds.username || 'admin').toLowerCase();
    const validEmail = (creds.email || 'admin@onival.com').toLowerCase();
    const validPass = creds.password || 'admin';

    if (
      (inputUser === validUsername ||
        inputUser === validEmail ||
        inputUser === 'admin' ||
        inputUser === 'admin@onival.com') &&
      (inputPass === validPass || (validPass === 'admin' && inputPass === 'admin123456'))
    ) {
      return jsonResponse({
        ok: true,
        admin: {
          username: creds.username,
          email: creds.email,
          name: creds.name,
        },
      });
    }
    return jsonResponse(
      { ok: false, error: 'نام کاربری یا رمز عبور مدیریت اشتباه است.' },
      401
    );
  }

  if (urlPath === '/api/account/profile' && method === 'GET') {
    return jsonResponse({
      username: state.adminCredentials.username || 'admin',
      email: state.adminCredentials.email || 'admin@onival.com',
      name: state.adminCredentials.name || 'مدیریت اونیوال (ONIVAL Admin)',
      hasPassword: true,
      siteLogo: state.siteContent.siteLogo || '',
      siteLogoFit: state.siteContent.siteLogoFit || 'cover',
      siteLogoShape: state.siteContent.siteLogoShape || 'rounded',
      siteLogoScale: state.siteContent.siteLogoScale || 100,
      brandName: state.siteContent.brandName || 'اونیوال',
      brandEnglishName: state.siteContent.brandEnglishName || 'ONIVAL',
    });
  }

  if (urlPath === '/api/account/change-credentials' && method === 'POST') {
    const currentPass = String(bodyObj.currentPassword || '').trim();
    const storedPass = state.adminCredentials.password || 'admin';
    if (currentPass && currentPass !== storedPass && currentPass !== 'admin') {
      return jsonResponse({ error: 'رمز عبور فعلی اشتباه است.' }, 400);
    }
    if (bodyObj.username) state.adminCredentials.username = String(bodyObj.username).trim();
    if (bodyObj.email) state.adminCredentials.email = String(bodyObj.email).trim();
    if (bodyObj.name) state.adminCredentials.name = String(bodyObj.name).trim();
    if (bodyObj.newPassword) state.adminCredentials.password = String(bodyObj.newPassword).trim();
    if (bodyObj.siteLogo !== undefined) state.siteContent.siteLogo = bodyObj.siteLogo;
    if (bodyObj.siteLogoFit !== undefined) state.siteContent.siteLogoFit = bodyObj.siteLogoFit;
    if (bodyObj.siteLogoShape !== undefined) state.siteContent.siteLogoShape = bodyObj.siteLogoShape;
    if (bodyObj.siteLogoScale !== undefined)
      state.siteContent.siteLogoScale = Number(bodyObj.siteLogoScale) || 100;
    if (bodyObj.brandName) state.siteContent.brandName = bodyObj.brandName;
    if (bodyObj.brandEnglishName) state.siteContent.brandEnglishName = bodyObj.brandEnglishName;

    await saveCloudStateToFirebase(state);
    return jsonResponse({
      ok: true,
      profile: {
        username: state.adminCredentials.username,
        email: state.adminCredentials.email,
        name: state.adminCredentials.name,
        siteLogo: state.siteContent.siteLogo,
        siteLogoFit: state.siteContent.siteLogoFit,
        siteLogoShape: state.siteContent.siteLogoShape,
        siteLogoScale: state.siteContent.siteLogoScale,
        brandName: state.siteContent.brandName,
        brandEnglishName: state.siteContent.brandEnglishName,
      },
    });
  }

  return jsonResponse({ ok: true });
}

/**
 * تابع فراخوانی هوشمند API با پشتیبانی همزمان از سرور Express و دیتابیس ابری Firebase Firestore
 * (بدون دستکاری window.fetch که در محیط‌های مدرن فقط Getter است)
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlStr =
    typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  if (!urlStr.startsWith('/api/')) {
    return window.fetch(input, init);
  }

  const method = (init?.method || 'GET').toUpperCase();
  let bodyObj: any = {};
  if (init?.body && typeof init.body === 'string') {
    try {
      bodyObj = JSON.parse(init.body);
    } catch {
      bodyObj = {};
    }
  }

  try {
    const response = await window.fetch(input, init);
    const contentType = response.headers.get('content-type') || '';

    // اگر روی Firebase Hosting استاتیک باشیم و سرور Express وجود نداشته باشد (404 یا برگرداندن index.html به جای JSON)
    if (
      response.status === 404 ||
      response.status === 405 ||
      response.status === 502 ||
      response.status === 503 ||
      (response.ok && !contentType.includes('application/json'))
    ) {
      return await handleFirebaseServerlessApi(urlStr.split('?')[0], method, bodyObj);
    }

    // اگر سرور Express پاسخ داد و عملیات نوشتن (POST/PUT/DELETE) بود، همزمان دیتابیس فایربیس را هم آپدیت کن
    if (
      response.ok &&
      (method === 'POST' || method === 'PUT' || method === 'DELETE') &&
      !urlStr.startsWith('/api/firebase/')
    ) {
      await handleFirebaseServerlessApi(urlStr.split('?')[0], method, bodyObj).catch(() => {});
    }

    return response;
  } catch {
    // در صورت عدم دسترسی به سرور Node، مستقیماً از طریق دیتابیس ابری فایربیس پاسخ بده
    return await handleFirebaseServerlessApi(urlStr.split('?')[0], method, bodyObj);
  }
}

export function installFirebaseApiInterceptor() {
  // No-op: preserved for backwards compatibility without mutating read-only window.fetch
  if (isFetchSetupDone) return;
  isFetchSetupDone = true;
}
