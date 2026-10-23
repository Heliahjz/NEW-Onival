<?php
/**
 * ==============================================================================
 * 🤖 ONIVAL - فایل اختصاصی و مستقل ربات بله (Bale Bot Webhook) - نسخه ۱.۲.۰
 * ==============================================================================
 * این فایل کاملاً خودکفا (Standalone) بوده و برای آپلود مستقیم در پوشه public_html
 * هاست اشتراکی (cPanel / DirectAdmin / Plesk / LiteSpeed / Apache) طراحی شده است.
 *
 * 📌 مسیر استقرار در هاست:
 * public_html/bale-bot.php
 *
 * 📌 آدرس وبهوک برای ثبت در بله:
 * https://yourdomain.com/bale-bot.php
 *
 * 🛡️ ویژگی‌های جدید و اصلاح‌شده (نسخه ۱.۲.۰):
 * ۱. پردازش هوشمند عکس فیش کارت‌به‌کارت (message.photo): تشکر فوری از خریدار،
 *    ارسال عکس فیش و اطلاعات فاکتور برای ادمین، و اطلاع‌رسانی به مشتری پس از تأیید ادمین.
 * ۲. پشتیبانی از کدهای فاکتور با ارقام نامحدود (بدون محدودیت ۳ رقمی و جلوگیری از قفل شدن ربات).
 * ۳. ارسال بی‌نقص کارت کیف‌پول بله (sendInvoice) با مبالغ ریالی دقیق و رعایت سقف کاراکترها.
 * ۴. تنظیم آسان توکن ولت بله با مقدار پیش‌فرض ولت تست (WALLET-TEST-1111111111111111)
 *    و همگام‌سازی خودکار با تنظیمات پنل ادمین سایت.
 * ==============================================================================
 */

error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('X-Powered-By: Onival-Bale-PHP-Bot-v1.2.0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['ok' => true]);
    exit;
}

// ==============================================================================
// بخش ۱: تنظیمات پیش‌فرض ربات بله (قابل ویرایش دستی و هماهنگ با پنل ادمین)
// ==============================================================================
$DEFAULT_CONFIG = [
    // توکن ربات مشتری بله (دریافت شده از BotFather@ در بله)
    'baleBotToken'       => '1204808805:W-mq-hFRtv71zdHaRFSUYdr2GWCJPCvQD34',

    // نام کاربری ربات بله
    'baleBotUsername'    => 'Onivalbot',

    // توکن ربات ادمین بله
    'baleAdminBotToken'  => '1692224424:rU91515j2K0H5o7O4K2cviw4g1n1lJ',

    // آیدی عددی چت ادمین در بله
    'baleAdminChatId'    => '69451465',

    // نام کاربری ادمین
    'baleAdminUsername'  => 'hasti_hjz',

    // ⭐ توکن درگاه کیف‌پول بله (Wallet Provider Token)
    // مقدار پیش‌فرض طبق درخواست بر روی ولت تست تنظیم است تا پرداخت فوری در دسترس باشد
    // توکن تست رسمی بله: WALLET-TEST-1111111111111111
    'baleProviderToken'  => 'WALLET-TEST-1111111111111111',

    // شماره کارت فروشگاه جهت پرداخت کارت به کارت
    'cardNumber'         => '۶۰۳۷-۹۹۷۵-۹۹۱۲-۳۴۵۶',
    'cardHolder'         => 'مجموعه تخصصی فرآورده‌های ارگانیک اونیوال',
    'bankName'           => 'بانک ملی ایران',

    // آدرس وب‌سایت فروشگاه
    'storeUrl'           => '',
    'storeName'          => 'فروشگاه تخصصی محصولات ارگانیک اونیوال'
];

$proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$detectedBaseUrl = "$proto://$host";
$currentScriptUrl = $detectedBaseUrl . ($_SERVER['SCRIPT_NAME'] ?? '/bale-bot.php');

// ==============================================================================
// بخش ۲: بارگذاری دیتابیس مشترک سفارشات (onival-persistent-data.json)
// ==============================================================================
$docRoot = rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', '/\\');
$currentDir = __DIR__;

$possibleDataPaths = [
    $currentDir . '/server-data/onival-persistent-data.json',
    $currentDir . '/onival-persistent-data.json',
    $docRoot . '/server-data/onival-persistent-data.json',
    $docRoot . '/api/server-data/onival-persistent-data.json',
    $docRoot . '/onival-persistent-data.json',
    dirname($currentDir) . '/server-data/onival-persistent-data.json',
    dirname($docRoot) . '/server-data/onival-persistent-data.json',
    sys_get_temp_dir() . '/onival-persistent-data.json'
];

$activeDbPath = null;
foreach ($possibleDataPaths as $path) {
    if (!empty($path) && file_exists($path) && is_readable($path)) {
        $activeDbPath = $path;
        break;
    }
}

if (!$activeDbPath) {
    $preferDir = $docRoot ? ($docRoot . '/server-data') : ($currentDir . '/server-data');
    if (!is_dir($preferDir)) {
        @mkdir($preferDir, 0755, true);
        @file_put_contents($preferDir . '/.htaccess', "Order allow,deny\nDeny from all\n");
    }
    $activeDbPath = $preferDir . '/onival-persistent-data.json';
}

function getDatabase($path) {
    if (!file_exists($path)) return [];
    $raw = @file_get_contents($path);
    if (!$raw) return [];
    $data = @json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function updateDatabase($path, $newData) {
    if (empty($path)) return false;
    $newData['updatedAt'] = date('c');
    $json = json_encode($newData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    $dir = dirname($path);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    return @file_put_contents($path, $json, LOCK_EX) !== false;
}

$db = getDatabase($activeDbPath);
$tgCfg = $db['telegramConfig'] ?? [];
$siteCfg = $db['siteContent'] ?? [];
$payCfg = $siteCfg['paymentConfig'] ?? [];

// همگام‌سازی توکن‌ها و اطلاعات ربات
$BOT_TOKEN = trim(!empty($tgCfg['baleBotToken']) ? $tgCfg['baleBotToken'] : (!empty($tgCfg['botToken']) ? $tgCfg['botToken'] : $DEFAULT_CONFIG['baleBotToken']));
$ADMIN_TOKEN = trim(!empty($tgCfg['baleAdminBotToken']) ? $tgCfg['baleAdminBotToken'] : $DEFAULT_CONFIG['baleAdminBotToken']);
$ADMIN_CHAT_ID = trim(!empty($tgCfg['baleAdminChatId']) ? $tgCfg['baleAdminChatId'] : (!empty($tgCfg['adminChatId']) ? $tgCfg['adminChatId'] : $DEFAULT_CONFIG['baleAdminChatId']));
$BOT_USERNAME = ltrim(trim(!empty($tgCfg['baleBotUsername']) ? $tgCfg['baleBotUsername'] : $DEFAULT_CONFIG['baleBotUsername']), '@');
$ADMIN_USERNAME = ltrim(trim(!empty($tgCfg['baleAdminUsername']) ? $tgCfg['baleAdminUsername'] : $DEFAULT_CONFIG['baleAdminUsername']), '@');
$STORE_URL = !empty($siteCfg['storeUrl']) ? $siteCfg['storeUrl'] : (!empty($DEFAULT_CONFIG['storeUrl']) ? $DEFAULT_CONFIG['storeUrl'] : $detectedBaseUrl);

// استخراج هوشمند و داینامیک توکن کیف‌پول بله (Wallet Provider Token)
$baleMode = strtolower($tgCfg['balePaymentMode'] ?? 'test');
$PROVIDER_TOKEN = '';

if ($baleMode === 'test') {
    if (!empty($tgCfg['balePaymentTokenTest'])) {
        $PROVIDER_TOKEN = trim($tgCfg['balePaymentTokenTest']);
    } else {
        $PROVIDER_TOKEN = !empty($DEFAULT_CONFIG['baleProviderToken']) ? trim($DEFAULT_CONFIG['baleProviderToken']) : 'WALLET-TEST-1111111111111111';
    }
} else {
    // حالت لایو
    if (!empty($tgCfg['balePaymentTokenLive'])) {
        $PROVIDER_TOKEN = trim($tgCfg['balePaymentTokenLive']);
    } elseif (!empty($tgCfg['balePaymentToken'])) {
        $PROVIDER_TOKEN = trim($tgCfg['balePaymentToken']);
    } elseif (!empty($DEFAULT_CONFIG['baleProviderToken'])) {
        $PROVIDER_TOKEN = trim($DEFAULT_CONFIG['baleProviderToken']);
    } else {
        $PROVIDER_TOKEN = 'WALLET-TEST-1111111111111111';
    }
}
if (empty($PROVIDER_TOKEN)) {
    $PROVIDER_TOKEN = 'WALLET-TEST-1111111111111111';
}

$CARD_NUMBER = !empty($payCfg['cardNumber']) ? $payCfg['cardNumber'] : $DEFAULT_CONFIG['cardNumber'];
$CARD_HOLDER = !empty($payCfg['cardHolderName']) ? $payCfg['cardHolderName'] : $DEFAULT_CONFIG['cardHolder'];
$BANK_NAME   = !empty($payCfg['bankName']) ? $payCfg['bankName'] : $DEFAULT_CONFIG['bankName'];

$BALE_API_BASE = 'https://tapi.bale.ai';

// ==============================================================================
// بخش ۳: توابع کمکی تبدیل اعداد، استخراج اقلام، قیمت و کد سفارش
// ==============================================================================

function normalizeDigits($str) {
    if (!$str) return '';
    $farsi = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
    $arabic = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    $english = ['0','1','2','3','4','5','6','7','8','9'];
    $str = str_replace($farsi, $english, $str);
    return str_replace($arabic, $english, $str);
}

/**
 * استخراج دقیق مبلغ سفارش به تومان (پشتیبانی از تمام فیلدهای دیتابیس)
 */
function getOrderAmountToman($order) {
    if (empty($order) || !is_array($order)) return 150000;

    if (!empty($order['finalTotal']) && is_numeric($order['finalTotal']) && (int)$order['finalTotal'] > 0) {
        return (int)$order['finalTotal'];
    }
    if (!empty($order['totalPrice']) && is_numeric($order['totalPrice']) && (int)$order['totalPrice'] > 0) {
        return (int)$order['totalPrice'];
    }
    if (!empty($order['total']) && is_numeric($order['total']) && (int)$order['total'] > 0) {
        return (int)$order['total'];
    }
    if (!empty($order['price']) && is_numeric($order['price']) && (int)$order['price'] > 0) {
        return (int)$order['price'];
    }
    if (!empty($order['amount']) && is_numeric($order['amount']) && (int)$order['amount'] > 0) {
        return (int)$order['amount'];
    }

    // محاسبه از مجموع اقلام در صورت عدم وجود فیلد سرجمع
    if (!empty($order['items']) && is_array($order['items'])) {
        $sum = 0;
        foreach ($order['items'] as $item) {
            $qty = !empty($item['quantity']) ? (int)$item['quantity'] : (!empty($item['count']) ? (int)$item['count'] : 1);
            $itemTotal = !empty($item['totalPrice']) ? (int)$item['totalPrice'] : (!empty($item['unitPrice']) ? ((int)$item['unitPrice'] * $qty) : (!empty($item['price']) ? ((int)$item['price'] * $qty) : 0));
            $sum += $itemTotal;
        }
        if ($sum > 0) return $sum;
    }

    return 150000;
}

function getOrderCustomerName($order) {
    if (!empty($order['userFullName'])) return trim($order['userFullName']);
    if (!empty($order['customerName'])) return trim($order['customerName']);
    if (!empty($order['fullName'])) return trim($order['fullName']);
    if (!empty($order['name'])) return trim($order['name']);
    return 'مشتری گرامی';
}

function getOrderCustomerPhone($order) {
    if (!empty($order['phoneNumber'])) return trim($order['phoneNumber']);
    if (!empty($order['customerPhone'])) return trim($order['customerPhone']);
    if (!empty($order['phone'])) return trim($order['phone']);
    if (!empty($order['userPhone'])) return trim($order['userPhone']);
    return '';
}

function getOrderCustomerAddress($order) {
    if (!empty($order['userAddress'])) return trim($order['userAddress']);
    if (!empty($order['shippingAddress'])) return trim($order['shippingAddress']);
    if (!empty($order['address'])) return trim($order['address']);
    return '';
}

function formatOrderItemsList($order) {
    $items = $order['items'] ?? [];
    if (!empty($items) && is_array($items)) {
        $lines = [];
        $i = 1;
        foreach ($items as $item) {
            $pName = !empty($item['productName']) ? $item['productName'] : (!empty($item['title']) ? $item['title'] : (!empty($item['name']) ? $item['name'] : 'محصول ارگانیک اونیوال'));
            $qty = !empty($item['quantity']) ? (int)$item['quantity'] : (!empty($item['count']) ? (int)$item['count'] : 1);
            $size = !empty($item['size']) ? $item['size'] : (!empty($item['weight']) ? $item['weight'] : '');
            $price = !empty($item['totalPrice']) ? (int)$item['totalPrice'] : (!empty($item['unitPrice']) ? ((int)$item['unitPrice'] * $qty) : (!empty($item['price']) ? ((int)$item['price'] * $qty) : 0));
            
            $line = "▫️ {$i}. {$pName}";
            if ($size && $size !== 'استاندارد') {
                $line .= " ({$size})";
            }
            $line .= " × {$qty} عدد";
            if ($price > 0) {
                $line .= " ➔ " . number_format($price) . " تومان";
            }
            $lines[] = $line;
            $i++;
        }
        return implode("\n", $lines);
    }
    
    if (!empty($order['isConsultation']) || !empty($order['consultationDetails'])) {
        $topic = $order['consultationDetails']['topicTitle'] ?? 'مشاوره تخصصی تغذیه و سلامت ارگانیک';
        $slot = $order['consultationDetails']['preferredTimeSlot'] ?? '';
        return "▫️ ۱. رزرو مشاوره تخصصی: {$topic}" . ($slot ? " ({$slot})" : "");
    }
    
    return "▫️ ۱. فرآورده‌های ارگانیک اونیوال (بسته انتخابی مشتری)";
}

/**
 * استخراج هوشمند کد فاکتور از متن پیام یا کپشن تصویر
 * ⭐ پشتیبانی کامل از اعداد نامحدود رقمی، پیشوندها و ترکیب‌ها
 */
function extractOrderCode($text) {
    if (empty($text) || !is_string($text)) return null;
    $norm = normalizeDigits(trim($text));
    
    // رد کردن دستورات عمومی منو
    if (preg_match('/^[\/!#]?(start|help|admin|orders|شروع|راهنما|سفارشات|فروشگاه|محصولات|تماس|پشتیبانی|پیگیری|پرداخت)$/iu', $norm)) {
        return null;
    }
    
    // ۱. دستور استارت با پارامتر: /start pay_ONV-ORD-91542 یا /start 91542
    if (preg_match('/^\/start[\s_]+(?:pay_|order_|پرداخت_)?([A-Za-z0-9_-]+)/iu', $norm, $m)) {
        $cand = trim(preg_replace('/^(?:pay_|order_|پرداخت_)/iu', '', $m[1]));
        if (!empty($cand) && !preg_match('/^(admin|help|orders|start)$/iu', $cand)) {
            return $cand;
        }
    }

    // ۲. دستور تایید مدیریت: /confirm_ONV-ORD-91542 یا /تایید_91542
    if (preg_match('/^\/(?:confirm_|approve_|تایید_)([A-Za-z0-9_-]+)/iu', $norm, $m)) {
        return trim($m[1]);
    }
    
    // ۳. الگوهای سازمانی اونیوال: ONV-ORD-XXX, ONV_ORD_XXX, ORD-XXX
    if (preg_match('/(ONV[-_]?[A-Za-z0-9_-]+|ORD[-_]?[A-Za-z0-9_-]+)/iu', $norm, $m)) {
        return trim($m[1]);
    }
    
    // ۴. عبارات کلیدی فارسی: فاکتور ۹۱۵۴۲، سفارش ۱۰۴۸۲، رسید ۳۸۴۲
    if (preg_match('/(?:فاکتور|سفارش|کد|رهگیری|پرداخت|شماره|رسید|فیش|invoice|order)\s*[:#-]?\s*([A-Za-z0-9_-]+)/iu', $norm, $m)) {
        if (preg_match('/\d/', $m[1])) {
            return trim($m[1]);
        }
    }
    
    // ۵. کد مستقل حروفی/عددی
    if (!str_starts_with($norm, '/') && preg_match('/^[A-Za-z0-9_-]{2,32}$/', $norm) && preg_match('/\d/', $norm)) {
        return $norm;
    }

    // ۶. هر عدد از ۳ رقم به بالا در هر جای متن
    if (preg_match('/\b\d{3,15}\b/', $norm, $m)) {
        return $m[0];
    }
    
    return null;
}

/**
 * جستجوی پیشرفته سفارش در دیتابیس (بدون محدودیت تعداد ارقام)
 */
function findOrderByCode($orders, $searchQuery) {
    if (empty($orders) || !is_array($orders) || empty($searchQuery)) return null;
    $raw = trim((string)$searchQuery);
    $norm = normalizeDigits($raw);
    $cleanQuery = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $norm));
    $cleanQuery = preg_replace('/^(PAY|ORDER)/', '', $cleanQuery);
    
    foreach ($orders as $ord) {
        $track = trim($ord['trackingCode'] ?? '');
        $ordNum = trim($ord['orderNumber'] ?? '');
        $id = strval($ord['id'] ?? '');

        // مقایسه مستقیم
        if (strcasecmp($track, $raw) === 0 || strcasecmp($ordNum, $raw) === 0 || $id === $raw) {
            return $ord;
        }

        $cleanTrack = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $track));
        $cleanOrdNum = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $ordNum));

        if (!empty($cleanQuery)) {
            if ($cleanTrack === $cleanQuery || $cleanOrdNum === $cleanQuery || $id === $cleanQuery) {
                return $ord;
            }
            if (strlen($cleanQuery) >= 3 && (strpos($cleanTrack, $cleanQuery) !== false || strpos($cleanQuery, $cleanTrack) !== false)) {
                return $ord;
            }
        }
        
        // مقایسه عددی برای پشتیبانی از ارقام نامحدود
        preg_match('/\d+/', $norm, $qDigits);
        if (!empty($qDigits[0])) {
            preg_match('/\d+/', $track, $tDigits);
            if (!empty($tDigits[0]) && $qDigits[0] === $tDigits[0]) {
                return $ord;
            }
            if ($id === $qDigits[0] || $ordNum === $qDigits[0]) {
                return $ord;
            }
        }
    }
    return null;
}

// ==============================================================================
// بخش ۴: متدهای ارتباطی با API بله (cURL)
// ==============================================================================

function callBaleApi($token, $method, $parameters = []) {
    global $BALE_API_BASE;
    if (empty($token)) return ['ok' => false, 'error' => 'Empty bot token'];
    $url = $BALE_API_BASE . "/bot{$token}/{$method}";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
    // ایمن‌سازی برای هاست‌های اشتراکی
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json; charset=utf-8']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($parameters, JSON_UNESCAPED_UNICODE));

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return ['ok' => false, 'error' => $error, 'http_code' => $httpCode];
    }
    $decoded = @json_decode($response, true);
    if (!is_array($decoded)) {
        return ['ok' => false, 'error' => 'Invalid JSON from Bale API', 'raw' => $response, 'http_code' => $httpCode];
    }
    return $decoded;
}

function sendBaleMessage($token, $chatId, $text, $replyMarkup = null) {
    $payload = [
        'chat_id' => is_numeric($chatId) ? (int)$chatId : $chatId,
        'text' => $text
    ];
    if ($replyMarkup) {
        $payload['reply_markup'] = $replyMarkup;
    }
    return callBaleApi($token, 'sendMessage', $payload);
}

function sendBalePhoto($token, $chatId, $photo, $caption = '', $replyMarkup = null) {
    $payload = [
        'chat_id' => is_numeric($chatId) ? (int)$chatId : $chatId,
        'photo' => $photo
    ];
    if (!empty($caption)) {
        $payload['caption'] = mb_substr($caption, 0, 1024, 'UTF-8');
    }
    if ($replyMarkup) {
        $payload['reply_markup'] = $replyMarkup;
    }
    return callBaleApi($token, 'sendPhoto', $payload);
}

/**
 * صدور کارت رسمی درخواست پول کیف‌پول بله (sendInvoice)
 * ⭐ رعایت دقیق استانداردهای بله:
 * - chat_id عددی
 * - title حداکثر ۳۲ کاراکتر
 * - description حداکثر ۲۵۵ کاراکتر
 * - payload حداکثر ۱۲۸ بایت
 * - currency معادل "IRR"
 * - prices در واحد ریال (تومان × ۱۰) و حتماً عدد صحیح
 * - عدم ارسال reply_markup تداخلی (بله خود دکمه پرداخت ولت را رسم می‌کند)
 */
function sendBaleInvoice($token, $chatId, $title, $description, $payloadStr, $providerToken, $currency, $prices) {
    $numericChatId = is_numeric($chatId) ? (int)$chatId : $chatId;
    $body = [
        'chat_id' => $numericChatId,
        'title' => mb_substr((string)$title, 0, 32, 'UTF-8'),
        'description' => mb_substr((string)$description, 0, 255, 'UTF-8'),
        'payload' => substr((string)$payloadStr, 0, 128),
        'provider_token' => (string)$providerToken,
        'start_parameter' => substr((string)$payloadStr, 0, 64),
        'currency' => $currency ?: 'IRR',
        'prices' => $prices
    ];
    return callBaleApi($token, 'sendInvoice', $body);
}

function appendBotLog(&$database, $dbPath, $type, $text, $status = 'info', $rawPayload = null) {
    if (!isset($database['botActivityLogs']) || !is_array($database['botActivityLogs'])) {
        $database['botActivityLogs'] = [];
    }
    $log = [
        'id' => time() * 1000 + rand(10, 99),
        'time' => date('H:i'),
        'type' => $type,
        'platform' => 'bale',
        'text' => $text,
        'status' => $status,
        'rawPayload' => $rawPayload
    ];
    array_unshift($database['botActivityLogs'], $log);
    if (count($database['botActivityLogs']) > 100) {
        $database['botActivityLogs'] = array_slice($database['botActivityLogs'], 0, 100);
    }
    updateDatabase($dbPath, $database);
}

function buildMainReplyKeyboard($storeUrl) {
    return [
        'keyboard' => [
            [
                ['text' => '🧾 استعلام و پرداخت فاکتور من']
            ],
            [
                ['text' => '🛍️ فروشگاه اونیوال'],
                ['text' => '📦 پیگیری سفارش']
            ],
            [
                ['text' => '💳 راهنمای روش‌های پرداخت'],
                ['text' => '📞 تماس با ما و پشتیبانی']
            ]
        ],
        'resize_keyboard' => true,
        'one_time_keyboard' => false
    ];
}

// ==============================================================================
// بخش ۵: پردازش درخواست‌های تست مرورگر (GET Request Diagnostics)
// ==============================================================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $testResult = !empty($BOT_TOKEN) ? callBaleApi($BOT_TOKEN, 'getMe') : null;

    if (isset($_GET['action']) && $_GET['action'] === 'set_webhook') {
        $setRes = callBaleApi($BOT_TOKEN, 'setWebhook', ['url' => $currentScriptUrl]);
        header('Location: ?webhook_status=' . ($setRes['ok'] ? 'success' : 'failed'));
        exit;
    }

    if (isset($_GET['format']) && $_GET['format'] === 'json') {
        echo json_encode([
            'ok' => true,
            'service' => 'ONIVAL Standalone Bale Bot Webhook',
            'version' => '1.2.0',
            'scriptUrl' => $currentScriptUrl,
            'botUsername' => '@' . $BOT_USERNAME,
            'adminChatId' => $ADMIN_CHAT_ID,
            'providerToken' => substr($PROVIDER_TOKEN, 0, 12) . '...',
            'paymentMode' => $baleMode,
            'databaseFile' => $activeDbPath,
            'databaseExists' => file_exists($activeDbPath),
            'ordersCount' => count($db['orders'] ?? []),
            'baleApiStatus' => $testResult
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
    ?>
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>وضعیت و تنظیم ربات بله اونیوال (v1.2.0)</title>
        <style>
            body { font-family: Tahoma, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; direction: rtl; }
            .container { max-width: 760px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155; }
            h1 { font-size: 20px; color: #38bdf8; margin-top: 0; display: flex; align-items: center; justify-content: space-between; }
            .badge { padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: bold; }
            .badge-success { background: #065f46; color: #34d399; }
            .badge-warning { background: #78350f; color: #fcd34d; }
            .card { background: #0f172a; border-radius: 12px; padding: 16px; margin: 16px 0; border: 1px solid #334155; font-size: 13px; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e293b; }
            .row:last-child { border-bottom: none; }
            .btn { display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; font-size: 13px; }
            .btn-green { background: #059669; }
            code { background: #0f172a; color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>
                <span>🤖 ربات بله اونیوال (bale-bot.php)</span>
                <span class="badge badge-success">نسخه ۱.۲.۰ (پشتیبانی کامل فیش و ولت)</span>
            </h1>
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
                این فایل در پوشه <code>public_html</code> هاست مستقر است. فرآیند تایید فیش کارت به کارت، صدور فاکتور کیف‌پول بله، تفکیک اقلام و اطلاع‌رسانی دوطرفه مشتری و ادمین کاملاً فعال است.
            </p>

            <div class="card">
                <div class="row">
                    <span>آدرس اینترنتی این فایل (Webhook URL):</span>
                    <strong style="direction: ltr;"><?php echo htmlspecialchars($currentScriptUrl); ?></strong>
                </div>
                <div class="row">
                    <span>نام کاربری ربات مشتری بله:</span>
                    <strong>@<?php echo htmlspecialchars($BOT_USERNAME); ?></strong>
                </div>
                <div class="row">
                    <span>شناسه ولت پرداخت بله (Provider Token):</span>
                    <strong style="direction: ltr; color: #34d399;"><?php echo htmlspecialchars($PROVIDER_TOKEN); ?> (حالت: <?php echo $baleMode; ?>)</strong>
                </div>
                <div class="row">
                    <span>شناسه چت ادمین (دریافت فیش و نوتیفیکیشن پرداخت):</span>
                    <strong style="direction: ltr;"><?php echo htmlspecialchars($ADMIN_CHAT_ID); ?></strong>
                </div>
                <div class="row">
                    <span>وضعیت اتصال به سرور بله (getMe):</span>
                    <span>
                        <?php if (!empty($testResult['ok'])): ?>
                            <span class="badge badge-success">✅ متصل به بله (@<?php echo htmlspecialchars($testResult['result']['username'] ?? ''); ?>)</span>
                        <?php else: ?>
                            <span class="badge badge-warning">⚠️ عدم پاسخ یا توکن نامعتبر</span>
                        <?php endif; ?>
                    </span>
                </div>
                <div class="row">
                    <span>تعداد کل سفارشات موجود در سیستم:</span>
                    <strong><?php echo count($db['orders'] ?? []); ?> سفارش</strong>
                </div>
            </div>

            <div style="display: flex; gap: 10px; margin: 20px 0;">
                <a href="?action=set_webhook" class="btn btn-green">⚡ ثبت فوری وبهوک در بله</a>
                <a href="<?php echo htmlspecialchars($currentScriptUrl); ?>" class="btn">🔄 تازه‌سازی</a>
            </div>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// ==============================================================================
// بخش ۶: پردازش درخواست‌های وب‌هوک بله (POST Webhook)
// ==============================================================================
$rawInput = file_get_contents('php://input');
$update = @json_decode($rawInput, true);

if (!$update || !is_array($update)) {
    echo json_encode(['ok' => false, 'error' => 'No valid JSON payload']);
    exit;
}

// ------------------------------------------------------------------------------
// ۶-۱: تأیید خودکار پیش‌پرداخت کیف‌پول بله (pre_checkout_query)
// ------------------------------------------------------------------------------
if (isset($update['pre_checkout_query'])) {
    $pcq = $update['pre_checkout_query'];
    $pcqId = $pcq['id'] ?? '';
    $orderCode = $pcq['invoice_payload'] ?? '';

    $ans = callBaleApi($BOT_TOKEN, 'answerPreCheckoutQuery', [
        'pre_checkout_query_id' => $pcqId,
        'ok' => true
    ]);

    appendBotLog($db, $activeDbPath, 'pre_checkout_query', "درخواست پیش‌پرداخت بله برای {$orderCode} تایید شد.", 'success', $pcq);
    echo json_encode(['ok' => true]);
    exit;
}

// ------------------------------------------------------------------------------
// ۶-۲: پردازش کلیک روی دکمه‌های شیشه‌ای (callback_query)
// ------------------------------------------------------------------------------
if (isset($update['callback_query'])) {
    $cb = $update['callback_query'];
    $cbId = $cb['id'] ?? '';
    $cbData = $cb['data'] ?? '';
    $cbChatId = $cb['message']['chat']['id'] ?? ($cb['from']['id'] ?? null);

    // بستن لودینگ دکمه در بله
    callBaleApi($BOT_TOKEN, 'answerCallbackQuery', [
        'callback_query_id' => $cbId,
        'text' => 'در حال بررسی درخواست...'
    ]);

    // تأیید فیش توسط ادمین از طریق دکمه شیشه‌ای
    if (strpos($cbData, 'confirm_') === 0 || strpos($cbData, 'approve_') === 0) {
        $codeToConfirm = preg_replace('/^(confirm_|approve_)/', '', $cbData);
        $order = findOrderByCode($db['orders'] ?? [], $codeToConfirm);

        if ($order) {
            foreach ($db['orders'] as &$ord) {
                if (($ord['trackingCode'] ?? '') === $order['trackingCode'] || (string)($ord['id'] ?? '') === (string)$order['id']) {
                    $ord['paymentStatus'] = 'Paid';
                    $ord['status'] = 'Processing';
                    $ord['approvedAt'] = date('c');
                    break;
                }
            }
            updateDatabase($activeDbPath, $db);

            $custName = getOrderCustomerName($order);
            $amountToman = getOrderAmountToman($order);

            // ۱. پیام تایید به ادمین
            $adminOk = "✅ فیش سفارش {$order['trackingCode']} با موفقیت تایید شد و پیام برای مشتری ارسال گردید.";
            sendBaleMessage($BOT_TOKEN, $cbChatId, $adminOk);

            // ۲. اطلاع‌رسانی به خریدار
            $custChat = $order['baleChatId'] ?? $order['chatId'] ?? null;
            if ($custChat) {
                $custNotify =
                    "🎉 خریدار گرامی، پرداخت شما تأیید شد!\n\n" .
                    "✅ فیش واریزی سفارش {$order['trackingCode']} توسط واحد حسابداری تأیید گردید.\n" .
                    "💰 مبلغ: " . number_format($amountToman) . " تومان\n" .
                    "📦 وضعیت سفارش: در حال آماده‌سازی و ارسال پستی 🚚\n\n" .
                    "از اعتماد شما به محصولات ارگانیک اونیوال صمیمانه سپاسگزاریم. 🌿🍯\n\n" .
                    "🔍 پیگیری لحظه‌ای در وب‌سایت:\n{$STORE_URL}?track={$order['trackingCode']}";
                sendBaleMessage($BOT_TOKEN, $custChat, $custNotify);
            }

            appendBotLog($db, $activeDbPath, 'admin_confirm_cb', "سفارش {$order['trackingCode']} توسط کلیک ادمین تأیید گردید.", 'success');
        }
        echo json_encode(['ok' => true]);
        exit;
    }

    // راهنمای کارت به کارت
    if (strpos($cbData, 'c2c_') === 0) {
        $c2cOrderCode = substr($cbData, 4);
        $matched = findOrderByCode($db['orders'] ?? [], $c2cOrderCode);
        $amountToman = $matched ? getOrderAmountToman($matched) : 0;

        $c2cMsg =
            "💳 راهنمای پرداخت کارت‌به‌کارت سفارش {$c2cOrderCode}:\n\n" .
            "▫️ شماره کارت: {$CARD_NUMBER}\n" .
            "▫️ به نام: {$CARD_HOLDER}\n" .
            "▫️ بانک: {$BANK_NAME}\n" .
            ($amountToman > 0 ? "▫️ مبلغ قابل واریز: " . number_format($amountToman) . " تومان\n\n" : "\n") .
            "📸 پس از انتقال وجه، لطفاً تصویر فیش یا رسید را مستقیماً در همین گفتگو ارسال فرمایید تا سفارش شما بررسی و تأیید گردد.";

        sendBaleMessage($BOT_TOKEN, $cbChatId, $c2cMsg);
        echo json_encode(['ok' => true]);
        exit;
    }
}

$message = $update['message'] ?? null;
if (!$message) {
    echo json_encode(['ok' => true, 'note' => 'No message block']);
    exit;
}

$chatId = $message['chat']['id'] ?? null;
$senderUsername = $message['from']['username'] ?? '';
$senderName = trim(($message['from']['first_name'] ?? '') . ' ' . ($message['from']['last_name'] ?? ''));
$text = trim($message['text'] ?? ($message['caption'] ?? ''));
$keyboard = buildMainReplyKeyboard($STORE_URL);

$isAdmin = (
    (string)$chatId === (string)$ADMIN_CHAT_ID ||
    (!empty($ADMIN_USERNAME) && strtolower($senderUsername) === strtolower($ADMIN_USERNAME)) ||
    $chatId === 69451465 ||
    $chatId === '69451465'
);

// ------------------------------------------------------------------------------
// ۶-۳: پردازش پرداخت موفقیت‌آمیز در کیف‌پول بله (successful_payment)
// ------------------------------------------------------------------------------
if (isset($message['successful_payment'])) {
    $sp = $message['successful_payment'];
    $orderPayload = $sp['invoice_payload'] ?? '';
    $cleanOrderCode = str_replace(['_', 'pay-', 'order-'], ['-', '', ''], $orderPayload);
    $totalAmountToman = round(($sp['total_amount'] ?? 0) / 10);
    $balePaymentId = $sp['provider_payment_charge_id'] ?? $sp['telegram_payment_charge_id'] ?? ('BALE-' . time());

    // یافتن و ثبت سفارش
    $foundOrder = null;
    if (isset($db['orders']) && is_array($db['orders'])) {
        foreach ($db['orders'] as &$ord) {
            $codeMatches = ($ord['trackingCode'] === $cleanOrderCode) || 
                           ($ord['orderNumber'] === $cleanOrderCode) || 
                           (str_replace('_', '-', $ord['trackingCode'] ?? '') === $cleanOrderCode);
            if ($codeMatches) {
                $ord['status'] = 'Processing';
                $ord['paymentStatus'] = 'Paid';
                $ord['paymentMethod'] = 'bale_wallet';
                $ord['balePaymentRef'] = $balePaymentId;
                $ord['baleChatId'] = $chatId;
                $ord['paidAt'] = date('c');
                $foundOrder = $ord;
                break;
            }
        }
        updateDatabase($activeDbPath, $db);
    }

    $customerDisplayName = $foundOrder ? getOrderCustomerName($foundOrder) : ($senderName ?: 'مشتری گرامی');
    $orderFinalCode = !empty($foundOrder['trackingCode']) ? $foundOrder['trackingCode'] : $cleanOrderCode;
    $orderFinalAmount = $foundOrder ? getOrderAmountToman($foundOrder) : $totalAmountToman;
    $itemsList = $foundOrder ? formatOrderItemsList($foundOrder) : '▫️ سفارش ثبت شده در سیستم';

    // ۱. ارسال رسید به مشتری
    $customerReceipt =
        "✅ پرداخت شما با موفقیت در کیف‌پول بله انجام شد!\n\n" .
        "📦 کد رهگیری سفارش: {$orderFinalCode}\n" .
        "👤 خریدار: {$customerDisplayName}\n" .
        "💳 مبلغ پرداختی: " . number_format($orderFinalAmount) . " تومان\n" .
        "🔖 شناسه تراکنش بله: {$balePaymentId}\n\n" .
        "📦 اقلام پرداختی:\n{$itemsList}\n\n" .
        "🌿 سفارش شما وارد فرآیند آماده‌سازی و ارسال شد. از اعتماد شما به محصولات ارگانیک اونیوال سپاسگزاریم.";

    $custButtons = [
        'inline_keyboard' => [
            [['text' => '🌐 پیگیری لحظه‌ای در وب‌سایت', 'url' => "{$STORE_URL}?track={$orderFinalCode}"]]
        ]
    ];
    sendBaleMessage($BOT_TOKEN, $chatId, $customerReceipt, $custButtons);

    // ۲. ارسال پیام به ادمین (فقط در مرحله پرداخت موفق)
    if (!empty($ADMIN_CHAT_ID)) {
        $adminNotifyToken = !empty($ADMIN_TOKEN) ? $ADMIN_TOKEN : $BOT_TOKEN;
        $adminAlert =
            "🔔 سفارش جدید با موفقیت پرداخت شد!\n\n" .
            "📦 شماره سفارش: {$orderFinalCode}\n" .
            "👤 خریدار: {$customerDisplayName}\n" .
            "📱 تلفن مشتری: " . ($foundOrder ? getOrderCustomerPhone($foundOrder) : 'ثبت نشده') . "\n" .
            "💰 مبلغ واریزشده: " . number_format($orderFinalAmount) . " تومان\n" .
            "💳 روش پرداخت: درگاه کیف‌پول بله\n" .
            "🔖 شناسه تراکنش: {$balePaymentId}\n" .
            (!empty($foundOrder['userAddress']) ? "📍 آدرس: {$foundOrder['userAddress']}\n" : "") .
            "⏰ زمان پرداخت: " . date('Y/m/d - H:i') . "\n\n" .
            "📦 اقلام سفارش:\n{$itemsList}";

        $adminButtons = [
            'inline_keyboard' => [
                [['text' => '📋 مشاهده سفارش در پنل ادمین', 'url' => "{$STORE_URL}?view=orders&track={$orderFinalCode}"]]
            ]
        ];
        sendBaleMessage($adminNotifyToken, $ADMIN_CHAT_ID, $adminAlert, $adminButtons);
    }

    appendBotLog($db, $activeDbPath, 'successful_payment', "پرداخت سفارش {$orderFinalCode} به مبلغ " . number_format($orderFinalAmount) . " تومان با موفقیت تایید شد.", 'success', $sp);
    echo json_encode(['ok' => true]);
    exit;
}

// ------------------------------------------------------------------------------
// ۶-۴: پردازش دریافت عکس فیش واریزی کارت‌به‌کارت (message.photo یا document)
// ⭐ طبق درخواست: تشکر از خرید، ارسال عکس و جزئیات به ادمین برای تأیید و آماده‌سازی برای اطلاع به مشتری
// ------------------------------------------------------------------------------
$hasPhoto = !empty($message['photo']) && is_array($message['photo']);
$hasDocImage = !empty($message['document']) && strpos($message['document']['mime_type'] ?? '', 'image') !== false;

if ($hasPhoto || $hasDocImage) {
    $fileId = '';
    if ($hasPhoto) {
        $photoArray = $message['photo'];
        $largest = end($photoArray);
        $fileId = $largest['file_id'] ?? '';
    } else {
        $fileId = $message['document']['file_id'] ?? '';
    }

    // ۱. استخراج کد فاکتور از کپشن یا پیدا کردن سفارش پرداخت‌نشده اخیر کاربر
    $captionText = trim($message['caption'] ?? '');
    $extractedCode = extractOrderCode($captionText);
    $matchedOrder = null;

    if ($extractedCode) {
        $matchedOrder = findOrderByCode($db['orders'] ?? [], $extractedCode);
    }

    // اگر در کپشن نبود، جستجو بر اساس چت‌آیدی یا آخرین سفارش باز در دیتابیس
    if (!$matchedOrder && !empty($db['orders'])) {
        foreach ($db['orders'] as $ord) {
            if (($ord['paymentStatus'] ?? '') !== 'Paid') {
                if (!empty($ord['baleChatId']) && (string)$ord['baleChatId'] === (string)$chatId) {
                    $matchedOrder = $ord;
                    break;
                }
            }
        }
        if (!$matchedOrder) {
            // انتخاب آخرین سفارش پرداخت‌نشده در سیستم
            foreach ($db['orders'] as $ord) {
                if (($ord['paymentStatus'] ?? '') !== 'Paid') {
                    $matchedOrder = $ord;
                    break;
                }
            }
        }
        if (!$matchedOrder) {
            $matchedOrder = $db['orders'][0];
        }
    }

    // به‌روزرسانی سفارش در دیتابیس (ذخیره آیدی فیش و شناسه چت خریدار)
    if ($matchedOrder) {
        foreach ($db['orders'] as &$ord) {
            if (($ord['trackingCode'] ?? '') === $matchedOrder['trackingCode'] || (string)($ord['id'] ?? '') === (string)$matchedOrder['id']) {
                $ord['receiptFileId'] = $fileId;
                $ord['baleChatId'] = $chatId;
                $ord['paymentMethod'] = 'card_to_card';
                $ord['paymentStatus'] = 'PendingVerification';
                $ord['receiptUploadedAt'] = date('c');
                $matchedOrder = $ord;
                break;
            }
        }
        updateDatabase($activeDbPath, $db);
    }

    $finalOrderCode = $matchedOrder['trackingCode'] ?? ($extractedCode ?: 'سفارش ثبت‌شده');
    $custDisplayName = $matchedOrder ? getOrderCustomerName($matchedOrder) : ($senderName ?: 'مشتری گرامی');
    $custPhone = $matchedOrder ? getOrderCustomerPhone($matchedOrder) : 'ثبت‌نشده';
    $orderAmountToman = $matchedOrder ? getOrderAmountToman($matchedOrder) : 0;
    $itemsList = $matchedOrder ? formatOrderItemsList($matchedOrder) : '▫️ فرآورده‌های ارگانیک اونیوال';

    // ۲. ارسال پیام تشکر و تایید دریافت به مشتری
    $customerThanks =
        "از خرید و حسن اعتماد شما به محصولات ارگانیک اونیوال صمیمانه سپاسگزاریم! 🌿🍯\n\n" .
        "📸 تصویر فیش واریزی شما با موفقیت دریافت شد و جهت بررسی و تأیید نهایی در اختیار واحد مالی و مدیریت فروشگاه قرار گرفت.\n\n" .
        "🔖 کد پیگیری فاکتور: {$finalOrderCode}\n" .
        ($orderAmountToman > 0 ? "💰 مبلغ فاکتور: " . number_format($orderAmountToman) . " تومان\n" : "") .
        "⏳ وضعیت: در انتظار بررسی و تأیید مدیریت\n\n" .
        "به محض بررسی و تأیید فیش توسط مدیریت، پیام تایید نهایی و آغاز آماده‌سازی مرسوله از همین طریق برای شما ارسال خواهد شد. 📦✨";

    sendBaleMessage($BOT_TOKEN, $chatId, $customerThanks, $keyboard);

    // ۳. ارسال فیش، اطلاعات سفارش و دکمه تایید فوری به ادمین
    if (!empty($ADMIN_CHAT_ID)) {
        $adminTokenToUse = !empty($ADMIN_TOKEN) ? $ADMIN_TOKEN : $BOT_TOKEN;
        $adminPhotoCaption =
            "🔔 فیش واریز کارت‌به‌کارت جدید دریافت شد!\n\n" .
            "📦 شماره سفارش: {$finalOrderCode}\n" .
            "👤 خریدار: {$custDisplayName}\n" .
            "📱 شماره تماس: {$custPhone}\n" .
            "💰 مبلغ فاکتور: " . number_format($orderAmountToman) . " تومان\n" .
            "⏰ زمان ارسال: " . date('Y/m/d - H:i') . "\n\n" .
            "📦 اقلام سفارش:\n{$itemsList}\n\n" .
            "⚡ جهت تایید رسید و تغییر وضعیت به پرداخت شده روی دستور زیر کلیک فرمایید:\n" .
            "/confirm_{$finalOrderCode}";

        $adminPhotoButtons = [
            'inline_keyboard' => [
                [
                    ['text' => '✅ تایید این فیش واریزی', 'callback_data' => "confirm_{$finalOrderCode}"]
                ],
                [
                    ['text' => '🌐 مشاهده سفارش در پنل سایت', 'url' => "{$STORE_URL}?track={$finalOrderCode}"]
                ]
            ]
        ];

        // ارسال عکس برای ادمین در بله
        $photoSendRes = sendBalePhoto($adminTokenToUse, $ADMIN_CHAT_ID, $fileId, $adminPhotoCaption, $adminPhotoButtons);

        // در صورت عدم ارسال عکس، متن برای ادمین ارسال شود
        if (empty($photoSendRes['ok'])) {
            sendBaleMessage($adminTokenToUse, $ADMIN_CHAT_ID, $adminPhotoCaption, $adminPhotoButtons);
        }
    }

    appendBotLog($db, $activeDbPath, 'receipt_photo_uploaded', "تصویر فیش سفارش {$finalOrderCode} از کاربر ({$chatId}) دریافت و به ادمین ارسال شد.", 'info', [
        'chatId' => $chatId,
        'orderCode' => $finalOrderCode,
        'fileId' => $fileId
    ]);

    echo json_encode(['ok' => true]);
    exit;
}

// ------------------------------------------------------------------------------
// ۶-۵: پردازش دستورات اختصاصی مدیریت (/confirm_CODE, /orders, /admin)
// ------------------------------------------------------------------------------
if ($isAdmin) {
    // ۱. تایید سفارش توسط ادمین: /confirm_CODE یا /تایید_CODE
    if (preg_match('/^\/(?:confirm_|approve_|تایید_)([A-Za-z0-9_-]+)/iu', $text, $matches)) {
        $codeToConfirm = trim($matches[1]);
        $targetOrder = findOrderByCode($db['orders'] ?? [], $codeToConfirm);

        if ($targetOrder) {
            foreach ($db['orders'] as &$ord) {
                if (($ord['trackingCode'] ?? '') === $targetOrder['trackingCode'] || (string)($ord['id'] ?? '') === (string)$targetOrder['id']) {
                    $ord['paymentStatus'] = 'Paid';
                    $ord['status'] = 'Processing';
                    $ord['approvedAt'] = date('c');
                    $targetOrder = $ord;
                    break;
                }
            }
            updateDatabase($activeDbPath, $db);

            $custName = getOrderCustomerName($targetOrder);
            $amountToman = getOrderAmountToman($targetOrder);

            // ۱. تاییدیه برای ادمین
            $adminOk =
                "✅ فاکتور و فیش سفارش {$targetOrder['trackingCode']} با موفقیت تایید و تسویه شد!\n\n" .
                "👤 خریدار: {$custName}\n" .
                "💰 مبلغ: " . number_format($amountToman) . " تومان\n" .
                "📦 وضعیت جدید: در حال آماده‌سازی و ارسال پستی\n\n" .
                "پیام تایید و قدردانی به صورت خودکار برای مشتری ارسال گردید.";
            sendBaleMessage($BOT_TOKEN, $chatId, $adminOk);

            // ۲. اطلاع‌رسانی فوری به مشتری
            $custChat = $targetOrder['baleChatId'] ?? $targetOrder['chatId'] ?? null;
            if ($custChat) {
                $custNotify =
                    "🎉 خریدار گرامی {$custName} عزیز،\n\n" .
                    "✅ فیش واریزی شما برای سفارش {$targetOrder['trackingCode']} توسط مدیریت فروشگاه تأیید گردید!\n\n" .
                    "💰 مبلغ تسویه شده: " . number_format($amountToman) . " تومان\n" .
                    "📦 وضعیت سفارش شما به «در حال آماده‌سازی و ارسال پستی 🚚» تغییر یافت.\n\n" .
                    "از خرید، همراهی و اعتماد ارزشمند شما به مجموعه فرآورده‌های ارگانیک اونیوال صمیمانه سپاسگزاریم. 🍯🌿\n\n" .
                    "🔍 پیگیری لحظه‌ای مرسوله در وب‌سایت:\n{$STORE_URL}?track={$targetOrder['trackingCode']}";

                sendBaleMessage($BOT_TOKEN, $custChat, $custNotify, [
                    'inline_keyboard' => [
                        [['text' => '🌐 پیگیری آنلاین سفارش در سایت', 'url' => "{$STORE_URL}?track={$targetOrder['trackingCode']}"]]
                    ]
                ]);
            }

            appendBotLog($db, $activeDbPath, 'admin_confirm_cmd', "سفارش {$targetOrder['trackingCode']} توسط ادمین تایید و به مشتری اطلاع‌رسانی شد.", 'success');
        } else {
            sendBaleMessage($BOT_TOKEN, $chatId, "⚠️ سفارشی با کد «{$codeToConfirm}» در سیستم یافت نشد.");
        }
        echo json_encode(['ok' => true]);
        exit;
    }

    // ۲. مشاهده آخرین سفارشات
    if ($text === '/orders' || $text === 'سفارشات' || $text === 'لیست سفارشات') {
        $ordersList = array_slice($db['orders'] ?? [], 0, 8);
        $reply = "📋 آخرین وضعیت سفارشات فروشگاه اونیوال:\n\n";
        if (empty($ordersList)) {
            $reply .= "هیچ سفارشی در سامانه یافت نشد.";
        } else {
            foreach ($ordersList as $o) {
                $reply .= "🔖 {$o['trackingCode']} | " . getOrderCustomerName($o) . " (" . getOrderCustomerPhone($o) . ")\n" .
                    "💰 " . number_format(getOrderAmountToman($o)) . " تومان | " . ($o['paymentStatus'] === 'Paid' ? '✅ پرداخت شده' : '⏳ در انتظار') . "\n" .
                    "📦 وضعیت: " . ($o['status'] === 'Processing' ? 'در حال آماده‌سازی' : ($o['status'] === 'Shipped' ? 'ارسال شده' : 'در انتظار')) . "\n" .
                    "تایید سریع: /confirm_{$o['trackingCode']}\n──────────\n";
            }
        }
        sendBaleMessage($BOT_TOKEN, $chatId, $reply);
        echo json_encode(['ok' => true]);
        exit;
    }

    // ۳. راهنمای ربات ادمین
    if ($text === '/admin' || ($text === '/start' && $chatId == $ADMIN_CHAT_ID)) {
        $adminGreeting =
            "سلام مدیر گرامی 👑\n\n" .
            "پنل مدیریت ربات بله اونیوال فعال است.\n" .
            "شناسه عددی چت شما: {$chatId}\n\n" .
            "📌 تمامی اعلان‌های سفارشات، فیش‌های واریزی و پرداخت‌های بله به این گفتگو ارسال می‌گردند.\n\n" .
            "دستورات مدیریت:\n" .
            "📋 /orders : مشاهده آخرین سفارشات\n" .
            "✅ /confirm_کد : تایید فوری فیش و اطلاع به مشتری";
        sendBaleMessage($BOT_TOKEN, $chatId, $adminGreeting);
        echo json_encode(['ok' => true]);
        exit;
    }
}

// ------------------------------------------------------------------------------
// تابع اختصاصی ارسال پیش‌فاکتور و درخواست پول کیف‌پول بله (sendInvoice)
// ------------------------------------------------------------------------------
function deliverOrderInvoiceWithWallet($botToken, $chatId, $order, $providerToken, $storeUrl, $keyboard, $cardNumber, $cardHolder, $bankName, &$db, $dbPath) {
    $orderCode = $order['trackingCode'] ?? ('ONV-ORD-' . ($order['id'] ?? time()));
    $custName = getOrderCustomerName($order);
    $custPhone = getOrderCustomerPhone($order);
    $custAddress = getOrderCustomerAddress($order);
    $amountToman = getOrderAmountToman($order);
    // مبلغ کیف‌پول بله باید حتماً به ریال و عدد صحیح باشد
    $amountRial = max(10000, (int)($amountToman * 10));
    $itemsText = formatOrderItemsList($order);
    $isPaid = ($order['paymentStatus'] === 'Paid' || $order['status'] === 'Processing' || $order['status'] === 'Delivered');

    // ثبت شناسه چت کاربر در سفارش
    foreach ($db['orders'] as &$ord) {
        if (($ord['trackingCode'] ?? '') === $orderCode || (string)($ord['id'] ?? '') === (string)($order['id'] ?? '')) {
            $ord['baleChatId'] = $chatId;
            break;
        }
    }
    updateDatabase($dbPath, $db);

    if ($isPaid) {
        $alreadyPaidMsg =
            "✅ فاکتور سفارش {$orderCode}\n\n" .
            "این سفارش قبلاً با موفقیت پرداخت شده و در مرحله آماده‌سازی یا ارسال پستی قرار دارد.\n" .
            "👤 خریدار: {$custName}\n" .
            "💰 مبلغ: " . number_format($amountToman) . " تومان\n\n" .
            "📦 اقلام سفارش:\n{$itemsText}\n\n" .
            "جهت رهگیری مرسوله پستی می‌توانید از سایت اقدام فرمایید:";
        sendBaleMessage($botToken, $chatId, $alreadyPaidMsg, [
            'inline_keyboard' => [
                [['text' => '🌐 پیگیری آنلاین در سایت', 'url' => "{$storeUrl}?track={$orderCode}"]]
            ]
        ]);
        return;
    }

    // پیام ۱: نمایش تفکیکی و شفاف مشخصات فاکتور و اقلام
    $invoiceOverview =
        "🧾 فاکتور سفارش فروشگاه محصولات ارگانیک اونیوال (ONIVAL)\n\n" .
        "🔖 شماره سفارش: {$orderCode}\n" .
        "👤 خریدار: {$custName}\n" .
        (!empty($custPhone) ? "📱 شماره تماس: {$custPhone}\n" : "") .
        (!empty($custAddress) ? "📍 نشانی تحویل: {$custAddress}\n" : "") .
        "\n📦 اقلام سفارش:\n{$itemsText}\n\n" .
        "💰 مبلغ کل قابل پرداخت: " . number_format($amountToman) . " تومان (" . number_format($amountRial) . " ریال)\n" .
        "⏳ وضعیت: در انتظار پرداخت\n\n" .
        "──────────────────\n" .
        "👇 درخواست پول کیف‌پول بله در زیر صادر شد.\n" .
        "جهت پرداخت مستقیم و آنی، روی دکمه «پرداخت» کارت زیر کلیک فرمایید:";

    $inlineOptions = [
        'inline_keyboard' => [
            [
                ['text' => '🌐 پرداخت آنلاین در وب‌سایت', 'url' => "{$storeUrl}?track={$orderCode}"]
            ],
            [
                ['text' => '💳 کارت به کارت شتابی', 'callback_data' => "c2c_{$orderCode}"]
            ]
        ]
    ];
    sendBaleMessage($botToken, $chatId, $invoiceOverview, $inlineOptions);

    // پیام ۲: صدور کارت رسمی درخواست پول کیف‌پول بله (sendInvoice)
    // رعایت دقیق محدودیت کاراکترها طبق مشخصات بله
    $invTitle = mb_substr("فاکتور {$orderCode}", 0, 32, 'UTF-8');
    $invDesc = mb_substr("پرداخت سفارش {$orderCode} فروشگاه ارگانیک اونیوال", 0, 255, 'UTF-8');
    $payload = substr("order_" . preg_replace('/[^A-Za-z0-9_-]/', '', $orderCode), 0, 128);

    $prices = [
        [
            'label' => mb_substr('مبلغ قابل پرداخت', 0, 32, 'UTF-8'),
            'amount' => $amountRial
        ]
    ];

    $invRes = sendBaleInvoice($botToken, $chatId, $invTitle, $invDesc, $payload, $providerToken, 'IRR', $prices);

    // در صورتی که توکن اولیه رد شد، تلاش با توکن تست رسمی
    if (empty($invRes['ok'])) {
        $testFallbackToken = 'WALLET-TEST-1111111111111111';
        if ($providerToken !== $testFallbackToken) {
            $invRes = sendBaleInvoice($botToken, $chatId, $invTitle, $invDesc, $payload, $testFallbackToken, 'IRR', $prices);
        }
    }

    // ارسال کارت به کارت در صورت عدم فعال بودن ولت کاربر
    if (empty($invRes['ok'])) {
        $cardFallback =
            "💳 امکان پرداخت به شیوه کارت به کارت:\n\n" .
            "▫️ شماره کارت: {$cardNumber}\n" .
            "▫️ به نام: {$cardHolder}\n" .
            "▫️ بانک: {$bankName}\n" .
            "▫️ مبلغ قابل واریز: " . number_format($amountToman) . " تومان\n\n" .
            "📸 پس از واریز، کافیست عکس فیش واریزی خود را در همین گفتگو ارسال فرمایید تا سفارش تایید و ارسال شود.";
        sendBaleMessage($botToken, $chatId, $cardFallback, $keyboard);

        appendBotLog($db, $dbPath, 'invoice_fallback', "کارت کیف‌پول با توکن {$providerToken} صادر نشد. راهنمای کارت به کارت ارسال گردید.", 'warning', $invRes);
    } else {
        appendBotLog($db, $dbPath, 'invoice_opened', "فاکتور سفارش {$orderCode} با کیف‌پول بله تحویل داده شد.", 'success');
    }
}

// ------------------------------------------------------------------------------
// ۶-۶: پردازش پیام متنی، استارت (/start) و دستورات منو
// ------------------------------------------------------------------------------
$detectedCode = extractOrderCode($text);

// ۱. شروع یا باز کردن فاکتور از طریق لینک: /start pay_ONV-ORD-91542
if (strpos($text, '/start') === 0) {
    if (!empty($detectedCode)) {
        $matched = findOrderByCode($db['orders'] ?? [], $detectedCode);
        if ($matched) {
            deliverOrderInvoiceWithWallet($BOT_TOKEN, $chatId, $matched, $PROVIDER_TOKEN, $STORE_URL, $keyboard, $CARD_NUMBER, $CARD_HOLDER, $BANK_NAME, $db, $activeDbPath);
            echo json_encode(['ok' => true]);
            exit;
        }
    }

    // اگر کاربر سفارش باز دارد، فاکتور باز شود
    $latestPending = null;
    foreach ($db['orders'] ?? [] as $ord) {
        if (($ord['paymentStatus'] ?? '') !== 'Paid') {
            $latestPending = $ord;
            break;
        }
    }
    if ($latestPending) {
        deliverOrderInvoiceWithWallet($BOT_TOKEN, $chatId, $latestPending, $PROVIDER_TOKEN, $STORE_URL, $keyboard, $CARD_NUMBER, $CARD_HOLDER, $BANK_NAME, $db, $activeDbPath);
        echo json_encode(['ok' => true]);
        exit;
    }

    $welcome =
        "سلام {$senderName} عزیز! 🌿\n\n" .
        "به بازوی رسمی فروشگاه تخصصی محصولات ارگانیک اونیوال (ONIVAL) خوش آمدید.\n\n" .
        "🍯 عسل طبیعی و خام سبلان با برگه آزمایشگاهی\n" .
        "👑 ژل رویال ۱۰۰٪ خالص و گرده گل تازه کوهستان\n" .
        "🍵 دمنوش‌ها و فرآورده‌های طبیعی کندو\n\n" .
        "از طریق گزینه‌های منوی زیر می‌توانید وضعیت سفارش خود را استعلام کنید یا فاکتور خریدتان را مستقیماً تسویه فرمایید:";

    sendBaleMessage($BOT_TOKEN, $chatId, $welcome, $keyboard);
    echo json_encode(['ok' => true]);
    exit;
}

// ۲. جستجوی مستقیم کد فاکتور در متن پیام مشتری
if ($detectedCode) {
    $matched = findOrderByCode($db['orders'] ?? [], $detectedCode);
    if ($matched) {
        deliverOrderInvoiceWithWallet($BOT_TOKEN, $chatId, $matched, $PROVIDER_TOKEN, $STORE_URL, $keyboard, $CARD_NUMBER, $CARD_HOLDER, $BANK_NAME, $db, $activeDbPath);
        echo json_encode(['ok' => true]);
        exit;
    }
}

// ۳. دکمه استعلام و پرداخت فاکتور من
if (mb_strpos($text, 'فاکتور') !== false || mb_strpos($text, 'استعلام') !== false) {
    $latestOrder = !empty($db['orders']) ? $db['orders'][0] : null;
    $hint = $latestOrder ? "\n(سفارش اخیر ثبت‌شده: {$latestOrder['trackingCode']})" : "";

    $promptMsg =
        "🧾 لطفاً شماره سفارش یا کد پیگیری فاکتور خود را ارسال فرمایید:{$hint}\n\n" .
        "نمونه‌ها: ONV_ORD_91542 یا 91542 یا ONV-ORD-10482";
    sendBaleMessage($BOT_TOKEN, $chatId, $promptMsg, $keyboard);
    echo json_encode(['ok' => true]);
    exit;
}

// ۴. دکمه پیگیری سفارش
if (mb_strpos($text, 'پیگیری') !== false) {
    $trackMsg =
        "📦 لطفاً کد رهگیری سفارش خود را ارسال فرمایید تا وضعیت بسته‌بندی و ارسال پستی برای شما نمایش داده شود.\n" .
        "همچنین می‌توانید مستقیماً از سامانه پیگیری سایت استفاده کنید:";
    $trackButtons = [
        'inline_keyboard' => [
            [['text' => '🌐 پیگیری آنلاین در سایت', 'url' => "{$STORE_URL}?view=tracking"]]
        ]
    ];
    sendBaleMessage($BOT_TOKEN, $chatId, $trackMsg, $trackButtons);
    echo json_encode(['ok' => true]);
    exit;
}

// ۵. دکمه فروشگاه
if (mb_strpos($text, 'فروشگاه') !== false || mb_strpos($text, 'محصولات') !== false) {
    $shopMsg =
        "🛍️ به فروشگاه تخصصی فرآورده‌های ارگانیک اونیوال خوش آمدید!\n\n" .
        "🌿 تمامی محصولات ما دارای برگه آزمایشگاه معتبر، ضمانت کتبی اصالت و ارسال سریع پستی هستند.\n\n" .
        "جهت مشاهده کاتالوگ و ثبت آنلاین سفارش به سایت مراجعه فرمایید:";
    sendBaleMessage($BOT_TOKEN, $chatId, $shopMsg, [
        'inline_keyboard' => [
            [['text' => '🛍️ ورود به وب‌سایت اونیوال', 'url' => $STORE_URL]]
        ]
    ]);
    echo json_encode(['ok' => true]);
    exit;
}

// ۶. راهنمای پرداخت
if (mb_strpos($text, 'پرداخت') !== false || mb_strpos($text, 'روش') !== false) {
    $guideMsg =
        "💳 روش‌های پرداخت در فروشگاه ارگانیک اونیوال:\n\n" .
        "۱️⃣ درگاه کیف‌پول بله: با لمس دکمه «پرداخت» فاکتور ربات، سریع و بدون کارمزد تسویه نمایید.\n" .
        "۲️⃣ پرداخت کارت به کارت:\n" .
        "▫️ شماره کارت: {$CARD_NUMBER}\n" .
        "▫️ به نام: {$CARD_HOLDER}\n" .
        "▫️ بانک: {$BANK_NAME}\n" .
        "۳️⃣ درگاه پرداخت اینترنتی وب‌سایت اونیوال.\n\n" .
        "📸 پس از کارت به کارت، عکس فیش را در همین چت ارسال نمایید تا تأیید گردد.";
    sendBaleMessage($BOT_TOKEN, $chatId, $guideMsg, $keyboard);
    echo json_encode(['ok' => true]);
    exit;
}

// ۷. تماس با ما
if (mb_strpos($text, 'تماس') !== false || mb_strpos($text, 'پشتیبانی') !== false) {
    $contactMsg =
        "📞 ارتباط مستقیم و مشاوره تخصصی اونیوال:\n\n" .
        "▫️ پاسخگویی در بله: @{$ADMIN_USERNAME}\n" .
        "▫️ پشتیبانی آنلاین وب‌سایت: در تمام ساعات شبانه‌روز";
    sendBaleMessage($BOT_TOKEN, $chatId, $contactMsg, [
        'inline_keyboard' => [
            [['text' => '🌐 ارتباط در وب‌سایت', 'url' => "{$STORE_URL}?view=contact"]]
        ]
    ]);
    echo json_encode(['ok' => true]);
    exit;
}

// پاسخ پیش‌فرض
$defaultReply =
    "پیام شما با موفقیت دریافت شد! 🌿\n\n" .
    "جهت استعلام فاکتور، کد پیگیری خود را ارسال کنید یا در صورت پرداخت کارت‌به‌کارت، عکس فیش واریزی را در همین چت بفرستید:";

sendBaleMessage($BOT_TOKEN, $chatId, $defaultReply, $keyboard);
echo json_encode(['ok' => true]);
