import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Mail,
  ShieldCheck,
  Lock,
  Save,
  CheckCircle2,
  UserCheck,
  Image as ImageIcon,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Hexagon,
  Sparkles,
  AlertCircle,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Crop
} from 'lucide-react';
import { SiteContent } from '../types';
import { HostDataManagementCard } from './HostDataManagementCard';
import { apiFetch } from '../services/dataService';

interface AccountViewProps {
  siteContent?: SiteContent;
  onUpdateSiteContent?: (updated: SiteContent) => Promise<boolean> | void;
  onRefreshData?: () => Promise<void> | void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  siteContent,
  onUpdateSiteContent,
  onRefreshData
}) => {
  const [username, setUsername] = useState('admin');
  const [email, setEmail] = useState('admin@onival.com');
  const [adminName, setAdminName] = useState('مدیریت اونیوال (ONIVAL Admin)');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  // Site Logo state & display customization
  const [siteLogo, setSiteLogo] = useState<string>(siteContent?.siteLogo || '');
  const [siteLogoFit, setSiteLogoFit] = useState<'cover' | 'contain'>(
    siteContent?.siteLogoFit || 'cover'
  );
  const [siteLogoShape, setSiteLogoShape] = useState<'circle' | 'rounded' | 'free'>(
    siteContent?.siteLogoShape || 'rounded'
  );
  const [siteLogoScale, setSiteLogoScale] = useState<number>(siteContent?.siteLogoScale || 100);
  const [autoTrimLogo, setAutoTrimLogo] = useState<boolean>(true);
  const [logoUploadError, setLogoUploadError] = useState('');
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [logoSuccessMsg, setLogoSuccessMsg] = useState('');

  // Credentials status state
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: ''
  });
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);

  useEffect(() => {
    apiFetch('/api/account/profile')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) {
          if (data.username) setUsername(data.username);
          if (data.email) setEmail(data.email);
          if (data.name) setAdminName(data.name);
          if (data.siteLogo !== undefined) setSiteLogo(data.siteLogo);
          if (data.siteLogoFit) setSiteLogoFit(data.siteLogoFit);
          if (data.siteLogoShape) setSiteLogoShape(data.siteLogoShape);
          if (data.siteLogoScale) setSiteLogoScale(Number(data.siteLogoScale) || 100);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (siteContent?.siteLogo !== undefined) {
      setSiteLogo(siteContent.siteLogo || '');
    }
    if (siteContent?.siteLogoFit) {
      setSiteLogoFit(siteContent.siteLogoFit);
    }
    if (siteContent?.siteLogoShape) {
      setSiteLogoShape(siteContent.siteLogoShape);
    }
    if (siteContent?.siteLogoScale) {
      setSiteLogoScale(siteContent.siteLogoScale);
    }
  }, [
    siteContent?.siteLogo,
    siteContent?.siteLogoFit,
    siteContent?.siteLogoShape,
    siteContent?.siteLogoScale
  ]);

  // Helper: Automatically trim excess transparent or uniform white margins from uploaded logo
  const processAndTrimLogoImage = (dataUrl: string, shouldTrim: boolean): Promise<string> => {
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const srcW = img.width;
        const srcH = img.height;
        if (!srcW || !srcH) {
          resolve(dataUrl);
          return;
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = srcW;
        tempCanvas.height = srcH;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
          resolve(dataUrl);
          return;
        }
        tempCtx.drawImage(img, 0, 0);

        let cropX = 0;
        let cropY = 0;
        let cropW = srcW;
        let cropH = srcH;

        if (shouldTrim) {
          try {
            const imgData = tempCtx.getImageData(0, 0, srcW, srcH);
            const pixels = imgData.data;

            // Check corner pixel to see if background is solid white/near-white or transparent
            const cornerR = pixels[0];
            const cornerG = pixels[1];
            const cornerB = pixels[2];
            const cornerA = pixels[3];
            const isCornerWhite =
              cornerA > 240 && cornerR > 245 && cornerG > 245 && cornerB > 245;

            const isBackgroundPixel = (idx: number) => {
              const r = pixels[idx];
              const g = pixels[idx + 1];
              const b = pixels[idx + 2];
              const a = pixels[idx + 3];
              if (a < 15) return true; // transparent
              if (isCornerWhite && r > 246 && g > 246 && b > 246) return true; // uniform white margin
              return false;
            };

            let top = srcH;
            let left = srcW;
            let right = 0;
            let bottom = 0;

            for (let y = 0; y < srcH; y++) {
              for (let x = 0; x < srcW; x++) {
                const idx = (y * srcW + x) * 4;
                if (!isBackgroundPixel(idx)) {
                  if (x < left) left = x;
                  if (x > right) right = x;
                  if (y < top) top = y;
                  if (y > bottom) bottom = y;
                }
              }
            }

            if (right >= left && bottom >= top) {
              // Add a tiny 2% breathing margin if not cover
              const padX = Math.round((right - left + 1) * 0.02);
              const padY = Math.round((bottom - top + 1) * 0.02);
              cropX = Math.max(0, left - padX);
              cropY = Math.max(0, top - padY);
              cropW = Math.min(srcW - cropX, right - left + 1 + padX * 2);
              cropH = Math.min(srcH - cropY, bottom - top + 1 + padY * 2);
            }
          } catch {
            // Ignore CORS or canvas pixel errors
          }
        }

        // Scale down to max 512px while preserving cropped aspect ratio
        const maxDim = 512;
        let outW = cropW;
        let outH = cropH;
        if (outW > maxDim || outH > maxDim) {
          if (outW > outH) {
            outH = Math.max(1, Math.round((outH * maxDim) / outW));
            outW = maxDim;
          } else {
            outW = Math.max(1, Math.round((outW * maxDim) / outH));
            outH = maxDim;
          }
        }

        const outCanvas = document.createElement('canvas');
        outCanvas.width = outW;
        outCanvas.height = outH;
        const outCtx = outCanvas.getContext('2d');
        if (!outCtx) {
          resolve(dataUrl);
          return;
        }
        outCtx.clearRect(0, 0, outW, outH);
        outCtx.drawImage(tempCanvas, cropX, cropY, cropW, cropH, 0, 0, outW, outH);
        resolve(outCanvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Handle Logo Image File Upload
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoUploadError('');
    setLogoSuccessMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoUploadError('لطفاً یک فایل تصویری معتبر (PNG، SVG، JPG یا WebP) انتخاب کنید.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async ev => {
      const resultStr = ev.target?.result as string;
      if (!resultStr) return;

      if (file.type === 'image/svg+xml') {
        setSiteLogo(resultStr);
        return;
      }

      const processed = await processAndTrimLogoImage(resultStr, autoTrimLogo);
      setSiteLogo(processed);
    };
    reader.readAsDataURL(file);
  };

  // Re-trim existing logo on demand
  const handleManualTrimExistingLogo = async () => {
    if (!siteLogo || siteLogo.startsWith('<svg')) return;
    const trimmed = await processAndTrimLogoImage(siteLogo, true);
    setSiteLogo(trimmed);
    setLogoSuccessMsg('حاشیه‌های اضافی تصویر لوگو به صورت هوشمند برش داده شد. اکنون دکمه ذخیره را بزنید.');
  };

  // Save Site Logo & Display Settings
  const handleSaveLogo = async (customLogoValue?: string) => {
    const targetLogo = customLogoValue !== undefined ? customLogoValue : siteLogo;
    setLogoUploadError('');
    setLogoSuccessMsg('');
    setIsSavingLogo(true);

    try {
      const res = await apiFetch('/api/account/change-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteLogo: targetLogo,
          siteLogoFit,
          siteLogoShape,
          siteLogoScale
        })
      });
      const data = await res.json();

      if (res.ok) {
        if (siteContent && onUpdateSiteContent) {
          await onUpdateSiteContent({
            ...siteContent,
            siteLogo: targetLogo,
            siteLogoFit,
            siteLogoShape,
            siteLogoScale
          });
        }
        setLogoSuccessMsg(
          targetLogo
            ? 'لوگوی سایت و تنظیمات کادر و بزرگنمایی آن با موفقیت ذخیره شد و در تمام بخش‌های سایت اعمال گردید.'
            : 'لوگوی سفارشی حذف شد و آیکون پیش‌فرض بازگردانی گردید.'
        );
      } else {
        setLogoUploadError(data.error || 'خطا در ذخیره لوگوی سایت.');
      }
    } catch {
      setLogoUploadError('خطا در برقراری ارتباط با سرور.');
    } finally {
      setIsSavingLogo(false);
    }
  };

  // Save Admin Username, Email & Password
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: null, message: '' });

    if (!username.trim()) {
      setStatus({ type: 'error', message: 'نام کاربری مدیریت نمی‌تواند خالی باشد.' });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'رمز عبور جدید و تکرار آن با یکدیگر مطابقت ندارند.' });
      return;
    }

    if (newPassword && newPassword.trim().length < 4) {
      setStatus({ type: 'error', message: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد.' });
      return;
    }

    setIsSavingCredentials(true);
    try {
      const res = await apiFetch('/api/account/change-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          name: adminName.trim(),
          currentPassword: currentPassword.trim() || undefined,
          newPassword: newPassword.trim() || undefined,
          siteLogo,
          siteLogoFit,
          siteLogoShape,
          siteLogoScale
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: 'error', message: data.error || 'خطا در بروزرسانی اطلاعات امنیتی مدیر' });
      } else {
        setStatus({
          type: 'success',
          message:
            newPassword.trim()
              ? 'نام کاربری و رمز عبور جدید مدیریت با موفقیت ذخیره شد. از این پس برای ورود از اطلاعات جدید استفاده نمایید.'
              : 'اطلاعات کاربری و پروفایل مدیریت با موفقیت ذخیره شد.'
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setStatus({ type: 'error', message: 'خطا در ارتباط با سرور' });
    } finally {
      setIsSavingCredentials(false);
    }
  };

  // Dynamic helper classes for previewing the logo exactly as it will appear
  const getPreviewContainerClass = (sizeType: 'header' | 'sidebar' | 'banner') => {
    const shapeClass =
      siteLogoShape === 'circle'
        ? 'rounded-full'
        : siteLogoShape === 'rounded'
        ? 'rounded-xl'
        : 'rounded-lg';

    if (siteLogoShape === 'free') {
      return sizeType === 'banner'
        ? 'h-14 max-w-[140px] flex items-center justify-center overflow-hidden shrink-0'
        : 'h-10 max-w-[120px] flex items-center justify-center overflow-hidden shrink-0';
    }

    const dimClass =
      sizeType === 'banner'
        ? 'w-14 h-14'
        : 'w-10 h-10';

    return `${dimClass} ${shapeClass} overflow-hidden flex items-center justify-center shrink-0 bg-white shadow-xs border border-slate-200/80`;
  };

  const getLogoImgStyle = (): React.CSSProperties => {
    const scaleVal = (siteLogoScale || 100) / 100;
    return {
      transform: scaleVal !== 1 ? `scale(${scaleVal})` : undefined,
      transformOrigin: 'center center'
    };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-amber-950 rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {siteLogo ? (
              <div className={getPreviewContainerClass('banner')}>
                <img
                  src={siteLogo}
                  alt="Site Logo"
                  style={getLogoImgStyle()}
                  className={`w-full h-full transition-transform duration-200 ${
                    siteLogoShape === 'free'
                      ? 'object-contain'
                      : siteLogoFit === 'cover'
                      ? 'object-cover'
                      : 'object-contain'
                  }`}
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center justify-center shrink-0">
                <ShieldCheck className="w-7 h-7 text-amber-400" />
              </div>
            )}
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold mb-1">
                تنظیمات هویت بصری و امنیت مدیریت
              </span>
              <h2 className="text-lg sm:text-xl font-black">لوگوی سایت، نام کاربری و رمز عبور ورود مدیر</h2>
              <p className="text-slate-300 text-xs mt-1">
                مدیریت فایل لوگوی برند فروشگاه، تنظیم نحوه قرارگیری در کادر و امنیت ورود به پنل مدیریت
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: SITE LOGO UPLOAD & BRANDING */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800">آپلود و تنظیم دقیق کادر لوگوی سایت</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تنظیم پر شدن کامل باکس (بدون فضای خالی)، شکل قاب و بزرگنمایی لوگو در هدر، فوتر و پنل مدیریت
              </p>
            </div>
          </div>
          {siteLogo ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
              لوگوی اختصاصی فعال است
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 self-start sm:self-center">
              آیکون پیش‌فرض (۶ ضلعی) فعال است
            </span>
          )}
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {logoUploadError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{logoUploadError}</span>
            </div>
          )}

          {logoSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{logoSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Live Preview Box (Shows Storefront Header + Admin Sidebar Preview) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 space-y-4">
              <span className="text-xs font-extrabold text-slate-600">پیش‌نمایش زنده در هدر فروشگاه:</span>

              {/* Storefront Floating Header Simulation */}
              <div className="bg-white px-5 py-2.5 rounded-full shadow-md border border-slate-200/80 flex items-center gap-2.5">
                {siteLogo ? (
                  <div className={getPreviewContainerClass('header')}>
                    <img
                      src={siteLogo}
                      alt="لوگوی سایت"
                      style={getLogoImgStyle()}
                      className={`w-full h-full transition-transform duration-200 ${
                        siteLogoShape === 'free'
                          ? 'object-contain max-h-10 w-auto'
                          : siteLogoFit === 'cover'
                          ? 'object-cover'
                          : 'object-contain'
                      }`}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                    <Hexagon className="w-5 h-5 fill-amber-500/20 text-amber-600 stroke-[2.2]" />
                  </div>
                )}
                <div className="flex items-baseline gap-1.5 text-stone-900">
                  <span className="font-black text-base">{siteContent?.brandName || 'اونیوال'}</span>
                  <span className="font-mono text-xs font-bold text-amber-600">
                    {siteContent?.brandEnglishName || 'ONIVAL'}
                  </span>
                </div>
              </div>

              {/* Dark Sidebar / Footer Simulation */}
              <div className="w-full pt-2 border-t border-slate-200/70 flex flex-col items-center">
                <span className="text-[11px] font-bold text-slate-400 mb-2">پیش‌نمایش در پنل مدیریت و فوتر تیره:</span>
                <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex items-center gap-2.5 shadow-sm">
                  {siteLogo ? (
                    <div className={getPreviewContainerClass('sidebar')}>
                      <img
                        src={siteLogo}
                        alt="لوگوی سایت"
                        style={getLogoImgStyle()}
                        className={`w-full h-full transition-transform duration-200 ${
                          siteLogoShape === 'free'
                            ? 'object-contain max-h-10 w-auto'
                            : siteLogoFit === 'cover'
                            ? 'object-cover'
                            : 'object-contain'
                        }`}
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white">
                      <Hexagon className="w-5 h-5" />
                    </div>
                  )}
                  <div className="text-right">
                    <div className="text-xs font-black">فروشگاه {siteContent?.brandName || 'اونیوال'}</div>
                    <div className="text-[10px] text-amber-400 font-mono">
                      {siteContent?.brandEnglishName || 'ONIVAL'} Panel
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                اگر لوگو دارای حاشیه سفید است، حالت <strong>«پر کردن کامل باکس»</strong> یا <strong>«اسلایدر بزرگنمایی»</strong> را تنظیم کنید تا هیچ فضای خالی باقی نماند.
              </p>
            </div>

            {/* Upload Controls & Framing Customizer */}
            <div className="lg:col-span-7 space-y-4">
              {/* Row 1: Upload & Delete Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition">
                  <Upload className="w-4 h-4" />
                  <span>انتخاب و آپلود فایل لوگو از دستگاه</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="hidden"
                  />
                </label>

                {siteLogo && (
                  <>
                    <button
                      type="button"
                      onClick={handleManualTrimExistingLogo}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs transition cursor-pointer"
                      title="حذف خودکار حاشیه‌های خالی یا سفید اطراف لوگو"
                    >
                      <Crop className="w-4 h-4" />
                      <span>حذف خودکار حاشیه سفید/خالی</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSiteLogo('');
                        handleSaveLogo('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>حذف لوگو</span>
                    </button>
                  </>
                )}
              </div>

              {/* Row 2: Framing Controls (Fit Mode, Box Shape, Zoom Scale) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Fit Mode */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      ۱. نحوه قرارگیری عکس در باکس:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setSiteLogoFit('cover')}
                        className={`py-2 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                          siteLogoFit === 'cover'
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>پر کردن کامل (بدون خالی)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSiteLogoFit('contain')}
                        className={`py-2 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                          siteLogoFit === 'contain'
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>نمایش کامل (Contain)</span>
                      </button>
                    </div>
                  </div>

                  {/* Box Shape */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      ۲. شکل کادر لوگو:
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setSiteLogoShape('rounded')}
                        className={`py-2 px-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          siteLogoShape === 'rounded'
                            ? 'bg-amber-500 text-white shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        مربع نرم
                      </button>
                      <button
                        type="button"
                        onClick={() => setSiteLogoShape('circle')}
                        className={`py-2 px-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          siteLogoShape === 'circle'
                            ? 'bg-amber-500 text-white shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        دایره‌ای
                      </button>
                      <button
                        type="button"
                        onClick={() => setSiteLogoShape('free')}
                        className={`py-2 px-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          siteLogoShape === 'free'
                            ? 'bg-amber-500 text-white shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        بدون کادر (آزاد)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Zoom / Scale Slider to eliminate any remaining empty space */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <ZoomIn className="w-4 h-4 text-amber-600" />
                      <span>۳. تنظیم بزرگنمایی و پر کردن کادر (Zoom):</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md text-[11px]">
                        {siteLogoScale}%
                      </span>
                      {siteLogoScale !== 100 && (
                        <button
                          type="button"
                          onClick={() => setSiteLogoScale(100)}
                          className="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                        >
                          بازنشانی (۱۰۰٪)
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSiteLogoScale(s => Math.max(70, s - 5))}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="range"
                      min={70}
                      max={180}
                      step={5}
                      value={siteLogoScale}
                      onChange={e => setSiteLogoScale(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setSiteLogoScale(s => Math.min(180, s + 5))}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    اگر فایل لوگوی شما دارای حاشیه خالی در اطراف خود است، با افزایش درصد بزرگنمایی (مثلاً به ۱۲۰٪ یا ۱۴۰٪) تصویر کاملاً کادر را پر می‌کند.
                  </p>
                </div>
              </div>

              {/* Row 3: Direct URL Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  یا وارد کردن لینک مستقیم تصویر لوگو (URL):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="https://example.com/logo.png"
                  value={siteLogo.startsWith('data:') ? '' : siteLogo}
                  onChange={e => setSiteLogo(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 outline-none text-xs font-mono text-slate-700"
                />
                {siteLogo.startsWith('data:') && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    ✓ فایل تصویری لوگو بارگذاری شده و آماده ذخیره است.
                  </p>
                )}
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  disabled={isSavingLogo}
                  onClick={() => handleSaveLogo()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                >
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>{isSavingLogo ? 'در حال ذخیره لوگو...' : 'ذخیره لوگو و تنظیمات کادر'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: ADMIN LOGIN USERNAME & PASSWORD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-800">
              تنظیم نام کاربری (Username) و رمز عبور (Password) ورود به پنل
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              هنگام ورود به پنل مدیریت از صفحه فروشگاه، وارد کردن هم‌زمان نام کاربری و رمز عبور تعریف‌شده در این بخش الزامی است.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {status.type && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 text-xs sm:text-sm font-bold ${
                status.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{status.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Admin Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                نام کاربری ورود مدیر (Username) *
              </label>
              <div className="relative flex items-center">
                <UserCheck className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 outline-none text-sm text-left font-mono font-bold text-slate-800"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                نام کاربری فعلی جهت ورود به پنل: <span className="font-mono font-bold text-slate-700">{username}</span>
              </p>
            </div>

            {/* Admin Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                ایمیل مدیریت (قابل استفاده به عنوان نام کاربری دوم)
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 outline-none text-sm text-left font-mono text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Admin Display Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              نام نمایشی مدیر در هدر پنل
            </label>
            <input
              type="text"
              value={adminName}
              onChange={e => setAdminName(e.target.value)}
              placeholder="مدیریت اونیوال"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 outline-none text-sm font-bold text-slate-700"
            />
          </div>

          <hr className="border-slate-100" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-extrabold text-amber-600">
              <Sparkles className="w-4 h-4" />
              <span>تغییر رمز عبور ورود مدیریت (در صورت تمایل به تغییر رمز پر کنید)</span>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
            >
              {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showPasswords ? 'مخفی کردن رمزها' : 'نمایش رمزها'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                رمز عبور فعلی (پیش‌فرض: admin)
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
                <input
                  type={showPasswords ? 'text' : 'password'}
                  dir="ltr"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 outline-none text-sm text-left font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">رمز عبور جدید</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
                <input
                  type={showPasswords ? 'text' : 'password'}
                  dir="ltr"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="حداقل ۴ کاراکتر"
                  className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 outline-none text-sm text-left font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">تکرار رمز عبور جدید</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
                <input
                  type={showPasswords ? 'text' : 'password'}
                  dir="ltr"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="تکرار رمز جدید"
                  className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 outline-none text-sm text-left font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSavingCredentials}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-amber-600/20 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSavingCredentials
                  ? 'در حال ذخیره اطلاعات...'
                  : 'ذخیره نام کاربری و رمز عبور مدیریت'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 3: HOST PERSISTENT STORAGE, SEED DATA & CPANEL DEPLOYMENT */}
      <HostDataManagementCard onRefreshAppData={onRefreshData} />
    </div>
  );
};
