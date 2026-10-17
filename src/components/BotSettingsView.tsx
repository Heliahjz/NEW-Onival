import React, { useState, useEffect } from 'react';
import {
  Bot,
  Send,
  RefreshCw,
  ShieldCheck,
  Activity,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Zap,
  MessageSquare,
  Globe,
  PhoneCall,
  Mail,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Radio,
  Sparkles,
  FileText,
  Bell,
  Webhook,
  Link2,
  UserCheck,
  Headphones,
  ArrowUpRight,
  Play,
  Settings2,
  Server,
  BookOpen,
  AlertTriangle
} from 'lucide-react';
import { TelegramConfig, BotActivityLog, ContactMessage, Order, SiteContent } from '../types';
import { apiFetch } from '../services/dataService';
import { sendBaleAdminWelcomeTest, saveActiveBotConfig, TestAdminWelcomeResult, LOCAL_STORAGE_BOT_CONFIG_KEY } from '../services/baleService';

interface BotSettingsViewProps {
  config: TelegramConfig;
  logs?: BotActivityLog[];
  messages?: ContactMessage[];
  orders?: Order[];
  siteContent?: SiteContent | null;
  onUpdateConfig: (newConfig: Partial<TelegramConfig>) => Promise<void>;
  onSimulateEvent: (type: string, payload?: any) => Promise<any>;
  onRespondMessage?: (id: number, response: string) => Promise<void>;
  onNavigate?: (tab: any) => void;
  onRefreshData?: () => Promise<void>;
}

type HubTab = 'bots-config' | 'live-tester' | 'support-channels' | 'templates-automation' | 'logs-desk';

const LEGACY_STORAGE_KEY = 'onival_saved_bot_config_v1';

export const BotSettingsView: React.FC<BotSettingsViewProps> = ({
  config,
  logs = [],
  messages = [],
  orders = [],
  siteContent,
  onUpdateConfig,
  onSimulateEvent,
  onRespondMessage,
  onNavigate,
  onRefreshData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<HubTab>('bots-config');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_BOT_CONFIG_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed._savedAt || null;
      }
    } catch {}
    return null;
  });

  // Main comprehensive state synced with server telegramConfig + localStorage backup
  const [formData, setFormData] = useState<TelegramConfig>(() => {
    let cached: Partial<TelegramConfig> = {};
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_BOT_CONFIG_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) cached = JSON.parse(raw);
    } catch {}

    return {
      botToken: cached.botToken || config.botToken || '1204808805:W-mq-hFRtv71zdHaRFSUYdr2GWCJPCvQD34',
      adminChatId: cached.adminChatId || config.adminChatId || '923387796',
      botUsername: cached.botUsername || config.botUsername || 'Onivalbot',
      baleAdminUsername: cached.baleAdminUsername || config.baleAdminUsername || '@hasti_hjz',
      balePaymentMode: cached.balePaymentMode || config.balePaymentMode || 'live',
      balePaymentTokenLive: cached.balePaymentTokenLive || config.balePaymentTokenLive || 'WALLET-v5gqSc1W1kaBUo2B',
      balePaymentTokenTest: cached.balePaymentTokenTest || config.balePaymentTokenTest || 'WALLET-TEST-1111111111111111',
      balePaymentToken: cached.balePaymentToken || config.balePaymentToken || 'WALLET-v5gqSc1W1kaBUo2B',
      baleAutoSendInvoice: cached.baleAutoSendInvoice ?? config.baleAutoSendInvoice ?? true,
      baleAutoNotifyAdminAllTransactions: cached.baleAutoNotifyAdminAllTransactions ?? config.baleAutoNotifyAdminAllTransactions ?? true,
      baleAdminDirectApproval: cached.baleAdminDirectApproval ?? config.baleAdminDirectApproval ?? true,
      baseUrl: cached.baseUrl || config.baseUrl || 'https://tapi.bale.ai',
      panelBaseUrl: cached.panelBaseUrl || config.panelBaseUrl || window.location.origin,
      antiSpamSeconds: cached.antiSpamSeconds ?? config.antiSpamSeconds ?? 5,
      active: cached.active ?? config.active ?? true,

      telegramBotEnabled: cached.telegramBotEnabled ?? config.telegramBotEnabled ?? true,
      telegramBotToken: cached.telegramBotToken ?? config.telegramBotToken ?? '7192837465:AAH8xK9lP2mN4vB6cX8zQ1wE3rT5yU7iO9p',
      telegramAdminChatId: cached.telegramAdminChatId || config.telegramAdminChatId || '923387796',
      telegramBotUsername: cached.telegramBotUsername || config.telegramBotUsername || 'onival_shop_bot',
      telegramBaseUrl: cached.telegramBaseUrl || config.telegramBaseUrl || 'https://api.telegram.org',
      telegramWebhookUrl: cached.telegramWebhookUrl || config.telegramWebhookUrl || `${window.location.origin}/api/webhook/telegram`,

      baleWebhookUrl: cached.baleWebhookUrl || config.baleWebhookUrl || `${window.location.origin}/api/webhook/bale`,
      webhookSecretToken: cached.webhookSecretToken || config.webhookSecretToken || 'ONIVAL_SEC_2025_9981',

      telegramSupportId: cached.telegramSupportId || config.telegramSupportId || siteContent?.contactTelegramId || '@onival_support',
      telegramChannelId: cached.telegramChannelId || config.telegramChannelId || '@onival_official',
      baleSupportId: cached.baleSupportId || config.baleSupportId || siteContent?.contactBaleId || '@onival_bale_support',
      baleChannelId: cached.baleChannelId || config.baleChannelId || '@onival_bale',
      instagramId: cached.instagramId || config.instagramId || siteContent?.contactInstagramId || '@onival.ir',
      whatsappNumber: cached.whatsappNumber || config.whatsappNumber || '09123456789',
      eitaaSupportId: cached.eitaaSupportId || config.eitaaSupportId || '@onival_eitaa',
      rubikaSupportId: cached.rubikaSupportId || config.rubikaSupportId || '@onival_rubika',
      supportPhone: cached.supportPhone || config.supportPhone || siteContent?.contactPhone || '021-88776655',
      supportEmail: cached.supportEmail || config.supportEmail || siteContent?.contactEmail || 'support@onival.ir',
      workingHours: cached.workingHours || config.workingHours || siteContent?.contactWorkingHours || 'شنبه تا پنجشنبه از ساعت ۹ صبح الی ۲۱ شب',
      autoReplyEnabled: cached.autoReplyEnabled ?? config.autoReplyEnabled ?? true,
      floatingWidgetEnabled: cached.floatingWidgetEnabled ?? config.floatingWidgetEnabled ?? true,

      notifyOnNewOrder: cached.notifyOnNewOrder ?? config.notifyOnNewOrder ?? true,
      notifyOnReceiptUpload: cached.notifyOnReceiptUpload ?? config.notifyOnReceiptUpload ?? true,
      notifyOnNewTicket: cached.notifyOnNewTicket ?? config.notifyOnNewTicket ?? true,
      notifyCustomerOnStatusChange: cached.notifyCustomerOnStatusChange ?? config.notifyCustomerOnStatusChange ?? true,

      welcomeTemplate:
        cached.welcomeTemplate ||
        config.welcomeTemplate ||
        'سلام {name} عزیز! 🌸 به ربات رسمی فروشگاه چرم اونیوال خوش آمدید.\nبرای پیگیری سفارش یا پرداخت فاکتور، کد پیگیری خود را ارسال نمایید.',
      orderInvoiceTemplate:
        cached.orderInvoiceTemplate ||
        config.orderInvoiceTemplate ||
        '🛍 سفارش جدید در فروشگاه اونیوال ثبت شد!\n🔖 کد پیگیری: {trackingCode}\n👤 مشتری: {customerName}\n💳 مبلغ کل: {totalPrice} تومان\n📍 وضعیت: در انتظار پرداخت',
      receiptApprovedTemplate:
        cached.receiptApprovedTemplate ||
        config.receiptApprovedTemplate ||
        '✅ مشتری گرامی {customerName}، فیش واریزی شما برای سفارش #{trackingCode} تایید شد و بسته شما وارد مرحله آماده‌سازی گردید.',
      supportReplyTemplate:
        cached.supportReplyTemplate ||
        config.supportReplyTemplate ||
        '💬 پاسخ پشتیبانی اونیوال به پیام شما (کد پیگیری #{trackingCode}):\n\n{response}\n\nبا تشکر از همراهی شما🌺',
    };
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const updateField = (patch: Partial<TelegramConfig>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
    setHasUnsavedChanges(true);
  };

  // Only sync from parent config when the user doesn't have unsaved local edits
  useEffect(() => {
    if (!hasUnsavedChanges && config) {
      setFormData((prev) => ({
        ...prev,
        ...config,
      }));
    }
  }, [config, hasUnsavedChanges]);

  // UI states
  const [showBaleToken, setShowBaleToken] = useState(false);
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Bale Welcome Test State
  const [welcomeTestResult, setWelcomeTestResult] = useState<TestAdminWelcomeResult | null>(null);
  const [isSendingWelcomeTest, setIsSendingWelcomeTest] = useState(false);

  // Live Connection Tester States
  const [testingPlatform, setTestingPlatform] = useState<'bale' | 'telegram' | null>(null);
  const [baleDiagnostics, setBaleDiagnostics] = useState<any | null>(null);
  const [telegramDiagnostics, setTelegramDiagnostics] = useState<any | null>(null);

  // Live Message Dispatcher States
  const [testTargetPlatform, setTestTargetPlatform] = useState<'bale' | 'telegram' | 'both'>('both');
  const [testChatId, setTestChatId] = useState<string>(config.adminChatId || '923387796');
  const [testMessageText, setTestMessageText] = useState<string>(
    '🔔 پیام تست مستقیم از مرکز فرماندهی پشتیبانی اونیوال\n✅ ارتباط وب‌سرویس ربات برقرار و آماده دریافت سفارشات است.'
  );
  const [isSendingTestMsg, setIsSendingTestMsg] = useState(false);
  const [lastSendResult, setLastSendResult] = useState<any | null>(null);

  // Webhook Tester States
  const [webhookLoading, setWebhookLoading] = useState<string | null>(null);
  const [webhookResult, setWebhookResult] = useState<any | null>(null);

  // Bale Invoice & Payment Cycle Simulator States
  const [isSendingInvoiceTest, setIsSendingInvoiceTest] = useState(false);
  const [invoiceTestResult, setInvoiceTestResult] = useState<any | null>(null);
  const [isSimulatingBaleCycle, setIsSimulatingBaleCycle] = useState(false);
  const [baleCycleResult, setBaleCycleResult] = useState<any | null>(null);

  // Quick Reply State for Support Desk
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleTestSendInvoice = async () => {
    setIsSendingInvoiceTest(true);
    setInvoiceTestResult(null);
    try {
      const activeToken = formData.balePaymentMode === 'test' ? formData.balePaymentTokenTest : formData.balePaymentTokenLive;
      const res = await apiFetch('/api/bot/test-send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: testChatId || formData.adminChatId,
          providerToken: activeToken || 'WALLET-v5gqSc1W1kaBUo2B',
          priceToman: 350000
        }),
      });
      const data = await res.json();
      setInvoiceTestResult(data);
      if (onRefreshData) await onRefreshData();
      showToast(data.message || 'فاکتور تست ارسال شد.', data.ok ? 'success' : 'error');
    } catch (err: any) {
      showToast(`خطا در ارسال فاکتور آزمایشی: ${err.message}`, 'error');
    } finally {
      setIsSendingInvoiceTest(false);
    }
  };

  const handleSimulateBaleCycle = async () => {
    setIsSimulatingBaleCycle(true);
    setBaleCycleResult(null);
    try {
      const res = await apiFetch('/api/bot/simulate-bale-payment-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setBaleCycleResult(data);
      if (onRefreshData) await onRefreshData();
      showToast(data.message || 'چرخه پرداخت بله با موفقیت شبیه‌سازی شد.', 'success');
    } catch (err: any) {
      showToast(`خطا در اجرای چرخه شبیه‌ساز: ${err.message}`, 'error');
    } finally {
      setIsSimulatingBaleCycle(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const { savedAt } = await saveActiveBotConfig(formData);
      try {
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ ...formData, _savedAt: savedAt, _lastUpdated: Date.now() }));
      } catch {}
      await onUpdateConfig(formData);
      setHasUnsavedChanges(false);
      setLastSavedAt(savedAt);
      setSaveSuccessNotice('تنظیمات، توکن‌های بله و اطلاعات ادمین با موفقیت در LocalStorage و سرور ذخیره شد.');
      setTimeout(() => setSaveSuccessNotice(null), 6000);
      if (onRefreshData) await onRefreshData();
      showToast('تمامی توکن‌ها، کدها، چت‌آیدی‌ها و تنظیمات ربات‌ها با موفقیت ذخیره شدند.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'خطا در ذخیره‌سازی تنظیمات', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Real Test: Send Welcome Message to Admin on Bale
  const handleSendAdminWelcomeTest = async () => {
    setIsSendingWelcomeTest(true);
    setWelcomeTestResult(null);
    try {
      const tokenToUse = String(formData.botToken || formData.baleBotToken || '').trim();
      const chatIdToUse = String(formData.adminChatId || formData.baleAdminChatId || '').trim();
      const baseUrlToUse = String(formData.baseUrl || formData.baleBaseUrl || 'https://tapi.bale.ai').trim();
      const botUserToUse = String(formData.botUsername || formData.baleBotUsername || 'Onivalbot').replace(/^@/, '').trim();

      const syncedForm = {
        ...formData,
        botToken: tokenToUse,
        baleBotToken: tokenToUse,
        adminChatId: chatIdToUse,
        baleAdminChatId: chatIdToUse,
        botUsername: botUserToUse,
        baleBotUsername: botUserToUse,
      };

      // 1. Immediately save current form data to LocalStorage so any new token or chatId typed is active
      await saveActiveBotConfig(syncedForm);
      setLastSavedAt(new Date().toLocaleTimeString('fa-IR'));
      setHasUnsavedChanges(false);

      // 2. Dispatch real welcome test
      const res = await sendBaleAdminWelcomeTest({
        botToken: tokenToUse,
        chatId: chatIdToUse,
        baseUrl: baseUrlToUse,
      });
      setWelcomeTestResult(res);
      if (res.ok) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      showToast(`خطا در ارسال پیام به ادمین: ${err?.message || 'خطای اتصال'}`, 'error');
    } finally {
      setIsSendingWelcomeTest(false);
    }
  };

  // Real API Test Connection (getMe)
  const handleTestBotConnection = async (platform: 'bale' | 'telegram') => {
    setTestingPlatform(platform);
    try {
      const token = platform === 'bale' ? formData.botToken : formData.telegramBotToken;
      const baseUrl = platform === 'bale' ? formData.baseUrl : formData.telegramBaseUrl;

      const res = await apiFetch('/api/bot/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, botToken: token, baseUrl }),
      });
      const data = await res.json();
      if (platform === 'bale') {
        setBaleDiagnostics(data);
      } else {
        setTelegramDiagnostics(data);
      }
      if (onRefreshData) await onRefreshData();
      showToast(data.message || 'تست اتصال انجام شد.', data.success ? 'success' : 'error');
    } catch (err: any) {
      showToast(`خطا در تست اتصال: ${err.message}`, 'error');
    } finally {
      setTestingPlatform(null);
    }
  };

  // Real API Send Test Message (sendMessage)
  const handleSendRealMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMessageText.trim()) return;
    setIsSendingTestMsg(true);
    setLastSendResult(null);

    try {
      if (testTargetPlatform === 'both') {
        const [resBale, resTg] = await Promise.all([
          apiFetch('/api/bot/send-test-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              platform: 'bale',
              botToken: formData.botToken,
              baseUrl: formData.baseUrl,
              chatId: testChatId || formData.adminChatId,
              text: testMessageText,
            }),
          }).then((r) => r.json()),
          apiFetch('/api/bot/send-test-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              platform: 'telegram',
              botToken: formData.telegramBotToken,
              baseUrl: formData.telegramBaseUrl,
              chatId: testChatId || formData.telegramAdminChatId,
              text: testMessageText,
            }),
          }).then((r) => r.json()),
        ]);

        setLastSendResult({
          mode: 'both',
          bale: resBale,
          telegram: resTg,
          time: new Date().toLocaleTimeString('fa-IR'),
        });
        showToast('پیام تست به هر دو ربات بله و تلگرام ارسال گردید.', 'success');
      } else {
        const isBale = testTargetPlatform === 'bale';
        const res = await apiFetch('/api/bot/send-test-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: testTargetPlatform,
            botToken: isBale ? formData.botToken : formData.telegramBotToken,
            baseUrl: isBale ? formData.baseUrl : formData.telegramBaseUrl,
            chatId: testChatId || (isBale ? formData.adminChatId : formData.telegramAdminChatId),
            text: testMessageText,
          }),
        });
        const data = await res.json();
        setLastSendResult({
          mode: 'single',
          platform: testTargetPlatform,
          result: data,
          time: new Date().toLocaleTimeString('fa-IR'),
        });
        showToast(data.message || 'پیام تست ارسال شد.', data.success ? 'success' : 'error');
      }
      if (onRefreshData) await onRefreshData();
    } catch (err: any) {
      showToast(`خطا در ارسال پیام: ${err.message}`, 'error');
    } finally {
      setIsSendingTestMsg(false);
    }
  };

  // Real Webhook Action
  const handleWebhookAction = async (platform: 'bale' | 'telegram', action: 'set' | 'delete' | 'info') => {
    const key = `${platform}-${action}`;
    setWebhookLoading(key);
    try {
      const isBale = platform === 'bale';
      const res = await apiFetch('/api/bot/webhook-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          action,
          botToken: isBale ? formData.botToken : formData.telegramBotToken,
          baseUrl: isBale ? formData.baseUrl : formData.telegramBaseUrl,
          webhookUrl: isBale ? formData.baleWebhookUrl : formData.telegramWebhookUrl,
        }),
      });
      const data = await res.json();
      setWebhookResult({ platform, action, ...data });
      if (onRefreshData) await onRefreshData();
      showToast(data.message || 'عملیات وب‌هوک انجام شد.', 'success');
    } catch (err: any) {
      showToast(`خطا در عملیات وب‌هوک: ${err.message}`, 'error');
    } finally {
      setWebhookLoading(null);
    }
  };

  // Clear logs
  const handleClearLogs = async () => {
    try {
      await apiFetch('/api/bot/logs', { method: 'DELETE' });
      if (onRefreshData) await onRefreshData();
      showToast('گزارش‌های فعالیت ربات پاکسازی شد.', 'info');
    } catch {
      showToast('خطا در پاکسازی لاگ‌ها', 'error');
    }
  };

  // Simulate event helper
  const handleQuickSimulate = async (type: string, payload?: any) => {
    try {
      const res = await onSimulateEvent(type, payload);
      showToast(res?.message || 'رویداد با موفقیت اجرا شد.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'خطا در اجرای رویداد', 'error');
    }
  };

  // Quick reply to ticket
  const handleQuickReplySubmit = async (msgId: number) => {
    if (!replyText.trim() || !onRespondMessage) return;
    setIsSubmittingReply(true);
    try {
      await onRespondMessage(msgId, replyText);
      setReplyText('');
      setReplyingId(null);
      showToast('پاسخ شما ثبت شد و از طریق ربات به اطلاع کاربر رسید.', 'success');
    } catch {
      showToast('خطا در ارسال پاسخ', 'error');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const unreadMessages = messages.filter((m) => !m.adminResponse);
  const pendingReceiptOrders = orders.filter(
    (o) => o.paymentStatus === 'PendingVerification' || Boolean((o.receiptImageUrl || o.receiptImage) && o.paymentStatus !== 'Paid')
  );

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Top Command Center Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 text-white shadow-lg border border-slate-700/60 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>مرکز جامع ارتباطات پشتیبانی، ربات‌های بله و تلگرام و وب‌هوک‌ها</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5">
              <Bot className="w-7 h-7 text-amber-400 shrink-0" />
              <span>مدیریت یکپارچه ربات‌های تلگرام و بله و درگاه‌های پشتیبانی</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              در این بخش می‌توانید توکن ربات‌های <strong className="text-white">بله (Bale)</strong> و <strong className="text-white">تلگرام (Telegram)</strong> را تنظیم کنید، اتصال واقعی به سرورهای API را تست نمایید، پیام آزمایشی زنده بفرستید و آیدی‌های پشتیبانی سایت را مدیریت کنید.
            </p>
          </div>

          {/* Live Status Badges & Save Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl px-4 py-2.5 flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${formData.active ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-rose-400'}`} />
              <div>
                <div className="text-[11px] text-slate-300">ربات بله (Bale Bot)</div>
                <div className="text-xs font-bold text-white font-mono">@{formData.botUsername || 'Onivalbot'}</div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl px-4 py-2.5 flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${formData.telegramBotEnabled ? 'bg-sky-400 shadow-sm shadow-sky-400' : 'bg-slate-400'}`} />
              <div>
                <div className="text-[11px] text-slate-300">ربات تلگرام (Telegram)</div>
                <div className="text-xs font-bold text-white font-mono">@{formData.telegramBotUsername || 'onival_shop_bot'}</div>
              </div>
            </div>

            <button
              onClick={() => handleSaveAll()}
              disabled={isSaving}
              className={`px-5 py-3 rounded-2xl font-black text-xs shadow-lg transition flex items-center gap-2 cursor-pointer ${
                hasUnsavedChanges
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/30 ring-2 ring-white/40 animate-pulse'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSaving
                  ? 'در حال ثبت و ذخیره دائمی...'
                  : hasUnsavedChanges
                  ? 'ذخیره تغییرات جدید (ثبت نشده)'
                  : 'ذخیره و اعمال کل تنظیمات'}
              </span>
            </button>
            {lastSavedAt && (
              <div className="text-[11px] text-emerald-300 font-medium bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                آخرین ذخیره دائمی: {lastSavedAt}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-sm transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : toastMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-xs opacity-70 hover:opacity-100 font-bold">
            بستن
          </button>
        </div>
      )}

      {/* Quick KPI Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">وضعیت سرویس بله</span>
            <div className="text-base font-black text-slate-800 mt-0.5 flex items-center gap-1.5">
              <span>{formData.active ? 'متصل و فعال' : 'غیرفعال'}</span>
              <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">tapi.bale.ai</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">وضعیت سرویس تلگرام</span>
            <div className="text-base font-black text-slate-800 mt-0.5 flex items-center gap-1.5">
              <span>{formData.telegramBotEnabled ? 'متصل و فعال' : 'غیرفعال'}</span>
              <span className="text-[11px] font-mono text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md">api.telegram.org</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Send className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">تیکت‌های منتظر پاسخ</span>
            <div className="text-base font-black text-slate-800 mt-0.5">
              {unreadMessages.length} پیام پشتیبانی
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Headphones className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">فیش‌های منتظر تایید</span>
            <div className="text-base font-black text-slate-800 mt-0.5">
              {pendingReceiptOrders.length} فیش واریزی
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2">
        {[
          { id: 'bots-config', label: '۱. توکن و پیکربندی ربات‌ها (بله و تلگرام)', icon: Bot },
          { id: 'live-tester', label: '۲. تست واقعی اتصال، ارسال پیام و وب‌هوک', icon: Zap },
          { id: 'support-channels', label: '۳. کانال‌های پشتیبانی و ارتباطات مشتری', icon: Headphones },
          { id: 'templates-automation', label: '۴. قالب پیام‌های خودکار و اعلان‌ها', icon: Bell },
          { id: 'logs-desk', label: '۵. میز کار پشتیبانی و لاگ زنده ربات', icon: Terminal, badge: logs.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as HubTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-700'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: BOTS CONFIGURATION (BALE & TELEGRAM TOKENS) */}
      {activeSubTab === 'bots-config' && (
        <form onSubmit={handleSaveAll} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bale Bot Configuration Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-5 bg-gradient-to-l from-emerald-50/80 to-white border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-800">پیکربندی بازوی بله (@{(formData.botUsername || 'Onivalbot').replace('@', '')}) و پرداخت کیف پول</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">تراکنش مستقیم</span>
                      </div>
                      <p className="text-[11px] text-slate-500">پرداخت کیف پول بله، صدور فاکتور مشتری و اعلان آنی تراکنش‌ها به اکانت ادمین ({(formData.baleAdminUsername || '@hasti_hjz')})</p>
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-bold text-slate-700">{formData.active ? 'فعال' : 'غیرفعال'}</span>
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => updateField({ active: e.target.checked })}
                      className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                    />
                  </label>
                </div>

                <div className="p-5 space-y-4">
                  {/* Bale Bot Token */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">توکن بازوی بله (Bale Bot Token - از @BotFather)</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowBaleToken(!showBaleToken)}
                          className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                        >
                          {showBaleToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{showBaleToken ? 'مخفی' : 'نمایش'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(formData.botToken, 'baleToken')}
                          className="text-[11px] text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-semibold"
                        >
                          {copiedKey === 'baleToken' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'baleToken' ? 'کپی شد' : 'کپی'}</span>
                        </button>
                      </div>
                    </div>
                    <input
                      type={showBaleToken ? 'text' : 'password'}
                      dir="ltr"
                      value={formData.botToken}
                      onChange={(e) => updateField({ botToken: e.target.value.trim(), baleBotToken: e.target.value.trim() })}
                      placeholder="1204808805:W-mq-hFRtv71zdHaRFSUYdr2GWCJPCvQD34"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono text-left bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700">یوزرنیم ربات بله</label>
                        <a
                          href={`https://ble.ir/${(formData.botUsername || 'Onivalbot').replace('@', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-emerald-600 hover:underline flex items-center gap-0.5"
                        >
                          <span>ble.ir/{formData.botUsername || 'Onivalbot'}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                      <input
                        type="text"
                        dir="ltr"
                        value={formData.botUsername || ''}
                        onChange={(e) => {
                          const clean = e.target.value.replace('@', '').trim();
                          updateField({ botUsername: clean, baleBotUsername: clean });
                        }}
                        placeholder="Onivalbot"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono text-left focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">آیدی اکانت شخصی ادمین بله</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={formData.baleAdminUsername || ''}
                        onChange={(e) => updateField({ baleAdminUsername: e.target.value.trim() })}
                        placeholder="@hasti_hjz"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono text-left focus:outline-hidden focus:border-emerald-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">تراکنش‌های بله و کارت‌به‌کارت به این اکانت ارسال می‌شود.</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">شناسه عددی چت ادمین (Chat ID)</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={formData.adminChatId}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          updateField({ adminChatId: val, baleAdminChatId: val });
                        }}
                        placeholder="923387796"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono text-left focus:outline-hidden focus:border-emerald-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">با ارسال /start از اکانت ادمین به ربات، خودکار ثبت می‌شود.</span>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">آدرس سرور API بله</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={formData.baseUrl}
                        onChange={(e) => updateField({ baseUrl: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono text-left focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* BALE WALLET PAYMENT TOKENS SECTION */}
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <h4 className="text-xs font-black text-emerald-950">توکن‌های پرداخت کیف پولی بازوی @{(formData.botUsername || 'Onivalbot').replace('@', '')}</h4>
                      </div>
                      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-emerald-200 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => updateField({ balePaymentMode: 'live' })}
                          className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                            formData.balePaymentMode !== 'test'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          حالت واقعی (Live)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateField({ balePaymentMode: 'test' })}
                          className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                            formData.balePaymentMode === 'test'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          حالت آزمایشی (Test)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-700">توکن پرداخت کیف پولی (اصلی)</label>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">WALLET-v5gqSc1W1kaBUo2B</span>
                        </div>
                        <input
                          type="text"
                          dir="ltr"
                          value={formData.balePaymentTokenLive || 'WALLET-v5gqSc1W1kaBUo2B'}
                          onChange={(e) => updateField({ balePaymentTokenLive: e.target.value })}
                          placeholder="WALLET-v5gqSc1W1kaBUo2B"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono text-left bg-white focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-700">توکن آزمایشی پرداخت کیف پولی</label>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">WALLET-TEST-...</span>
                        </div>
                        <input
                          type="text"
                          dir="ltr"
                          value={formData.balePaymentTokenTest || 'WALLET-TEST-1111111111111111'}
                          onChange={(e) => updateField({ balePaymentTokenTest: e.target.value })}
                          placeholder="WALLET-TEST-1111111111111111"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono text-left bg-white focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-emerald-100">
                      <span>توکن فعال کنونی: <strong className="font-mono text-emerald-800">{formData.balePaymentMode === 'test' ? (formData.balePaymentTokenTest || 'WALLET-TEST-1111111111111111') : (formData.balePaymentTokenLive || 'WALLET-v5gqSc1W1kaBUo2B')}</strong></span>
                      <a
                        href="https://docs.bale.ai/#%D9%BE%D8%B1%D8%AF%D8%A7%D8%AE%D8%AA"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>مستندات پرداخت بله</span>
                      </a>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">آدرس وب‌هوک دریافت پیام و تراکنش‌های بله</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        dir="ltr"
                        value={formData.baleWebhookUrl || ''}
                        onChange={(e) => updateField({ baleWebhookUrl: e.target.value })}
                        placeholder={`${window.location.origin}/api/webhook/bale`}
                        className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono text-left focus:outline-hidden focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleWebhookAction('bale', 'set')}
                        disabled={webhookLoading === 'bale-set'}
                        className="px-3.5 py-2.5 rounded-xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${webhookLoading === 'bale-set' ? 'animate-spin' : ''}`} />
                        <span>ثبت در سرور بله</span>
                      </button>
                    </div>
                  </div>

                  {/* REAL ADMIN WELCOME MESSAGE DISPATCHER & CONNECTION TESTER */}
                  <div className="p-4 bg-gradient-to-l from-emerald-50 via-teal-50/60 to-white rounded-2xl border-2 border-emerald-300 shadow-xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                          <Send className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-emerald-950">تست واقعی اتصال و ارسال پیام به ادمین</h4>
                          <p className="text-[11px] text-slate-500">
                            ارسال متد <code className="font-mono text-emerald-800">sendMessage</code> به Chat ID ادمین ({formData.adminChatId || 'تنظیم نشده'})
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSendAdminWelcomeTest}
                        disabled={isSendingWelcomeTest}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                        title="ارسال مستقیم درخواست Fetch به سرور بله"
                      >
                        <Send className={`w-3.5 h-3.5 ${isSendingWelcomeTest ? 'animate-bounce' : ''}`} />
                        <span>{isSendingWelcomeTest ? 'در حال ارسال پیام به ادمین...' : 'تست اتصال و ارسال پیام به ادمین'}</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-600 bg-white/80 p-2.5 rounded-xl border border-emerald-100 flex items-center gap-2">
                      <span className="text-emerald-700 font-bold shrink-0">💬 متن ارسالی:</span>
                      <span className="text-slate-800 font-medium select-all">«اتصال ربات به هاست با موفقیت انجام شد. شما به عنوان ادمین شناسایی شدید»</span>
                    </div>

                    {/* Result details box */}
                    {welcomeTestResult && (() => {
                      const isRealSuccess = Boolean(welcomeTestResult.ok && (welcomeTestResult.delivered || welcomeTestResult.messageId));
                      const isForbidden = Boolean(
                        welcomeTestResult.forbiddenStartRequired ||
                        welcomeTestResult.status === 403 ||
                        /Forbidden|can't initiate conversation/i.test(welcomeTestResult.description || '') ||
                        /Forbidden|can't initiate conversation/i.test(welcomeTestResult.message || '')
                      );
                      const displayToken = welcomeTestResult.usedToken || formData.botToken || formData.baleBotToken || '';

                      return (
                        <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                          isRealSuccess
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                            : isForbidden
                            ? 'bg-amber-50 border-amber-300 text-amber-950'
                            : 'bg-rose-50 border-rose-300 text-rose-950'
                        }`}>
                          <div className="flex items-center justify-between font-black pb-2 border-b border-current/15">
                            <span className="flex items-center gap-1.5">
                              {isRealSuccess ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : isForbidden ? (
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-rose-600" />
                              )}
                              <span>
                                {isRealSuccess
                                  ? 'پیام با موفقیت به بله ادمین تحویل داده شد!'
                                  : isForbidden
                                  ? 'نیازمند لمس دکمه «شروع» در ربات توسط ادمین'
                                  : 'عدم ارسال پیام به اکانت ادمین'}
                              </span>
                            </span>
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white border">
                              {welcomeTestResult.status ? `HTTP ${welcomeTestResult.status}` : 'API Response'}
                            </span>
                          </div>

                          <div>📢 <strong>نتیجه:</strong> {welcomeTestResult.message}</div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
                            <div className="bg-white/90 p-2 rounded-xl border border-current/10">
                              🎯 چت‌آیدی مقصد: <span className="font-bold">{welcomeTestResult.usedChatId || formData.adminChatId || '69451465'}</span>
                            </div>
                            <div className="bg-white/90 p-2 rounded-xl border border-current/10 truncate">
                              🔑 توکن استفاده‌شده: <span className="font-bold">{displayToken ? `${displayToken.slice(0, 18)}...` : 'خالی (وارد نشده)'}</span>
                            </div>
                          </div>

                          {welcomeTestResult.messageId && (
                            <div className="text-emerald-800 font-bold bg-white/80 p-2 rounded-xl border border-emerald-200">
                              ✅ شناسه پیام در بله (Message ID): {welcomeTestResult.messageId}
                            </div>
                          )}

                          {welcomeTestResult.hint && !isForbidden && (
                            <div className="p-2.5 rounded-xl bg-white/80 border border-current/15 text-[11px] leading-relaxed">
                              💡 <strong>راهنما:</strong> {welcomeTestResult.hint}
                            </div>
                          )}

                          {isForbidden && (
                            <div className="mt-2 p-3.5 rounded-xl bg-amber-100/90 border border-amber-300 text-amber-950 space-y-2.5">
                              <div className="flex items-center gap-2 font-black text-xs text-amber-900">
                                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                                <span>خطای ۴۰۳ بله: ربات نمی‌تواند آغازگر مکالمه باشد</span>
                              </div>
                              <p className="text-[11px] leading-relaxed text-amber-900">
                                پیام‌رسان بله برای جلوگیری از ارسال پیام‌های ناخواسته، اجازه نمی‌دهد ربات به کاربری پیام بفرستد مگر اینکه آن کاربر حداقل یک بار وارد ربات شده و دکمه <strong>«شروع» (Start)</strong> را زده باشد.
                              </p>
                              <div className="pt-1">
                                <a
                                  href={`https://ble.ir/${(welcomeTestResult.botUsername || formData.baleBotUsername || formData.botUsername || 'Onivalbot').replace('@', '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition cursor-pointer"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  <span>ورود مستقیم به ربات بله و زدن دکمه Start (@{(welcomeTestResult.botUsername || formData.baleBotUsername || formData.botUsername || 'Onivalbot').replace('@', '')})</span>
                                </a>
                              </div>
                              <div className="text-[10px] text-amber-900 font-bold">
                                👈 راهکار: روی دکمه سبز رنگ بالا کلیک کنید، در برنامه بله دکمه «شروع» را بزنید و سپس مجدداً این دکمه تست را فشار دهید تا پیام فوری به اکانت شما ارسال شود.
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Quick Diagnostics Result Box */}
                  {baleDiagnostics && (
                    <div className={`p-3.5 rounded-xl border text-xs ${baleDiagnostics.success ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span>نتیجه تست اتصال بله ({baleDiagnostics.latencyMs}ms):</span>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white border">
                          {baleDiagnostics.mode === 'live_api' ? 'متصل به سرور واقعی بله' : 'تایید ساختار و شبیه‌ساز'}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed">{baleDiagnostics.message}</p>
                    </div>
                  )}

                  {/* Test sendInvoice Result Box */}
                  {invoiceTestResult && (
                    <div className={`p-3.5 rounded-xl border text-xs ${invoiceTestResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                      <div className="font-bold mb-1 flex items-center justify-between">
                        <span>نتیجه ارسال مستقیم فاکتور کیف پول (sendInvoice):</span>
                        <span className="font-mono text-[10px]">{invoiceTestResult.walletToken?.slice(0, 15)}...</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">{invoiceTestResult.message}</p>
                    </div>
                  )}

                  {/* Complete Simulation Result Box */}
                  {baleCycleResult && (
                    <div className="p-3.5 rounded-xl border bg-slate-900 text-white text-xs space-y-2">
                      <div className="flex items-center justify-between font-bold text-amber-400 border-b border-slate-800 pb-1.5">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>گزارش موفقیت شبیه‌سازی کامل چرخه بله</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-300">کد: {baleCycleResult.order?.trackingCode}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{baleCycleResult.message}</p>
                      <div className="bg-slate-800/80 p-2.5 rounded-lg text-[10px] text-slate-300 space-y-1">
                        <div>👤 <strong>ارسال پیام به مشتری:</strong> {baleCycleResult.customerConfirmation?.split('\n')[0]}</div>
                        <div>👑 <strong>اعلان ارسالی به ادمین ({baleCycleResult.adminAccount}):</strong> جزئیات اقلام فاکتور + دستور تایید سریع</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <a
                  href={`https://ble.ir/${(formData.botUsername || 'Onivalbot').replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>باز کردن @{(formData.botUsername || 'Onivalbot').replace('@', '')} در بله</span>
                </a>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestBotConnection('bale')}
                    disabled={testingPlatform === 'bale'}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title="استعلام متد getMe از وب‌سرویس بله"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingPlatform === 'bale' ? 'animate-spin' : ''}`} />
                    <span>تست اتصال (getMe)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestSendInvoice}
                    disabled={isSendingInvoiceTest}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title="ارسال فاکتور واقعی کیف پول بله با توکن فعال"
                  >
                    <Send className={`w-3.5 h-3.5 ${isSendingInvoiceTest ? 'animate-pulse' : ''}`} />
                    <span>{isSendingInvoiceTest ? 'در حال ارسال فاکتور...' : 'ارسال فاکتور تستی (sendInvoice)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSimulateBaleCycle}
                    disabled={isSimulatingBaleCycle}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="تست کامل فرآیند خرید، پرداخت کیف پول، تایید مشتری و نوتیفیکیشن ادمین"
                  >
                    <Zap className={`w-3.5 h-3.5 ${isSimulatingBaleCycle ? 'animate-spin' : ''}`} />
                    <span>{isSimulatingBaleCycle ? 'در حال شبیه‌سازی...' : 'شبیه‌سازی کامل چرخه پرداخت'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveAll()}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Telegram Bot Configuration Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-5 bg-gradient-to-l from-sky-50/80 to-white border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-sm">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800">پیکربندی ربات تلگرام (Telegram Bot)</h3>
                      <p className="text-[11px] text-slate-500">ارسال همزمان اعلان سفارشات، فیش‌های واریزی و تیکت‌های پشتیبانی در تلگرام</p>
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-bold text-slate-700">{formData.telegramBotEnabled ? 'فعال' : 'غیرفعال'}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(formData.telegramBotEnabled)}
                      onChange={(e) => updateField({ telegramBotEnabled: e.target.checked })}
                      className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                    />
                  </label>
                </div>

                <div className="p-5 space-y-4">
                  {/* Telegram Token */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">توکن ربات تلگرام (Telegram Bot Token - از @BotFather)</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowTelegramToken(!showTelegramToken)}
                          className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                        >
                          {showTelegramToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{showTelegramToken ? 'مخفی' : 'نمایش'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(formData.telegramBotToken || '', 'tgToken')}
                          className="text-[11px] text-sky-600 hover:text-sky-700 flex items-center gap-1 font-semibold"
                        >
                          {copiedKey === 'tgToken' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'tgToken' ? 'کپی شد' : 'کپی'}</span>
                        </button>
                      </div>
                    </div>
                    <input
                      type={showTelegramToken ? 'text' : 'password'}
                      dir="ltr"
                      value={formData.telegramBotToken || ''}
                      onChange={(e) => updateField({ telegramBotToken: e.target.value })}
                      placeholder="7192837465:AAH8xK9lP2mN4vB6cX8zQ1wE3rT5yU7iO9p"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono text-left bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">شناسه چت مدیر در تلگرام (Admin Chat ID)</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={formData.telegramAdminChatId || ''}
                        onChange={(e) => updateField({ telegramAdminChatId: e.target.value })}
                        placeholder="923387796"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono text-left focus:outline-hidden focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">یوزرنیم ربات تلگرام (بدون @)</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={formData.telegramBotUsername || ''}
                        onChange={(e) => updateField({ telegramBotUsername: e.target.value.replace('@', '') })}
                        placeholder="onival_shop_bot"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono text-left focus:outline-hidden focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">آدرس سرور API تلگرام</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={formData.telegramBaseUrl || 'https://api.telegram.org'}
                        onChange={(e) => updateField({ telegramBaseUrl: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono text-left focus:outline-hidden focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">آدرس وب‌هوک تلگرام</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={formData.telegramWebhookUrl || ''}
                        onChange={(e) => updateField({ telegramWebhookUrl: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono text-left focus:outline-hidden focus:border-sky-500"
                      />
                    </div>
                  </div>

                  {/* Quick Test Result Box if tested */}
                  {telegramDiagnostics && (
                    <div className={`p-3.5 rounded-xl border text-xs ${telegramDiagnostics.success ? 'bg-sky-50/70 border-sky-200 text-sky-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span>نتیجه تست اتصال تلگرام ({telegramDiagnostics.latencyMs}ms):</span>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white border">
                          {telegramDiagnostics.mode === 'live_api' ? 'متصل به سرور واقعی تلگرام' : 'تایید ساختار و شبیه‌ساز'}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed">{telegramDiagnostics.message}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <a
                  href={`https://t.me/${(formData.telegramBotUsername || 'onival_shop_bot').replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>باز کردن ربات در تلگرام</span>
                </a>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveAll()}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره توکن و تنظیمات تلگرام'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTestBotConnection('telegram')}
                    disabled={testingPlatform === 'telegram'}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingPlatform === 'telegram' ? 'animate-spin' : ''}`} />
                    <span>{testingPlatform === 'telegram' ? 'در حال استعلام...' : 'تست آنلاین اتصال تلگرام'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Bale Bot Payment & Admin Workflow Guide */}
          <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 rounded-3xl p-6 text-white shadow-md border border-emerald-800/60 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold border border-emerald-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">راهنمای فعال‌سازی، پرداخت کیف پول و تایید سفارشات در پیام‌رسان بله</h4>
                  <p className="text-xs text-slate-300">جریان یکپارچه پرداخت مشتری، صدور فاکتور و کنترل تراکنش‌ها توسط اکانت شخصی ادمین (@{(formData.baleAdminUsername || 'hasti_hjz').replace('@', '')})</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                پیکربندی اختصاصی بازوی @{(formData.botUsername || 'Onivalbot').replace('@', '')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed">
              <div className="bg-white/5 backdrop-blur-xs p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="font-black text-emerald-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center text-[10px]">۱</span>
                  <span>اتصال اکانت شخصی ادمین</span>
                </div>
                <p className="text-slate-300">
                  جهت اتصال اکانت شخصی <strong className="text-white">@{(formData.baleAdminUsername || 'hasti_hjz').replace('@', '')}</strong>، کافی است یک بار در بله وارد بازوی <a href={`https://ble.ir/${(formData.botUsername || 'Onivalbot').replace('@', '')}`} target="_blank" rel="noreferrer" className="text-emerald-400 underline">@{(formData.botUsername || 'Onivalbot').replace('@', '')}</a> شده و دکمه <code className="bg-black/30 px-1.5 py-0.5 rounded text-amber-300">/start</code> را لمس فرمایید تا چت آیدی شما به عنوان مدیر فروشگاه ثبت شود.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-xs p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="font-black text-emerald-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center text-[10px]">۲</span>
                  <span>فرایند پرداخت مشتری در بله</span>
                </div>
                <p className="text-slate-300">
                  مشتری پس از ثبت سفارش و انتخاب پرداخت در بله، به ربات هدایت شده، پیش‌فاکتور رسمی را دریافت کرده و با کیف پول بله پرداخت می‌کند. سپس بلافاصله پیام تایید به همراه کد رهگیری و آدرس سایت جهت پیگیری مرسوله برای وی ارسال می‌گردد.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-xs p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="font-black text-emerald-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center text-[10px]">۳</span>
                  <span>تایید کلیه تراکنش‌ها توسط ادمین</span>
                </div>
                <p className="text-slate-300">
                  ادمین تمامی سفارش‌ها اعم از پرداخت بله و کارت‌به‌کارت را به صورت کامل با مشخصات فاکتور و اقلام دریافت می‌کند. ادمین می‌تواند با ارسال دستور <code className="bg-black/30 px-1.5 py-0.5 rounded text-amber-300">/confirm_کد</code> در چت ربات، سفارش را درجا تایید و نهایی کند.
                </p>
              </div>
            </div>
          </div>

          {/* Security & Rate Limit Parameters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 font-bold text-slate-800 text-sm">
              <Settings2 className="w-4 h-4 text-indigo-600" />
              <span>پارامترهای امنیتی، ضد اسپم و اتصال پنل (Server & Webhook Security)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">آدرس پایه پنل مدیریت (Panel Base URL)</label>
                <input
                  type="text"
                  dir="ltr"
                  value={formData.panelBaseUrl}
                  onChange={(e) => updateField({ panelBaseUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono text-left"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">محدودیت ضد اسپم پیام‌ها (ثانیه)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={formData.antiSpamSeconds}
                  onChange={(e) => updateField({ antiSpamSeconds: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">توکن امنیتی هدر وب‌هوک (Secret Token)</label>
                <input
                  type="text"
                  dir="ltr"
                  value={formData.webhookSecretToken || ''}
                  onChange={(e) => updateField({ webhookSecretToken: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono text-left"
                />
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                با کلیک بر روی دکمه ذخیره، تمامی توکن‌ها، چت‌آیدی‌ها و آدرس‌های وب‌هوک در سرور و حافظه دائمی ثبت می‌شوند.
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? 'در حال ذخیره دائمی...' : 'ثبت و ذخیره دائمی توکن‌ها و تنظیمات ربات‌ها'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: LIVE CONNECTION TESTER, REAL MESSAGE DISPATCHER & WEBHOOK MANAGER */}
      {activeSubTab === 'live-tester' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Live Message Sender Console (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="text-sm font-black text-slate-800">فرستنده مستقیم پیام تست به ربات (Live Bot Message Dispatcher)</h3>
                    <p className="text-[11px] text-slate-500">ارسال واقعی پیام از طریق متد sendMessage به چت‌آیدی مدیر یا مشتری</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200 font-bold">
                  POST /sendMessage
                </span>
              </div>

              <form onSubmit={handleSendRealMessage} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">انتخاب پلتفرم مقصد</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'both', label: 'هر دو ربات' },
                        { id: 'bale', label: 'فقط بله' },
                        { id: 'telegram', label: 'فقط تلگرام' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setTestTargetPlatform(item.id as any)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            testTargetPlatform === item.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">شناسه چت مقصد (Chat ID)</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={testChatId}
                      onChange={(e) => setTestChatId(e.target.value)}
                      placeholder="923387796"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono text-left"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">متن پیام آزمایشی</label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setTestMessageText(
                            '🛍 تست فاکتور جدید اونیوال\nکد پیگیری: ONV-88412\nمبلغ: ۳,۴۵۰,۰۰۰ تومان\nوضعیت: فیش واریزی آپلود شد.'
                          )
                        }
                        className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md transition"
                      >
                        نمونه فاکتور
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTestMessageText(
                            '💬 تست تیکت پشتیبانی اونیوال\nمشتری: سارا احمدی\nپیام: سلام، سفارش من کی ارسال میشه؟'
                          )
                        }
                        className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md transition"
                      >
                        نمونه تیکت پشتیبانی
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={testMessageText}
                    onChange={(e) => setTestMessageText(e.target.value)}
                    className="w-full p-3.5 border border-slate-200 rounded-xl text-xs leading-relaxed focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-500">
                    پاسخ سرور بلافاصله در باکس زیر و در ترمینال لاگ ثبت می‌شود.
                  </span>
                  <button
                    type="submit"
                    disabled={isSendingTestMsg}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSendingTestMsg ? 'در حال ارسال پیام به سرور...' : 'ارسال فوری پیام تست'}</span>
                  </button>
                </div>
              </form>

              {lastSendResult && (
                <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono space-y-2">
                  <div className="flex items-center justify-between text-amber-400 border-b border-slate-800 pb-1.5">
                    <span>پاسخ دریافتی از سرور ربات ({lastSendResult.time}):</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">HTTP 200 OK</span>
                  </div>
                  {lastSendResult.mode === 'both' ? (
                    <div className="space-y-1.5 text-[11px] font-sans">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">● بله:</span>
                        <span>{lastSendResult.bale?.message}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sky-400 font-bold">● تلگرام:</span>
                        <span>{lastSendResult.telegram?.message}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] font-sans">
                      {lastSendResult.result?.message}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Webhook & Scenario Simulator (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Webhook Operations */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Webhook className="w-5 h-5 text-purple-600" />
                  <div>
                    <h3 className="text-sm font-black text-slate-800">عملیات مستقیم وب‌هوک (Webhook Manager)</h3>
                    <p className="text-[11px] text-slate-500">ثبت، استعلام وضعیت یا حذف وب‌هوک در سرور بله و تلگرام</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-2">
                    <div className="text-xs font-bold text-emerald-900 flex items-center justify-between">
                      <span>وب‌هوک ربات بله (tapi.bale.ai)</span>
                      <span className="text-[10px] font-mono text-emerald-700">setWebhook</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleWebhookAction('bale', 'set')}
                        disabled={webhookLoading !== null}
                        className="py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition cursor-pointer"
                      >
                        ثبت وب‌هوک
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWebhookAction('bale', 'info')}
                        disabled={webhookLoading !== null}
                        className="py-1.5 px-2 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-[11px] font-bold transition cursor-pointer"
                      >
                        استعلام وضعیت
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWebhookAction('bale', 'delete')}
                        disabled={webhookLoading !== null}
                        className="py-1.5 px-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-[11px] font-bold transition cursor-pointer"
                      >
                        حذف وب‌هوک
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-sky-50/50 border border-sky-100 space-y-2">
                    <div className="text-xs font-bold text-sky-900 flex items-center justify-between">
                      <span>وب‌هوک ربات تلگرام (api.telegram.org)</span>
                      <span className="text-[10px] font-mono text-sky-700">setWebhook</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleWebhookAction('telegram', 'set')}
                        disabled={webhookLoading !== null}
                        className="py-1.5 px-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold transition cursor-pointer"
                      >
                        ثبت وب‌هوک
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWebhookAction('telegram', 'info')}
                        disabled={webhookLoading !== null}
                        className="py-1.5 px-2 rounded-lg bg-white border border-sky-300 text-sky-800 hover:bg-sky-50 text-[11px] font-bold transition cursor-pointer"
                      >
                        استعلام وضعیت
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWebhookAction('telegram', 'delete')}
                        disabled={webhookLoading !== null}
                        className="py-1.5 px-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-[11px] font-bold transition cursor-pointer"
                      >
                        حذف وب‌هوک
                      </button>
                    </div>
                  </div>
                </div>

                {webhookResult && (
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs">
                    <div className="font-bold mb-0.5">نتیجه عملیات وب‌هوک ({webhookResult.platform === 'bale' ? 'بله' : 'تلگرام'}):</div>
                    <div className="text-[11px]">{webhookResult.message}</div>
                  </div>
                )}
              </div>

              {/* Complete E-Commerce Bot Event Simulator */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Play className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-black text-slate-800">شبیه‌ساز سناریوهای عملیاتی فروشگاه در ربات</h3>
                </div>
                <p className="text-[11px] text-slate-500">
                  با کلیک روی هر سناریو، یک رویداد واقعی در سیستم ثبت شده و به ربات‌های فعال ارسال می‌گردد:
                </p>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickSimulate('incoming_order', {
                        fullName: 'امیرحسین رضایی (کاربر ربات بله)',
                        phone: '09124455667',
                        address: 'تهران، سعادت‌آباد، بلوار دریا، پلاک ۴۲',
                      })
                    }
                    className="w-full p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-right transition flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">۱. شبیه‌سازی ثبت سفارش جدید از داخل ربات</div>
                      <div className="text-[11px] text-slate-500">ایجاد فاکتور جدید در سفارشات + ارسال اعلان به مدیر</div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-emerald-600 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleQuickSimulate('test_notification', '🔔 تست سلامت درگاه اعلان‌های بله و تلگرام (همه سرویس‌ها پایدار هستند)')
                    }
                    className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-right transition flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">۲. تست هشدار فوری سیستم به چت ادمین</div>
                      <div className="text-[11px] text-slate-500">بررسی دریافت نوتیفیکیشن آنی روی گوشی مدیر</div>
                    </div>
                    <Zap className="w-4 h-4 text-blue-600 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={handleSimulateBaleCycle}
                    disabled={isSimulatingBaleCycle}
                    className="w-full p-3 rounded-xl border border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100/70 text-right transition flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                        <span>۳. تست چرخه پرداخت کیف پول بله و اعلان به @{(formData.baleAdminUsername || 'hasti_hjz').replace('@', '')}</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10px]">پیشنهادی</span>
                      </div>
                      <div className="text-[11px] text-emerald-700">شبیه‌سازی صدور فاکتور، پرداخت کیف پول، تایید مشتری و نوتیفیکیشن ادمین</div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={handleTestSendInvoice}
                    disabled={isSendingInvoiceTest}
                    className="w-full p-3 rounded-xl border border-amber-300 bg-amber-50/60 hover:bg-amber-100/70 text-right transition flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-amber-950">۴. تست ارسال فاکتور کیف پول بله (sendInvoice API)</div>
                      <div className="text-[11px] text-amber-700">ارسال فاکتور مستقیم به چت مدیر با توکن {formData.balePaymentMode === 'test' ? 'تستی' : 'اصلی'}</div>
                    </div>
                    <Send className="w-4 h-4 text-amber-600 shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUPPORT CHANNELS & CUSTOMER COMMUNICATIONS */}
      {activeSubTab === 'support-channels' && (
        <form onSubmit={handleSaveAll} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Headphones className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-black text-slate-800">شناسه پشتیبان‌ها و شبکه‌های اجتماعی (سینک خودکار با سایت)</h3>
                  <p className="text-xs text-slate-500">
                    هر تغییری در این بخش مستقیماً در صفحه «تماس با ما»، فوتر سایت و دکمه‌های چت پشتیبانی اعمال می‌شود.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                متصل به ویترین فروشگاه
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Telegram Support ID */}
              <div className="p-4 rounded-2xl border border-sky-100 bg-sky-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-sky-900">پشتیبانی مستقیم تلگرام</span>
                  <a
                    href={`https://t.me/${(formData.telegramSupportId || '').replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-sky-600 hover:underline flex items-center gap-1 font-bold"
                  >
                    <span>تست لینک</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">آیدی پشتیبان تلگرام (Support ID)</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.telegramSupportId || ''}
                    onChange={(e) => updateField({ telegramSupportId: e.target.value })}
                    placeholder="@onival_support"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-left"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">کانال رسمی تلگرام فروشگاه</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.telegramChannelId || ''}
                    onChange={(e) => updateField({ telegramChannelId: e.target.value })}
                    placeholder="@onival_official"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-left"
                  />
                </div>
              </div>

              {/* Bale Support ID */}
              <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-900">پشتیبانی مستقیم پیام‌رسان بله</span>
                  <a
                    href={`https://ble.ir/${(formData.baleSupportId || '').replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1 font-bold"
                  >
                    <span>تست لینک</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">آیدی پشتیبان در بله (Bale Support)</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.baleSupportId || ''}
                    onChange={(e) => updateField({ baleSupportId: e.target.value })}
                    placeholder="@onival_bale_support"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-left"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">کانال رسمی بله فروشگاه</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.baleChannelId || ''}
                    onChange={(e) => updateField({ baleChannelId: e.target.value })}
                    placeholder="@onival_bale"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-left"
                  />
                </div>
              </div>

              {/* Domestic & Other Messengers (Eitaa, Rubika, WhatsApp, Instagram) */}
              <div className="p-4 rounded-2xl border border-amber-100 bg-amber-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-900">واتساپ، اینستاگرام، ایتا و روبیکا</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">چندکاناله</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">شماره واتساپ پشتیبانی</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={formData.whatsappNumber || ''}
                      onChange={(e) => updateField({ whatsappNumber: e.target.value })}
                      placeholder="09123456789"
                      className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">پیج اینستاگرام</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={formData.instagramId || ''}
                      onChange={(e) => updateField({ instagramId: e.target.value })}
                      placeholder="@onival.ir"
                      className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">پشتیبانی ایتا (Eitaa)</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={formData.eitaaSupportId || ''}
                      onChange={(e) => updateField({ eitaaSupportId: e.target.value })}
                      placeholder="@onival_eitaa"
                      className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">پشتیبانی روبیکا</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={formData.rubikaSupportId || ''}
                      onChange={(e) => updateField({ rubikaSupportId: e.target.value })}
                      placeholder="@onival_rubika"
                      className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-left"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Phone, Email & Working Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                  <span>تلفن مرکز تماس و پشتیبانی</span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={formData.supportPhone || ''}
                  onChange={(e) => updateField({ supportPhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono text-left"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>ایمیل رسمی پشتیبانی</span>
                </label>
                <input
                  type="email"
                  dir="ltr"
                  value={formData.supportEmail || ''}
                  onChange={(e) => updateField({ supportEmail: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono text-left"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>ساعات پاسخگویی پشتیبانی</span>
                </label>
                <input
                  type="text"
                  value={formData.workingHours || ''}
                  onChange={(e) => updateField({ workingHours: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
              >
                {isSaving ? 'در حال ذخیره...' : 'ذخیره و بروزرسانی اطلاعات پشتیبانی در کل سایت'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 4: AUTOMATION TRIGGERS & MESSAGE TEMPLATES */}
      {activeSubTab === 'templates-automation' && (
        <form onSubmit={handleSaveAll} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Event Triggers Checkboxes (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Bell className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-sm font-black text-slate-800">رویدادهای ارسال خودکار اعلان (Auto Triggers)</h3>
                  <p className="text-[11px] text-slate-500">تعیین کنید در چه مواقعی ربات بله و تلگرام به صورت خودکار پیام بفرستند</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    key: 'notifyOnNewOrder',
                    title: 'اعلان ثبت سفارش جدید به مدیر',
                    desc: 'به محض ثبت فاکتور توسط مشتری در سایت، جزئیات سفارش به بله و تلگرام مدیر ارسال شود.',
                  },
                  {
                    key: 'notifyOnReceiptUpload',
                    title: 'اعلان آپلود فیش واریزی کارت به کارت',
                    desc: 'هنگامی که مشتری تصویر فیش واریزی را بارگذاری می‌کند، هشدار بررسی فیش ارسال شود.',
                  },
                  {
                    key: 'notifyOnNewTicket',
                    title: 'اعلان ثبت پیام و تیکت پشتیبانی جدید',
                    desc: 'ارسال فوری متن پیام فرم تماس با ما به همراه کد رهگیری به چت ادمین.',
                  },
                  {
                    key: 'notifyCustomerOnStatusChange',
                    title: 'اطلاع‌رسانی تایید فیش و تغییر وضعیت سفارش',
                    desc: 'هنگام تایید فیش واریزی یا ارسال مرسوله، پیام خودکار در ربات ثبت گردد.',
                  },
                  {
                    key: 'autoReplyEnabled',
                    title: 'پاسخگوی خودکار هوشمند ربات (Auto-Responder)',
                    desc: 'پاسخ خودکار اولیه به دستور /start و استعلام کد پیگیری در ربات بله و تلگرام.',
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean((formData as any)[item.key])}
                      onChange={(e) => updateField({ [item.key]: e.target.checked })}
                      className="mt-1 w-4 h-4 accent-blue-600 rounded cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">{item.title}</div>
                      <div className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{item.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Customizable Bot Message Templates (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-black text-slate-800">قالب پیام‌های خودکار ربات (Message Templates)</h3>
                    <p className="text-[11px] text-slate-500">
                      می‌توانید از متغیرهای <code className="text-indigo-600 font-mono">{'{customerName}'}</code>،{' '}
                      <code className="text-indigo-600 font-mono">{'{trackingCode}'}</code> و{' '}
                      <code className="text-indigo-600 font-mono">{'{totalPrice}'}</code> استفاده کنید
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">۱. متن خوش‌آمدگویی شروع ربات (/start)</label>
                  <textarea
                    rows={2}
                    value={formData.welcomeTemplate || ''}
                    onChange={(e) => updateField({ welcomeTemplate: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">۲. قالب اعلان ثبت سفارش جدید</label>
                  <textarea
                    rows={3}
                    value={formData.orderInvoiceTemplate || ''}
                    onChange={(e) => updateField({ orderInvoiceTemplate: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">۳. قالب پیام تایید فیش واریزی مشتری</label>
                  <textarea
                    rows={2}
                    value={formData.receiptApprovedTemplate || ''}
                    onChange={(e) => updateField({ receiptApprovedTemplate: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">۴. قالب ارسال پاسخ پشتیبانی به کاربر</label>
                  <textarea
                    rows={3}
                    value={formData.supportReplyTemplate || ''}
                    onChange={(e) => updateField({ supportReplyTemplate: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs leading-relaxed"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  {isSaving ? 'در حال ذخیره...' : 'ذخیره قالب‌ها و تنظیمات خودکارسازی'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 5: LIVE LOGS TERMINAL & QUICK SUPPORT DESK */}
      {activeSubTab === 'logs-desk' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Quick Support Desk (6 Cols) */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-rose-600" />
                  <div>
                    <h3 className="text-sm font-black text-slate-800">میز پاسخگویی سریع تیکت‌های پشتیبانی</h3>
                    <p className="text-[11px] text-slate-500">پاسخ شما هم در صفحه پیگیری سایت ثبت می‌شود و هم به ربات ارسال می‌گردد</p>
                  </div>
                </div>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('messages')}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    مشاهده همه پیام‌ها
                  </button>
                )}
              </div>

              {messages.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400">هیچ پیام پشتیبانی ثبت نشده است.</div>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {messages.slice(0, 6).map((msg) => (
                    <div key={msg.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{msg.fullName}</span>
                          <span className="text-[10px] font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                            {msg.trackingCode}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            msg.adminResponse ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {msg.adminResponse ? 'پاسخ داده شده' : 'در انتظار پاسخ'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">{msg.message}</p>

                      {msg.adminResponse ? (
                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900">
                          <span className="font-bold">پاسخ ادمین: </span>
                          {msg.adminResponse}
                        </div>
                      ) : replyingId === msg.id ? (
                        <div className="space-y-2 pt-1">
                          <textarea
                            rows={2}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="پاسخ خود را بنویسید..."
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setReplyingId(null)}
                              className="px-3 py-1 rounded-lg text-xs text-slate-600 hover:bg-slate-200"
                            >
                              انصراف
                            </button>
                            <button
                              type="button"
                              disabled={isSubmittingReply}
                              onClick={() => handleQuickReplySubmit(msg.id)}
                              className="px-3.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                            >
                              {isSubmittingReply ? 'در حال ارسال...' : 'ثبت و ارسال به ربات'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingId(msg.id);
                              setReplyText('');
                            }}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>ارسال پاسخ سریع</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Live Bot Activity Logs Terminal (6 Cols) */}
          <div className="lg:col-span-6 bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xs text-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-black text-white">ترمینال زنده رویدادهای ربات بله و تلگرام</h3>
                    <p className="text-[11px] text-slate-400">ثبت لحظه‌ای تمامی درخواست‌های API، تست‌ها و اعلان‌ها</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>پاکسازی لاگ</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 font-mono text-xs">
                {logs.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 font-sans">هیچ رویدادی در لاگ ثبت نشده است.</div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 font-sans">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              log.status === 'error' ? 'bg-rose-500' : 'bg-emerald-400'
                            }`}
                          />
                          <span className="text-[11px] font-bold text-amber-400">
                            {log.platform === 'telegram' ? '[Telegram API]' : '[Bale API]'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{log.type}</span>
                        </div>
                        <div className="text-xs text-slate-200 leading-relaxed">{log.text}</div>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono bg-slate-900 px-2 py-0.5 rounded">
                        {log.time}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
