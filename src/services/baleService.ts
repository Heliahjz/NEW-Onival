import { TelegramConfig, Order } from '../types';
import { DEFAULT_TELEGRAM_CONFIG } from './seedData';
import { apiFetch } from './dataService';

export const LOCAL_STORAGE_BOT_CONFIG_KEY = 'onival_bot_config';

/**
 * Retrieves the currently active Bale / Bot configuration from LocalStorage,
 * falling back to initial seed data or passed fallback.
 */
export function getActiveBotConfig(fallback?: TelegramConfig): TelegramConfig {
  let cached: Partial<TelegramConfig> = {};
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_BOT_CONFIG_KEY);
      if (raw) {
        cached = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to parse onival_bot_config from localStorage:', e);
    }
  }

  const base = fallback || DEFAULT_TELEGRAM_CONFIG;
  return {
    ...base,
    ...cached,
    botToken: (cached.botToken || cached.baleBotToken || base.botToken || base.baleBotToken || '').trim(),
    adminChatId: (cached.adminChatId || cached.baleAdminChatId || base.adminChatId || base.baleAdminChatId || '').trim(),
    botUsername: (cached.botUsername || cached.baleBotUsername || base.botUsername || base.baleBotUsername || 'Onivalbot').replace(/^@/, ''),
    baleBotUsername: (cached.baleBotUsername || cached.botUsername || base.baleBotUsername || base.botUsername || 'Onivalbot').replace(/^@/, ''),
    baleAdminUsername: cached.baleAdminUsername || base.baleAdminUsername || '@hasti_hjz',
    balePaymentMode: cached.balePaymentMode || base.balePaymentMode || 'live',
    balePaymentTokenLive: cached.balePaymentTokenLive || base.balePaymentTokenLive || 'WALLET-v5gqSc1W1kaBUo2B',
    balePaymentTokenTest: cached.balePaymentTokenTest || base.balePaymentTokenTest || 'WALLET-TEST-1111111111111111',
    baseUrl: cached.baseUrl || cached.baleBaseUrl || base.baseUrl || 'https://tapi.bale.ai',
    baleBaseUrl: cached.baleBaseUrl || cached.baseUrl || base.baleBaseUrl || 'https://tapi.bale.ai',
  };
}

/**
 * Saves bot configuration to LocalStorage and syncs with the server API.
 */
export async function saveActiveBotConfig(config: TelegramConfig): Promise<{ ok: boolean; savedAt: string }> {
  const savedAt = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const payloadToStore = {
    ...config,
    _savedAt: savedAt,
    _lastUpdated: Date.now()
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_BOT_CONFIG_KEY, JSON.stringify(payloadToStore));
      window.dispatchEvent(new CustomEvent('onival_bot_config_updated', { detail: payloadToStore }));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }

  try {
    await apiFetch('/api/bot/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadToStore)
    });
  } catch (err) {
    console.warn('Server sync error for bot config (localStorage remains updated):', err);
  }

  return { ok: true, savedAt };
}

export interface TestAdminWelcomeResult {
  ok: boolean;
  delivered: boolean;
  status: number;
  message: string;
  description?: string;
  messageId?: number;
  rawResponse?: any;
  usedToken: string;
  usedChatId: string;
  hint?: string;
  latencyMs?: number;
  forbiddenStartRequired?: boolean;
  botUsername?: string;
  botLink?: string;
}

/**
 * Sends real welcome message to the admin's Chat ID on Bale:
 * "اتصال ربات به هاست با موفقیت انجام شد. شما به عنوان ادمین شناسایی شدید"
 */
export async function sendBaleAdminWelcomeTest(options?: {
  botToken?: string;
  chatId?: string;
  baseUrl?: string;
}): Promise<TestAdminWelcomeResult> {
  const currentConfig = getActiveBotConfig();
  const token = (options?.botToken || currentConfig.botToken || currentConfig.baleBotToken || DEFAULT_TELEGRAM_CONFIG.botToken || '').trim();
  const chatId = (options?.chatId || currentConfig.adminChatId || currentConfig.baleAdminChatId || DEFAULT_TELEGRAM_CONFIG.adminChatId || '69451465').trim();
  const baseUrl = (options?.baseUrl || currentConfig.baleBaseUrl || currentConfig.baseUrl || 'https://tapi.bale.ai').replace(/\/+$/, '');

  if (!token) {
    return {
      ok: false,
      delivered: false,
      status: 400,
      message: 'توکن ربات بله وارد نشده است.',
      description: 'لطفاً توکن ربات دریافتی از @BotFather را در کادر تنظیمات وارد کنید.',
      usedToken: '',
      usedChatId: chatId,
      hint: 'وارد ربات @BotFather در بله شده و توکن بازوی خود را کپی کنید.'
    };
  }

  if (!chatId) {
    return {
      ok: false,
      delivered: false,
      status: 400,
      message: 'شناسه عددی چت ادمین (Chat ID) وارد نشده است.',
      description: 'لطفاً شناسه عددی چت ادمین را در کادر وارد نمایید.',
      usedToken: token,
      usedChatId: '',
      hint: 'می‌توانید با ارسال دستور /start از اکانت شخصی به ربات یا استعلام در بله چت‌آیدی را دریافت کنید.'
    };
  }

  const welcomeText = 'اتصال ربات به هاست با موفقیت انجام شد. شما به عنوان ادمین شناسایی شدید';
  const startMs = Date.now();

  // 1. Direct Client-Side Fetch to Bale API (https://tapi.bale.ai/bot<TOKEN>/sendMessage)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const apiRes = await fetch(`${baseUrl}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: welcomeText
      }),
      signal: controller.signal
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - startMs;
    const data: any = await apiRes.json().catch(() => null);

    if (apiRes.ok && data?.ok) {
      return {
        ok: true,
        delivered: true,
        status: apiRes.status,
        latencyMs,
        messageId: data.result?.message_id,
        message: 'پیام «اتصال ربات به هاست با موفقیت انجام شد. شما به عنوان ادمین شناسایی شدید» با موفقیت مستقیم به بله شما تحویل داده شد.',
        rawResponse: data,
        usedToken: token,
        usedChatId: chatId
      };
    } else if (apiRes.status === 401 || (data && !data.ok)) {
      const desc = data?.description || (apiRes.status === 401 ? 'Unauthorized (توکن نامعتبر)' : `خطای ${apiRes.status}`);
      const isForbidden = apiRes.status === 403 || /Forbidden|can't initiate conversation/i.test(desc);
      const botUser = (currentConfig.baleBotUsername || currentConfig.botUsername || 'Onivalbot').replace(/^@/, '');
      return {
        ok: false,
        delivered: false,
        status: apiRes.status,
        latencyMs,
        forbiddenStartRequired: isForbidden,
        botUsername: botUser,
        botLink: `https://ble.ir/${botUser}`,
        description: desc,
        message: isForbidden ? 'خطای امنیتی ۴۰۳ بله: ربات نمی‌تواند شروع‌کننده مکالمه باشد.' : `پاسخ وب‌سرویس بله: ${desc}`,
        rawResponse: data,
        usedToken: token,
        usedChatId: chatId,
        hint: isForbidden
          ? `مدیر گرامی، ربات‌های بله برای جلوگیری از مزاحمت تا زمانی که دکمه «شروع» (/start) را نزده باشید، پیام نمی‌فرستند. لطفاً روی لینک ble.ir/${botUser} کلیک نموده، Start را لمس کنید و سپس مجدداً تست را بزنید.`
          : apiRes.status === 401
          ? 'توکن وارد شده معتبر نیست یا منقضی شده است. لطفاً توکن جدید را از @BotFather در بله کپی کرده و ذخیره نمایید.'
          : 'در صورت خطای chat not found، لطفاً ابتدا با اکانت خود به ربات در بله پیام /start ارسال کنید.'
      };
    }
  } catch (clientErr) {
    // If direct client fetch failed (e.g. browser CORS policy in iframe or sandbox), seamlessly fallback to host server proxy
    console.info('Direct client-side fetch hit browser restriction, falling back to server host proxy:', clientErr);
  }

  // 2. Server Host Proxy Fetch to Bale API (guaranteed delivery)
  try {
    const res = await apiFetch('/api/bot/test-admin-welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken: token, chatId, baseUrl })
    });
    const data: any = await res.json().catch(() => null);
    if (data && typeof data === 'object') {
      return {
        ...data,
        usedToken: data.usedToken || token,
        usedChatId: data.usedChatId || chatId,
        botUsername: data.botUsername || (currentConfig.baleBotUsername || currentConfig.botUsername || 'Onivalbot').replace(/^@/, '')
      };
    }
  } catch (err: any) {
    console.warn('Server proxy fetch failed:', err);
  }

  return {
    ok: false,
    delivered: false,
    status: 0,
    description: 'خطای شبکه یا عدم پاسخگویی سرور بله',
    message: 'خطا در برقراری ارتباط با وب‌سرویس بله',
    usedToken: token,
    usedChatId: chatId,
    botUsername: (currentConfig.baleBotUsername || currentConfig.botUsername || 'Onivalbot').replace(/^@/, ''),
    hint: 'لطفاً از اتصال اینترنت، صحت توکن بله و چت‌آیدی ادمین اطمینان حاصل فرمایید.'
  };
}

/**
 * Automatically dispatches the instant order notification to the admin via Bale Bot API.
 */
export async function sendBaleAdminOrderNotification(order: Order, customConfig?: TelegramConfig): Promise<void> {
  const cfg = customConfig || getActiveBotConfig();
  const token = (cfg.botToken || cfg.baleBotToken || '').trim();
  const chatId = (cfg.adminChatId || cfg.baleAdminChatId || '').trim();
  const baseUrl = (cfg.baleBaseUrl || cfg.baseUrl || 'https://tapi.bale.ai').replace(/\/+$/, '');

  if (!token || !chatId) return;

  const itemsList = (order.items || [])
    .map((it, i) => `${i + 1}. ${it.productName} (${it.size || 'استاندارد'}) × ${it.quantity} عدد - ${Number(it.totalPrice || 0).toLocaleString('fa-IR')} تومان`)
    .join('\n');

  const paymentTitle =
    order.paymentMethod === 'bale_bot'
      ? 'کیف پول بله (Bale Wallet)'
      : order.paymentMethod === 'card_to_card'
      ? 'کارت به کارت (فیش واریزی)'
      : 'درگاه آنلاین اینترنتی';

  const notificationText =
    `🔔 سفارش جدید در فروشگاه اونیوال (ONIVAL) ثبت شد!\n\n` +
    `🧾 شماره فاکتور: ${order.trackingCode}\n` +
    `👤 خریدار: ${order.userFullName}\n` +
    `📞 شماره تماس: ${order.phoneNumber}\n` +
    `💰 مبلغ کل فاکتور: ${Number(order.totalPrice || 0).toLocaleString('fa-IR')} تومان\n` +
    `💳 روش پرداخت انتخابی: ${paymentTitle}\n` +
    `📍 آدرس تحویل: ${order.userAddress}\n\n` +
    `📦 اقلام سفارش:\n${itemsList || '---'}\n\n` +
    `🔗 پیگیری فاکتور در سایت:\n${window.location.origin}/?track=${order.trackingCode}\n\n` +
    `⚡ دستور تایید فوری این سفارش توسط ادمین در بله:\n/confirm_${order.trackingCode}`;

  // 1. Try server endpoint
  try {
    await apiFetch('/api/bot/send-real-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'bale',
        chatId,
        botToken: token,
        baseUrl,
        text: notificationText
      })
    });
    return;
  } catch {
    // fallback to direct client-side fetch if server offline
  }

  // 2. Direct client fetch fallback
  try {
    await fetch(`${baseUrl}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: notificationText })
    });
  } catch {
    // ignore client network failure
  }
}
