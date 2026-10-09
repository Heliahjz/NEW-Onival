import React, { useState } from 'react';
import {
  Product,
  ProductCategory,
  ProductSize,
  PublicationStatus,
  StockAvailability
} from '../types';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Tag,
  Package,
  X,
  Image as ImageIcon,
  ListPlus,
  Upload,
  Check,
  Percent,
  Sparkles,
  Globe,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { sanitizeSlug, isSlugDuplicate } from '../utils/seo';

interface ProductsViewProps {
  products: Product[];
  categories: ProductCategory[];
  onAddProduct: (product: Partial<Product>) => Promise<void>;
  onEditProduct: (id: number, product: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: number) => Promise<void>;
}

const PRESET_PRODUCT_IMAGES = [
  {
    label: 'عسل طلایی خالص',
    url: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'شان عسل و موم طبیعی',
    url: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'ژل رویال و اکسیر کندو',
    url: 'https://images.unsplash.com/photo-1471943311424-646960669fbc?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'دمنوش و گیاهان دارویی',
    url: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'گرده گل و فرآورده کوهستانی',
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80',
  },
];

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  categories,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formError, setFormError] = useState('');
  const [activeModalTab, setActiveModalTab] = useState<'general' | 'seo'>('general');

  // Form states
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [price, setPrice] = useState('');
  const [hasSize, setHasSize] = useState(false);
  const [sizes, setSizes] = useState<ProductSize[]>([
    { name: 'نیم کیلوگرم (۵۰۰ گرم)', price: 200000 },
    { name: 'یک کیلوگرم (۱۰۰۰ گرم)', price: 380000 },
  ]);
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [productCategoryId, setProductCategoryId] = useState<number>(categories[0]?.id || 1);
  const [imageName, setImageName] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isAmazingOffer, setIsAmazingOffer] = useState<boolean>(false);

  // SEO & Publishing states
  const [status, setStatus] = useState<PublicationStatus>('published');
  const [availability, setAvailability] = useState<StockAvailability>('InStock');
  const [sku, setSku] = useState('');
  const [brand, setBrand] = useState('اونیوال | ONIVAL');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [ogTitle, setOgTitle] = useState('');
  const [ogDescription, setOgDescription] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [robotsNoIndex, setRobotsNoIndex] = useState(false);
  const [robotsNoFollow, setRobotsNoFollow] = useState(false);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormError('');
    setActiveModalTab('general');
    setTitle('');
    setSlug('');
    setPrice('');
    setHasSize(false);
    setSizes([
      { name: 'نیم کیلوگرم (۵۰۰ گرم)', price: 200000 },
      { name: 'یک کیلوگرم (۱۰۰۰ گرم)', price: 380000 },
    ]);
    setShortDescription('');
    setDescription('');
    setProductCategoryId(categories[0]?.id || 1);
    setImageName(PRESET_PRODUCT_IMAGES[0].url);
    setImageAlt('');
    setDiscountPercent(0);
    setIsAmazingOffer(false);
    setStatus('published');
    setAvailability('InStock');
    setSku('');
    setBrand('اونیوال | ONIVAL');
    setSeoTitle('');
    setSeoDescription('');
    setCanonicalUrl('');
    setOgTitle('');
    setOgDescription('');
    setOgImage('');
    setRobotsNoIndex(false);
    setRobotsNoFollow(false);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormError('');
    setActiveModalTab('general');
    setTitle(product.title);
    setSlug(product.slug);
    setPrice(product.price.toString());
    setHasSize(product.hasSize);
    if (product.sizes && product.sizes.length > 0) {
      setSizes([...product.sizes]);
    } else if (product.hasSize) {
      setSizes([
        { name: 'سایز کوچک (۵۰۰ گرم)', price: product.priceSmall || product.price },
        { name: 'سایز بزرگ (۱ کیلوگرم)', price: product.priceLarge || product.price },
      ]);
    } else {
      setSizes([
        { name: 'نیم کیلوگرم (۵۰۰ گرم)', price: 200000 },
        { name: 'یک کیلوگرم (۱۰۰۰ گرم)', price: 380000 },
      ]);
    }
    setShortDescription(product.shortDescription || product.description || '');
    setDescription(product.content || product.description || '');
    setProductCategoryId(product.categoryId ?? product.productCategoryId ?? (categories[0]?.id || 1));
    setImageName(product.imageName || PRESET_PRODUCT_IMAGES[0].url);
    setImageAlt(product.imageAlt || `${product.title} - فروشگاه اونیوال`);
    setDiscountPercent(product.discount ?? product.discountPercent ?? 0);
    setIsAmazingOffer(Boolean(product.isAmazingOffer || (product.discount ?? 0) > 0));
    setStatus(product.status || 'published');
    setAvailability(product.availability || 'InStock');
    setSku(product.sku || `ONV-${product.id}`);
    setBrand(product.brand || 'اونیوال | ONIVAL');
    setSeoTitle(product.seoTitle || '');
    setSeoDescription(product.seoDescription || '');
    setCanonicalUrl(product.canonicalUrl || '');
    setOgTitle(product.ogTitle || '');
    setOgDescription(product.ogDescription || '');
    setOgImage(product.ogImage || '');
    setRobotsNoIndex(Boolean(product.robotsNoIndex));
    setRobotsNoFollow(Boolean(product.robotsNoFollow));
    setIsModalOpen(true);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageName(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddSizeRow = () => {
    setSizes([...sizes, { name: '', price: 0 }]);
  };

  const handleRemoveSizeRow = (index: number) => {
    if (sizes.length <= 1) return;
    setSizes(sizes.filter((_, idx) => idx !== index));
  };

  const handleSizeChange = (index: number, field: 'name' | 'price', val: string) => {
    const updated = [...sizes];
    if (field === 'name') {
      updated[index].name = val;
    } else {
      updated[index].price = Number(val) || 0;
    }
    setSizes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('عنوان محصول الزامی است.');
      return;
    }

    const candidateSlug = sanitizeSlug(slug || title, 'product', editingProduct?.id);
    if (isSlugDuplicate(products, candidateSlug, editingProduct?.id)) {
      setFormError(`اسلاگ «${candidateSlug}» تکراری است و قبلاً برای محصول دیگری ثبت شده است.`);
      setActiveModalTab('seo');
      return;
    }

    const validSizes = hasSize ? sizes.filter((s) => s.name.trim() !== '') : [];
    const basePrice =
      hasSize && validSizes.length > 0 ? validSizes[0].price : Number(price) || 0;

    const resolvedDiscount = Math.min(90, Math.max(0, Number(discountPercent) || 0));
    const resolvedShortDesc = shortDescription.trim() || `${title.trim()} با تضمین اصالت و کیفیت آزمایشگاهی`;
    const resolvedFullContent = description.trim() || resolvedShortDesc || title.trim();

    const payload: Partial<Product> = {
      title: title.trim(),
      slug: candidateSlug,
      price: basePrice,
      hasSize,
      sizes: hasSize ? validSizes : [],
      priceSmall: hasSize && validSizes[0] ? validSizes[0].price : undefined,
      priceLarge: hasSize && validSizes[1] ? validSizes[1].price : undefined,
      shortDescription: resolvedShortDesc,
      description: resolvedShortDesc,
      content: resolvedFullContent,
      categoryId: Number(productCategoryId),
      productCategoryId: Number(productCategoryId),
      imageName: imageName.trim() || PRESET_PRODUCT_IMAGES[0].url,
      imageAlt: imageAlt.trim() || `${title.trim()} - فروشگاه تخصصی اونیوال`,
      discount: resolvedDiscount,
      discountPercent: resolvedDiscount,
      isAmazingOffer,
      status,
      availability,
      sku: sku.trim() || `ONV-${editingProduct?.id || Date.now()}`,
      brand: brand.trim() || 'اونیوال | ONIVAL',
      seoTitle: seoTitle.trim() || `${title.trim()} | خرید با ضمانت آزمایشگاهی از اونیوال`,
      seoDescription:
        seoDescription.trim() ||
        resolvedShortDesc ||
        resolvedFullContent.slice(0, 155),
      canonicalUrl: canonicalUrl.trim() || undefined,
      ogTitle: ogTitle.trim() || undefined,
      ogDescription: ogDescription.trim() || undefined,
      ogImage: ogImage.trim() || undefined,
      robotsNoIndex,
      robotsNoFollow,
    };

    try {
      if (editingProduct) {
        await onEditProduct(editingProduct.id, payload);
      } else {
        await onAddProduct(payload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'خطا در ذخیره محصول');
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      String(p.title || '').toLowerCase().includes(q) ||
      String(p.description || p.shortDescription || '').toLowerCase().includes(q) ||
      String(p.slug || '').toLowerCase().includes(q);
    const catId = p.categoryId ?? p.productCategoryId;
    const matchesCategory =
      selectedCategory === 'all' || catId === Number(selectedCategory);
    const pStatus = p.status || 'published';
    const matchesStatus = statusFilter === 'all' || pStatus === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus && !p.isDelete;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
  };

  const previewSlug = sanitizeSlug(slug || title, 'product', editingProduct?.id);
  const previewTitle =
    seoTitle.trim() || `${title || 'عنوان محصول'} | خرید آنلاین از فروشگاه اونیوال`;
  const previewDesc =
    seoDescription.trim() ||
    shortDescription.trim() ||
    'توضیحات متا محصول در نتایج جستجوی گوگل در این بخش نمایش داده می‌شود...';

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجو در نام، اسلاگ یا توضیحات محصول..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">همه دسته‌بندی‌ها</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">همه وضعیت‌های انتشار</option>
            <option value="published">منتشرشده (عمومی و در Sitemap)</option>
            <option value="draft">پیش‌نویس (مخفی از فروشگاه و گوگل)</option>
          </select>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          افزودن محصول جدید
        </button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProducts.map((product) => {
          const isDraft = product.status === 'draft';
          return (
            <div
              key={product.id}
              className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group ${
                isDraft ? 'border-amber-300 bg-amber-50/10' : 'border-slate-200/70'
              }`}
            >
              <div>
                <div className="h-48 bg-slate-100 relative overflow-hidden">
                  <img
                    src={product.imageName || PRESET_PRODUCT_IMAGES[0].url}
                    alt={product.imageAlt || product.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />

                  <div className="absolute top-3 right-3 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/90 text-slate-800 backdrop-blur-sm shadow-sm">
                      <Tag className="w-3 h-3 text-blue-600" />
                      {product.categoryTitle || product.productCategoryTitle || 'عمومی'}
                    </span>

                    {isDraft ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm">
                        <EyeOff className="w-3 h-3" />
                        پیش‌نویس
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm">
                        <Eye className="w-3 h-3" />
                        منتشرشده
                      </span>
                    )}

                    {(product.discount ?? product.discountPercent ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-600 text-white shadow-sm">
                        {product.discount ?? product.discountPercent}٪ تخفیف
                      </span>
                    ) : null}
                  </div>

                  <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between text-white">
                    <span className="font-bold text-base truncate">{product.title}</span>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono" dir="ltr">
                    <span className="truncate">/products/{product.slug}</span>
                    <span className={product.robotsNoIndex ? 'text-rose-500 font-bold' : 'text-emerald-600 font-bold'}>
                      {product.robotsNoIndex ? 'noindex' : 'index'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 min-h-[2rem]">
                    {product.description || product.shortDescription}
                  </p>

                  <div className="pt-2 border-t border-slate-100">
                    {product.hasSize && product.sizes && product.sizes.length > 0 ? (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-semibold text-slate-400">
                          سایزها و قیمت‌ها:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {product.sizes.map((s, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                            >
                              <span className="text-slate-600 font-medium">{s.name}:</span>
                              <span className="font-bold text-blue-600">
                                {formatCurrency(s.price)}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">قیمت محصول:</span>
                        <span className="font-bold text-slate-800">
                          {formatCurrency(product.price)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                <a
                  href={`/products/${encodeURIComponent(product.slug)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
                >
                  <Globe className="w-3.5 h-3.5" />
                  مشاهده صفحه سئو
                </a>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(product)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    ویرایش و سئو
                  </button>
                  <button
                    onClick={() => onDeleteProduct(product.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200/60">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">محصولی یافت نشد</h3>
            <p className="text-xs text-slate-400 mt-1">
              هیچ محصولی با فیلترهای انتخاب شده مطابقت ندارد.
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Modal with SEO & Structured Data Tab */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingProduct ? 'ویرایش محصول و تنظیمات سئو' : 'افزودن محصول جدید به فروشگاه'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 mt-4 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveModalTab('general')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                  activeModalTab === 'general'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ۱. مشخصات، قیمت و تصویر محصول
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('seo')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeModalTab === 'seo'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                ۲. تنظیمات سئو، اسلاگ، وضعیت انتشار و اسکیما
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {activeModalTab === 'general' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        عنوان محصول *
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          if (!editingProduct && !slug) {
                            setSlug(sanitizeSlug(e.target.value, 'product'));
                          }
                        }}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="مثلاً: عسل کوهستان اردبیل"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        وضعیت انتشار و نمایش
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as PublicationStatus)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="published">منتشرشده (نمایش در فروشگاه و نقشه سایت گوگل)</option>
                        <option value="draft">پیش‌نویس (مخفی از مشتریان و موتورهای جستجو)</option>
                      </select>
                    </div>
                  </div>

                  {/* Image Selection & Upload */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      تصویر اصلی و متن جایگزین (Image Alt برای سئو تصاویر گوگل)
                    </label>

                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0">
                        {imageName ? (
                          <img
                            src={imageName}
                            alt={imageAlt || title || 'Preview'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                            بدون عکس
                          </div>
                        )}
                      </div>

                      <div className="flex-1 w-full space-y-2">
                        <input
                          type="text"
                          value={imageName}
                          onChange={(e) => setImageName(e.target.value)}
                          dir="ltr"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          placeholder="لینک مستقیم تصویر (https://...)"
                        />
                        <input
                          type="text"
                          value={imageAlt}
                          onChange={(e) => setImageAlt(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          placeholder="متن جایگزین تصویر (Alt Text) - مثلاً: شیشه عسل طبیعی کوهستان سبلان اونیوال"
                        />

                        <div className="flex flex-wrap items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            آپلود عکس از سیستم
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageFileUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="pt-1">
                      <span className="block text-[11px] text-slate-500 mb-1.5">
                        یا انتخاب سریع از تصاویر آماده:
                      </span>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {PRESET_PRODUCT_IMAGES.map((preset, idx) => {
                          const isSelected = imageName === preset.url;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setImageName(preset.url)}
                              className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                                isSelected
                                  ? 'border-blue-600 scale-105 shadow-sm'
                                  : 'border-transparent opacity-75 hover:opacity-100'
                              }`}
                              title={preset.label}
                            >
                              <img
                                src={preset.url}
                                alt={preset.label}
                                className="w-full h-full object-cover"
                              />
                              {isSelected && (
                                <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                                  <Check className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Category & Stock Availability */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        دسته‌بندی محصول
                      </label>
                      <select
                        value={productCategoryId}
                        onChange={(e) => setProductCategoryId(Number(e.target.value))}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        وضعیت موجودی (Schema Offer)
                      </label>
                      <select
                        value={availability}
                        onChange={(e) => setAvailability(e.target.value as StockAvailability)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="InStock">موجود در انبار (InStock)</option>
                        <option value="OutOfStock">ناموجود (OutOfStock)</option>
                        <option value="PreOrder">پیش‌فروش (PreOrder)</option>
                      </select>
                    </div>

                    {!hasSize && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          قیمت تک‌سایز (تومان) *
                        </label>
                        <input
                          type="number"
                          required={!hasSize}
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          placeholder="مثلاً: 250000"
                        />
                      </div>
                    )}
                  </div>

                  {/* Discount & Amazing Offer */}
                  <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200/70 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Percent className="w-4 h-4 text-rose-600" />
                        <span className="text-xs font-bold text-slate-800">
                          تنظیمات تخفیف و پیشنهاد شگفت‌انگیز
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {[0, 10, 15, 20, 30, 50].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setDiscountPercent(preset)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                              discountPercent === preset
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-200 hover:border-rose-300'
                            }`}
                          >
                            {preset === 0 ? 'بدون تخفیف' : `${preset}٪`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          درصد تخفیف (۰ تا ۹۰ درصد)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={90}
                          value={discountPercent}
                          onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        />
                      </div>

                      <div className="flex items-end">
                        <label className="flex items-center gap-2.5 w-full px-3 py-2 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-rose-300 transition">
                          <input
                            type="checkbox"
                            checked={isAmazingOffer}
                            onChange={(e) => setIsAmazingOffer(e.target.checked)}
                            className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                          />
                          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-700">
                            نمایش در اسلایدر «پیشنهاد شگفت‌انگیز»
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Multi-size toggle */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          id="hasSizeToggle"
                          checked={hasSize}
                          onChange={(e) => setHasSize(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label
                          htmlFor="hasSizeToggle"
                          className="text-xs font-bold text-slate-700 cursor-pointer"
                        >
                          این محصول دارای وزن‌ها / سایزهای متنوع با قیمت‌های متفاوت است
                        </label>
                      </div>

                      {hasSize && (
                        <button
                          type="button"
                          onClick={handleAddSizeRow}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                          افزودن سایز جدید
                        </button>
                      )}
                    </div>

                    {hasSize && (
                      <div className="space-y-2 pt-2 border-t border-slate-200/60">
                        {sizes.map((s, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              required
                              value={s.name}
                              onChange={(e) => handleSizeChange(idx, 'name', e.target.value)}
                              placeholder="عنوان سایز (مثلاً: نیم کیلوگرم)"
                              className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            <input
                              type="number"
                              required
                              value={s.price}
                              onChange={(e) => handleSizeChange(idx, 'price', e.target.value)}
                              placeholder="قیمت (تومان)"
                              className="w-36 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            {sizes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSizeRow(idx)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      توضیحات کوتاه (نمایش در کارت محصول و خلاصه بالای صفحه) *
                    </label>
                    <input
                      type="text"
                      required
                      value={shortDescription}
                      onChange={(e) => setShortDescription(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="خلاصه یک خطی از ویژگی‌های محصول..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      توضیحات کامل و تخصصی محصول (محتوای اصلی صفحه محصول برای کاربران و گوگل)
                    </label>
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="توضیحات کامل درباره خواص، نحوه مصرف، ساکارز و تضمین آزمایشگاهی..."
                    />
                  </div>
                </>
              ) : (
                /* SEO & Structured Data Tab */
                <div className="space-y-4">
                  {/* Live Google SERP Preview */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-400">
                      پیش‌نمایش زنده نتیجه در جستجوی گوگل (Google SERP Preview):
                    </div>
                    <div className="text-xs text-emerald-700 font-mono truncate" dir="ltr">
                      {typeof window !== 'undefined' ? window.location.origin : 'https://onival.ir'}/products/{previewSlug}
                    </div>
                    <div className="text-base font-bold text-blue-700 hover:underline truncate">
                      {previewTitle}
                    </div>
                    <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {previewDesc}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        آدرس یکتای محصول (URL Slug) *
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        placeholder="sabalan-natural-honey"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        در صورت تغییر اسلاگ محصول قبلی، ریدایرکت ۳۰۱ خودکار ثبت می‌شود.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        کد شناسه کالا (SKU در اسکیمای Product)
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="ONV-101"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      عنوان سئو اختصاصی (SEO Meta Title)
                    </label>
                    <input
                      type="text"
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder={`${title || 'نام محصول'} | خرید با برگه آزمایشگاهی از اونیوال`}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                      <span>در صورت خالی بودن، از عنوان محصول به صورت هوشمند ساخته می‌شود.</span>
                      <span>{seoTitle.length} / 60</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      توضیحات متا سئو (SEO Meta Description)
                    </label>
                    <textarea
                      rows={3}
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      placeholder="توضیحات جذاب شامل مزایا، خلوص و ارسال سریع برای جذب کلیک در نتایج گوگل..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                      <span>پیشنهاد استاندارد: ۱۲۰ تا ۱۵۵ کاراکتر</span>
                      <span>{seoDescription.length} / 160</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        برند محصول (Brand Schema)
                      </label>
                      <input
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        آدرس Canonical سفارشی (اختیاری)
                      </label>
                      <input
                        type="url"
                        dir="ltr"
                        value={canonicalUrl}
                        onChange={(e) => setCanonicalUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Advanced Indexing Controls */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={robotsNoIndex}
                        onChange={(e) => setRobotsNoIndex(e.target.checked)}
                        className="w-4 h-4 text-rose-600 rounded"
                      />
                      <span className="text-xs font-bold text-slate-700">
                        عدم ایندکس در گوگل (<code dir="ltr">noindex</code>)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={robotsNoFollow}
                        onChange={(e) => setRobotsNoFollow(e.target.checked)}
                        className="w-4 h-4 text-rose-600 rounded"
                      />
                      <span className="text-xs font-bold text-slate-700">
                        عدم دنبال کردن لینک‌ها (<code dir="ltr">nofollow</code>)
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                >
                  {editingProduct ? 'ذخیره تغییرات و بروزرسانی سئو' : 'ثبت و انتشار محصول'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
