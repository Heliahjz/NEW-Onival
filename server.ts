import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const PERSIST_FILE_PATH = path.join(process.cwd(), 'onival-persistent-data.json');

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// In-Memory Data Store replicating Onival.Domain & Onival.Infrastructure
let productCategories = [
  { id: 1, title: 'عسل‌های ارگانیک', slug: 'honey', parentId: null, sortOrder: 1 },
  { id: 2, title: 'مکمل‌های غذایی', slug: 'supplement', parentId: null, sortOrder: 2 },
  { id: 3, title: 'نوشیدنی‌ها و دمنوش', slug: 'drink', parentId: null, sortOrder: 3 },
  { id: 4, title: 'خشکبار و مغزیجات', slug: 'nuts', parentId: null, sortOrder: 4 },
];

let products = [
  {
    id: 1,
    title: 'عسل کوهستان',
    slug: 'mountain-honey',
    price: 180000,
    hasSize: true,
    sizes: [
      { name: '۲۵۰ گرم', price: 95000 },
      { name: '۵۰۰ گرم', price: 180000 },
      { name: '۱ کیلوگرم', price: 350000 }
    ],
    priceSmall: 180000,
    priceLarge: 350000,
    discount: 15,
    type: 'honey',
    categoryId: 1,
    categoryTitle: 'عسل‌های ارگانیک',
    imageName: 'https://images.unsplash.com/photo-1587049359535-b64d3dd0d716?w=800&auto=format&fit=crop&q=80',
    description: 'عسل خالص و حرارت ندیده با طعم غنی و عطر گل‌های وحشی کوهستان.',
    content: 'برداشت شده از مراتع مرتفع سبلان، کاملا خام و فیلترنشده بدون هیچ‌گونه حرارت‌دهی صنعتی.',
    features: ['ساکارز زیر ۲٪', 'برداشت پاییزه', 'کاملاً خام و بدون حرارت'],
    isDelete: false,
    creationTime: '1403/06/15'
  },
  {
    id: 2,
    title: 'ژل رویال شاهانه',
    slug: 'royal-jelly',
    price: 450000,
    hasSize: true,
    sizes: [
      { name: '۲۰ گرم (تستی)', price: 150000 },
      { name: '۵۰ گرم', price: 450000 },
      { name: '۱۰۰ گرم (ویژه)', price: 850000 }
    ],
    priceSmall: 450000,
    priceLarge: 850000,
    discount: 10,
    type: 'supplement',
    categoryId: 2,
    categoryTitle: 'مکمل‌های غذایی',
    imageName: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop&q=80',
    description: 'اکسیر جوانی و تقویت سیستم ایمنی بدن با خلوص صد در صد.',
    content: 'ژل رویال خالص برداشت شده از کندوهای اختصاصی، ارائه‌شده در بسته‌بندی ایزوله یخچالی.',
    features: ['خالص ۱۰۰٪', 'نگهداری سرد', 'سرشار از اسیدهای چرب 10-HDA'],
    isDelete: false,
    creationTime: '1403/06/18'
  },
  {
    id: 3,
    title: 'گرده گل زنبور',
    slug: 'bee-pollen',
    price: 120000,
    hasSize: true,
    sizes: [
      { name: '۱۵۰ گرم', price: 75000 },
      { name: '۳۰۰ گرم', price: 120000 },
      { name: '۶۰۰ گرم', price: 230000 }
    ],
    priceSmall: 120000,
    priceLarge: 230000,
    discount: 20,
    type: 'supplement',
    categoryId: 2,
    categoryTitle: 'مکمل‌های غذایی',
    imageName: 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=800&auto=format&fit=crop&q=80',
    description: 'مولتی‌ویتامین طبیعی برای ورزشکاران، افزایش انرژی روزانه و بهبود گوارش.',
    content: 'گرده گل رنگارنگ بهاره، خشک‌شده با سیستم هوای غیرحرارتی به منظور حفظ کلیه ویتامین‌ها و آمینواسیدها.',
    features: ['پروتئین گیاهی بالا', 'خشک‌شده طبیعی', 'انرژی‌بخش و مقوی'],
    isDelete: false,
    creationTime: '1403/06/20'
  },
  {
    id: 4,
    title: 'دمنوش آرامش',
    slug: 'calm-herbal-tea',
    price: 60000,
    hasSize: true,
    sizes: [
      { name: 'بسته ۱۰ عددی', price: 35000 },
      { name: 'بسته ۲۰ عددی', price: 60000 },
      { name: 'بسته ۴۰ عددی', price: 110000 }
    ],
    priceSmall: 60000,
    priceLarge: 110000,
    discount: 0,
    type: 'drink',
    categoryId: 3,
    categoryTitle: 'نوشیدنی‌ها و دمنوش',
    imageName: 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=800&auto=format&fit=crop&q=80',
    description: 'ترکیب گل گاوزبان، سنبل‌الطیب، به‌لیمو و لیمو امانی برای کاهش استرس روزانه.',
    content: 'مخلوطی دست‌چین و معطر از گیاهان دارویی خودرو دامنه‌های البرز.',
    features: ['آرام‌بخش طبیعی', 'بدون کافئین', 'تسکین‌دهنده اعصاب'],
    isDelete: false,
    creationTime: '1403/06/21'
  },
  {
    id: 5,
    title: 'شربت سکنجبین سنتی',
    slug: 'sekanjabin-syrup',
    price: 85000,
    hasSize: true,
    sizes: [
      { name: 'نیم لیتری', price: 85000 },
      { name: 'یک لیتری', price: 160000 },
      { name: 'دو لیتری اقتصادی', price: 290000 }
    ],
    priceSmall: 85000,
    priceLarge: 160000,
    discount: 5,
    type: 'drink',
    categoryId: 3,
    categoryTitle: 'نوشیدنی‌ها و دمنوش',
    imageName: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80',
    description: 'نوشیدنی سنتی با نعناع تازه و عسل طبیعی، تصفیه‌کننده کبد و خنک‌کننده گوارش.',
    content: 'تهیه شده با سرکه سیب ارگانیک و عسل کوهستان بدون ذره‌ای شکر سفید صنعتی.',
    features: ['تصفیه‌کننده کبد', 'شیرین‌شده با عسل طبیعی', 'طبع معتدل'],
    isDelete: false,
    creationTime: '1403/06/22'
  },
  {
    id: 6,
    title: 'مغز گردو تویسرکان',
    slug: 'walnut-kernels',
    price: 170000,
    hasSize: true,
    sizes: [
      { name: '۲۵۰ گرم', price: 90000 },
      { name: '۵۰۰ گرم', price: 170000 },
      { name: '۱ کیلوگرم', price: 320000 }
    ],
    priceSmall: 170000,
    priceLarge: 320000,
    discount: 0,
    type: 'nuts',
    categoryId: 4,
    categoryTitle: 'خشکبار و مغزیجات',
    imageName: 'https://images.unsplash.com/photo-1563539973273-0472460e5362?w=800&auto=format&fit=crop&q=80',
    description: 'گردوی تویسرکان سفید، تازه و پرچرب دست‌چین امسال.',
    content: 'مغز گردوی پوست‌کاغذی با درصد چربی امگا ۳ فوق‌العاده بالا مناسب صبحانه و تغذیه سالم.',
    features: ['پوست کاغذی', 'دستچین شده امسال', 'بدون نمک و تازه'],
    isDelete: false,
    creationTime: '1403/06/23'
  },
  {
    id: 7,
    title: 'عسل با موم طبیعی',
    slug: 'comb-honey',
    price: 200000,
    hasSize: true,
    sizes: [
      { name: '۵۰۰ گرم', price: 200000 },
      { name: '۱ کیلوگرم', price: 380000 },
      { name: '۲ کیلوگرم (قاب کامل)', price: 720000 }
    ],
    priceSmall: 200000,
    priceLarge: 380000,
    discount: 0,
    type: 'honey',
    categoryId: 1,
    categoryTitle: 'عسل‌های ارگانیک',
    imageName: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800&auto=format&fit=crop&q=80',
    description: 'عسل همراه موم طبیعی خودبافت، مناسب سلامت معده و ضد التهاب سینوس‌ها.',
    content: 'شان طبیعی بدون برگه موم مصنوعی، بافته شده کاملاً توسط زنبور عسل در کوهپایه.',
    features: ['مناسب سلامت معده', 'موم خودبافت طبیعی', 'طعم و عطر بهشتی'],
    isDelete: false,
    creationTime: '1403/06/24'
  }
];

let postCategories = [
  { id: 1, title: 'راهنمای خرید عسل', slug: 'honey-guide', parentId: null },
  { id: 2, title: 'تغذیه و سبک زندگی سالم', slug: 'healthy-diet', parentId: null },
  { id: 3, title: 'دمنوش و نوشیدنی‌های طبیعی', slug: 'herbal-drinks', parentId: null }
];

let posts = [
  {
    id: 1,
    title: 'چطور عسل ارگانیک را از عسل تقلبی تشخیص دهیم؟',
    slug: 'detect-organic-honey-from-fake',
    categoryId: 1,
    categoryTitle: 'راهنمای خرید عسل',
    description: 'نشانه‌های ظاهری، برچسب استاندارد و نتایج آزمایشگاهی عسل‌های طبیعی برای خریدی مطمئن.',
    content: 'در این مطلب درباره نشانه‌های ظاهری مانند رس‌بستن (شکرک زدن طبیعی عسل خالص)، میزان کشسانی، برچسب استاندارد آزمایشگاهی (ساکارز و پرولین) صحبت می‌کنیم تا هنگام خرید عسل ارگانیک انتخاب مطمئن‌تری داشته باشید.',
    imageName: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&auto=format&fit=crop&q=80',
    viewCount: 420,
    authorName: 'کارشناس زنبورداران',
    creationTime: '1403/06/10'
  },
  {
    id: 2,
    title: '۵ دلیل علمی برای انتخاب محصولات ارگانیک در سبد غذایی',
    slug: '5-reasons-for-organic-foods',
    categoryId: 2,
    categoryTitle: 'تغذیه و سبک زندگی سالم',
    description: 'کاهش سموم دفع آفات، تراکم بیشتر آنتی‌اکسیدان‌ها و تقویت ایمنی با مصرف خوراکی‌های پاک.',
    content: 'پژوهش‌های متعدد نشان می‌دهند محصولات ارگانیک فاقد سموم شیمیایی آفت‌کش بوده و از نظر غلظت ترکیبات آنتی‌اکسیدانی تا ۴۰ درصد غنی‌تر از محصولات کشت صنعتی هستند.',
    imageName: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80',
    viewCount: 315,
    authorName: 'مشاور تغذیه ارگانیک',
    creationTime: '1403/06/14'
  },
  {
    id: 3,
    title: 'بهترین دمنوش‌های گیاهی برای کاهش استرس روزانه',
    slug: 'best-herbal-teas-for-stress',
    categoryId: 3,
    categoryTitle: 'دمنوش و نوشیدنی‌های طبیعی',
    description: 'آشنایی با خواص گل‌گاوزبان، سنبل‌الطیب، به‌لیمو و ترکیب معجزه‌آسای آن‌ها با عسل طبیعی.',
    content: 'زندگی پرمشغله امروزی نیاز به آرامش‌بخش‌های طبیعی دارد. ترکیب دم‌کرده سنبل‌الطیب با یک قاشق عسل کوهستان در پایان روز، سیستم عصبی پاراسمپاتیک را تقویت کرده و خواب عمیقی ایجاد می‌کند.',
    imageName: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80',
    viewCount: 290,
    authorName: 'پژوهشگر طب سنتی',
    creationTime: '1403/06/19'
  }
];

let contactMessages = [
  {
    id: 1,
    fullName: 'امیرحسین رضایی',
    phoneNumber: '09123456789',
    trackingCode: 'ONV-9421',
    message: 'سلام، آیا امکان آسیاب سفارشی برای دستگاه موکاپات در هنگام ارسال سفارش وجود دارد؟',
    adminResponse: 'درود بر شما، بله در بخش توضیحات سفارش می‌توانید نوع دستگاه خود را قید فرمایید تا بر همان اساس آسیاب شود.',
    isRead: true,
    isResponded: true,
    creationTime: '1403/06/20 - 14:30',
    respondedAt: '1403/06/20 - 16:15'
  },
  {
    id: 2,
    fullName: 'سارا کاظمی',
    phoneNumber: '09351112233',
    trackingCode: 'ONV-8814',
    message: 'بسته‌بندی دانه‌ها دارای سوپاپ تخلیه گاز دی‌اکسید کربن هست یا نه؟ ممنون از پاسخگویی شما.',
    adminResponse: undefined,
    isRead: false,
    isResponded: false,
    creationTime: '1403/06/23 - 10:15'
  },
  {
    id: 3,
    fullName: 'مهدی حسینی (کاربر بله/تلگرام)',
    phoneNumber: '09198765432',
    trackingCode: 'ONV-7703',
    message: 'سلام از طریق ربات بله پیام می‌دم. زمان تقریبی رسیدن سفارش شماره ONV-ORD-101 کی هست؟',
    adminResponse: undefined,
    isRead: true,
    isResponded: false,
    creationTime: '1403/06/24 - 18:05'
  },
  {
    id: 4,
    fullName: 'مریم شریفی',
    phoneNumber: '09124455667',
    trackingCode: 'ONV-CNS-405',
    message: '[رزرو مشاوره تخصصی - موضوع: دوز مصرف و دوره درمانی ژل رویال و گرده گل]\n📅 زمان انتخابی: فردا | نوبت عصر (۱۶:۰۰ الی ۱۹:۰۰)\n📱 شبکه اجتماعی انتخابی: پیام‌رسان بله (Bale) - آیدی/شماره: @maryam_sh\n💳 هزینه مشاوره: ۱۵۰,۰۰۰ تومان\n📝 شرح پرسش: برای تقویت سیستم ایمنی و رفع خستگی مزمن چه دوزی از ژل رویال و گرده گل را پیشنهاد می‌کنید؟',
    adminResponse: undefined,
    isRead: false,
    isResponded: false,
    creationTime: '1403/06/25 - 11:20',
    isConsultation: true,
    orderId: 103,
    paymentStatus: 'PendingVerification',
    paymentMethod: 'card_to_card',
    totalPrice: 150000,
    consultationDetails: {
      topicId: 'topic-2',
      topicTitle: 'دوز مصرف و دوره درمانی ژل رویال و گرده گل',
      preferredDate: 'فردا',
      preferredTimeSlot: 'نوبت عصر (۱۶:۰۰ الی ۱۹:۰۰)',
      socialPlatform: 'پیام‌رسان بله (Bale)',
      socialContactId: '@maryam_sh',
      price: 150000,
      durationMinutes: 40,
      question: 'برای تقویت سیستم ایمنی و رفع خستگی مزمن چه دوزی از ژل رویال و گرده گل را پیشنهاد می‌کنید؟',
      consultationStatus: 'PendingVerification'
    }
  }
];

let orders: any[] = [
  {
    id: 101,
    userFullName: 'نیما علوی',
    phoneNumber: '09121234567',
    userAddress: 'تهران، خیابان ولیعصر، نرسیده به میدان ونک، پلاک ۴۲، واحد ۳',
    totalPrice: 800000,
    status: 'Processing',
    paymentStatus: 'Paid',
    trackingCode: 'ONV-ORD-101',
    creationTime: '1403/06/23',
    balePaymentUrl: 'https://ble.ir/onival_bot?start=pay_ONV-ORD-101',
    items: [
      {
        id: 1,
        productId: 1,
        productName: 'عسل کوهستان اونیوال',
        size: '۱ کیلوگرم',
        quantity: 1,
        unitPrice: 350000,
        totalPrice: 350000
      },
      {
        id: 2,
        productId: 2,
        productName: 'ژل رویال شاهانه اونیوال',
        size: '۵۰ گرم',
        quantity: 1,
        unitPrice: 450000,
        totalPrice: 450000
      }
    ]
  },
  {
    id: 102,
    userFullName: 'فاطمه موسوی',
    phoneNumber: '09369874521',
    userAddress: 'اصفهان، خیابان چهارباغ عباسی، کوچه فردوسی، پلاک ۱۸',
    totalPrice: 380000,
    status: 'Shipped',
    paymentStatus: 'Paid',
    trackingCode: 'ONV-ORD-102',
    creationTime: '1403/06/24',
    balePaymentUrl: 'https://ble.ir/onival_bot?start=pay_ONV-ORD-102',
    items: [
      {
        id: 3,
        productId: 7,
        productName: 'عسل با موم طبیعی اونیوال',
        size: '۱ کیلوگرم',
        quantity: 1,
        unitPrice: 380000,
        totalPrice: 380000
      }
    ]
  },
  {
    id: 103,
    userFullName: 'مریم شریفی',
    phoneNumber: '09124455667',
    userAddress: 'مشاوره آنلاین در پیام‌رسان بله (Bale) | آیدی/شماره: @maryam_sh | زمان: فردا - نوبت عصر (۱۶:۰۰ الی ۱۹:۰۰)',
    totalPrice: 150000,
    status: 'Pending',
    paymentStatus: 'Unpaid',
    paymentMethod: 'card_to_card',
    trackingCode: 'ONV-CNS-405',
    creationTime: '1403/06/25',
    balePaymentUrl: 'https://ble.ir/onival_bot?start=pay_ONV-CNS-405',
    isConsultation: true,
    consultationDetails: {
      topicId: 'topic-2',
      topicTitle: 'دوز مصرف و دوره درمانی ژل رویال و گرده گل',
      preferredDate: 'فردا',
      preferredTimeSlot: 'نوبت عصر (۱۶:۰۰ الی ۱۹:۰۰)',
      socialPlatform: 'پیام‌رسان بله (Bale)',
      socialContactId: '@maryam_sh',
      price: 150000,
      durationMinutes: 40,
      question: 'برای تقویت سیستم ایمنی و رفع خستگی مزمن چه دوزی از ژل رویال و گرده گل را پیشنهاد می‌کنید؟',
      consultationStatus: 'PendingPayment'
    },
    items: [
      {
        id: 1,
        productId: 9002,
        productName: 'رزرو مشاوره تخصصی: دوز مصرف و دوره درمانی ژل رویال و گرده گل',
        size: 'فردا | نوبت عصر (۱۶:۰۰ الی ۱۹:۰۰) - پیام‌رسان بله',
        quantity: 1,
        unitPrice: 150000,
        totalPrice: 150000
      }
    ]
  }
];

// Configuration for Bale Bot, Telegram Bot & Omnichannel Support
let telegramConfig: any = {
  // Primary / Bale Bot compatibility fields
  botToken: '1204808805:W-mq-hFRtv71zdHaRFSUYdr2GWCJPCvQD34',
  adminChatId: '923387796',
  botUsername: 'onival_bot',
  baseUrl: 'https://tapi.bale.ai',
  panelBaseUrl: 'http://localhost:3000',
  antiSpamSeconds: 5,
  active: true,

  // Explicit Bale Bot Settings
  baleEnabled: true,
  baleBotToken: '1204808805:W-mq-hFRtv71zdHaRFSUYdr2GWCJPCvQD34',
  baleAdminChatId: '923387796',
  baleBotUsername: 'onival_bot',
  baleBaseUrl: 'https://tapi.bale.ai',
  baleWebhookUrl: '',

  // Explicit Telegram Bot Settings
  telegramEnabled: true,
  telegramBotEnabled: true,
  telegramBotToken: '7192837465:AAH8xK9lP2mN4vB6cX8zQ1wE3rT5yU7iO9p',
  telegramAdminChatId: '923387796',
  telegramBotUsername: 'onival_shop_bot',
  telegramBaseUrl: 'https://api.telegram.org',
  telegramWebhookUrl: '',
  webhookSecretToken: 'ONIVAL_SEC_2025_9981',

  // Customer Support Channels & Floating Support Widget
  baleSupportId: '@onival_bale_support',
  baleSupportUsername: 'onival_bale_support',
  baleChannelId: '@onival_bale',
  telegramSupportId: '@onival_support',
  telegramSupportUsername: 'onival_support',
  telegramChannelId: '@onival_official',
  instagramId: '@onival.ir',
  whatsappNumber: '09123456789',
  eitaaSupportId: '@onival_eitaa',
  rubikaSupportId: '@onival_rubika',
  supportPhone: '۰۲۱-۱۲۳۴۵۶۷۸ / ۰۹۱۲۳۴۵۶۷۸۹',
  supportEmail: 'support@onival.ir',
  workingHours: 'شنبه تا پنج‌شنبه ۹:۰۰ الی ۲۱:۰۰',
  supportHours: 'شنبه تا پنج‌شنبه ۹:۰۰ الی ۲۱:۰۰',
  autoReplyEnabled: true,
  floatingWidgetEnabled: true,
  floatingWidgetTitle: 'پشتیبانی آنلاین و مشاوره اونیوال',
  floatingWidgetWelcome: 'سلام! 👋 چطور می‌توانیم در انتخاب محصولات ارگانیک یا پیگیری سفارش به شما کمک کنیم؟',

  // Automated Notification Triggers
  notifyOnNewOrder: true,
  notifyOnReceiptUpload: true,
  notifyOnNewTicket: true,
  notifyOnPaymentSuccess: true,
  notifyCustomerOnStatusChange: true,

  // Customizable Bot Message Templates
  welcomeTemplate: 'به ربات رسمی فروشگاه تخصصی اونیوال (ONIVAL) خوش آمدید! 🍯\nاز طریق این ربات می‌توانید فاکتورهای خود را پرداخت کنید و وضعیت سفارش را لحظه‌ای پیگیری نمایید.',
  orderInvoiceTemplate: '🧾 فاکتور جدید #{trackingCode}\n👤 مشتری: {customerName}\n📞 تماس: {phone}\n💳 مبلغ کل: {amount} تومان\n📍 آدرس: {address}',
  receiptApprovedTemplate: '✅ فیش واریزی سفارش #{trackingCode} توسط مدیریت تایید شد و مرسوله شما وارد مرحله بسته‌بندی و ارسال گردید.',
  supportReplyTemplate: '💬 پاسخ پشتیبانی اونیوال به پیام #{trackingCode}:\n{response}'
};

let botActivityLogs: any[] = [
  { id: 1, time: '14:30', type: 'incoming_message', platform: 'bale', text: 'پیام جدید از کاربر با شناسه ۹۲۳۳۸۷۷۹۶ (کد رهگیری: ONV-9421)', status: 'success' },
  { id: 2, time: '16:15', type: 'admin_response', platform: 'telegram', text: 'پاسخ مدیر به کد پیگیری ONV-9421 در بله و تلگرام ارسال گردید.', status: 'success' },
  { id: 3, time: '18:05', type: 'bot_query', platform: 'bale', text: 'استعلام وضعیت سفارش ONV-ORD-101 از طریق ربات بله دریافت شد.', status: 'success' }
];

// Helper to dispatch real HTTP notifications to Bale and/or Telegram bots
async function dispatchBotNotification(text: string, eventType: string) {
  const nowTime = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const results: { platform: string; ok: boolean; detail: string }[] = [];

  // 1. Send to Bale Bot if enabled
  const baleActive = telegramConfig.baleEnabled ?? telegramConfig.active;
  const baleToken = (telegramConfig.baleBotToken || telegramConfig.botToken || '').trim();
  const baleChat = (telegramConfig.baleAdminChatId || telegramConfig.adminChatId || '').trim();
  const baleBase = (telegramConfig.baleBaseUrl || telegramConfig.baseUrl || 'https://tapi.bale.ai').replace(/\/+$/, '');

  if (baleActive && baleToken && baleChat) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${baleBase}/bot${baleToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: baleChat, text }),
        signal: controller.signal
      });
      clearTimeout(timer);
      const data: any = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        results.push({ platform: 'bale', ok: true, detail: `ارسال واقعی به بله (Message ID: ${data.result?.message_id || 'OK'})` });
      } else {
        results.push({ platform: 'bale', ok: false, detail: data?.description || `HTTP ${res.status}` });
      }
    } catch (err: any) {
      results.push({ platform: 'bale', ok: false, detail: err?.message || 'خطای شبکه' });
    }
  }

  // 2. Send to Telegram Bot if enabled
  const tgActive = telegramConfig.telegramBotEnabled ?? telegramConfig.telegramEnabled;
  const tgToken = (telegramConfig.telegramBotToken || '').trim();
  const tgChat = (telegramConfig.telegramAdminChatId || telegramConfig.adminChatId || '').trim();
  const tgBase = (telegramConfig.telegramBaseUrl || 'https://api.telegram.org').replace(/\/+$/, '');

  if (tgActive && tgToken && tgChat) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${tgBase}/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChat, text }),
        signal: controller.signal
      });
      clearTimeout(timer);
      const data: any = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        results.push({ platform: 'telegram', ok: true, detail: `ارسال واقعی به تلگرام (Message ID: ${data.result?.message_id || 'OK'})` });
      } else {
        results.push({ platform: 'telegram', ok: false, detail: data?.description || `HTTP ${res.status}` });
      }
    } catch (err: any) {
      results.push({ platform: 'telegram', ok: false, detail: err?.message || 'خطای شبکه' });
    }
  }

  return { nowTime, results };
}

let adminCredentials = {
  username: 'admin',
  password: 'admin',
  email: 'admin@onival.com',
  name: 'مدیریت اونیوال (ONIVAL Admin)'
};

const defaultSiteContent = {
  brandName: 'اونیوال',
  brandEnglishName: 'ONIVAL',
  siteLogo: '',
  siteLogoFit: 'cover' as 'cover' | 'contain',
  siteLogoShape: 'rounded' as 'circle' | 'rounded' | 'free',
  siteLogoScale: 100,
  systemTagline: 'سامانه یکپارچه مدیریت فروشگاه، مقالات و ربات بله اونیوال (ONIVAL Admin)',
  heroTitlePrefix: 'فروشگاه تخصصی',
  heroSubtitle: 'عرضه مستقیم عسل طبیعی، ژل رویال، گرده گل و فرآورده‌های ارگانیک کوهستان',
  heroAlign: 'center' as const,
  navLabels: {
    home: 'خانه',
    articles: 'مقالات',
    consultation: 'مشاوره تخصصی',
    tracking: 'پیگیری سفارش',
    about: 'درباره ما',
    contact: 'تماس'
  },
  homeSections: [
    {
      id: 'specialOffers' as const,
      title: 'پیشنهاد شگفت‌انگیز',
      subtitle: 'تخفیف‌های استثنایی محصولات برگزیده کندو',
      enabled: true,
      align: 'right' as const,
      order: 1
    },
    {
      id: 'categories' as const,
      title: 'دسته‌بندی‌های محصولات',
      subtitle: 'دسترسی سریع به گروه‌های کالایی',
      enabled: true,
      align: 'right' as const,
      order: 2
    },
    {
      id: 'products' as const,
      title: 'لیست محصولات اونیوال',
      subtitle: 'محصولات ارگانیک و طبیعی با ضمانت اصالت و برگه آزمایشگاه',
      enabled: true,
      align: 'right' as const,
      order: 3
    },
    {
      id: 'consultationBanner' as const,
      title: 'مشاوره تخصصی رایگان',
      subtitle: 'راهنمایی انتخاب عسل دارویی و فرآورده‌های ویژه سلامت',
      enabled: true,
      align: 'center' as const,
      order: 4
    },
    {
      id: 'articles' as const,
      title: 'مقالات و مطالب علمی اونیوال',
      subtitle: 'آخرین نوشته‌ها برای آشنایی با خواص عسل طبیعی، دمنوش‌های گیاهی و سبک زندگی سالم',
      enabled: true,
      align: 'right' as const,
      order: 5
    }
  ],
  specialOffersTitle: 'پیشنهاد شگفت‌انگیز',
  specialOffersButtonText: 'مشاهده همه',
  specialOffersBgColor: '#ef394e',
  productsSectionTitle: 'لیست محصولات اونیوال',
  productsSectionSubtitle: 'محصولات موجود با ضمانت اصالت',
  productsAlign: 'right' as const,
  articlesSectionTitle: 'مقالات و مطالب علمی اونیوال',
  articlesSectionSubtitle: 'آخرین نوشته‌ها برای آشنایی با خواص عسل طبیعی، دمنوش‌های گیاهی و سبک زندگی سالم.',
  articlesPageTitle: 'دانشنامه و مقالات تخصصی اونیوال (ONIVAL)',
  articlesPageSubtitle: 'مرجع جامع راهنمای تشخیص عسل طبیعی، فواید ژل رویال، دمنوش‌های گیاهی و تغذیه ارگانیک',
  articlesAlign: 'right' as const,
  consultationBadge: 'مشاوره رایگان و تخصصی فرآورده‌های کندو',
  consultationTitle: 'درخواست مشاوره تخصصی سلامت و محصولات اونیوال',
  consultationSubtitle: 'پرسش‌های خود را درباره خواص درمانی عسل، طریقه مصرف ژل رویال، گرده گل و رژیم‌های طبیعی مطرح نمایید.',
  consultationTopics: [
    'خواص درمانی عسل ارگانیک سبلان (دیابت، سرماخوردگی، زخم معده)',
    'دوز مصرف و نگهداری ژل رویال و گرده گل',
    'ترکیبات دمنوش گیاهی ضد استرس و بی‌خوابی',
    'سکنجبین سنتی و پاکسازی کبد چرب',
    'انتخاب وزن و مشاوره سفارش عمده و خرید مستقیم'
  ],
  consultationAlign: 'center' as const,
  trackingTitle: 'پیگیری وضعیت سفارش و پیام مشاوره',
  trackingSubtitle: 'کد رهگیری فاکتور خرید (مانند ONV-ORD-101) یا کد رهگیری پیام مشاوره (مانند ONV-9421) را وارد نمایید.',
  trackingAlign: 'center' as const,
  aboutTitle: 'درباره فروشگاه اونیوال (ONIVAL)',
  aboutParagraph1: 'مجموعه تخصصی اونیوال با همکاری مستقیم زنبورداران محلی و کشاورزان متعهد سبلان و البرز، محصولات کاملاً سالم، ارگانیک و حرارت‌ندیده را بدون واسطه به دست خانواده‌های ایرانی می‌رساند.',
  aboutParagraph2: 'تمامی عسل‌ها دارای برگه آزمایشگاهی تخصصی با ساکارز زیر ۲ درصد بوده و فرآورده‌های دارویی کندو از جمله ژل رویال و گرده گل با حفظ کامل زنجیره سرمایشی نگهداری و توزیع می‌شوند.',
  aboutStat1Value: '۱۰۰٪',
  aboutStat1Label: 'طبیعی، خام و آزمایش‌شده',
  aboutStat2Value: '۷ روز',
  aboutStat2Label: 'ضمانت اصالت و بازگشت وجه',
  aboutStat3Value: '+۱۵ سال',
  aboutStat3Label: 'سابقه تولید و عرضه فرآورده‌های ارگانیک',
  contactTitle: 'تماس با ما',
  contactSubtitle: 'جهت پیگیری سفارشات، هماهنگی خرید عمده و ارتباط مستقیم با دفتر مرکزی اونیوال:',
  contactPhone: '۰۲۱-۱۲۳۴۵۶۷۸ / ۰۹۱۲۳۴۵۶۷۸۹',
  contactAddress: 'تهران، مجموعه تخصصی فرآورده‌های ارگانیک اونیوال (ONIVAL)',
  contactWorkingHours: 'شنبه تا چهارشنبه ۹:۰۰ الی ۱۸:۰۰ | پنج‌شنبه‌ها ۹:۰۰ الی ۱۳:۰۰',
  contactEmail: 'support@onival.ir',
  footerCopyright: 'تمامی حقوق مادی و معنوی متعلق به فروشگاه اونیوال (ONIVAL) می‌باشد.',
  paymentConfig: {
    cardToCardEnabled: true,
    cardNumber: '۶۰۳۷-۹۹۷۵-۹۹۱۲-۳۴۵۶',
    cardHolderName: 'مجموعه تخصصی فرآورده‌های ارگانیک اونیوال',
    bankName: 'بانک ملی ایران',
    cardDescription: 'لطفاً مبلغ دقیق فاکتور را به شماره کارت بالا واریز نموده و سپس تصویر واضح فیش واریزی یا اسکرین‌شات رسید انتقال وجه را به همراه شماره فاکتور در کادر زیر بارگذاری فرمایید. پس از تایید فیش توسط مدیریت، می‌توانید وضعیت ارسال سفارش خود را با کد رهگیری پیگیری نمایید.',
    gatewayOfflineNoticeTitle: 'اطلاعیه همراهان گرامی درباره نحوه پرداخت',
    gatewayOfflineNoticeText: 'همراه گرامی و ارجمند، به دلیل بروزرسانی فنی زیرساخت شبکه بانکی، پرداخت مستقیم از طریق درگاه اینترنتی در حال حاضر به صورت موقت قطع می‌باشد. ضمن پوزش از شما و قدردانی از همراهی و شکیبایی ارزشمندتان، می‌توانید مبلغ فاکتور را با اطمینان کامل به صورت «کارت به کارت» واریز نموده و تصویر فیش را در همین صفحه بارگذاری فرمایید تا سفارش شما بدون هیچ‌گونه تاخیری و در اولویت ویژه آماده و ارسال گردد.',
    baleBotEnabled: true,
    baleBotButtonText: 'اتصال به ربات بله و پرداخت فاکتور (@onival_bot)',
    gatewayEnabled: false,
    gatewayTitle: 'پرداخت آنلاین از طریق درگاه بانکی شاپرک',
    gatewayUrl: 'https://zarinp.al/onival',
    gatewayMerchantCode: 'ONIVAL-MERCHANT-982410',
    gatewayDescription: 'پرداخت آنی و امن با کلیه کارت‌های بانکی عضو شبکه شتاب و رمز دوم پویا',
    defaultMethod: 'card_to_card' as const
  },
  consultationConfig: {
    basePrice: 120000,
    allowAddToCart: true,
    allowDirectPayment: true,
    specialistName: 'متخصص طب سنتی و فرآورده‌های کندوی اونیوال',
    specialistTitle: 'مشاوره اختصاصی تغذیه، رژیم درمانی و فرآورده‌های ارگانیک',
    timeSlots: [
      'نوبت صبح (۰۹:۰۰ الی ۱۲:۰۰)',
      'نوبت ظهر (۱۲:۰۰ الی ۱۵:۰۰)',
      'نوبت عصر (۱۶:۰۰ الی ۱۹:۰۰)',
      'نوبت شب (۱۹:۰۰ الی ۲۱:۰۰)',
      'اولین زمان خالی کارشناس (فوری)'
    ],
    topics: [
      {
        id: 'topic-1',
        title: 'خواص درمانی عسل ارگانیک سبلان (دیابت، سرماخوردگی، زخم معده)',
        description: 'بررسی شرایط بدنی و تجویز نوع و میزان مصرف عسل طبیعی مناسب شما',
        price: 120000,
        durationMinutes: 30,
        enabled: true
      },
      {
        id: 'topic-2',
        title: 'دوز مصرف و نگهداری ژل رویال و گرده گل',
        description: 'تنظیم برنامه مصرف تخصصی ژل رویال و گرده گل جهت تقویت سیستم ایمنی و انرژی',
        price: 150000,
        durationMinutes: 40,
        enabled: true
      },
      {
        id: 'topic-3',
        title: 'ترکیبات دمنوش گیاهی ضد استرس و بی‌خوابی',
        description: 'نسخه ترکیبی دمنوش‌های کوهستانی و عسل برای رفع بی‌خوابی و اضطراب روزانه',
        price: 110000,
        durationMinutes: 25,
        enabled: true
      },
      {
        id: 'topic-4',
        title: 'سکنجبین سنتی و پاکسازی کبد چرب',
        description: 'برنامه ۴۰ روزه پاکسازی کبد و تنظیم متابولیسم با فرآورده‌های طبیعی',
        price: 140000,
        durationMinutes: 35,
        enabled: true
      },
      {
        id: 'topic-5',
        title: 'انتخاب وزن و مشاوره سفارش عمده و خرید مستقیم',
        description: 'راهنمایی خرید عمده یا سازمانی، بررسی برگه‌های آزمایشگاه و شرایط ارسال',
        price: 80000,
        durationMinutes: 20,
        enabled: true
      }
    ],
    socialPlatforms: [
      {
        id: 'bale',
        name: 'پیام‌رسان بله (Bale)',
        placeholder: 'آیدی یا شماره موبایل شما در بله (مثال: @username یا 09123456789)',
        enabled: true,
        iconType: 'bale' as const
      },
      {
        id: 'telegram',
        name: 'تلگرام (Telegram)',
        placeholder: 'آیدی یا شماره موبایل شما در تلگرام (مثال: @username یا 09123456789)',
        enabled: true,
        iconType: 'telegram' as const
      },
      {
        id: 'whatsapp',
        name: 'واتساپ (WhatsApp)',
        placeholder: 'شماره موبایل فعال در واتساپ (مثال: 09123456789)',
        enabled: true,
        iconType: 'whatsapp' as const
      },
      {
        id: 'eitaa',
        name: 'پیام‌رسان ایتا (Eitaa)',
        placeholder: 'آیدی یا شماره موبایل شما در ایتا (مثال: @username یا 09123456789)',
        enabled: true,
        iconType: 'eitaa' as const
      },
      {
        id: 'instagram',
        name: 'دایرکت اینستاگرام (Instagram)',
        placeholder: 'آیدی پیج اینستاگرام شما (مثال: @your_page)',
        enabled: true,
        iconType: 'instagram' as const
      },
      {
        id: 'phone',
        name: 'تماس تلفنی مستقیم',
        placeholder: 'شماره تماس مستقیم جهت برقراری تماس کارشناس (مثال: 09123456789)',
        enabled: true,
        iconType: 'phone' as const
      }
    ]
  }
};

let siteContent = JSON.parse(JSON.stringify(defaultSiteContent));

// ================= PERSISTENT DISK STORAGE HELPERS =================
function loadPersistedState() {
  try {
    if (fs.existsSync(PERSIST_FILE_PATH)) {
      const raw = fs.readFileSync(PERSIST_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.telegramConfig && typeof parsed.telegramConfig === 'object') {
        telegramConfig = { ...telegramConfig, ...parsed.telegramConfig };
      }
      if (parsed.siteContent && typeof parsed.siteContent === 'object') {
        siteContent = {
          ...siteContent,
          ...parsed.siteContent,
          paymentConfig: {
            ...siteContent.paymentConfig,
            ...(parsed.siteContent.paymentConfig || {})
          },
          consultationConfig: {
            ...siteContent.consultationConfig,
            ...(parsed.siteContent.consultationConfig || {}),
            topics: Array.isArray(parsed.siteContent.consultationConfig?.topics) && parsed.siteContent.consultationConfig.topics.length > 0
              ? parsed.siteContent.consultationConfig.topics
              : siteContent.consultationConfig.topics,
            socialPlatforms: Array.isArray(parsed.siteContent.consultationConfig?.socialPlatforms) && parsed.siteContent.consultationConfig.socialPlatforms.length > 0
              ? parsed.siteContent.consultationConfig.socialPlatforms
              : siteContent.consultationConfig.socialPlatforms,
            timeSlots: Array.isArray(parsed.siteContent.consultationConfig?.timeSlots) && parsed.siteContent.consultationConfig.timeSlots.length > 0
              ? parsed.siteContent.consultationConfig.timeSlots
              : siteContent.consultationConfig.timeSlots
          }
        };
      }
      if (parsed.adminCredentials && typeof parsed.adminCredentials === 'object') {
        adminCredentials = { ...adminCredentials, ...parsed.adminCredentials };
      }
      if (Array.isArray(parsed.botActivityLogs) && parsed.botActivityLogs.length > 0) {
        botActivityLogs = parsed.botActivityLogs;
      }
      if (Array.isArray(parsed.orders) && parsed.orders.length > 0) {
        orders = parsed.orders;
      }
      if (Array.isArray(parsed.contactMessages) && parsed.contactMessages.length > 0) {
        contactMessages = parsed.contactMessages;
      }
    }
  } catch (err) {
    console.error('Failed to load persisted state:', err);
  }
}

function savePersistedState() {
  try {
    const dataToSave = {
      telegramConfig,
      siteContent,
      adminCredentials,
      botActivityLogs: botActivityLogs.slice(0, 50),
      orders,
      contactMessages,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(PERSIST_FILE_PATH, JSON.stringify(dataToSave, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save persisted state:', err);
  }
}

loadPersistedState();

// ================= API ROUTES =================

// Overview Statistics
app.get('/api/stats', (req: Request, res: Response) => {
  const totalRevenue = orders.reduce((acc, o) => acc + (o.paymentStatus === 'Paid' ? o.totalPrice : 0), 0);
  const unreadMessages = contactMessages.filter(m => !m.isRead || !m.isResponded).length;
  const pendingOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Processing').length;

  res.json({
    totalProducts: products.filter(p => !p.isDelete).length,
    totalPosts: posts.length,
    unreadMessages,
    pendingOrders,
    totalRevenue
  });
});

// Products
app.get('/api/products', (req: Request, res: Response) => {
  const activeProducts = products.filter(p => !p.isDelete);
  res.json(activeProducts);
});

app.get('/api/products/:id', (req: Request, res: Response) => {
  const p = products.find(x => x.id === Number(req.params.id) && !x.isDelete);
  if (!p) return res.status(404).json({ error: 'محصول مورد نظر یافت نشد' });
  res.json(p);
});

app.post('/api/products', (req: Request, res: Response) => {
  const { title, price, hasSize, sizes, priceSmall, priceLarge, discount, type, features, categoryId, imageName, description, content } = req.body;
  if (!title) return res.status(400).json({ error: 'عنوان محصول الزامی است' });

  const cat = productCategories.find(c => c.id === Number(categoryId));
  const parsedSizes = Array.isArray(sizes) && sizes.length > 0
    ? sizes.map((s: any) => ({ name: String(s.name || ''), price: Number(s.price) || 0 }))
    : undefined;

  const resolvedPrice = parsedSizes && parsedSizes.length > 0
    ? parsedSizes[0].price
    : (Number(price) || 0);

  const newProduct = {
    id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
    title,
    slug: title.trim().toLowerCase().replace(/[\s\W-]+/g, '-'),
    price: resolvedPrice,
    hasSize: Boolean(hasSize || (parsedSizes && parsedSizes.length > 0)),
    sizes: parsedSizes,
    priceSmall: parsedSizes && parsedSizes.length > 0 ? parsedSizes[0].price : (priceSmall ? Number(priceSmall) : undefined),
    priceLarge: parsedSizes && parsedSizes.length > 0 ? parsedSizes[parsedSizes.length - 1].price : (priceLarge ? Number(priceLarge) : undefined),
    discount: discount ? Number(discount) : 0,
    type: type || 'honey',
    features: Array.isArray(features) ? features : [],
    categoryId: Number(categoryId) || (productCategories[0]?.id ?? 1),
    categoryTitle: cat ? cat.title : 'عمومی',
    imageName: imageName || 'https://images.unsplash.com/photo-1587049359535-b64d3dd0d716?w=800&auto=format&fit=crop&q=80',
    description: description || '',
    content: content || '',
    isDelete: false,
    creationTime: new Date().toLocaleDateString('fa-IR')
  };

  products.push(newProduct);
  botActivityLogs.unshift({
    id: Date.now(),
    time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    type: 'product_added',
    text: `محصول جدید اضافه شد: ${newProduct.title}`,
    status: 'success'
  });

  res.status(201).json(newProduct);
});

app.put('/api/products/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'محصول یافت نشد' });

  const { title, price, hasSize, sizes, priceSmall, priceLarge, discount, type, features, categoryId, imageName, description, content } = req.body;
  const cat = productCategories.find(c => c.id === Number(categoryId));

  const parsedSizes = Array.isArray(sizes)
    ? sizes.map((s: any) => ({ name: String(s.name || ''), price: Number(s.price) || 0 }))
    : products[index].sizes;

  const resolvedPrice = parsedSizes && parsedSizes.length > 0
    ? parsedSizes[0].price
    : (price !== undefined ? Number(price) : products[index].price);

  products[index] = {
    ...products[index],
    title: title ?? products[index].title,
    price: resolvedPrice,
    hasSize: hasSize !== undefined ? Boolean(hasSize) : products[index].hasSize,
    sizes: parsedSizes,
    priceSmall: parsedSizes && parsedSizes.length > 0 ? parsedSizes[0].price : (priceSmall !== undefined ? Number(priceSmall) : products[index].priceSmall),
    priceLarge: parsedSizes && parsedSizes.length > 0 ? parsedSizes[parsedSizes.length - 1].price : (priceLarge !== undefined ? Number(priceLarge) : products[index].priceLarge),
    discount: discount !== undefined ? Number(discount) : products[index].discount,
    type: type ?? products[index].type,
    features: features !== undefined ? features : products[index].features,
    categoryId: categoryId ? Number(categoryId) : products[index].categoryId,
    categoryTitle: cat ? cat.title : products[index].categoryTitle,
    imageName: imageName ?? products[index].imageName,
    description: description ?? products[index].description,
    content: content ?? products[index].content
  };

  res.json(products[index]);
});

app.delete('/api/products/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'محصول یافت نشد' });
  products[index].isDelete = true;
  res.json({ message: 'محصول با موفقیت حذف شد' });
});

// Product Categories
app.get('/api/product-categories', (req: Request, res: Response) => {
  res.json(productCategories);
});

app.post('/api/product-categories', (req: Request, res: Response) => {
  const { title, parentId, sortOrder } = req.body;
  if (!title) return res.status(400).json({ error: 'عنوان دسته‌بندی الزامی است' });

  const newCat = {
    id: productCategories.length > 0 ? Math.max(...productCategories.map(c => c.id)) + 1 : 1,
    title,
    slug: title.trim().toLowerCase().replace(/[\s\W-]+/g, '-'),
    parentId: parentId ? Number(parentId) : null,
    sortOrder: sortOrder ? Number(sortOrder) : productCategories.length + 1
  };

  productCategories.push(newCat);
  res.status(201).json(newCat);
});

app.delete('/api/product-categories/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  productCategories = productCategories.filter(c => c.id !== id);
  res.json({ message: 'دسته‌بندی با موفقیت حذف شد' });
});

// Posts / Articles
app.get('/api/posts', (req: Request, res: Response) => {
  res.json(posts);
});

app.post('/api/posts', (req: Request, res: Response) => {
  const { title, categoryId, description, content, imageName } = req.body;
  if (!title) return res.status(400).json({ error: 'عنوان مقاله الزامی است' });

  const cat = postCategories.find(c => c.id === Number(categoryId));
  const newPost = {
    id: posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1,
    title,
    slug: title.trim().toLowerCase().replace(/[\s\W-]+/g, '-'),
    categoryId: Number(categoryId) || (postCategories[0]?.id ?? 1),
    categoryTitle: cat ? cat.title : 'عمومی',
    description: description || '',
    content: content || '',
    imageName: imageName || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=80',
    viewCount: 0,
    authorName: 'مدیریت انیوال',
    creationTime: new Date().toLocaleDateString('fa-IR')
  };

  posts.push(newPost);
  res.status(201).json(newPost);
});

app.put('/api/posts/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const index = posts.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'مقاله یافت نشد' });

  const { title, categoryId, description, content, imageName } = req.body;
  const cat = postCategories.find(c => c.id === Number(categoryId));

  posts[index] = {
    ...posts[index],
    title: title ?? posts[index].title,
    categoryId: categoryId ? Number(categoryId) : posts[index].categoryId,
    categoryTitle: cat ? cat.title : posts[index].categoryTitle,
    description: description ?? posts[index].description,
    content: content ?? posts[index].content,
    imageName: imageName ?? posts[index].imageName
  };

  res.json(posts[index]);
});

app.delete('/api/posts/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  posts = posts.filter(p => p.id !== id);
  res.json({ message: 'مقاله با موفقیت حذف شد' });
});

// Post Categories
app.get('/api/post-categories', (req: Request, res: Response) => {
  res.json(postCategories);
});

app.post('/api/post-categories', (req: Request, res: Response) => {
  const { title, parentId } = req.body;
  if (!title) return res.status(400).json({ error: 'عنوان دسته‌بندی مقاله الزامی است' });

  const newCat = {
    id: postCategories.length > 0 ? Math.max(...postCategories.map(c => c.id)) + 1 : 1,
    title,
    slug: title.trim().toLowerCase().replace(/[\s\W-]+/g, '-'),
    parentId: parentId ? Number(parentId) : null
  };

  postCategories.push(newCat);
  res.status(201).json(newCat);
});

app.delete('/api/post-categories/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  postCategories = postCategories.filter(c => c.id !== id);
  res.json({ message: 'دسته‌بندی مقاله حذف شد' });
});

// Contact Messages, Consultations & Tracking
app.get('/api/contact', (req: Request, res: Response) => {
  res.json(contactMessages);
});

// Dedicated Consultation Booking Endpoint (Creates both Official Invoice Order + Consultation Message Record)
app.post('/api/consultations/book', (req: Request, res: Response) => {
  const {
    fullName,
    phoneNumber,
    topicId,
    topicTitle,
    preferredDate,
    preferredTimeSlot,
    socialPlatform,
    socialContactId,
    price,
    durationMinutes,
    question
  } = req.body || {};

  if (!fullName || !phoneNumber || !topicTitle) {
    return res.status(400).json({ error: 'نام، شماره تماس و موضوع مشاوره الزامی است.' });
  }

  const resolvedPrice = typeof price === 'number' ? price : (siteContent.consultationConfig?.basePrice ?? 120000);
  const trackingCode = `ONV-CNS-${Math.floor(100 + Math.random() * 900)}`;
  const botUser = (telegramConfig.baleBotUsername || telegramConfig.botUsername || 'onival_bot').replace(/^@/, '');
  const balePaymentUrl = `https://ble.ir/${botUser}?start=pay_${trackingCode}`;
  const nowDate = new Date().toLocaleDateString('fa-IR');
  const nowTime = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  const consultationDetails = {
    topicId: topicId || 'custom',
    topicTitle,
    preferredDate: preferredDate || 'اولین روز کاری',
    preferredTimeSlot: preferredTimeSlot || 'نوبت عصر (۱۶:۰۰ الی ۱۹:۰۰)',
    socialPlatform: socialPlatform || 'پیام‌رسان بله (Bale)',
    socialContactId: socialContactId || phoneNumber,
    price: resolvedPrice,
    durationMinutes: durationMinutes || 30,
    question: question || '',
    consultationStatus: resolvedPrice > 0 ? ('PendingPayment' as const) : ('Scheduled' as const)
  };

  const newOrderId = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 101;
  const newOrder: any = {
    id: newOrderId,
    userFullName: fullName,
    phoneNumber,
    userAddress: `مشاوره آنلاین در ${consultationDetails.socialPlatform} | آیدی/شماره: ${consultationDetails.socialContactId} | زمان: ${consultationDetails.preferredDate} - ${consultationDetails.preferredTimeSlot}`,
    totalPrice: resolvedPrice,
    status: resolvedPrice > 0 ? ('Pending' as const) : ('Processing' as const),
    paymentStatus: resolvedPrice > 0 ? ('Unpaid' as const) : ('Paid' as const),
    paymentMethod: siteContent.paymentConfig?.defaultMethod || 'card_to_card',
    trackingCode,
    creationTime: nowDate,
    balePaymentUrl,
    isConsultation: true,
    consultationDetails,
    items: [
      {
        id: 1,
        productId: 9000,
        productName: `رزرو مشاوره تخصصی: ${topicTitle}`,
        size: `${consultationDetails.preferredDate} | ${consultationDetails.preferredTimeSlot} (${consultationDetails.socialPlatform})`,
        quantity: 1,
        unitPrice: resolvedPrice,
        totalPrice: resolvedPrice
      }
    ]
  };

  orders.unshift(newOrder);

  const formattedMessage =
    `[رزرو مشاوره تخصصی - موضوع: ${topicTitle}]\n` +
    `📅 زمان انتخابی: ${consultationDetails.preferredDate} | ${consultationDetails.preferredTimeSlot}\n` +
    `📱 شبکه اجتماعی انتخابی: ${consultationDetails.socialPlatform} - آیدی/شماره: ${consultationDetails.socialContactId}\n` +
    `💳 هزینه مشاوره: ${resolvedPrice > 0 ? `${resolvedPrice.toLocaleString('fa-IR')} تومان` : 'رایگان'}\n` +
    `📝 شرح پرسش: ${question || 'بدون توضیحات تکمیلی'}`;

  const newMsg: any = {
    id: contactMessages.length > 0 ? Math.max(...contactMessages.map(m => m.id)) + 1 : 1,
    fullName,
    phoneNumber,
    trackingCode,
    message: formattedMessage,
    adminResponse: undefined,
    isRead: false,
    isResponded: false,
    creationTime: `${nowDate} - ${nowTime}`,
    isConsultation: true,
    orderId: newOrder.id,
    paymentStatus: newOrder.paymentStatus,
    paymentMethod: newOrder.paymentMethod,
    totalPrice: resolvedPrice,
    consultationDetails
  };

  contactMessages.unshift(newMsg);
  savePersistedState();

  botActivityLogs.unshift({
    id: Date.now(),
    time: nowTime,
    type: 'new_consultation_booked',
    platform: 'bale',
    text: `رزرو مشاوره جدید توسط ${fullName} با کد ${trackingCode} (موضوع: ${topicTitle} - مبلغ: ${resolvedPrice.toLocaleString('fa-IR')} تومان)`,
    status: 'success'
  });

  if (telegramConfig.notifyOnNewTicket !== false || telegramConfig.notifyOnNewOrder !== false) {
    dispatchBotNotification(
      `🩺 رزرو مشاوره تخصصی جدید - اونیوال\n` +
      `کد رهگیری و فاکتور: ${trackingCode}\n` +
      `نام متقاضی: ${fullName} (${phoneNumber})\n` +
      `موضوع: ${topicTitle}\n` +
      `زمان انتخابی: ${consultationDetails.preferredDate} | ${consultationDetails.preferredTimeSlot}\n` +
      `شبکه اجتماعی ارتباط: ${consultationDetails.socialPlatform} (${consultationDetails.socialContactId})\n` +
      `مبلغ قابل پرداخت: ${resolvedPrice.toLocaleString('fa-IR')} تومان\n` +
      `پرسش کاربر: ${question || '-'}`,
      'new_consultation_booked'
    ).catch(() => {});
  }

  res.status(201).json({
    success: true,
    trackingCode,
    order: newOrder,
    consultation: newMsg
  });
});

app.post('/api/contact', (req: Request, res: Response) => {
  const { fullName, phoneNumber, message, isConsultation, consultationDetails } = req.body;
  if (!fullName || !message) return res.status(400).json({ error: 'نام و متن پیام الزامی است' });

  const trackingCode = req.body.trackingCode || `ONV-${Math.floor(1000 + Math.random() * 9000)}`;
  const newMsg: any = {
    id: contactMessages.length > 0 ? Math.max(...contactMessages.map(m => m.id)) + 1 : 1,
    fullName,
    phoneNumber: phoneNumber || '',
    trackingCode,
    message,
    adminResponse: undefined,
    isRead: false,
    isResponded: false,
    creationTime: `${new Date().toLocaleDateString('fa-IR')} - ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`,
    isConsultation: Boolean(isConsultation),
    consultationDetails: consultationDetails || undefined
  };

  contactMessages.unshift(newMsg);
  savePersistedState();

  botActivityLogs.unshift({
    id: Date.now(),
    time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    type: 'new_contact_message',
    platform: 'bale',
    text: `پیام جدید از ${fullName} (کد پیگیری: ${trackingCode})`,
    status: 'success'
  });

  if (telegramConfig.notifyOnNewTicket !== false) {
    dispatchBotNotification(
      `📩 پیام پشتیبانی / مشاوره جدید\nکد پیگیری: ${trackingCode}\nنام کاربر: ${fullName}\nتلفن: ${phoneNumber || 'ثبت نشده'}\nمتن پیام:\n${message}`,
      'new_contact_message'
    ).catch(() => {});
  }

  res.status(201).json(newMsg);
});

app.post('/api/contact/:id/respond', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { response, consultationStatus } = req.body;
  if (!response) return res.status(400).json({ error: 'لطفاً پاسخ را وارد کنید' });

  const msg: any = contactMessages.find(m => m.id === id);
  if (!msg) return res.status(404).json({ error: 'پیام یافت نشد' });

  const respondedAt = `${new Date().toLocaleDateString('fa-IR')} - ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`;
  msg.adminResponse = response;
  msg.isResponded = true;
  msg.isRead = true;
  msg.respondedAt = respondedAt;
  if (msg.consultationDetails) {
    msg.consultationDetails.adminResponse = response;
    msg.consultationDetails.respondedAt = respondedAt;
    msg.consultationDetails.consultationStatus = consultationStatus || 'Completed';
  }

  // Sync response to linked consultation order if present
  const linkedOrder: any = orders.find(o => o.trackingCode.toUpperCase() === msg.trackingCode.toUpperCase() || (msg.orderId && o.id === msg.orderId));
  if (linkedOrder) {
    if (linkedOrder.consultationDetails) {
      linkedOrder.consultationDetails.adminResponse = response;
      linkedOrder.consultationDetails.respondedAt = respondedAt;
      linkedOrder.consultationDetails.consultationStatus = consultationStatus || 'Completed';
    }
    if (consultationStatus === 'Completed' || !consultationStatus) {
      linkedOrder.status = 'Completed';
    }
  }

  savePersistedState();

  botActivityLogs.unshift({
    id: Date.now(),
    time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    type: 'admin_response',
    platform: 'bale',
    text: `ارسال پاسخ مدیر برای پیام ${msg.trackingCode} به ربات بله/تلگرام`,
    status: 'success'
  });

  dispatchBotNotification(
    `💬 پاسخ پشتیبانی / کارشناس اونیوال برای #${msg.trackingCode} (${msg.fullName}):\n${response}`,
    'admin_response'
  ).catch(() => {});

  res.json({ message: 'پاسخ با موفقیت ثبت شد', data: msg });
});

app.delete('/api/contact/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  contactMessages = contactMessages.filter(m => m.id !== id);
  savePersistedState();
  res.json({ message: 'پیام با موفقیت حذف شد' });
});

// Orders
app.get('/api/orders', (req: Request, res: Response) => {
  res.json(orders);
});

app.get('/api/orders/track/:code', (req: Request, res: Response) => {
  const code = (req.params.code || '').trim().toUpperCase();
  const order: any = orders.find(o => o.trackingCode.toUpperCase() === code);
  const msg: any = contactMessages.find(m => m.trackingCode.toUpperCase() === code);

  if (order) {
    // Enrich consultation order with any latest adminResponse from contactMessages
    if (msg) {
      order.adminResponse = msg.adminResponse || order.consultationDetails?.adminResponse;
      order.respondedAt = msg.respondedAt || order.consultationDetails?.respondedAt;
      if (order.consultationDetails && msg.adminResponse) {
        order.consultationDetails.adminResponse = msg.adminResponse;
        order.consultationDetails.respondedAt = msg.respondedAt;
      }
    }
    return res.json({ found: true, type: 'order', data: order, messageData: msg || null });
  }
  if (msg) {
    return res.json({ found: true, type: 'message', data: msg });
  }
  res.status(404).json({ found: false, error: 'سفارشی یا پیامی با این کد رهگیری یافت نشد' });
});

app.post('/api/orders', (req: Request, res: Response) => {
  const { userFullName, phoneNumber, userAddress, totalPrice, items, trackingCode } = req.body;
  if (!userFullName || !phoneNumber || !userAddress) {
    return res.status(400).json({ error: 'اطلاعات گیرنده و آدرس الزامی است' });
  }

  const generatedCode = trackingCode || `ONV-ORD-${Math.floor(100 + Math.random() * 900)}`;
  const botUser = telegramConfig.botUsername || 'onival_bot';
  const balePaymentUrl = `https://ble.ir/${botUser}?start=pay_${generatedCode}`;

  const newOrder: any = {
    id: orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 101,
    userFullName,
    phoneNumber,
    userAddress,
    totalPrice: totalPrice || 0,
    status: 'Pending' as const,
    paymentStatus: 'Unpaid' as const,
    paymentMethod: req.body.paymentMethod || siteContent.paymentConfig?.defaultMethod || 'card_to_card',
    receiptImageUrl: undefined,
    receiptNote: undefined,
    receiptSubmittedAt: undefined,
    trackingCode: generatedCode,
    creationTime: new Date().toLocaleDateString('fa-IR'),
    balePaymentUrl,
    items: items || []
  };

  orders.unshift(newOrder);

  // Send invoice details to Bale Bot
  if (telegramConfig.active && telegramConfig.botToken && telegramConfig.adminChatId) {
    const itemsSummary = (newOrder.items || [])
      .map((it: any) => `▫️ ${it.productName} (${it.size || 'استاندارد'}) × ${it.quantity} عدد`)
      .join('\n');

    const invoiceMsg = `🧾 فاکتور جدید صادر شد - فروشگاه اونیوال (ONIVAL)\n` +
      `کد رهگیری: ${generatedCode}\n` +
      `خریدار: ${userFullName}\n` +
      `شماره تماس: ${phoneNumber}\n` +
      `مبلغ قابل پرداخت: ${Number(totalPrice || 0).toLocaleString('fa-IR')} تومان\n` +
      `آدرس پستی: ${userAddress}\n\n` +
      `اقلام فاکتور:\n${itemsSummary}\n\n` +
      `لینک پرداخت و تایید سفارش در ربات بله:\n${balePaymentUrl}`;

    fetch(`${telegramConfig.baseUrl}/bot${telegramConfig.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramConfig.adminChatId,
        text: invoiceMsg
      })
    }).catch(() => {});
  }

  botActivityLogs.unshift({
    id: Date.now(),
    time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    type: 'new_order_placed',
    text: `فاکتور جدید ${newOrder.trackingCode} صادر و جهت پرداخت به ربات بله ارجاع شد. مبلغ: ${newOrder.totalPrice.toLocaleString('fa-IR')} تومان`,
    status: 'success'
  });

  res.status(201).json(newOrder);
});

app.post('/api/orders/:id/confirm-bale-payment', (req: Request, res: Response) => {
  const param = req.params.id;
  const order: any = orders.find(o => o.id === Number(param) || o.trackingCode.toUpperCase() === param.toUpperCase());
  if (!order) return res.status(404).json({ error: 'سفارش یافت نشد' });

  order.paymentMethod = 'bale_bot';
  order.paymentStatus = 'Paid';
  order.status = 'Processing'; // در حال آماده‌سازی
  if (order.consultationDetails) {
    order.consultationDetails.consultationStatus = 'Scheduled';
  }

  const linkedMsg: any = contactMessages.find(m => m.trackingCode.toUpperCase() === order.trackingCode.toUpperCase());
  if (linkedMsg) {
    linkedMsg.paymentStatus = 'Paid';
    linkedMsg.paymentMethod = 'bale_bot';
    if (linkedMsg.consultationDetails) {
      linkedMsg.consultationDetails.consultationStatus = 'Scheduled';
    }
  }
  savePersistedState();

  botActivityLogs.unshift({
    id: Date.now(),
    time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    type: 'bale_payment_success',
    text: `پرداخت سفارش ${order.trackingCode} در ربات بله با موفقیت تایید شد. وضعیت سفارش به "در حال آماده‌سازی" تغییر یافت.`,
    status: 'success'
  });

  res.json({ success: true, order, message: 'پرداخت در ربات بله تایید شد و وضعیت به در حال آماده‌سازی تغییر کرد' });
});

app.post('/api/orders/:id/upload-receipt', (req: Request, res: Response) => {
  const param = (req.params.id || '').trim();
  const order: any = orders.find(o => o.id === Number(param) || o.trackingCode.toUpperCase() === param.toUpperCase());
  if (!order) return res.status(404).json({ error: 'فاکتور مورد نظر یافت نشد' });

  const receiptImg = req.body.receiptImageUrl || req.body.receiptImage;
  const { receiptNote } = req.body;
  if (!receiptImg) {
    return res.status(400).json({ error: 'لطفاً تصویر فیش واریزی را انتخاب نمایید' });
  }

  const timestamp = `${new Date().toLocaleDateString('fa-IR')} - ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`;
  order.receiptImageUrl = receiptImg;
  order.receiptImage = receiptImg;
  order.receiptNote = receiptNote || '';
  order.receiptSubmittedAt = timestamp;
  order.receiptUploadedAt = timestamp;
  order.paymentMethod = 'card_to_card';
  order.paymentStatus = 'PendingVerification';
  if (order.consultationDetails) {
    order.consultationDetails.consultationStatus = 'PendingVerification';
  }

  const linkedMsg: any = contactMessages.find(m => m.trackingCode.toUpperCase() === order.trackingCode.toUpperCase());
  if (linkedMsg) {
    linkedMsg.receiptImage = receiptImg;
    linkedMsg.receiptImageUrl = receiptImg;
    linkedMsg.receiptNote = receiptNote || '';
    linkedMsg.receiptUploadedAt = timestamp;
    linkedMsg.paymentMethod = 'card_to_card';
    linkedMsg.paymentStatus = 'PendingVerification';
    if (linkedMsg.consultationDetails) {
      linkedMsg.consultationDetails.consultationStatus = 'PendingVerification';
    }
  }
  savePersistedState();

  botActivityLogs.unshift({
    id: Date.now(),
    time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    type: 'receipt_uploaded',
    platform: 'bale',
    text: `فیش واریزی کارت به کارت برای فاکتور ${order.trackingCode} توسط ${order.userFullName} بارگذاری شد و منتظر تایید مدیر است.`,
    status: 'success'
  });

  if (telegramConfig.notifyOnReceiptUpload !== false) {
    const notifyText =
      `📸 فیش واریزی جدید بارگذاری شد!\n` +
      `🧾 شماره فاکتور: ${order.trackingCode}\n` +
      `👤 مشتری: ${order.userFullName} (${order.phoneNumber})\n` +
      `💰 مبلغ فاکتور: ${Number(order.totalPrice || 0).toLocaleString('fa-IR')} تومان\n` +
      `📝 توضیحات مشتری: ${receiptNote || 'ندارد'}\n` +
      `⏱ زمان ثبت: ${timestamp}\n` +
      `لطفاً جهت بررسی تصویر فیش و تایید نهایی به پنل مدیریت سفارشات مراجعه فرمایید.`;
    dispatchBotNotification(notifyText, 'receipt_uploaded').catch(() => {});
  }

  res.json({
    success: true,
    order,
    message: 'تصویر فیش واریزی به همراه شماره فاکتور با موفقیت ثبت شد و جهت تایید برای مدیریت ارسال گردید.'
  });
});

app.post('/api/orders/:id/verify-receipt', (req: Request, res: Response) => {
  const param = (req.params.id || '').trim();
  const order: any = orders.find(o => o.id === Number(param) || o.trackingCode.toUpperCase() === param.toUpperCase());
  if (!order) return res.status(404).json({ error: 'سفارش یافت نشد' });

  const { approved } = req.body;
  if (approved) {
    order.paymentStatus = 'Paid';
    if (order.status === 'Pending') {
      order.status = 'Processing';
    }
    if (order.consultationDetails) {
      order.consultationDetails.consultationStatus = 'Scheduled';
    }
    botActivityLogs.unshift({
      id: Date.now(),
      time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      type: 'receipt_approved',
      text: `فیش واریزی فاکتور ${order.trackingCode} توسط مدیر تایید شد و سفارش در وضعیت "در حال آماده‌سازی" قرار گرفت.`,
      status: 'success'
    });
  } else {
    order.paymentStatus = 'Failed';
    if (order.consultationDetails) {
      order.consultationDetails.consultationStatus = 'PendingPayment';
    }
    botActivityLogs.unshift({
      id: Date.now(),
      time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      type: 'receipt_rejected',
      text: `فیش واریزی فاکتور ${order.trackingCode} توسط مدیر رد شد (نیاز به بررسی یا ارسال مجدد).`,
      status: 'warning'
    });
  }

  const linkedMsg: any = contactMessages.find(m => m.trackingCode.toUpperCase() === order.trackingCode.toUpperCase());
  if (linkedMsg) {
    linkedMsg.paymentStatus = order.paymentStatus;
    if (linkedMsg.consultationDetails) {
      linkedMsg.consultationDetails.consultationStatus = approved ? 'Scheduled' : 'PendingPayment';
    }
  }
  savePersistedState();

  res.json({ success: true, order });
});

app.post('/api/orders/:id/confirm-gateway-payment', (req: Request, res: Response) => {
  const param = (req.params.id || '').trim();
  const order: any = orders.find(o => o.id === Number(param) || o.trackingCode.toUpperCase() === param.toUpperCase());
  if (!order) return res.status(404).json({ error: 'سفارش یافت نشد' });

  order.paymentMethod = 'online_gateway';
  order.paymentStatus = 'Paid';
  order.status = 'Processing';
  if (order.consultationDetails) {
    order.consultationDetails.consultationStatus = 'Scheduled';
  }

  const linkedMsg: any = contactMessages.find(m => m.trackingCode.toUpperCase() === order.trackingCode.toUpperCase());
  if (linkedMsg) {
    linkedMsg.paymentStatus = 'Paid';
    linkedMsg.paymentMethod = 'online_gateway';
    if (linkedMsg.consultationDetails) {
      linkedMsg.consultationDetails.consultationStatus = 'Scheduled';
    }
  }
  savePersistedState();

  botActivityLogs.unshift({
    id: Date.now(),
    time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    type: 'gateway_payment_success',
    text: `پرداخت آنلاین فاکتور ${order.trackingCode} از طریق درگاه بانکی با موفقیت انجام و تایید شد.`,
    status: 'success'
  });

  res.json({ success: true, order });
});

app.put('/api/orders/:id/status', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { status, paymentStatus, consultationStatus } = req.body;
  const order: any = orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ error: 'سفارش یافت نشد' });

  if (status) order.status = status;
  if (paymentStatus) order.paymentStatus = paymentStatus;
  if (order.consultationDetails) {
    if (consultationStatus) {
      order.consultationDetails.consultationStatus = consultationStatus;
    } else if (status === 'Completed') {
      order.consultationDetails.consultationStatus = 'Completed';
    } else if (status === 'Cancelled') {
      order.consultationDetails.consultationStatus = 'Cancelled';
    } else if (order.paymentStatus === 'Paid' && order.consultationDetails.consultationStatus === 'PendingPayment') {
      order.consultationDetails.consultationStatus = 'Scheduled';
    }
  }

  const linkedMsg: any = contactMessages.find(m => m.trackingCode.toUpperCase() === order.trackingCode.toUpperCase());
  if (linkedMsg) {
    if (paymentStatus) linkedMsg.paymentStatus = paymentStatus;
    if (linkedMsg.consultationDetails && order.consultationDetails) {
      linkedMsg.consultationDetails.consultationStatus = order.consultationDetails.consultationStatus;
    }
  }

  savePersistedState();

  const statusLabel = status === 'Pending' ? 'در انتظار پرداخت / تایید'
    : status === 'Processing' ? 'در حال آماده‌سازی و بسته‌بندی'
    : status === 'Shipped' ? 'تحویل به پست / ارسال شده'
    : status === 'Completed' ? 'تحویل داده شده به مشتری'
    : status === 'Cancelled' ? 'لغو شده' : status;

  botActivityLogs.unshift({
    id: Date.now(),
    time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    type: 'order_status_update',
    text: `مدیر فروشگاه وضعیت سفارش ${order.trackingCode} را به "${statusLabel}" تغییر داد.`,
    status: 'success'
  });

  res.json(order);
});

// Telegram & Bale Bot settings, real connection testers, webhook manager & simulator
app.get('/api/bot/config', (req: Request, res: Response) => {
  res.json({
    config: telegramConfig,
    logs: botActivityLogs.slice(0, 30)
  });
});

app.post('/api/bot/config', (req: Request, res: Response) => {
  const incoming = req.body || {};

  const resolvedBaleToken = incoming.baleBotToken ?? incoming.botToken ?? telegramConfig.botToken;
  const resolvedBaleChatId = incoming.baleAdminChatId ?? incoming.adminChatId ?? telegramConfig.adminChatId;
  const resolvedBaleUsername = (incoming.baleBotUsername ?? incoming.botUsername ?? telegramConfig.botUsername ?? 'onival_bot').replace(/^@/, '');
  const resolvedBaleBaseUrl = incoming.baleBaseUrl ?? incoming.baseUrl ?? telegramConfig.baseUrl;
  const resolvedBaleActive = incoming.active !== undefined ? Boolean(incoming.active) : (incoming.baleEnabled !== undefined ? Boolean(incoming.baleEnabled) : telegramConfig.active);

  const resolvedTgEnabled = incoming.telegramBotEnabled !== undefined
    ? Boolean(incoming.telegramBotEnabled)
    : (incoming.telegramEnabled !== undefined ? Boolean(incoming.telegramEnabled) : telegramConfig.telegramBotEnabled);
  const resolvedTgUsername = (incoming.telegramBotUsername ?? telegramConfig.telegramBotUsername ?? 'onival_shop_bot').replace(/^@/, '');

  const resolvedTgSupport = incoming.telegramSupportId ?? incoming.telegramSupportUsername ?? telegramConfig.telegramSupportId;
  const resolvedBaleSupport = incoming.baleSupportId ?? incoming.baleSupportUsername ?? telegramConfig.baleSupportId;
  const resolvedWorkingHours = incoming.workingHours ?? incoming.supportHours ?? telegramConfig.workingHours;

  telegramConfig = {
    ...telegramConfig,
    ...incoming,
    // Keep primary & explicit Bale fields 100% synced
    botToken: resolvedBaleToken,
    baleBotToken: resolvedBaleToken,
    adminChatId: resolvedBaleChatId,
    baleAdminChatId: resolvedBaleChatId,
    botUsername: resolvedBaleUsername,
    baleBotUsername: resolvedBaleUsername,
    baseUrl: resolvedBaleBaseUrl,
    baleBaseUrl: resolvedBaleBaseUrl,
    active: resolvedBaleActive,
    baleEnabled: resolvedBaleActive,

    // Keep Telegram fields 100% synced
    telegramBotEnabled: resolvedTgEnabled,
    telegramEnabled: resolvedTgEnabled,
    telegramBotUsername: resolvedTgUsername,

    // Keep Support IDs & hours synced
    telegramSupportId: resolvedTgSupport,
    telegramSupportUsername: resolvedTgSupport,
    baleSupportId: resolvedBaleSupport,
    baleSupportUsername: resolvedBaleSupport,
    workingHours: resolvedWorkingHours,
    supportHours: resolvedWorkingHours,

    antiSpamSeconds: incoming.antiSpamSeconds !== undefined ? Number(incoming.antiSpamSeconds) : telegramConfig.antiSpamSeconds,
  };

  // Sync support channels & bot IDs with siteContent so Storefront Contact Page, Footer & Payment Config stay in sync
  if (telegramConfig.supportPhone) siteContent.contactPhone = telegramConfig.supportPhone;
  if (telegramConfig.supportEmail) siteContent.contactEmail = telegramConfig.supportEmail;
  if (telegramConfig.workingHours) siteContent.contactWorkingHours = telegramConfig.workingHours;
  if (telegramConfig.telegramSupportId) siteContent.contactTelegramId = telegramConfig.telegramSupportId;
  if (telegramConfig.baleSupportId) siteContent.contactBaleId = telegramConfig.baleSupportId;
  if (telegramConfig.instagramId) siteContent.contactInstagramId = telegramConfig.instagramId;
  if (telegramConfig.whatsappNumber) siteContent.contactWhatsapp = telegramConfig.whatsappNumber;
  if (telegramConfig.eitaaSupportId) siteContent.contactEitaaId = telegramConfig.eitaaSupportId;
  if (telegramConfig.rubikaSupportId) siteContent.contactRubikaId = telegramConfig.rubikaSupportId;

  if (!siteContent.pages) siteContent.pages = {};
  if (!siteContent.pages.contact) siteContent.pages.contact = {};
  siteContent.pages.contact.phone = `تلفن پشتیبانی و سفارشات: ${telegramConfig.supportPhone}`;
  siteContent.pages.contact.baleBotId = `@${resolvedBaleUsername}`;
  siteContent.pages.contact.telegramSupportId = telegramConfig.telegramSupportId;
  siteContent.pages.contact.baleSupportId = telegramConfig.baleSupportId;

  if (siteContent.paymentConfig) {
    siteContent.paymentConfig.baleBotUsername = resolvedBaleUsername;
    siteContent.paymentConfig.baleBotButtonText = `اتصال به ربات بله و پرداخت فاکتور (@${resolvedBaleUsername})`;
  }

  botActivityLogs.unshift({
    id: Date.now(),
    time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    type: 'config_saved',
    platform: 'system',
    text: `تنظیمات توکن‌ها، آیدی‌های پشتیبانی و ربات‌های بله (@${resolvedBaleUsername}) و تلگرام (@${resolvedTgUsername}) به صورت دائمی ذخیره و در سایت اعمال شد.`,
    status: 'success'
  });

  savePersistedState();

  res.json({
    success: true,
    message: 'تمامی تنظیمات ربات‌های بله و تلگرام، توکن‌ها و آیدی‌های پشتیبانی به صورت دائمی ذخیره و در سایت اعمال شد.',
    config: telegramConfig,
    siteContent,
    logs: botActivityLogs.slice(0, 30)
  });
});

// Real live Bot API Connection Test (calls /getMe on Bale or Telegram API)
app.post('/api/bot/test-connection', async (req: Request, res: Response) => {
  const { platform = 'bale', botToken, baseUrl } = req.body || {};
  const resolvedToken = (
    botToken ||
    (platform === 'telegram' ? telegramConfig.telegramBotToken : telegramConfig.baleBotToken || telegramConfig.botToken) ||
    ''
  ).trim();

  const resolvedBaseUrl = (
    baseUrl ||
    (platform === 'telegram' ? telegramConfig.telegramBaseUrl || 'https://api.telegram.org' : telegramConfig.baleBaseUrl || telegramConfig.baseUrl || 'https://tapi.bale.ai')
  ).replace(/\/+$/, '');

  const platformName = platform === 'telegram' ? 'تلگرام (Telegram)' : 'بله (Bale)';
  const time = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (!resolvedToken) {
    return res.status(400).json({
      ok: false,
      connected: false,
      platform,
      message: `توکن ربات ${platformName} وارد نشده است. لطفاً ابتدا توکن را از @BotFather دریافت و در کادر مربوطه وارد نمایید.`
    });
  }

  const startMs = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const apiRes = await fetch(`${resolvedBaseUrl}/bot${resolvedToken}/getMe`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startMs;
    const data: any = await apiRes.json().catch(() => null);

    if (apiRes.ok && data && data.ok && data.result) {
      const botUser = data.result.username || data.result.first_name || 'Bot';
      botActivityLogs.unshift({
        id: Date.now(),
        time,
        type: 'connection_test_ok',
        platform: platform === 'telegram' ? 'telegram' : 'bale',
        text: `تست اتصال واقعی ${platformName} موفق بود: @${botUser} (پینگ: ${latencyMs}ms)`,
        status: 'success'
      });

      return res.json({
        ok: true,
        success: true,
        connected: true,
        mode: 'live_api',
        platform,
        latencyMs,
        httpStatus: apiRes.status,
        botInfo: data.result,
        message: `اتصال واقعی با سرور ${platformName} برقرار شد! نام ربات: ${data.result.first_name || ''} (@${data.result.username || ''}) - پینگ: ${latencyMs} میلی‌ثانیه`,
        logs: botActivityLogs.slice(0, 30)
      });
    } else {
      const errDesc = data?.description || `کد وضعیت HTTP ${apiRes.status} (توکن نامعتبر یا عدم تطابق با سرور ${resolvedBaseUrl})`;
      botActivityLogs.unshift({
        id: Date.now(),
        time,
        type: 'connection_test_fail',
        platform: platform === 'telegram' ? 'telegram' : 'bale',
        text: `پاسخ سرور ${platformName} در تست getMe: ${errDesc} (پینگ سرور: ${latencyMs}ms)`,
        status: 'warning'
      });

      const isTokenFormatValid = /^\d+:[A-Za-z0-9_-]{15,}$/.test(resolvedToken);

      return res.json({
        ok: true,
        success: isTokenFormatValid,
        connected: false,
        mode: 'validated_format',
        serverReachable: true,
        platform,
        latencyMs,
        httpStatus: apiRes.status,
        errorDescription: errDesc,
        message: isTokenFormatValid
          ? `ارتباط با سرور ${resolvedBaseUrl} برقرار شد (پینگ: ${latencyMs}ms). ساختار توکن معتبر است (پاسخ سرور برای این توکن: ${errDesc}).`
          : `ارتباط با سرور ${resolvedBaseUrl} برقرار شد (پینگ: ${latencyMs}ms)، اما توکن وارد شده معتبر نیست: «${errDesc}».`,
        logs: botActivityLogs.slice(0, 30)
      });
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startMs;
    const isAbort = err?.name === 'AbortError';
    const errMsg = isAbort
      ? `عدم پاسخگویی سرور ${resolvedBaseUrl} پس از ۸ ثانیه (در صورت استفاده از تلگرام روی سرور ایران، می‌توانید آدرس پروکسی/ورکر کلودفلر را در فیلد آدرس پایه قرار دهید).`
      : `خطای شبکه در اتصال به ${resolvedBaseUrl}: ${err?.message || 'Unknown error'}`;

    botActivityLogs.unshift({
      id: Date.now(),
      time,
      type: 'connection_test_error',
      platform: platform === 'telegram' ? 'telegram' : 'bale',
      text: `خطای شبکه در تست ربات ${platformName}: ${errMsg}`,
      status: 'error'
    });

    return res.json({
      ok: true,
      connected: false,
      serverReachable: false,
      platform,
      latencyMs,
      errorDescription: errMsg,
      message: errMsg,
      logs: botActivityLogs.slice(0, 30)
    });
  }
});

// Real live Message Sender (calls /sendMessage on Bale, Telegram, or Both)
const handleSendLiveBotMessage = async (req: Request, res: Response) => {
  const { platform = 'bale', chatId, text, botToken, baseUrl } = req.body || {};
  const msgText = (text || '').trim() || `🔔 پیام تست ارتباطی از پنل مدیریت فروشگاه اونیوال (ONIVAL)\n⏱ زمان ارسال: ${new Date().toLocaleString('fa-IR')}`;
  const time = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const targets: Array<{
    platform: 'bale' | 'telegram';
    name: string;
    token: string;
    chatId: string;
    baseUrl: string;
  }> = [];

  if (platform === 'bale' || platform === 'both') {
    targets.push({
      platform: 'bale',
      name: 'بله (Bale)',
      token: (botToken || telegramConfig.baleBotToken || telegramConfig.botToken || '').trim(),
      chatId: (chatId || telegramConfig.baleAdminChatId || telegramConfig.adminChatId || '').trim(),
      baseUrl: (baseUrl || telegramConfig.baleBaseUrl || telegramConfig.baseUrl || 'https://tapi.bale.ai').replace(/\/+$/, '')
    });
  }

  if (platform === 'telegram' || platform === 'both') {
    targets.push({
      platform: 'telegram',
      name: 'تلگرام (Telegram)',
      token: (botToken || telegramConfig.telegramBotToken || '').trim(),
      chatId: (chatId || telegramConfig.telegramAdminChatId || telegramConfig.adminChatId || '').trim(),
      baseUrl: (baseUrl || telegramConfig.telegramBaseUrl || 'https://api.telegram.org').replace(/\/+$/, '')
    });
  }

  const results: any[] = [];

  for (const t of targets) {
    if (!t.token || !t.chatId) {
      results.push({
        platform: t.platform,
        delivered: false,
        simulated: true,
        message: `توکن یا شناسه چت برای ${t.name} کامل نیست (در لاگ محلی ثبت شد).`
      });
      botActivityLogs.unshift({
        id: Date.now() + Math.random(),
        time,
        type: 'send_message_simulated',
        platform: t.platform,
        text: `[ثبت در صف / شبیه‌سازی ${t.name}] ارسال پیام به ${t.chatId || 'ادمین'}: "${msgText.slice(0, 60)}..."`,
        status: 'warning'
      });
      continue;
    }

    const startMs = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const apiRes = await fetch(`${t.baseUrl}/bot${t.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: t.chatId,
          text: msgText
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startMs;
      const data: any = await apiRes.json().catch(() => null);

      if (apiRes.ok && data && data.ok) {
        results.push({
          platform: t.platform,
          delivered: true,
          latencyMs,
          messageId: data.result?.message_id,
          message: `پیام واقعاً از طریق سرور ${t.name} به چت ${t.chatId} تحویل داده شد (Message ID: ${data.result?.message_id || 'OK'} - ${latencyMs}ms).`
        });
        botActivityLogs.unshift({
          id: Date.now() + Math.random(),
          time,
          type: 'send_message_real_ok',
          platform: t.platform,
          text: `ارسال واقعی موفق در ${t.name} به چت ${t.chatId} (پینگ: ${latencyMs}ms)`,
          status: 'success'
        });
      } else {
        const desc = data?.description || `HTTP ${apiRes.status}`;
        results.push({
          platform: t.platform,
          delivered: false,
          latencyMs,
          errorDescription: desc,
          message: `پاسخ سرور ${t.name}: «${desc}» (رویداد در لاگ سامانه نیز ثبت گردید).`
        });
        botActivityLogs.unshift({
          id: Date.now() + Math.random(),
          time,
          type: 'send_message_api_response',
          platform: t.platform,
          text: `تلاش ارسال به ${t.name} (چت ${t.chatId}): پاسخ سرور «${desc}»`,
          status: 'warning'
        });
      }
    } catch (err: any) {
      const latencyMs = Date.now() - startMs;
      const errMsg = err?.name === 'AbortError' ? 'Timeout (۸ ثانیه)' : (err?.message || 'خطای شبکه');
      results.push({
        platform: t.platform,
        delivered: false,
        latencyMs,
        errorDescription: errMsg,
        message: `عدم دسترسی مستقیم به سرور ${t.name} (${errMsg}) - پیام در لاگ داخلی ثبت شد.`
      });
      botActivityLogs.unshift({
        id: Date.now() + Math.random(),
        time,
        type: 'send_message_network_err',
        platform: t.platform,
        text: `خطای شبکه در ارسال به ${t.name}: ${errMsg}`,
        status: 'error'
      });
    }
  }

  savePersistedState();
  const firstMsg = results[0]?.message || 'پیام تست پردازش شد.';
  return res.json({
    ok: true,
    success: true,
    results,
    message: results.map(r => r.message).join(' | ') || firstMsg,
    summary: results.map(r => r.message).join(' | '),
    logs: botActivityLogs.slice(0, 30)
  });
};

app.post('/api/bot/send-real-message', handleSendLiveBotMessage);
app.post('/api/bot/send-test-message', handleSendLiveBotMessage);

// Real Webhook Management (setWebhook / deleteWebhook / getWebhookInfo)
app.post('/api/bot/webhook-action', async (req: Request, res: Response) => {
  const { platform = 'bale', action = 'info', webhookUrl, botToken, baseUrl } = req.body || {};
  const resolvedToken = (
    botToken ||
    (platform === 'telegram' ? telegramConfig.telegramBotToken : telegramConfig.baleBotToken || telegramConfig.botToken) ||
    ''
  ).trim();
  const resolvedBaseUrl = (
    baseUrl ||
    (platform === 'telegram' ? telegramConfig.telegramBaseUrl || 'https://api.telegram.org' : telegramConfig.baleBaseUrl || telegramConfig.baseUrl || 'https://tapi.bale.ai')
  ).replace(/\/+$/, '');
  const platformName = platform === 'telegram' ? 'تلگرام' : 'بله';
  const time = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (!resolvedToken) {
    return res.status(400).json({
      ok: false,
      message: `توکن ربات ${platformName} وارد نشده است.`
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let endpoint = 'getWebhookInfo';
    let fetchOptions: any = { method: 'GET', signal: controller.signal };

    if (action === 'set') {
      endpoint = 'setWebhook';
      const targetUrl = (webhookUrl || `${telegramConfig.panelBaseUrl}/api/bot/webhook/${platform}`).trim();
      if (platform === 'telegram') {
        telegramConfig.telegramWebhookUrl = targetUrl;
      } else {
        telegramConfig.baleWebhookUrl = targetUrl;
      }
      fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
        signal: controller.signal
      };
    } else if (action === 'delete') {
      endpoint = 'deleteWebhook';
      fetchOptions = { method: 'POST', signal: controller.signal };
    }

    const apiRes = await fetch(`${resolvedBaseUrl}/bot${resolvedToken}/${endpoint}`, fetchOptions);
    clearTimeout(timeoutId);
    const data: any = await apiRes.json().catch(() => null);

    const statusMsg = data?.ok
      ? `عملیات ${endpoint} روی ربات ${platformName} با موفقیت انجام شد.`
      : `پاسخ سرور ${platformName} برای ${endpoint}: ${data?.description || `HTTP ${apiRes.status}`}`;

    botActivityLogs.unshift({
      id: Date.now(),
      time,
      type: `webhook_${action}`,
      platform: platform === 'telegram' ? 'telegram' : 'bale',
      text: statusMsg,
      status: data?.ok ? 'success' : 'warning'
    });
    savePersistedState();

    return res.json({
      ok: Boolean(data?.ok),
      success: true,
      apiData: data,
      message: statusMsg,
      logs: botActivityLogs.slice(0, 30)
    });
  } catch (err: any) {
    const msg = `خطا در ارتباط با وب‌هوک ${platformName}: ${err?.message || 'خطای شبکه'}`;
    botActivityLogs.unshift({
      id: Date.now(),
      time,
      type: `webhook_error`,
      platform: platform === 'telegram' ? 'telegram' : 'bale',
      text: msg,
      status: 'error'
    });
    return res.json({
      ok: false,
      message: msg,
      logs: botActivityLogs.slice(0, 30)
    });
  }
});

app.delete('/api/bot/logs', (req: Request, res: Response) => {
  botActivityLogs = [
    {
      id: Date.now(),
      time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      type: 'logs_cleared',
      platform: 'system',
      text: 'تاریخچه لاگ‌های مخابراتی توسط مدیر پاکسازی شد.',
      status: 'success'
    }
  ];
  res.json({ ok: true, logs: botActivityLogs });
});

app.post('/api/bot/simulate-event', async (req: Request, res: Response) => {
  const { type, payload } = req.body;
  const time = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  if (type === 'test_notification') {
    const testText = payload || `🔔 تست ارتباط پنل مدیریت اونیوال با ربات‌های پشتیبانی (${time})`;
    const dispatchRes = await dispatchBotNotification(testText, 'test_notification');

    botActivityLogs.unshift({
      id: Date.now(),
      time,
      type: 'test_notification',
      platform: 'bale',
      text: `پیام تستی به شناسه ادمین (${telegramConfig.adminChatId}) ارسال شد: ${testText}`,
      status: 'success'
    });
    return res.json({
      success: true,
      dispatchResults: dispatchRes.results,
      message: 'پیام تستی پردازش و به درگاه ربات‌های فعال ارسال گردید.',
      logs: botActivityLogs.slice(0, 30)
    });
  }

  if (type === 'incoming_support_ticket') {
    const trackingCode = `ONV-${Math.floor(1000 + Math.random() * 9000)}`;
    const senderPlatform = payload?.platform === 'telegram' ? 'تلگرام' : 'بله';
    const newMsg = {
      id: contactMessages.length > 0 ? Math.max(...contactMessages.map(m => m.id)) + 1 : 1,
      fullName: payload?.fullName || `کاربر پشتیبانی ${senderPlatform}`,
      phoneNumber: payload?.phoneNumber || '09123456789',
      trackingCode,
      message: payload?.message || `[دریافتی از ربات ${senderPlatform}] سلام، می‌خواستم درباره نحوه ارسال عسل کوهستان و زمان تحویل در تهران سوال کنم.`,
      adminResponse: undefined,
      isRead: false,
      isResponded: false,
      creationTime: `${new Date().toLocaleDateString('fa-IR')} - ${time}`
    };
    contactMessages.unshift(newMsg);

    botActivityLogs.unshift({
      id: Date.now(),
      time,
      type: 'incoming_support_ticket',
      platform: payload?.platform === 'telegram' ? 'telegram' : 'bale',
      text: `تیکت پشتیبانی جدید از ربات ${senderPlatform} ثبت شد (کد رهگیری: ${trackingCode})`,
      status: 'success'
    });

    if (telegramConfig.notifyOnNewTicket !== false) {
      await dispatchBotNotification(
        `📩 تیکت پشتیبانی جدید (${senderPlatform})\nکد رهگیری: ${trackingCode}\nفرستنده: ${newMsg.fullName}\nمتن: ${newMsg.message}`,
        'incoming_support_ticket'
      );
    }

    return res.json({
      success: true,
      ticket: newMsg,
      message: `تیکت پشتیبانی جدید با کد رهگیری ${trackingCode} ثبت و در بخش پیام‌های پشتیبانی قرار گرفت.`,
      logs: botActivityLogs.slice(0, 30)
    });
  }

  if (type === 'incoming_order') {
    const newOrderId = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 101;
    const trackingCode = `ONV-ORD-${newOrderId}`;
    const newOrder: any = {
      id: newOrderId,
      userFullName: payload?.fullName || 'کاربر ربات هوشمند اونیوال',
      phoneNumber: payload?.phone || '09121112233',
      userAddress: payload?.address || 'تهران، میدان ونک، سفارش ثبت شده از طریق ربات',
      totalPrice: 350000,
      status: 'Processing' as const,
      paymentStatus: 'Paid' as const,
      paymentMethod: 'bale_bot' as const,
      trackingCode,
      creationTime: new Date().toLocaleDateString('fa-IR'),
      balePaymentUrl: `https://ble.ir/${telegramConfig.baleBotUsername || 'onival_bot'}?start=pay_${trackingCode}`,
      items: [
        {
          id: 1,
          productId: 1,
          productName: 'عسل کوهستان اونیوال',
          size: '۱ کیلوگرم',
          quantity: 1,
          unitPrice: 350000,
          totalPrice: 350000
        }
      ]
    };
    orders.unshift(newOrder);

    botActivityLogs.unshift({
      id: Date.now(),
      time,
      type: 'notify_new_order',
      platform: 'bale',
      text: `سفارش جدید ${trackingCode} از طریق ربات ثبت شد و نوتیفیکیشن به ادمین (${telegramConfig.adminChatId}) ارسال گردید.`,
      status: 'success'
    });

    if (telegramConfig.notifyOnNewOrder !== false) {
      await dispatchBotNotification(
        `🛒 سفارش جدید از ربات ثبت شد!\nکد فاکتور: ${trackingCode}\nمشتری: ${newOrder.userFullName}\nمبلغ: ۳۵۰,۰۰۰ تومان`,
        'incoming_order'
      );
    }

    return res.json({
      success: true,
      order: newOrder,
      message: `سفارش جدید با کد ${trackingCode} ثبت شد و به لیست سفارشات اضافه گردید.`,
      logs: botActivityLogs.slice(0, 30)
    });
  }

  res.status(400).json({ error: 'رویداد نامعتبر است' });
});

// Admin Account & Authentication
app.get('/api/account/profile', (req: Request, res: Response) => {
  res.json({
    username: adminCredentials.username || 'admin',
    email: adminCredentials.email || 'admin@onival.com',
    name: adminCredentials.name || 'مدیریت اونیوال (ONIVAL Admin)',
    siteLogo: siteContent.siteLogo || '',
    siteLogoFit: siteContent.siteLogoFit || 'cover',
    siteLogoShape: siteContent.siteLogoShape || 'rounded',
    siteLogoScale: siteContent.siteLogoScale || 100
  });
});

app.post('/api/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body || {};
  const inputUser = (username || '').trim().toLowerCase();
  const inputPass = (password || '').trim();

  const validUser = (adminCredentials.username || 'admin').trim().toLowerCase();
  const validEmail = (adminCredentials.email || 'admin@onival.com').trim().toLowerCase();
  const validPass = (adminCredentials.password || 'admin').trim();

  const isUserMatch = inputUser === validUser || inputUser === validEmail;
  const isPassMatch = inputPass === validPass;

  if (!inputUser || !inputPass) {
    return res.status(400).json({
      ok: false,
      error: 'لطفاً نام کاربری و رمز عبور مدیریت را به صورت کامل وارد نمایید.'
    });
  }

  if (isUserMatch && isPassMatch) {
    return res.json({
      ok: true,
      success: true,
      profile: {
        username: adminCredentials.username,
        email: adminCredentials.email,
        name: adminCredentials.name
      },
      message: 'ورود به پنل مدیریت با موفقیت انجام شد.'
    });
  }

  return res.status(401).json({
    ok: false,
    error: 'نام کاربری یا رمز عبور مدیریت اشتباه است.'
  });
});

app.post('/api/account/change-credentials', (req: Request, res: Response) => {
  const { username, currentPassword, newPassword, email, name, siteLogo, siteLogoFit, siteLogoShape, siteLogoScale } = req.body || {};

  // Verify currentPassword if password or username is being changed and currentPassword was provided
  if (newPassword || username) {
    const validPass = (adminCredentials.password || 'admin').trim();
    if (currentPassword !== undefined && currentPassword.trim() !== '' && currentPassword.trim() !== validPass) {
      return res.status(400).json({ error: 'رمز عبور فعلی وارد شده صحیح نمی‌باشد.' });
    }
  }

  if (newPassword !== undefined && newPassword.trim() !== '') {
    if (newPassword.trim().length < 4) {
      return res.status(400).json({ error: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد.' });
    }
    adminCredentials.password = newPassword.trim();
  }

  if (username && username.trim()) {
    adminCredentials.username = username.trim();
  }
  if (email && email.trim()) {
    adminCredentials.email = email.trim();
  }
  if (name && name.trim()) {
    adminCredentials.name = name.trim();
  }
  if (siteLogo !== undefined) {
    siteContent.siteLogo = siteLogo;
  }
  if (siteLogoFit !== undefined) {
    siteContent.siteLogoFit = siteLogoFit;
  }
  if (siteLogoShape !== undefined) {
    siteContent.siteLogoShape = siteLogoShape;
  }
  if (siteLogoScale !== undefined) {
    siteContent.siteLogoScale = Number(siteLogoScale) || 100;
  }

  savePersistedState();

  res.json({
    ok: true,
    success: true,
    profile: {
      username: adminCredentials.username,
      email: adminCredentials.email,
      name: adminCredentials.name,
      siteLogo: siteContent.siteLogo || '',
      siteLogoFit: siteContent.siteLogoFit || 'cover',
      siteLogoShape: siteContent.siteLogoShape || 'rounded',
      siteLogoScale: siteContent.siteLogoScale || 100
    },
    siteContent,
    message: 'تنظیمات امنیتی، نام کاربری، رمز عبور و لوگوی سایت با موفقیت ذخیره شد.'
  });
});

// ================= SITE CONTENT & LAYOUT CUSTOMIZER =================
app.get('/api/site-content', (req: Request, res: Response) => {
  res.json(siteContent);
});

app.put('/api/site-content', (req: Request, res: Response) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ error: 'داده‌های ارسالی نامعتبر است' });
  }

  // Deep merge / update
  siteContent = {
    ...siteContent,
    ...incoming,
    navLabels: {
      ...siteContent.navLabels,
      ...(incoming.navLabels || {})
    },
    homeSections: Array.isArray(incoming.homeSections) && incoming.homeSections.length > 0
      ? incoming.homeSections
      : siteContent.homeSections,
    consultationTopics: Array.isArray(incoming.consultationTopics)
      ? incoming.consultationTopics
      : siteContent.consultationTopics,
    paymentConfig: {
      ...siteContent.paymentConfig,
      ...(incoming.paymentConfig || {})
    },
    consultationConfig: {
      ...siteContent.consultationConfig,
      ...(incoming.consultationConfig || {}),
      topics: Array.isArray(incoming.consultationConfig?.topics)
        ? incoming.consultationConfig.topics
        : siteContent.consultationConfig?.topics,
      socialPlatforms: Array.isArray(incoming.consultationConfig?.socialPlatforms)
        ? incoming.consultationConfig.socialPlatforms
        : siteContent.consultationConfig?.socialPlatforms,
      timeSlots: Array.isArray(incoming.consultationConfig?.timeSlots)
        ? incoming.consultationConfig.timeSlots
        : siteContent.consultationConfig?.timeSlots
    }
  };

  if (Array.isArray(siteContent.consultationConfig?.topics) && siteContent.consultationConfig.topics.length > 0) {
    siteContent.consultationTopics = siteContent.consultationConfig.topics
      .filter((t: any) => t.enabled !== false)
      .map((t: any) => t.title);
  }

  botActivityLogs.unshift({
    id: Date.now(),
    time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    type: 'content_updated',
    text: `تنظیمات محتوا، تیترها و چیدمان صفحات فروشگاه توسط مدیر به‌روزرسانی شد.`,
    status: 'success'
  });

  savePersistedState();

  res.json({ success: true, siteContent, message: 'تنظیمات و متون جدید صفحات با موفقیت ذخیره و در تمام بخش‌ها اعمال گردید.' });
});

app.post('/api/site-content/reset', (req: Request, res: Response) => {
  siteContent = JSON.parse(JSON.stringify(defaultSiteContent));
  savePersistedState();
  botActivityLogs.unshift({
    id: Date.now(),
    time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    type: 'content_reset',
    text: `محتوای صفحات و چیدمان به مقادیر پیش‌فرض کارخانه بازنشانی شد.`,
    status: 'warning'
  });

  res.json({ success: true, siteContent, message: 'محتوا و چیدمان صفحات به حالت پیش‌فرض بازگردانی شد.' });
});

// ================= VITE / SPA SERVER SETUP =================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Onival Web & Admin Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
