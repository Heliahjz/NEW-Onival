import React, { useState } from 'react';
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
  Server
} from 'lucide-react';
import {
  getActiveFirebaseConfig,
  saveRuntimeFirebaseConfig,
  FIREBASE_CONFIG,
  CustomFirebaseConfig
} from '../firebaseConfig';
import {
  runManualSeedDatabase,
  getCachedCloudState,
  saveCloudStateToFirebase
} from '../services/firebaseSync';

interface FirebaseMigrationCardProps {
  onRefreshAppData?: () => Promise<void> | void;
}

export const FirebaseMigrationCard: React.FC<FirebaseMigrationCardProps> = ({
  onRefreshAppData,
}) => {
  const activeCfg = getActiveFirebaseConfig();
  const [configForm, setConfigForm] = useState<CustomFirebaseConfig>({
    apiKey: activeCfg.apiKey || '',
    authDomain: activeCfg.authDomain || '',
    projectId: activeCfg.projectId || '',
    storageBucket: activeCfg.storageBucket || '',
    messagingSenderId: activeCfg.messagingSenderId || '',
    appId: activeCfg.appId || '',
    firestoreDatabaseId: activeCfg.firestoreDatabaseId || '(default)',
  });

  const [isSeeding, setIsSeeding] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  // ۱. اجرای راه‌اندازی اولیه (Seed Data) برای ساخت محصولات پیش‌فرض و حساب ادمین در فایربیس
  const handleSeedDatabase = async (resetToFactory = false) => {
    setIsSeeding(true);
    setFeedback({ type: null, message: '' });
    try {
      const res = await runManualSeedDatabase({ resetAllToDefault: resetToFactory });
      setFeedback({
        type: 'success',
        message: res.message,
      });
      await onRefreshAppData?.();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'خطا در راه‌اندازی اولیه دیتابیس فایربیس',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  // ۲. همگام‌سازی فوری تمام اطلاعات فعلی سایت با دیتابیس ابری فایربیس
  const handleSyncCurrentStateToFirebase = async () => {
    setIsSyncingCloud(true);
    setFeedback({ type: null, message: '' });
    try {
      const currentState = getCachedCloudState();
      const ok = await saveCloudStateToFirebase(currentState);
      setFeedback({
        type: ok ? 'success' : 'error',
        message: ok
          ? 'تمامی اطلاعات لحظه‌ای سایت (محصولات، سفارشات، مقالات، لوگو، ربات‌ها و حساب ادمین) به طور کامل در دیتابیس ابری Firebase Firestore ذخیره شد.'
          : 'ذخیره در حافظه محلی انجام شد اما اتصال به کلود فایربیس برقرار نشد. تنظیمات پروژه فایربیس یا Rules را بررسی نمایید.',
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'خطا در همگام‌سازی با سرور فایربیس.',
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
    a.download = `onival-full-database-backup-${new Date().toISOString().slice(0, 10)}.json`;
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

  // ۴. بازگردانی فایل پشتیبان دیتابیس (Import JSON Backup) و انتقال مستقیم به فایربیس
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
        await saveCloudStateToFirebase(parsed);
        try {
          await fetch('/api/firebase/import-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed),
          });
        } catch {
          // ignore if serverless
        }
        await onRefreshAppData?.();
        setFeedback({
          type: 'success',
          message:
            'تمامی اطلاعات فایل پشتیبان با موفقیت وارد سیستم شد و در دیتابیس فایربیس نیز ثبت گردید.',
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

  const handleSaveCustomFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveRuntimeFirebaseConfig(configForm);
    setFeedback({
      type: 'success',
      message:
        'تنظیمات اتصال به فایربیس ذخیره شد. برای اعمال اتصال به پروژه جدید، صفحه را یک بار رفرش (Reload) نمایید.',
    });
  };

  const handleResetFirebaseConfig = () => {
    saveRuntimeFirebaseConfig(null);
    setConfigForm({
      apiKey: FIREBASE_CONFIG.apiKey,
      authDomain: FIREBASE_CONFIG.authDomain,
      projectId: FIREBASE_CONFIG.projectId,
      storageBucket: FIREBASE_CONFIG.storageBucket,
      messagingSenderId: FIREBASE_CONFIG.messagingSenderId,
      appId: FIREBASE_CONFIG.appId,
      firestoreDatabaseId: FIREBASE_CONFIG.firestoreDatabaseId || '(default)',
    });
    setFeedback({
      type: 'success',
      message: 'تنظیمات فایربیس به مقادیر پیش‌فرض فایل src/firebaseConfig.ts بازنشانی شد.',
    });
  };

  const configSnippetCode = `// فایل متمرکز: src/firebaseConfig.ts
export const FIREBASE_CONFIG = {
  apiKey: "${configForm.apiKey}",
  authDomain: "${configForm.authDomain}",
  projectId: "${configForm.projectId}",
  storageBucket: "${configForm.storageBucket}",
  messagingSenderId: "${configForm.messagingSenderId}",
  appId: "${configForm.appId}",
  firestoreDatabaseId: "${configForm.firestoreDatabaseId || '(default)'}"
};`;

  const handleCopySnippet = () => {
    navigator.clipboard?.writeText(configSnippetCode);
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2500);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-l from-amber-50/70 via-white to-emerald-50/40">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-800">
                مدیریت دیتابیس فایربیس (Firebase Firestore)، راه‌اندازی اولیه (Seed Data) و انتقال سرور
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                متصل به Cloud Firestore
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ساخت خودکار محصولات و ادمین پیش‌فرض در فایربیس، پشتیبان‌گیری کامل تا لحظه انتقال و تنظیمات متمرکز <code className="font-mono text-amber-700">src/firebaseConfig.ts</code>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-amber-600" />
          <span>{showGuide ? 'بستن راهنمای انتقال فایربیس' : 'مشاهده راهنمای گام‌به‌گام انتقال دیتابیس'}</span>
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
                <span>۱. دکمه راه‌اندازی اولیه دیتابیس (Seed Data) و انتقال کامل اطلاعات</span>
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                پروژه به محض لود شدن به صورت خودکار دیتابیس خالی را با محصولات پیش‌فرض و اکانت ادمین پر می‌کند. همچنین هر زمان بخواهید می‌توانید با دکمه‌های زیر دیتابیس را دستی Seed یا پشتیبان‌گیری کنید:
              </p>
            </div>
          </div>

          {/* اطلاعات حساب ادمین پیش‌فرض */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-white border border-amber-200/80">
            <div className="flex items-center justify-between md:justify-start gap-2 text-xs">
              <span className="text-slate-500 font-bold">نام کاربری ادمین پیش‌فرض:</span>
              <code className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-mono font-bold">admin</code>
            </div>
            <div className="flex items-center justify-between md:justify-start gap-2 text-xs">
              <span className="text-slate-500 font-bold">ایمیل ادمین پیش‌فرض:</span>
              <code className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-mono font-bold">admin@onival.com</code>
            </div>
            <div className="flex items-center justify-between md:justify-start gap-2 text-xs">
              <span className="text-slate-500 font-bold">رمز عبور پیش‌فرض:</span>
              <code className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-mono font-bold">admin</code>
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
                  ? 'در حال ساخت داده‌ها در فایربیس...'
                  : 'راه‌اندازی اولیه و تزریق محصولات و ادمین پیش‌فرض (Seed Data)'}
              </span>
            </button>

            <button
              type="button"
              disabled={isSyncingCloud}
              onClick={handleSyncCurrentStateToFirebase}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <CloudUpload className="w-4 h-4" />
              <span>
                {isSyncingCloud
                  ? 'در حال ذخیره در فایربیس...'
                  : 'ذخیره و همگام‌سازی فوری کل اطلاعات فعلی در فایربیس'}
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
              <span>بازگردانی و انتقال فایل پشتیبان به فایربیس (Import)</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImportBackupFile}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* ۲. فایل متمرکز تنظیمات فایربیس (src/firebaseConfig.ts) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <form
            onSubmit={handleSaveCustomFirebaseConfig}
            className="lg:col-span-7 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-600" />
                <span>۲. تنظیمات متمرکز اتصال به فایربیس (firebaseConfig)</span>
              </h4>
              <button
                type="button"
                onClick={handleResetFirebaseConfig}
                className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                بازگردانی به کانفیگ پیش‌فرض
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              تمامی تنظیمات فایربیس در فایل <code className="font-mono font-bold text-slate-700">src/firebaseConfig.ts</code> متمرکز شده است. برای انتقال به پروژه یا هاست جدید، می‌توانید یا آن فایل را ویرایش کنید و یا مشخصات پروژه فایربیس جدید را در فرم زیر وارد و ذخیره نمایید:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Project ID</label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  value={configForm.projectId}
                  onChange={(e) => setConfigForm({ ...configForm, projectId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">API Key</label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  value={configForm.apiKey}
                  onChange={(e) => setConfigForm({ ...configForm, apiKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Auth Domain</label>
                <input
                  type="text"
                  dir="ltr"
                  value={configForm.authDomain}
                  onChange={(e) => setConfigForm({ ...configForm, authDomain: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Storage Bucket</label>
                <input
                  type="text"
                  dir="ltr"
                  value={configForm.storageBucket}
                  onChange={(e) => setConfigForm({ ...configForm, storageBucket: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">App ID</label>
                <input
                  type="text"
                  dir="ltr"
                  value={configForm.appId}
                  onChange={(e) => setConfigForm({ ...configForm, appId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Firestore Database ID (پیش‌فرض: (default))
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={configForm.firestoreDatabaseId || '(default)'}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, firestoreDatabaseId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                />
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                ذخیره تنظیمات اتصال فایربیس
              </button>
            </div>
          </form>

          {/* پیش‌نمایش کد متمرکز firebaseConfig.ts */}
          <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-slate-900 text-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Terminal className="w-4 h-4" />
                <span>فایل متمرکز: src/firebaseConfig.ts</span>
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
              با تغییر همین چند خط در فایل <code className="text-amber-300 font-mono">src/firebaseConfig.ts</code>، کل پروژه در هر هاست یا سروری به دیتابیس جدید شما متصل می‌شود.
            </p>
          </div>
        </div>

        {/* ۳. راهنمای جامع و گام‌به‌گام انتقال دیتابیس در فایربیس گوگل */}
        {showGuide && (
          <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-4">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>راهنمای کامل و گام‌به‌گام انتقال دیتابیس به فایربیس گوگل (بدون حذف هیچ‌یک از اطلاعات)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 leading-relaxed">
              <div className="bg-white p-4 rounded-xl border border-amber-100 space-y-2">
                <div className="font-black text-amber-700">
                  روش اول: انتقال آنی از طریق پنل مدیریت (ساده‌ترین و کامل‌ترین روش)
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                  <li>
                    قبل از تغییر سرور یا اکانت فایربیس، در همین بخش روی دکمه{' '}
                    <strong>«دانلود فایل پشتیبان کامل دیتابیس (JSON)»</strong> کلیک کنید تا تمام اطلاعات سایت تا این لحظه (محصولات، سفارشات، فیش‌ها، تنظیمات ربات، لوگو و رمز ادمین) در یک فایل ذخیره شود.
                  </li>
                  <li>
                    وارد کنسول گوگل فایربیس (<code className="font-mono">console.firebase.google.com</code>) شوید، یک پروژه بسازید و از منوی <strong>Build &gt; Firestore Database</strong> روی <strong>Create database</strong> کلیک کنید.
                  </li>
                  <li>
                    در بخش <strong>Project Settings &gt; General &gt; Your apps (Web)</strong> مقادیر <code className="font-mono">firebaseConfig</code> را کپی کرده و در فایل <code className="font-mono font-bold">src/firebaseConfig.ts</code> (یا فرم بالا) قرار دهید.
                  </li>
                  <li>
                    در تب <strong>Firestore Database &gt; Rules</strong>، قوانین فایل <code className="font-mono">firestore.rules</code> پروژه را قرار داده و <strong>Publish</strong> بزنید.
                  </li>
                  <li>
                    سایت را باز کرده و با دکمه <strong>«بازگردانی و انتقال فایل پشتیبان به فایربیس (Import)»</strong> فایل JSON دانلود شده را انتخاب کنید؛ کل اطلاعات تا آخرین لحظه بدون حذف حتی یک رکورد به فایربیس جدید منتقل می‌شود!
                  </li>
                </ol>
              </div>

              <div className="bg-white p-4 rounded-xl border border-amber-100 space-y-2">
                <div className="font-black text-indigo-700">
                  روش دوم: انتقال مستقیم بین دو پروژه فایربیس در Google Cloud (مناسب دیتابیس‌های حجیم)
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                  <li>
                    اگر می‌خواهید دیتابیس Firestore را مستقیماً در کلود گوگل از یک پروژه به پروژه دیگر منتقل کنید، وارد <code className="font-mono">console.cloud.google.com/firestore</code> شوید.
                  </li>
                  <li>
                    از منوی سمت چپ گزینه <strong>Import/Export</strong> را انتخاب کرده و روی <strong>Export</strong> کلیک کنید و یک Bucket در Google Cloud Storage انتخاب نمایید.
                  </li>
                  <li>
                    یا با ابزار خط فرمان Google Cloud دستور زیر را اجرا کنید:
                    <pre dir="ltr" className="mt-1 p-2 rounded bg-slate-900 text-amber-300 font-mono text-[10px] overflow-x-auto">
                      gcloud firestore export gs://YOUR_BUCKET_NAME --project=SOURCE_PROJECT_ID
                    </pre>
                  </li>
                  <li>
                    سپس در پروژه مقصد دستور Import را اجرا نمایید:
                    <pre dir="ltr" className="mt-1 p-2 rounded bg-slate-900 text-emerald-300 font-mono text-[10px] overflow-x-auto">
                      gcloud firestore import gs://YOUR_BUCKET_NAME/EXPORT_FOLDER --project=NEW_PROJECT_ID
                    </pre>
                  </li>
                  <li>
                    در نهایت فقط مقادیر فایل متمرکز <code className="font-mono font-bold">src/firebaseConfig.ts</code> را به پروژه جدید تغییر دهید.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
