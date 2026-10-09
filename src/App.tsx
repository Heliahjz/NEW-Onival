import React, { useState, useEffect } from 'react';
import { Sidebar, NavItem } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ProductsView } from './components/ProductsView';
import { DiscountsView } from './components/DiscountsView';
import { ProductCategoriesView } from './components/ProductCategoriesView';
import { PostsView } from './components/PostsView';
import { PostCategoriesView } from './components/PostCategoriesView';
import { ContactMessagesView } from './components/ContactMessagesView';
import { OrdersView } from './components/OrdersView';
import { BotSettingsView } from './components/BotSettingsView';
import { AccountView } from './components/AccountView';
import { StorefrontView } from './components/StorefrontView';
import { PageEditorView } from './components/PageEditorView';
import { PaymentSettingsView } from './components/PaymentSettingsView';
import { ConsultationsAdminView } from './components/ConsultationsAdminView';
import {
  apiFetch,
  ensureFirebaseSeededOnBoot,
  saveCloudStateToFirebase
} from './services/firebaseSync';
import { 
  Product, 
  ProductCategory, 
  Post, 
  PostCategory, 
  ContactMessage, 
  Order, 
  TelegramConfig, 
  BotActivityLog,
  AdminStats,
  SiteContent
} from './types';

export default function App() {
  const [viewMode, setViewMode] = useState<'admin' | 'storefront'>('storefront');
  const [activeTab, setActiveTab] = useState<NavItem>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // States
  const [stats, setStats] = useState<AdminStats>({
    totalProducts: 0,
    totalPosts: 0,
    unreadMessages: 0,
    pendingOrders: 0,
    totalRevenue: 0,
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postCategories, setPostCategories] = useState<PostCategory[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContent | null>(null);
  const [botLogs, setBotLogs] = useState<BotActivityLog[]>([]);
  const [botConfig, setBotConfig] = useState<TelegramConfig>({
    botToken: '1204808805:W-mq-hFRtv71zdHaRFSUYdr2GWCJPCvQD34',
    adminChatId: '923387796',
    baseUrl: 'https://tapi.bale.ai',
    panelBaseUrl: 'http://localhost:3000',
    antiSpamSeconds: 5,
    active: true,
  });

  // Load all initial data
  const fetchData = async () => {
    try {
      const [
        statsRes,
        prodRes,
        prodCatRes,
        postRes,
        postCatRes,
        msgRes,
        ordersRes,
        botRes,
        contentRes,
      ] = await Promise.all([
        apiFetch('/api/stats').then((r) => r.json()),
        apiFetch('/api/products').then((r) => r.json()),
        apiFetch('/api/product-categories').then((r) => r.json()),
        apiFetch('/api/posts').then((r) => r.json()),
        apiFetch('/api/post-categories').then((r) => r.json()),
        apiFetch('/api/contact').then((r) => r.json()),
        apiFetch('/api/orders').then((r) => r.json()),
        apiFetch('/api/bot/config').then((r) => r.json()),
        apiFetch('/api/site-content').then((r) => r.json()).catch(() => null),
      ]);

      if (statsRes) setStats(statsRes);
      if (Array.isArray(prodRes)) setProducts(prodRes);
      if (Array.isArray(prodCatRes)) setProductCategories(prodCatRes);
      if (Array.isArray(postRes)) setPosts(postRes);
      if (Array.isArray(postCatRes)) setPostCategories(postCatRes);
      if (Array.isArray(msgRes)) setMessages(msgRes);
      if (Array.isArray(ordersRes)) setOrders(ordersRes);
      if (botRes?.config) setBotConfig(botRes.config);
      if (Array.isArray(botRes?.logs)) setBotLogs(botRes.logs);
      if (contentRes) setSiteContent(contentRes);
    } catch (err) {
      console.error('Failed to load Onival data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const bootAndSeed = async () => {
      try {
        // ۱. اجرای خودکار راه‌اندازی اولیه (Auto-Seed) روی دیتابیس فایربیس به محض لود شدن سایت
        const cloudInit = await ensureFirebaseSeededOnBoot();
        if (cloudInit.state) {
          // اگر دیتابیس فایربیس اطلاعاتی دارد، سرور محلی را هم با آن همگام کن
          try {
            await window.fetch('/api/firebase/import-state', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(cloudInit.state),
            });
          } catch {
            // ignore on static hosting
          }
        }
      } catch (e) {
        console.error('Firebase auto-seed check error:', e);
      } finally {
        await fetchData();
      }
    };
    bootAndSeed();
  }, []);

  // Handlers for Products
  const handleAddProduct = async (prod: Partial<Product>) => {
    const res = await apiFetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prod),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const handleEditProduct = async (id: number, prod: Partial<Product>) => {
    const res = await apiFetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prod),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const handleDeleteProduct = async (id: number) => {
    const res = await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchData();
    }
  };

  // Handlers for Product Categories
  const handleAddProductCategory = async (cat: { title: string; parentId?: number | null }) => {
    const res = await apiFetch('/api/product-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const handleDeleteProductCategory = async (id: number) => {
    const res = await apiFetch(`/api/product-categories/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchData();
    }
  };

  // Handlers for Posts
  const handleAddPost = async (post: Partial<Post>) => {
    const res = await apiFetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const handleEditPost = async (id: number, post: Partial<Post>) => {
    const res = await apiFetch(`/api/posts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const handleDeletePost = async (id: number) => {
    const res = await apiFetch(`/api/posts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchData();
    }
  };

  // Handlers for Post Categories
  const handleAddPostCategory = async (cat: { title: string; parentId?: number | null }) => {
    const res = await apiFetch('/api/post-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const handleDeletePostCategory = async (id: number) => {
    const res = await apiFetch(`/api/post-categories/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchData();
    }
  };

  // Handlers for Messages
  const handleRespondMessage = async (id: number, response: string) => {
    const res = await apiFetch(`/api/contact/${id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response }),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const handleDeleteMessage = async (id: number) => {
    const res = await apiFetch(`/api/contact/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchData();
    }
  };

  const handleMarkMessageRead = async (id: number) => {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, isRead: true } : m)));
  };

  // Handlers for Orders
  const handleUpdateOrderStatus = async (
    id: number,
    status: Order['status'],
    paymentStatus?: Order['paymentStatus']
  ) => {
    const res = await apiFetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, paymentStatus }),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  const handleVerifyReceipt = async (id: number, approved: boolean) => {
    const res = await apiFetch(`/api/orders/${id}/verify-receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved }),
    });
    if (res.ok) {
      await fetchData();
    }
  };

  // Handlers for Bot
  const handleUpdateBotConfig = async (newConfig: Partial<TelegramConfig>) => {
    const res = await apiFetch('/api/bot/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.config) setBotConfig(data.config);
      await fetchData();
    }
  };

  const handleSimulateBotEvent = async (type: string, payload?: any) => {
    const res = await apiFetch('/api/bot/simulate-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload }),
    });
    const data = await res.json();
    await fetchData();
    return data;
  };

  // Handlers for Credentials
  const handleUpdateCredentials = async (email: string, newPass: string) => {
    const res = await apiFetch('/api/account/change-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword: newPass }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'خطا در ثبت مشخصات');
    }
  };

  // Handlers for Storefront Actions
  const handlePlaceOrder = async (orderData: Partial<Order>) => {
    const res = await apiFetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    if (res.ok) {
      await fetchData();
      return await res.json();
    }
  };

  const handleSubmitContact = async (contactData: { fullName: string; phoneNumber?: string; message: string }) => {
    const res = await apiFetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactData),
    });
    if (res.ok) {
      const data = await res.json();
      await fetchData();
      return data;
    }
  };

  // Handlers for Site Content Management
  const handleSaveSiteContent = async (newContent: SiteContent) => {
    const res = await apiFetch('/api/site-content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newContent),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.siteContent) {
        setSiteContent(data.siteContent);
      }
    } else {
      const err = await res.json();
      throw new Error(err.error || 'خطا در ذخیره محتوای سایت');
    }
  };

  const handleResetSiteContent = async () => {
    const res = await apiFetch('/api/site-content/reset', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data.siteContent) {
        setSiteContent(data.siteContent);
      }
    }
  };

  const getSectionTitle = (tab: NavItem) => {
    switch (tab) {
      case 'dashboard':
        return 'داشبورد عمومی';
      case 'products':
        return 'مدیریت محصولات';
      case 'discounts':
        return 'مدیریت تخفیف‌ها و پیشنهاد شگفت‌انگیز';
      case 'product-categories':
        return 'دسته‌بندی محصولات';
      case 'posts':
        return 'مقالات و اخبار وبلاگ';
      case 'post-categories':
        return 'دسته‌بندی مقالات';
      case 'consultations':
        return 'مدیریت رزروها، قیمت، موضوعات و شبکه‌های اجتماعی مشاوره';
      case 'messages':
        return 'پیام‌ها و پشتیبانی کاربران';
      case 'orders':
        return 'مدیریت سفارشات و تایید فیش‌های واریزی';
      case 'payment-settings':
        return 'تنظیمات صفحه پرداخت، شماره کارت و درگاه بانکی';
      case 'page-editor':
        return 'اصلاح صفحات، عناوین و چیدمان محتوا';
      case 'bot':
        return 'مرکز فرماندهی ربات‌های بله و تلگرام و درگاه‌های ارتباطی پشتیبانی';
      case 'account':
        return 'امنیت و تنظیمات مدیر';
    }
  };

  if (viewMode === 'storefront') {
    return (
      <StorefrontView
        products={products}
        categories={productCategories}
        posts={posts}
        messages={messages}
        siteContent={siteContent || undefined}
        onBackToAdmin={() => {
          fetchData();
          setViewMode('admin');
        }}
        onPlaceOrder={handlePlaceOrder}
        onSubmitContact={handleSubmitContact}
        onOrderUpdated={fetchData}
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        unreadMessagesCount={stats.unreadMessages}
        pendingOrdersCount={stats.pendingOrders}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onViewStorefront={() => setViewMode('storefront')}
        brandName={siteContent?.brandName}
        brandEnglishName={siteContent?.brandEnglishName}
        siteLogo={siteContent?.siteLogo}
        siteLogoFit={siteContent?.siteLogoFit}
        siteLogoShape={siteContent?.siteLogoShape}
        siteLogoScale={siteContent?.siteLogoScale}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={getSectionTitle(activeTab)}
          unreadMessagesCount={stats.unreadMessages}
          pendingOrdersCount={stats.pendingOrders}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onViewStorefront={() => setViewMode('storefront')}
          onNavigate={(tab) => setActiveTab(tab)}
          orders={orders}
          messages={messages}
          onMarkMessageRead={handleMarkMessageRead}
          siteLogo={siteContent?.siteLogo}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                <div className="text-xs font-medium">در حال فراخوانی داده‌های انیوال...</div>
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <DashboardView
                    stats={stats}
                    products={products}
                    posts={posts}
                    messages={messages}
                    orders={orders}
                    botConfig={botConfig}
                    onNavigate={setActiveTab}
                    onOpenAddProduct={() => setActiveTab('products')}
                    onOpenAddPost={() => setActiveTab('posts')}
                    onTestBot={() => handleSimulateBotEvent('test_notification')}
                    onViewStorefront={() => setViewMode('storefront')}
                  />
                )}

                {activeTab === 'products' && (
                  <ProductsView
                    products={products}
                    categories={productCategories}
                    onAddProduct={handleAddProduct}
                    onEditProduct={handleEditProduct}
                    onDeleteProduct={handleDeleteProduct}
                  />
                )}

                {activeTab === 'discounts' && (
                  <DiscountsView
                    products={products}
                    categories={productCategories}
                    onEditProduct={handleEditProduct}
                    onViewStorefront={() => setViewMode('storefront')}
                  />
                )}

                {activeTab === 'product-categories' && (
                  <ProductCategoriesView
                    categories={productCategories}
                    onAddCategory={handleAddProductCategory}
                    onDeleteCategory={handleDeleteProductCategory}
                  />
                )}

                {activeTab === 'posts' && (
                  <PostsView
                    posts={posts}
                    categories={postCategories}
                    onAddPost={handleAddPost}
                    onEditPost={handleEditPost}
                    onDeletePost={handleDeletePost}
                  />
                )}

                {activeTab === 'post-categories' && (
                  <PostCategoriesView
                    categories={postCategories}
                    onAddCategory={handleAddPostCategory}
                    onDeleteCategory={handleDeletePostCategory}
                  />
                )}

                {activeTab === 'consultations' && siteContent && (
                  <ConsultationsAdminView
                    siteContent={siteContent}
                    orders={orders}
                    messages={messages}
                    onSaveSiteContent={handleSaveSiteContent}
                    onRespondMessage={handleRespondMessage}
                    onUpdateOrderStatus={handleUpdateOrderStatus}
                    onVerifyReceipt={handleVerifyReceipt}
                    onOpenPaymentSettings={() => setActiveTab('payment-settings')}
                    onViewStorefront={() => setViewMode('storefront')}
                  />
                )}

                {activeTab === 'messages' && (
                  <ContactMessagesView
                    messages={messages}
                    onRespond={handleRespondMessage}
                    onDelete={handleDeleteMessage}
                  />
                )}

                {activeTab === 'orders' && (
                  <OrdersView
                    orders={orders}
                    onUpdateOrderStatus={handleUpdateOrderStatus}
                    onVerifyReceipt={handleVerifyReceipt}
                    onOpenPaymentSettings={() => setActiveTab('payment-settings')}
                  />
                )}

                {activeTab === 'payment-settings' && siteContent && (
                  <PaymentSettingsView
                    siteContent={siteContent}
                    onSave={handleSaveSiteContent}
                    onPreviewStorefront={() => setViewMode('storefront')}
                    onNavigateOrders={() => setActiveTab('orders')}
                    pendingReceiptsCount={
                      orders.filter(
                        (o) =>
                          o.paymentStatus === 'PendingVerification' ||
                          Boolean(o.receiptImageUrl && o.paymentStatus !== 'Paid')
                      ).length
                    }
                  />
                )}

                {activeTab === 'page-editor' && siteContent && (
                  <PageEditorView
                    siteContent={siteContent}
                    onSave={handleSaveSiteContent}
                    onReset={handleResetSiteContent}
                    onPreviewStorefront={() => setViewMode('storefront')}
                  />
                )}

                {activeTab === 'bot' && (
                  <BotSettingsView
                    config={botConfig}
                    logs={botLogs}
                    messages={messages}
                    orders={orders}
                    siteContent={siteContent}
                    onUpdateConfig={handleUpdateBotConfig}
                    onSimulateEvent={handleSimulateBotEvent}
                    onRespondMessage={handleRespondMessage}
                    onNavigate={setActiveTab}
                    onRefreshData={fetchData}
                  />
                )}

                {activeTab === 'account' && (
                  <AccountView
                    siteContent={siteContent || undefined}
                    onUpdateSiteContent={handleSaveSiteContent}
                    onRefreshData={fetchData}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
