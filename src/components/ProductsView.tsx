import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Image as ImageIcon,
  Tag,
  AlertTriangle,
  Percent,
  Layers
} from 'lucide-react';
import { Product, ProductCategory, ProductSize } from '../types';

interface ProductsViewProps {
  products: Product[];
  categories: ProductCategory[];
  onAddProduct: (prod: Partial<Product>) => Promise<void>;
  onEditProduct: (id: number, prod: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: number) => Promise<void>;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  categories,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all' | 'discounted'>('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState<{
    title: string;
    price: string;
    hasSize: boolean;
    sizes: { name: string; price: string }[];
    discount: string;
    categoryId: number;
    imageName: string;
    description: string;
    content: string;
  }>({
    title: '',
    price: '',
    hasSize: false,
    sizes: [
      { name: '۵۰۰ گرم', price: '' },
      { name: '۱ کیلوگرم', price: '' }
    ],
    discount: '0',
    categoryId: categories[0]?.id || 1,
    imageName: '',
    description: '',
    content: ''
  });

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      title: '',
      price: '',
      hasSize: false,
      sizes: [
        { name: '۵۰۰ گرم', price: '' },
        { name: '۱ کیلوگرم', price: '' }
      ],
      discount: '0',
      categoryId: categories[0]?.id || 1,
      imageName: 'https://images.unsplash.com/photo-1587049359535-b64d3dd0d716?w=800&auto=format&fit=crop&q=80',
      description: '',
      content: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    let initialSizes: { name: string; price: string }[] = [];
    if (p.sizes && p.sizes.length > 0) {
      initialSizes = p.sizes.map(s => ({ name: s.name, price: s.price.toString() }));
    } else if (p.hasSize && (p.priceSmall || p.priceLarge)) {
      initialSizes = [
        { name: 'کوچک', price: (p.priceSmall || p.price).toString() },
        { name: 'بزرگ', price: (p.priceLarge || p.price).toString() }
      ];
    } else {
      initialSizes = [
        { name: '۵۰۰ گرم', price: p.price.toString() },
        { name: '۱ کیلوگرم', price: Math.round(p.price * 1.8).toString() }
      ];
    }

    setFormData({
      title: p.title,
      price: p.price.toString(),
      hasSize: Boolean(p.hasSize || (p.sizes && p.sizes.length > 0)),
      sizes: initialSizes,
      discount: (p.discount || 0).toString(),
      categoryId: p.categoryId,
      imageName: p.imageName,
      description: p.description,
      content: p.content
    });
    setIsModalOpen(true);
  };

  const addSizeRow = () => {
    setFormData(prev => ({
      ...prev,
      sizes: [...prev.sizes, { name: '', price: '' }]
    }));
  };

  const removeSizeRow = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== idx)
    }));
  };

  const updateSizeRow = (idx: number, field: 'name' | 'price', val: string) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.map((s, i) => i === idx ? { ...s, [field]: val } : s)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    setIsSubmitting(true);
    try {
      const validSizes = formData.hasSize 
        ? formData.sizes
            .filter(s => s.name.trim() !== '')
            .map(s => ({ name: s.name.trim(), price: Number(s.price) || 0 }))
        : undefined;

      const basePrice = validSizes && validSizes.length > 0 
        ? validSizes[0].price 
        : (Number(formData.price) || 0);

      const discountNum = Math.min(99, Math.max(0, Number(formData.discount) || 0));

      const payload: Partial<Product> = {
        title: formData.title,
        price: basePrice,
        hasSize: formData.hasSize && (validSizes?.length || 0) > 0,
        sizes: validSizes,
        priceSmall: validSizes && validSizes.length > 0 ? validSizes[0].price : undefined,
        priceLarge: validSizes && validSizes.length > 1 ? validSizes[validSizes.length - 1].price : undefined,
        discount: discountNum,
        categoryId: Number(formData.categoryId),
        imageName: formData.imageName,
        description: formData.description,
        content: formData.content
      };

      if (editingProduct) {
        await onEditProduct(editingProduct.id, payload);
      } else {
        await onAddProduct(payload);
      }
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await onDeleteProduct(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory === 'all' 
      ? true 
      : selectedCategory === 'discounted'
      ? (p.discount || 0) > 0
      : p.categoryId === selectedCategory;
    return matchSearch && matchCat;
  });

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('fa-IR').format(val) + ' تومان';
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            <span>مدیریت محصولات اونیوال (ONIVAL)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تنظیم کاتالوگ، سایزبندی پویا (۲، ۳ یا چند اندازه دلخواه)، تخفیف و پیشنهاد شگفت‌انگیز
          </p>
        </div>

        <button
          id="btn-open-add-product"
          onClick={openAddModal}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>افزودن محصول جدید</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-products"
            type="text"
            placeholder="جستجو در عنوان یا مشخصات محصول..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === 'all'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            همه دسته‌ها ({products.length})
          </button>
          <button
            onClick={() => setSelectedCategory('discounted')}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              selectedCategory === 'discounted'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>شگفت‌انگیز / تخفیف‌دار ({products.filter(p => (p.discount || 0) > 0).length})</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.title}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
              <tr>
                <th className="py-3.5 px-4">تصویر</th>
                <th className="py-3.5 px-4">عنوان محصول</th>
                <th className="py-3.5 px-4">دسته‌بندی</th>
                <th className="py-3.5 px-4">سایزبندی و قیمت‌ها</th>
                <th className="py-3.5 px-4">تخفیف</th>
                <th className="py-3.5 px-4">تاریخ درج</th>
                <th className="py-3.5 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    هیچ محصولی با این مشخصات یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const hasCustomSizes = p.sizes && p.sizes.length > 0;
                  const discountVal = p.discount || 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <img
                          src={p.imageName}
                          alt={p.title}
                          className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1587049359535-b64d3dd0d716?w=800&auto=format&fit=crop&q=80';
                          }}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{p.title}</div>
                        <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{p.description}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {p.categoryTitle || 'عمومی'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {hasCustomSizes ? (
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md mb-1">
                              <Layers className="w-3 h-3" />
                              <span>{p.sizes!.length} اندازه / وزن</span>
                            </div>
                            <div className="space-y-0.5 text-xs">
                              {p.sizes!.map((s, sIdx) => {
                                const finalP = discountVal > 0 
                                  ? Math.round(s.price * (1 - discountVal / 100)) 
                                  : s.price;
                                return (
                                  <div key={sIdx} className="text-slate-600 flex items-center gap-1.5">
                                    <span className="text-slate-400 font-mono">▪</span>
                                    <span className="font-medium text-slate-700">{s.name}:</span>
                                    {discountVal > 0 ? (
                                      <div className="flex items-center gap-1">
                                        <span className="line-through text-slate-400 text-[11px]">{formatPrice(s.price)}</span>
                                        <span className="font-bold text-emerald-600">{formatPrice(finalP)}</span>
                                      </div>
                                    ) : (
                                      <span className="font-bold text-slate-800">{formatPrice(s.price)}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : p.hasSize ? (
                          <div className="space-y-0.5 text-xs">
                            <div className="text-slate-600">
                              کوچک: <span className="font-bold text-slate-800">{formatPrice(p.priceSmall || p.price)}</span>
                            </div>
                            <div className="text-slate-600">
                              بزرگ: <span className="font-bold text-slate-800">{formatPrice(p.priceLarge || p.price)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs">
                            {discountVal > 0 ? (
                              <div className="space-y-0.5">
                                <div className="line-through text-slate-400">{formatPrice(p.price)}</div>
                                <div className="font-bold text-emerald-600 text-sm">
                                  {formatPrice(Math.round(p.price * (1 - discountVal / 100)))}
                                </div>
                              </div>
                            ) : (
                              <div className="font-bold text-slate-800 text-sm">{formatPrice(p.price)}</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {discountVal > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
                            <Percent className="w-3 h-3" />
                            <span>{discountVal}٪ تخفیف</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">بدون تخفیف</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                        {p.creationTime}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="ویرایش محصول"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(p)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                            title="حذف محصول"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" />
                <span>{editingProduct ? 'ویرایش محصول' : 'افزودن محصول جدید به کاتالوگ اونیوال'}</span>
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان محصول <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مانند: عسل گون خالص کوهستان اونیوال"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  دسته‌بندی محصول
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* HasSize & Multi-Size Management */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasSize}
                    onChange={(e) => setFormData({ ...formData, hasSize: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    محصول دارای اندازه، وزن یا بسته‌بندی‌های مختلف است (مثلاً ۲ سایز، ۳ سایز یا بیشتر)
                  </span>
                </label>

                {formData.hasSize ? (
                  <div className="pt-3 border-t border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">
                        فهرست اندازه‌ها / وزن‌ها و قیمت هر کدام:
                      </span>
                      <button
                        type="button"
                        onClick={addSizeRow}
                        className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-lg flex items-center gap-1 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>افزودن سایز جدید</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {formData.sizes.map((sz, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                          <div className="flex-1">
                            <input
                              type="text"
                              required
                              placeholder="نام سایز (مانند: ۲۵۰ گرم، ۵۰۰ گرم، ۱ کیلو)"
                              value={sz.name}
                              onChange={(e) => updateSizeRow(idx, 'name', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white"
                            />
                          </div>
                          <div className="w-36">
                            <input
                              type="number"
                              required
                              placeholder="قیمت (تومان)"
                              value={sz.price}
                              onChange={(e) => updateSizeRow(idx, 'price', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white text-left font-mono"
                            />
                          </div>
                          {formData.sizes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSizeRow(idx)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                              title="حذف این اندازه"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      مشتری در صفحه فروشگاه می‌تواند بین این اندازه‌ها انتخاب کند و قیمت بر اساس سایز انتخابی به‌روزرسانی می‌شود.
                    </p>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-slate-200">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      قیمت تک و استاندارد محصول (تومان)
                    </label>
                    <input
                      type="number"
                      placeholder="مانند: ۳۵۰,۰۰۰"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Discount Setting */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-amber-600" />
                    <span>تنظیم درصد تخفیف و پیشنهاد شگفت‌انگیز</span>
                  </label>
                  {Number(formData.discount) > 0 && (
                    <span className="px-2 py-0.5 bg-rose-500 text-white rounded-md text-[11px] font-bold">
                      نمایش در پیشنهاد شگفت‌انگیز صفحه اصلی
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-28">
                    <input
                      type="number"
                      min="0"
                      max="99"
                      placeholder="0"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white font-mono text-center font-bold"
                    />
                  </div>
                  <span className="text-xs font-bold text-amber-900">درصد تخفیف (٪)</span>
                  <div className="text-xs text-amber-800 flex-1">
                    {Number(formData.discount) > 0 ? (
                      <span>
                        این محصول با برچسب <strong>{formData.discount}٪ تخفیف</strong> در بخش پیشنهاد شگفت‌انگیز و کاتالوگ نمایش می‌یابد.
                      </span>
                    ) : (
                      <span className="text-slate-500">عدد ۰ به معنی قیمت بدون تخفیف است.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  آدرس تصویر محصول
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.imageName}
                    onChange={(e) => setFormData({ ...formData, imageName: e.target.value })}
                    className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono text-xs"
                  />
                  {formData.imageName && (
                    <img 
                      src={formData.imageName} 
                      alt="Preview" 
                      className="w-10 h-10 rounded-lg object-cover border border-slate-200" 
                    />
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  توضیحات کوتاه محصول
                </label>
                <textarea
                  rows={2}
                  placeholder="خلاصه ویژگی‌ها و خواص محصول برای کارت کاتالوگ..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  محتوای کامل و مشخصات فنی (مشابه ادیتور پیشرفته اونیوال)
                </label>
                <textarea
                  rows={3}
                  placeholder="توضیحات مفصل، منطقه برداشت، نحوه مصرف، گواهی آزمایشگاهی و جدول مشخصات..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  {isSubmitting ? 'در حال ثبت...' : editingProduct ? 'ذخیره تغییرات' : 'افزودن محصول'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              حذف محصول «{deleteTarget.title}»
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              آیا از حذف این محصول اطمینان دارید؟ این عملیات محصول را از لیست کاتالوگ فروشگاه حذف خواهد کرد.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                {isSubmitting ? 'در حال حذف...' : 'تأیید و حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
