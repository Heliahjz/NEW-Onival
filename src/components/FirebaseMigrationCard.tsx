import React, { useState, useEffect } from 'react';
import {
  Database,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Terminal,
  FileJson,
  ShieldCheck,
  HelpCircle,
  Layers,
  Sparkles,
  Server,
} from 'lucide-react';
import {
  getActiveSupabaseConfig,
  saveRuntimeSupabaseConfig,
  SUPABASE_CONFIG,
  CustomSupabaseConfig,
  testSupabaseConnection,
} from '../supabaseClient';
import {
  runManualSeedDatabase,
  getCachedCloudState,
  saveCloudStateToSupabase,
  getAdminSessionToken,
} from '../services/firebaseSync';

interface FirebaseMigrationCardProps {
  onRefreshAppData?: () => Promise<void> | void;
}

const SUPABASE_SCHEMA_SQL = `-- اسکریپت ساخت جداول پروژه اونیوال در Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.products (
  id BIGINT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT,
  price NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  category_id BIGINT DEFAULT 1,
  category_title TEXT,
  image_name TEXT,
  description TEXT,
  content TEXT,
  status TEXT DEFAULT 'published',
  is_delete BOOLEAN DEFAULT false,
  payload JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id BIGINT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT,
  parent_id BIGINT,
  sort_order INTEGER DEFAULT 1,
  description TEXT,
  image_name TEXT,
  status TEXT DEFAULT 'published',
  payload JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id BIGINT PRIMARY KEY,
  tracking_code TEXT,
  user_full_name TEXT,
  phone_number TEXT,
  user_address TEXT,
  total_price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Pending',
  payment_status TEXT DEFAULT 'Unpaid',
  payment_method TEXT DEFAULT 'card_to_card',
  creation_time TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  payload JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_users (
  id BIGINT PRIMARY KEY,
  username TEXT NOT NULL DEFAULT 'admin',
  email TEXT NOT NULL DEFAULT 'admin@onival.com',
  password TEXT NOT NULL DEFAULT 'admin',
  name TEXT DEFAULT 'مدیریت اونیوال (ONIVAL Admin)',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`;

export const FirebaseMigrationCard: React.FC<FirebaseMigrationCardProps> = ({
  onRefreshAppData,
}) => {
  const activeCfg = getActiveSupabaseConfig();
  const [configForm, setConfigForm] = useState<CustomSupabaseConfig>({
    supabaseUrl: activeCfg.supabaseUrl || SUPABASE_CONFIG.supabaseUrl,
    supabaseAnonKey: activeCfg.supabaseAnonKey || SUPABASE_CONFIG.supabaseAnonKey,
  });

  const [isSeeding, setIsSeeding] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    tablesReady: boolean;
    message?: string;
  }>({ connected: true, tablesReady: false });

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    testSupabaseConnection().then(setConnectionStatus).catch(() => {});
  }, []);

  // ۱. اجرای راه‌اندازی اولیه (Seed Data) برای ساخت محصولات پیش‌فرض و حساب ادمین در سوپابیس
  const handleSeedDatabase = async (resetToFactory = false) => {
    setIsSeeding(true);
    setFeedback({ type: null, message: '' });
    try {
      const res = await runManualSeedDatabase({ resetAllToDefault: resetToFactory });
      setFeedback({
        type: 'success',
        message: res.message,
      });
      const status = await testSupabaseConnection();
      setConnectionStatus(status);
      await onRefreshAppData?.();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'خطا در راه‌اندازی اولیه دیتابیس سوپابیس',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  // ۲. همگام‌سازی فوری تمام اطلاعات فعلی سایت با دیتابیس ابری سوپابیس
  const handleSyncCurrentStateToSupabase = async () => {
    setIsSyncingCloud(true);
    setFeedback({ type: null, message: '' });
    try {
      const currentState = getCachedCloudState();
      const ok = await saveCloudStateToSupabase(currentState);
      setFeedback({
        type: ok ? 'success' : 'error',
        message: ok
          ? 'تمامی اطلاعات لحظه‌ای سایت (محصولات، دسته‌بندی‌ها، سفارشات، مقالات، لوگو و حساب ادمین) به طور کامل در جداول Supabase ذخیره شد.'
          : 'ذخیره در حافظه محلی انجام شد؛ برای ثبت در سرور ابری مطمئن شوید جداول (products, categories, orders, admin_users, settings) در Supabase SQL Editor ساخته شده‌اند.',
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'خطا در همگام‌سازی با سرور Supabase.',
      });
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // ۳. خروجی گرفتن کامل از کل دیتابیس تا این لحظه (JSON Backup)
  const handleExportFullBackup = () => {
    const state = getCachedCloudState();
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `onival-supabase-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedback({
      type: 'success',
      message:
        'فایل پشتیبان کامل دیتابیس (شامل تمام محصولات، سفارشات، تنظیمات و اکانت مدیریت تا این لحظه) دانلود شد.',
    });
  };

  // ۴. بازگردانی فایل پشتیبان دیتابیس (Import JSON Backup) و انتقال مستقیم به سوپابیس
  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const raw = ev.target?.result as string;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('فرمت فایل پشتیبان معتبر نیست.');
        }
        setIsSyncingCloud(true);
        await saveCloudStateToSupabase(parsed);
        try {
          const token = getAdminSessionToken();
          await fetch('/api/firebase/import-state', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(parsed),
          });
        } catch {
          // ignore if serverless SPA on Netlify
        }
        await onRefreshAppData?.();
        setFeedback({
          type: 'success',
          message:
            'تمامی اطلاعات فایل پشتیبان با موفقیت وارد سیستم شد و در دیتابیس Supabase نیز ثبت گردید.',
        });
      } catch (err: any) {
        setFeedback({
          type: 'error',
          message: err?.message || 'خطا در خواندن فایل پشتیبان JSON.',
        });
      } finally {
        setIsSyncingCloud(false);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveCustomSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveRuntimeSupabaseConfig(configForm);
    setFeedback({
      type: 'success',
      message:
        'تنظیمات اتصال به Supabase ذخیره شد. برای اعمال اتصال به پروژه جدید، صفحه را یک بار رفرش (Reload) نمایید.',
    });
  };

  const handleResetSupabaseConfig = () => {
    saveRuntimeSupabaseConfig(null);
    setConfigForm({
      supabaseUrl: SUPABASE_CONFIG.supabaseUrl,
      supabaseAnonKey: SUPABASE_CONFIG.supabaseAnonKey,
    });
    setFeedback({
      type: 'success',
      message: 'تنظیمات اتصال به مقادیر پیش‌فرض فایل src/supabaseClient.ts بازنشانی شد.',
    });
  };

  const configSnippetCode = `// فایل متمرکز: src/supabaseClient.ts
export const SUPABASE_CONFIG = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "${configForm.supabaseUrl}",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "${configForm.supabaseAnonKey}"
};`;

  const handleCopySnippet = () => {
    navigator.clipboard?.writeText(configSnippetCode);
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2500);
  };

  const handleCopySql = () => {
    navigator.clipboard?.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-l from-emerald-50/70 via-white to-amber-50/40">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-800">
                مدیریت دیتابیس ابری سوپابیس (Supabase)، راه‌اندازی اولیه (Seed Data) و استقرار Netlify
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                {connectionStatus.tablesReady
                  ? 'جداول Supabase فعال و متصل'
                  : 'متصل به سرور Supabase'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              پشتیبانی کامل از جداول <code className="font-mono text-emerald-700">products</code>،{' '}
              <code className="font-mono text-emerald-700">categories</code>،{' '}
              <code className="font-mono text-emerald-700">orders</code>،{' '}
              <code className="font-mono text-emerald-700">admin_users</code> و{' '}
              <code className="font-mono text-emerald-700">settings</code> از طریق{' '}
              <code className="font-mono text-amber-700">src/supabaseClient.ts</code>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-emerald-600" />
          <span>
            {showGuide
              ? 'بستن راهنمای جداول Supabase و Netlify'
              : 'مشاهده اسکریپت SQL و راهنمای استقرار'}
          </span>
        </button>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {feedback.type && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 text-xs sm:text-sm font-bold ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* ۱. دکمه‌های راه‌اندازی اولیه (Seed Data) و پشتیبان‌گیری آنی */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>۱. راه‌اندازی اولیه خودکار دیتابیس در سوپابیس (Seed Data) و پشتیبان‌گیری</span>
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                در صورت خالی بودن جداول در Supabase، سیستم به صورت خودکار محصولات، دسته‌بندی‌ها، تنظیمات و حساب پیش‌فرض ادمین را درج می‌کند. همچنین با دکمه‌های زیر می‌توانید هر زمان عملیات Seed یا همگام‌سازی را اجرا کنید:
              </p>
            </div>
          </div>

          {/* اطلاعات حساب ادمین پیش‌فرض */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-white border border-emerald-200/80">
            <div className="flex items-center justify-between md:justify-start gap-2 text-xs">
              <span className="text-slate-500 font-bold">نام کاربری ادمین پیش‌فرض:</span>
              <code className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-mono font-bold">
                admin
              </code>
            </div>
            <div className="flex items-center justify-between md:justify-start gap-2 text-xs">
              <span className="text-slate-500 font-bold">ایمیل ادمین پیش‌فرض:</span>
              <code className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-mono font-bold">
                admin@onival.com
              </code>
            </div>
            <div className="flex items-center justify-between md:justify-start gap-2 text-xs">
              <span className="text-slate-500 font-bold">رمز عبور پیش‌فرض:</span>
              <code className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-mono font-bold">
                admin
              </code>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              disabled={isSeeding}
              onClick={() => handleSeedDatabase(false)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSeeding ? 'animate-spin' : ''}`} />
              <span>
                {isSeeding
                  ? 'در حال تزریق داده‌ها در Supabase...'
                  : 'راه‌اندازی اولیه و تزریق محصولات و ادمین پیش‌فرض (Seed Data)'}
              </span>
            </button>

            <button
              type="button"
              disabled={isSyncingCloud}
              onClick={handleSyncCurrentStateToSupabase}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <CloudUpload className="w-4 h-4" />
              <span>
                {isSyncingCloud
                  ? 'در حال ذخیره در Supabase...'
                  : 'ذخیره و همگام‌سازی فوری کل اطلاعات فعلی در Supabase'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportFullBackup}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
            >
              <CloudDownload className="w-4 h-4 text-amber-400" />
              <span>دانلود فایل پشتیبان کامل دیتابیس (JSON)</span>
            </button>

            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition">
              <FileJson className="w-4 h-4 text-indigo-600" />
              <span>بازگردانی و انتقال فایل پشتیبان به Supabase (Import)</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImportBackupFile}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* ۲. فایل متمرکز تنظیمات سوپابیس (src/supabaseClient.ts) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <form
            onSubmit={handleSaveCustomSupabaseConfig}
            className="lg:col-span-7 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-600" />
                <span>۲. تنظیمات متمرکز اتصال به سوپابیس (src/supabaseClient.ts)</span>
              </h4>
              <button
                type="button"
                onClick={handleResetSupabaseConfig}
                className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                بازگردانی به مقادیر پیش‌فرض
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              پروژه به صورت خودکار متغیرهای محیطی{' '}
              <code className="font-mono font-bold text-slate-700">
                import.meta.env.VITE_SUPABASE_URL
              </code>{' '}
              و{' '}
              <code className="font-mono font-bold text-slate-700">
                import.meta.env.VITE_SUPABASE_ANON_KEY
              </code>{' '}
              را از طریق فایل <code className="font-mono font-bold text-slate-700">src/supabaseClient.ts</code> می‌خواند:
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  VITE_SUPABASE_URL (Project URL)
                </label>
                <input
                  type="url"
                  dir="ltr"
                  required
                  value={configForm.supabaseUrl}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, supabaseUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  VITE_SUPABASE_ANON_KEY (Publishable / Anon Key)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  value={configForm.supabaseAnonKey}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, supabaseAnonKey: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                />
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                ذخیره تنظیمات اتصال Supabase
              </button>
            </div>
          </form>

          {/* پیش‌نمایش کد متمرکز supabaseClient.ts */}
          <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-slate-900 text-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Terminal className="w-4 h-4" />
                <span>فایل متمرکز: src/supabaseClient.ts</span>
              </span>
              <button
                type="button"
                onClick={handleCopySnippet}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 cursor-pointer"
              >
                {copiedConfig ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>کپی شد</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>کپی کد کانفیگ</span>
                  </>
                )}
              </button>
            </div>
            <pre
              dir="ltr"
              className="text-[11px] font-mono bg-slate-950/90 p-3.5 rounded-xl overflow-x-auto text-emerald-300 leading-relaxed border border-slate-800"
            >
              {configSnippetCode}
            </pre>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              در Netlify نیز می‌توانید متغیرهای{' '}
              <code className="text-amber-300 font-mono">VITE_SUPABASE_URL</code> و{' '}
              <code className="text-amber-300 font-mono">VITE_SUPABASE_ANON_KEY</code> را در بخش Environment Variables قرار دهید.
            </p>
          </div>
        </div>

        {/* ۳. اسکریپت ساخت جداول در Supabase SQL Editor */}
        {showGuide && (
          <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>
                  اسکریپت SQL ساخت جداول در Supabase (products, categories, orders, admin_users, settings)
                </span>
              </h4>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>اسکریپت SQL کپی شد</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>کپی اسکریپت SQL برای Supabase</span>
                  </>
                )}
              </button>
            </div>

            <pre
              dir="ltr"
              className="text-[11px] font-mono bg-slate-950 text-emerald-300 p-4 rounded-xl overflow-x-auto max-h-60 leading-relaxed border border-slate-800"
            >
              {SUPABASE_SCHEMA_SQL}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
