import React, { useState } from 'react';
import { Post, PostCategory, PublicationStatus } from '../types';
import {
  Plus,
  Edit2,
  Trash2,
  FileText,
  Eye,
  EyeOff,
  Calendar,
  User,
  X,
  Image as ImageIcon,
  Upload,
  Check,
  Globe,
  AlertCircle
} from 'lucide-react';
import { sanitizeSlug, isSlugDuplicate } from '../utils/seo';

interface PostsViewProps {
  posts: Post[];
  categories: PostCategory[];
  onAddPost: (post: Partial<Post>) => Promise<void>;
  onEditPost: (id: number, post: Partial<Post>) => Promise<void>;
  onDeletePost: (id: number) => Promise<void>;
}

const PRESET_POST_IMAGES = [
  {
    label: 'خواص عسل طبیعی',
    url: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'ژل رویال و سلامتی',
    url: 'https://images.unsplash.com/photo-1471943311424-646960669fbc?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'زنبورداری و طبیعت',
    url: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=900&q=80',
  },
  {
    label: 'دمنوش و طب سنتی',
    url: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=900&q=80',
  },
];

export const PostsView: React.FC<PostsViewProps> = ({
  posts,
  categories,
  onAddPost,
  onEditPost,
  onDeletePost,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'seo'>('content');
  const [formError, setFormError] = useState('');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id || 1);
  const [imageName, setImageName] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [status, setStatus] = useState<PublicationStatus>('published');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [robotsNoIndex, setRobotsNoIndex] = useState(false);
  const [robotsNoFollow, setRobotsNoFollow] = useState(false);

  const openAddModal = () => {
    setEditingPost(null);
    setActiveTab('content');
    setFormError('');
    setTitle('');
    setSlug('');
    setAuthorName('تحریریه علمی اونیوال');
    setDescription('');
    setContent('');
    setCategoryId(categories[0]?.id || 1);
    setImageName(PRESET_POST_IMAGES[0].url);
    setImageAlt('');
    setStatus('published');
    setSeoTitle('');
    setSeoDescription('');
    setCanonicalUrl('');
    setRobotsNoIndex(false);
    setRobotsNoFollow(false);
    setIsModalOpen(true);
  };

  const openEditModal = (post: Post) => {
    setEditingPost(post);
    setActiveTab('content');
    setFormError('');
    setTitle(post.title);
    setSlug(post.slug);
    setAuthorName(post.authorName);
    setDescription(post.description);
    setContent(post.content);
    setCategoryId(post.categoryId);
    setImageName(post.imageName || PRESET_POST_IMAGES[0].url);
    setImageAlt(post.imageAlt || post.title);
    setStatus(post.status || 'published');
    setSeoTitle(post.seoTitle || '');
    setSeoDescription(post.seoDescription || '');
    setCanonicalUrl(post.canonicalUrl || '');
    setRobotsNoIndex(Boolean(post.robotsNoIndex));
    setRobotsNoFollow(Boolean(post.robotsNoFollow));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const candidateSlug = sanitizeSlug(slug || title, 'article', editingPost?.id);
    if (isSlugDuplicate(posts, candidateSlug, editingPost?.id)) {
      setFormError(`اسلاگ «${candidateSlug}» قبلاً برای مقاله دیگری ثبت شده است.`);
      setActiveTab('seo');
      return;
    }

    const payload: Partial<Post> = {
      title: title.trim(),
      slug: candidateSlug,
      authorName: authorName.trim() || 'تحریریه علمی اونیوال',
      description: description.trim() || content.trim().slice(0, 155),
      content: content.trim(),
      categoryId: Number(categoryId),
      imageName: imageName.trim() || PRESET_POST_IMAGES[0].url,
      imageAlt: imageAlt.trim() || `${title.trim()} - مجله سلامت اونیوال`,
      status,
      seoTitle: seoTitle.trim() || `${title.trim()} | مجله سلامت اونیوال`,
      seoDescription:
        seoDescription.trim() || description.trim() || content.trim().slice(0, 155),
      canonicalUrl: canonicalUrl.trim() || undefined,
      robotsNoIndex,
      robotsNoFollow,
    };

    try {
      if (editingPost) {
        await onEditPost(editingPost.id, payload);
      } else {
        await onAddPost(payload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'خطا در ذخیره مقاله');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-slate-900">مدیریت مقالات و مجله سلامت (Blog SEO)</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            هر مقاله منتشرشده دارای آدرس اختصاصی <code dir="ltr">/articles/:slug</code> و اسکیمای استاندارد <code dir="ltr">BlogPosting</code> است.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          انتشار مقاله جدید
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {posts.map((post) => {
          const isDraft = post.status === 'draft';
          return (
            <div
              key={post.id}
              className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                isDraft ? 'border-amber-300' : 'border-slate-200/60'
              }`}
            >
              <div>
                <div className="h-44 bg-slate-100 relative overflow-hidden">
                  <img
                    src={post.imageName || PRESET_POST_IMAGES[0].url}
                    alt={post.imageAlt || post.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent" />
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/90 text-slate-800">
                      {post.categoryTitle || 'عمومی'}
                    </span>
                    {isDraft ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white">
                        <EyeOff className="w-3 h-3" />
                        پیش‌نویس
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">
                        <Eye className="w-3 h-3" />
                        منتشرشده
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-2" dir="ltr">
                    <span>/articles/{post.slug}</span>
                    <span>{post.updatedAt?.slice(0, 10) || post.creationTime}</span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 mb-2 line-clamp-1">
                    {post.title}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-4">
                    {post.description}
                  </p>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {post.authorName}
                  </span>
                  <a
                    href={`/articles/${encodeURIComponent(post.slug)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    مشاهده صفحه مقاله
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(post)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeletePost(post.id)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Post Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingPost ? 'ویرایش مقاله و تنظیمات سئو' : 'نگارش مقاله علمی جدید'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-4 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('content')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                  activeTab === 'content'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600'
                }`}
              >
                ۱. محتوای مقاله و تصویر کاور
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('seo')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'seo'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                ۲. سئو، اسلاگ و اسکیمای BlogPosting
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {activeTab === 'content' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        عنوان مقاله *
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          if (!editingPost && !slug) {
                            setSlug(sanitizeSlug(e.target.value, 'article'));
                          }
                        }}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        وضعیت انتشار مقاله
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as PublicationStatus)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                      >
                        <option value="published">منتشرشده (در سایت و Sitemap)</option>
                        <option value="draft">پیش‌نویس (مخفی از عموم)</option>
                      </select>
                    </div>
                  </div>

                  {/* Cover Image & Alt */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      تصویر کاور مقاله و متن جایگزین (Image Alt)
                    </label>

                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <div className="w-24 h-16 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0">
                        {imageName && (
                          <img
                            src={imageName}
                            alt={imageAlt || title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      <div className="flex-1 w-full space-y-2">
                        <input
                          type="text"
                          value={imageName}
                          onChange={(e) => setImageName(e.target.value)}
                          dir="ltr"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                          placeholder="لینک تصویر کاور (https://...)"
                        />
                        <input
                          type="text"
                          value={imageAlt}
                          onChange={(e) => setImageAlt(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                          placeholder="متن جایگزین تصویر (Alt Text) برای سئو تصاویر"
                        />
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          آپلود تصویر از سیستم
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {PRESET_POST_IMAGES.map((preset, idx) => {
                        const isSelected = imageName === preset.url;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setImageName(preset.url)}
                            className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                              isSelected ? 'border-blue-600' : 'border-transparent opacity-75'
                            }`}
                          >
                            <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        دسته‌بندی مقاله
                      </label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(Number(e.target.value))}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
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
                        نام نویسنده (Author Schema)
                      </label>
                      <input
                        type="text"
                        required
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      چکیده مقاله (Summary) *
                    </label>
                    <input
                      type="text"
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      متن کامل مقاله *
                    </label>
                    <textarea
                      rows={6}
                      required
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      اسلاگ یکتای مقاله (URL Slug) *
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="recognize-pure-natural-honey"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      در صورت تغییر اسلاگ، آدرس قبلی به صورت خودکار با کد ۳۰۱ به آدرس جدید هدایت می‌شود.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      عنوان سئو اختصاصی (SEO Meta Title)
                    </label>
                    <input
                      type="text"
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder={`${title || 'عنوان مقاله'} | مجله سلامت اونیوال`}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      توضیحات متا سئو (SEO Meta Description)
                    </label>
                    <textarea
                      rows={3}
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      placeholder="خلاصه استاندارد ۱۲۰ تا ۱۵۵ کاراکتری برای نمایش در نتایج گوگل..."
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

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={robotsNoIndex}
                        onChange={(e) => setRobotsNoIndex(e.target.checked)}
                        className="w-4 h-4 text-rose-600 rounded"
                      />
                      <span className="text-xs font-bold text-slate-700">
                        عدم ایندکس (<code dir="ltr">noindex</code>)
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
                        عدم فالو لینک‌ها (<code dir="ltr">nofollow</code>)
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
                >
                  {editingPost ? 'بروزرسانی مقاله و سئو' : 'انتشار مقاله'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
