<?php
/**
 * ==============================================================================
 * ✈️ ONIVAL - فایل اختصاصی و مستقل ربات تلگرام (Telegram Bot Webhook)
 * ==============================================================================
 * این فایل کاملاً خودکفا (Standalone) بوده و برای آپلود مستقیم در پوشه public_html
 * هاست اشتراکی (cPanel / DirectAdmin / Plesk / LiteSpeed / Apache) طراحی شده است.
 *
 * 📌 مسیر پیشنهادی در هاست:
 * public_html/telegram-bot.php
 *
 * 📌 آدرس وبهوک برای ثبت در تلگرام:
 * https://yourdomain.com/telegram-bot.php
 *
 * ⚙️ نیازمندی‌ها:
 * - PHP نسخه 7.4 یا 8.0 یا بالاتر با فعال بودن پسوند cURL و json
 * - گواهی SSL معتبر (HTTPS)
 *
 * 🛡️ ویژگی‌های کلیدی:
 * ۱. سازگار با API رسمی تلگرام (api.telegram.org)
 * ۲. کیبورد اصلی و دکمه‌های شیشه‌ای برای فاکتور، پیگیری و فروشگاه
 * ۳. اتصال اتمیک به فایل دیتابیس سفارشات (onival-persistent-data.json)
 * ۴. قانون اکید: ارسال نوتیفیکیشن به ادمین منحصراً پس از پرداخت موفق انجام می‌شود.
 * ۵. دارای صفحه تست و دیاگنوستیک بصری در صورت باز کردن فایل در مرورگر.
 * ==============================================================================
 */

error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('X-Powered-By: Onival-Telegram-PHP-Bot');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['ok' => true]);
    exit;
}

// ==============================================================================
// بخش ۱: تنظیمات پیش‌فرض ربات تلگرام (قابل ویرایش دستی یا همگام با دیتابیس)
// ==============================================================================
$DEFAULT_CONFIG = [
    // توکن ربات تلگرام (دریافت شده از BotFather@ در تلگرام)
    'telegramBotToken'     => '1204808805:W-mq-hFRtv71zdHaRFSUYdr2GWCJPCvQD34',

    // نام کاربری ربات تلگرام
    'telegramBotUsername'  => 'Onivalbot',

    // آیدی عددی چت ادمین در تلگرام (برای دریافت نوتیفیکیشن سفارش‌های پرداخت‌شده)
    'adminChatId'          => '69451465',

    // نام کاربری ادمین
    'adminUsername'        => 'hasti_hjz',

    // آدرس وب‌سایت فروشگاه (در صورت خالی بودن خودکار تشخیص داده می‌شود)
    'storeUrl'             => '',

    // نام فروشگاه
    'storeName'            => 'فروشگاه تخصصی محصولات ارگانیک اونیوال'
];

$proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$detectedBaseUrl = "$proto://$host";
$currentScriptUrl = $detectedBaseUrl . ($_SERVER['SCRIPT_NAME'] ?? '/telegram-bot.php');

// ==============================================================================
// بخش ۲: یافتن و بارگذاری دیتابیس مشترک سفارشات (onival-persistent-data.json)
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

function getDatabaseTg($path) {
    if (!file_exists($path)) return [];
    $raw = @file_get_contents($path);
    if (!$raw) return [];
    $data = @json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function updateDatabaseTg($path, $newData) {
    if (empty($path)) return false;
    $newData['updatedAt'] = date('c');
    $json = json_encode($newData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    $dir = dirname($path);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    return @file_put_contents($path, $json, LOCK_EX) !== false;
}

$db = getDatabaseTg($activeDbPath);
$tgCfg = $db['telegramConfig'] ?? [];
$siteCfg = $db['siteContent'] ?? [];

$BOT_TOKEN = trim(!empty($tgCfg['telegramBotToken']) ? $tgCfg['telegramBotToken'] : (!empty($tgCfg['botToken']) ? $tgCfg['botToken'] : $DEFAULT_CONFIG['telegramBotToken']));
$ADMIN_CHAT_ID = trim(!empty($tgCfg['adminChatId']) ? $tgCfg['adminChatId'] : (!empty($tgCfg['baleAdminChatId']) ? $tgCfg['baleAdminChatId'] : $DEFAULT_CONFIG['adminChatId']));
$BOT_USERNAME = ltrim(trim(!empty($tgCfg['telegramBotUsername']) ? $tgCfg['telegramBotUsername'] : (!empty($tgCfg['botUsername']) ? $tgCfg['botUsername'] : $DEFAULT_CONFIG['telegramBotUsername'])), '@');
$ADMIN_USERNAME = ltrim(trim(!empty($tgCfg['adminUsername']) ? $tgCfg['adminUsername'] : $DEFAULT_CONFIG['adminUsername']), '@');
$STORE_URL = !empty($siteCfg['storeUrl']) ? $siteCfg['storeUrl'] : (!empty($DEFAULT_CONFIG['storeUrl']) ? $DEFAULT_CONFIG['storeUrl'] : $detectedBaseUrl);

$TG_API_BASE = 'https://api.telegram.org';

// ==============================================================================
// بخش ۳: توابع ارتباط با API تلگرام
// ==============================================================================
function callTelegramApi($token, $method, $parameters = []) {
    global $TG_API_BASE;
    $url = $TG_API_BASE . "/bot{$token}/{$method}";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
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
    return is_array($decoded) ? $decoded : ['ok' => false, 'raw' => $response, 'http_code' => $httpCode];
}

function sendTelegramMessage($token, $chatId, $text, $replyMarkup = null) {
    $payload = [
        'chat_id' => $chatId,
        'text' => $text
    ];
    if ($replyMarkup) {
        $payload['reply_markup'] = $replyMarkup;
    }
    return callTelegramApi($token, 'sendMessage', $payload);
}

function sendTelegramPhoto($token, $chatId, $photo, $caption = '', $replyMarkup = null) {
    $payload = [
        'chat_id' => $chatId,
        'photo' => $photo
    ];
    if (!empty($caption)) {
        $payload['caption'] = mb_substr($caption, 0, 1024, 'UTF-8');
    }
    if ($replyMarkup) {
        $payload['reply_markup'] = $replyMarkup;
    }
    return callTelegramApi($token, 'sendPhoto', $payload);
}

function buildMainTelegramKeyboard() {
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

function normalizeDigitsTg($str) {
    $farsi = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
    $arabic = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    $english = ['0','1','2','3','4','5','6','7','8','9'];
    $str = str_replace($farsi, $english, $str);
    return str_replace($arabic, $english, $str);
}

// ==============================================================================
// بخش ۴: دیاگنوستیک بصری در صورت باز کردن فایل در مرورگر (GET Request)
// ==============================================================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';

    $testResult = null;
    if (!empty($BOT_TOKEN)) {
        $testResult = callTelegramApi($BOT_TOKEN, 'getMe');
    }

    $webhookSetResult = null;
    if ($action === 'set_webhook' || isset($_GET['set_webhook'])) {
        $webhookSetResult = callTelegramApi($BOT_TOKEN, 'setWebhook', ['url' => $currentScriptUrl]);
    }

    if (isset($_GET['format']) && $_GET['format'] === 'json') {
        echo json_encode([
            'ok' => true,
            'service' => 'ONIVAL Standalone Telegram Bot Webhook',
            'version' => '1.1.0',
            'scriptUrl' => $currentScriptUrl,
            'botUsername' => '@' . $BOT_USERNAME,
            'adminChatId' => $ADMIN_CHAT_ID,
            'telegramApiStatus' => $testResult
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
    ?>
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>وضعیت ربات تلگرام اونیوال | ONIVAL Telegram Bot</title>
        <style>
            body { font-family: Tahoma, 'Segoe UI', sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; direction: rtl; }
            .container { max-width: 760px; margin: 0 auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); padding: 32px; border: 1px solid #e2e8f0; }
            h1 { font-size: 22px; color: #1e293b; margin-top: 0; display: flex; align-items: center; gap: 8px; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: bold; }
            .badge-success { background: #dcfce7; color: #15803d; }
            .badge-warning { background: #fef3c7; color: #b45309; }
            .card { background: #f1f5f9; border-radius: 10px; padding: 16px; margin: 16px 0; font-size: 14px; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            .row:last-child { border-bottom: none; }
            .btn { display: inline-block; background: #0284c7; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 13px; border: none; cursor: pointer; }
            .btn-green { background: #16a34a; }
            pre { background: #0f172a; color: #38bdf8; padding: 12px; border-radius: 8px; direction: ltr; text-align: left; overflow-x: auto; font-size: 13px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>
                ✈️ وضعیت فایل اختصاصی ربات تلگرام (telegram-bot.php)
                <span class="badge badge-success">نسخه ۱.۱.۰</span>
            </h1>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
                این فایل در پوشه <code>public_html</code> هاست شما مستقر شده و تمام پیام‌های دریافتی از سرورهای تلگرام را پردازش می‌کند.
            </p>

            <div class="card">
                <div class="row">
                    <span>آدرس اینترنتی این فایل (Webhook URL):</span>
                    <strong style="direction: ltr;"><?php echo htmlspecialchars($currentScriptUrl); ?></strong>
                </div>
                <div class="row">
                    <span>نام کاربری ربات تلگرام:</span>
                    <strong>@<?php echo htmlspecialchars($BOT_USERNAME); ?></strong>
                </div>
                <div class="row">
                    <span>وضعیت اتصال به API تلگرام (getMe):</span>
                    <span>
                        <?php if (!empty($testResult['ok'])): ?>
                            <span class="badge badge-success">✅ متصل (@<?php echo htmlspecialchars($testResult['result']['username'] ?? ''); ?>)</span>
                        <?php else: ?>
                            <span class="badge badge-warning">⚠️ عدم پاسخ یا نیاز به فیلترشکن روی سرور خارجی</span>
                        <?php endif; ?>
                    </span>
                </div>
            </div>

            <div style="display: flex; gap: 10px; margin: 20px 0;">
                <a href="?action=set_webhook" class="btn btn-green">⚡ ثبت فوری وبهوک در تلگرام</a>
                <a href="<?php echo htmlspecialchars($currentScriptUrl); ?>" class="btn">🔄 تازه‌سازی</a>
            </div>

            <div style="margin-top: 24px;">
                <h3 style="font-size: 15px; margin-bottom: 8px;">دستور ثبت دستی وبهوک در مرورگر:</h3>
                <pre>https://api.telegram.org/bot<?php echo htmlspecialchars($BOT_TOKEN); ?>/setWebhook?url=<?php echo urlencode($currentScriptUrl); ?></pre>
            </div>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// ==============================================================================
// بخش ۵: پردازش به‌روزرسانی‌های دریافتی از تلگرام (POST Webhook Handling)
// ==============================================================================
$rawInput = file_get_contents('php://input');
$update = @json_decode($rawInput, true);

if (!$update || !is_array($update)) {
    echo json_encode(['ok' => false, 'error' => 'No valid payload']);
    exit;
}

$message = $update['message'] ?? null;
if (!$message) {
    echo json_encode(['ok' => true, 'note' => 'No message']);
    exit;
}

$chatId = $message['chat']['id'] ?? null;
$senderName = trim(($message['from']['first_name'] ?? '') . ' ' . ($message['from']['last_name'] ?? ''));
$text = trim($message['text'] ?? ($message['caption'] ?? ''));
$keyboard = buildMainTelegramKeyboard();

// ۰. پردازش عکس فیش واریزی کارت‌به‌کارت (message.photo)
$hasPhoto = !empty($message['photo']) && is_array($message['photo']);
$hasDocImage = !empty($message['document']) && strpos($message['document']['mime_type'] ?? '', 'image') !== false;

if ($hasPhoto || $hasDocImage) {
    $photoArray = $message['photo'] ?? [];
    $fileId = $hasPhoto ? end($photoArray)['file_id'] : ($message['document']['file_id'] ?? '');
    $captionText = trim($message['caption'] ?? '');
    
    // جستجوی کد فاکتور در متن کپشن یا آخرین سفارش پرداخت‌نشده
    $matched = null;
    if (preg_match('/(?:فاکتور|سفارش|کد|رهگیری|پرداخت|شماره|فیش|رسید|invoice|order)?\s*[:#-]?\s*([A-Za-z0-9_-]+)/iu', $captionText, $m)) {
        if (preg_match('/\d/', $m[1])) {
            $codeCand = trim($m[1]);
            foreach ($db['orders'] ?? [] as $ord) {
                if (strcasecmp($ord['trackingCode'] ?? '', $codeCand) === 0 || (string)($ord['id'] ?? '') === $codeCand) {
                    $matched = $ord;
                    break;
                }
            }
        }
    }
    if (!$matched && !empty($db['orders'])) {
        foreach ($db['orders'] as $ord) {
            if (($ord['paymentStatus'] ?? '') !== 'Paid') {
                $matched = $ord;
                break;
            }
        }
        if (!$matched) $matched = $db['orders'][0];
    }

    if ($matched) {
        foreach ($db['orders'] as &$ord) {
            if (($ord['trackingCode'] ?? '') === $matched['trackingCode'] || (string)($ord['id'] ?? '') === (string)$matched['id']) {
                $ord['receiptFileId'] = $fileId;
                $ord['telegramChatId'] = $chatId;
                $ord['paymentMethod'] = 'card_to_card';
                $ord['paymentStatus'] = 'PendingVerification';
                $ord['receiptUploadedAt'] = date('c');
                $matched = $ord;
                break;
            }
        }
        updateDatabaseTg($activeDbPath, $db);
    }

    $finalOrderCode = $matched['trackingCode'] ?? 'سفارش ثبت‌شده';
    $custDisplayName = !empty($matched['userFullName']) ? $matched['userFullName'] : ($senderName ?: 'مشتری گرامی');
    $custPhone = !empty($matched['phoneNumber']) ? $matched['phoneNumber'] : 'ثبت‌نشده';
    $orderAmountToman = (int)($matched['finalTotal'] ?? $matched['totalPrice'] ?? $matched['total'] ?? 0);

    // پیام به مشتری
    $customerThanks =
        "از خرید و حسن اعتماد شما به محصولات ارگانیک اونیوال صمیمانه سپاسگزاریم! 🌿🍯\n\n" .
        "📸 تصویر فیش واریزی شما با موفقیت در سامانه ثبت شد و جهت بررسی و تأیید نهایی برای مدیریت ارسال گردید.\n\n" .
        "🔖 کد فاکتور: {$finalOrderCode}\n" .
        ($orderAmountToman > 0 ? "💰 مبلغ فاکتور: " . number_format($orderAmountToman) . " تومان\n" : "") .
        "⏳ وضعیت: در انتظار بررسی و تأیید مدیریت\n\n" .
        "به محض تأیید فیش توسط مدیریت، پیام تایید نهایی برای شما ارسال خواهد شد. 📦✨";

    sendTelegramMessage($BOT_TOKEN, $chatId, $customerThanks, $keyboard);

    // ارسال به ادمین
    if (!empty($ADMIN_CHAT_ID)) {
        $itemsList = '';
        foreach ($matched['items'] ?? [] as $it) {
            $pName = $it['productName'] ?? $it['title'] ?? 'محصول ارگانیک';
            $qty = $it['quantity'] ?? 1;
            $itemsList .= "▫️ $pName × $qty عدد\n";
        }
        if (empty($itemsList)) $itemsList = "▫️ فیش واریز مستقیم\n";

        $adminCaption =
            "🔔 فیش واریز کارت‌به‌کارت جدید در تلگرام!\n\n" .
            "📦 شماره سفارش: {$finalOrderCode}\n" .
            "👤 خریدار: {$custDisplayName}\n" .
            "📱 تلفن مشتری: {$custPhone}\n" .
            "💰 مبلغ فاکتور: " . number_format($orderAmountToman) . " تومان\n" .
            "⏰ زمان ارسال: " . date('Y/m/d - H:i') . "\n\n" .
            "📦 اقلام سفارش:\n{$itemsList}\n" .
            "⚡ جهت تایید رسید روی دستور زیر کلیک فرمایید:\n" .
            "/confirm_{$finalOrderCode}";

        $adminButtons = [
            'inline_keyboard' => [
                [['text' => '✅ تایید این فیش واریزی', 'callback_data' => "confirm_{$finalOrderCode}"]],
                [['text' => '🌐 مشاهده سفارش در سایت', 'url' => "{$STORE_URL}?track={$finalOrderCode}"]]
            ]
        ];

        $photoRes = sendTelegramPhoto($BOT_TOKEN, $ADMIN_CHAT_ID, $fileId, $adminCaption, $adminButtons);
        if (empty($photoRes['ok'])) {
            sendTelegramMessage($BOT_TOKEN, $ADMIN_CHAT_ID, $adminCaption, $adminButtons);
        }
    }

    echo json_encode(['ok' => true]);
    exit;
}

// ۰-۱. پردازش دستور تایید فیش توسط ادمین: /confirm_CODE یا /approve_CODE
if (preg_match('/^\/(?:confirm_|approve_|تایید_)([A-Za-z0-9_-]+)/iu', $text, $matches)) {
    $codeToConfirm = strtoupper(trim($matches[1]));
    $foundOrder = null;
    foreach ($db['orders'] ?? [] as &$ord) {
        if (strtoupper($ord['trackingCode'] ?? '') === $codeToConfirm || (string)($ord['id'] ?? '') === $codeToConfirm) {
            $ord['paymentStatus'] = 'Paid';
            $ord['status'] = 'Processing';
            $ord['approvedAt'] = date('c');
            $foundOrder = $ord;
            break;
        }
    }
    if ($foundOrder) {
        updateDatabaseTg($activeDbPath, $db);
        $custName = $foundOrder['userFullName'] ?? $foundOrder['customerName'] ?? 'مشتری گرامی';
        $adminReply = "✅ فاکتور و فیش سفارش {$foundOrder['trackingCode']} با موفقیت تایید شد!\nوضعیت: در حال آماده‌سازی و ارسال پستی\nپیام اطلاع‌رسانی برای خریدار ارسال گردید.";
        sendTelegramMessage($BOT_TOKEN, $chatId, $adminReply);

        // اطلاع به مشتری
        $custChat = $foundOrder['telegramChatId'] ?? $foundOrder['chatId'] ?? null;
        if ($custChat) {
            $custNotify =
                "🎉 خریدار گرامی {$custName} عزیز،\n\n" .
                "✅ فیش واریزی شما برای سفارش {$foundOrder['trackingCode']} توسط مدیریت فروشگاه تأیید گردید!\n\n" .
                "📦 وضعیت سفارش شما به «در حال آماده‌سازی و ارسال پستی 🚚» تغییر یافت.\n\n" .
                "از خرید و همراهی گرم شما با مجموعه فرآورده‌های ارگانیک اونیوال صمیمانه سپاسگزاریم. 🍯🌿\n\n" .
                "🔍 پیگیری لحظه‌ای سفارش:\n{$STORE_URL}?track={$foundOrder['trackingCode']}";

            sendTelegramMessage($BOT_TOKEN, $custChat, $custNotify, [
                'inline_keyboard' => [
                    [['text' => '🌐 پیگیری سفارش در وب‌سایت', 'url' => "{$STORE_URL}?track={$foundOrder['trackingCode']}"]]
                ]
            ]);
        }
    } else {
        sendTelegramMessage($BOT_TOKEN, $chatId, "⚠️ سفارشی با کد «{$codeToConfirm}» یافت نشد.");
    }
    echo json_encode(['ok' => true]);
    exit;
}

// ۱. پردازش پرداخت موفق (successful_payment)
if (isset($message['successful_payment'])) {
    $sp = $message['successful_payment'];
    $orderPayload = $sp['invoice_payload'] ?? '';
    $cleanOrderCode = str_replace('_', '-', $orderPayload);
    if (strpos($cleanOrderCode, 'pay-') === 0) {
        $cleanOrderCode = substr($cleanOrderCode, 4);
    }
    $totalAmountToman = round(($sp['total_amount'] ?? 0) / 10);

    // به‌روزرسانی وضعیت سفارش در دیتابیس
    $foundOrder = null;
    if (isset($db['orders']) && is_array($db['orders'])) {
        foreach ($db['orders'] as &$ord) {
            if ($ord['trackingCode'] === $cleanOrderCode || $ord['orderNumber'] === $cleanOrderCode) {
                $ord['status'] = 'Processing';
                $ord['paymentStatus'] = 'Paid';
                $ord['paymentMethod'] = 'telegram_payment';
                $ord['paidAt'] = date('c');
                $foundOrder = $ord;
                break;
            }
        }
        updateDatabaseTg($activeDbPath, $db);
    }

    $customerDisplayName = !empty($foundOrder['customerName']) ? $foundOrder['customerName'] : ($senderName ?: 'مشتری گرامی');
    $orderFinalCode = !empty($foundOrder['trackingCode']) ? $foundOrder['trackingCode'] : $cleanOrderCode;
    $orderFinalAmount = !empty($foundOrder['finalTotal']) ? number_format($foundOrder['finalTotal']) : number_format($totalAmountToman);

    // پیام مشتری
    $customerReceipt =
        "✅ پرداخت شما با موفقیت تأیید شد!\n\n" .
        "📦 کد پیگیری سفارش: {$orderFinalCode}\n" .
        "👤 خریدار: {$customerDisplayName}\n" .
        "💳 مبلغ پرداختی: {$orderFinalAmount} تومان\n\n" .
        "🌿 سفارش شما برای بسته‌بندی ارسال گردید. سپاس از خرید شما.";
    sendTelegramMessage($BOT_TOKEN, $chatId, $customerReceipt);

    // ارسال نوتیفیکیشن اختصاصی به ادمین (فقط در مرحله پرداخت موفق)
    if (!empty($ADMIN_CHAT_ID)) {
        $adminAlert =
            "🔔 سفارش جدید در تلگرام با موفقیت پرداخت شد!\n\n" .
            "📦 شماره سفارش: {$orderFinalCode}\n" .
            "👤 خریدار: {$customerDisplayName}\n" .
            "💰 مبلغ: {$orderFinalAmount} تومان\n" .
            "📱 تلفن: " . ($foundOrder['customerPhone'] ?? 'ثبت نشده') . "\n" .
            "⏰ زمان: " . date('Y/m/d - H:i');
        sendTelegramMessage($BOT_TOKEN, $ADMIN_CHAT_ID, $adminAlert);
    }

    echo json_encode(['ok' => true]);
    exit;
}

// ۲. پردازش استارت (/start)
if (strpos($text, '/start') === 0) {
    $param = trim(substr($text, 6));
    if (!empty($param)) {
        $cleanParam = str_replace('_', '-', $param);
        if (strpos($cleanParam, 'pay-') === 0) {
            $cleanParam = substr($cleanParam, 4);
        }

        $matchedOrder = null;
        if (isset($db['orders']) && is_array($db['orders'])) {
            foreach ($db['orders'] as $ord) {
                if ($ord['trackingCode'] === $cleanParam || $ord['orderNumber'] === $cleanParam) {
                    $matchedOrder = $ord;
                    break;
                }
            }
        }

        if ($matchedOrder) {
            $orderCode = $matchedOrder['trackingCode'];
            $totalToman = 0;
            if (!empty($matchedOrder['finalTotal']) && is_numeric($matchedOrder['finalTotal']) && (int)$matchedOrder['finalTotal'] > 0) {
                $totalToman = (int)$matchedOrder['finalTotal'];
            } elseif (!empty($matchedOrder['totalPrice']) && is_numeric($matchedOrder['totalPrice']) && (int)$matchedOrder['totalPrice'] > 0) {
                $totalToman = (int)$matchedOrder['totalPrice'];
            } elseif (!empty($matchedOrder['total']) && is_numeric($matchedOrder['total']) && (int)$matchedOrder['total'] > 0) {
                $totalToman = (int)$matchedOrder['total'];
            } elseif (!empty($matchedOrder['price']) && is_numeric($matchedOrder['price']) && (int)$matchedOrder['price'] > 0) {
                $totalToman = (int)$matchedOrder['price'];
            } else {
                $totalToman = 150000;
            }
            $amount = number_format($totalToman);
            $buyer = !empty($matchedOrder['userFullName']) ? $matchedOrder['userFullName'] : (!empty($matchedOrder['customerName']) ? $matchedOrder['customerName'] : 'مشتری گرامی');
            $phone = !empty($matchedOrder['phoneNumber']) ? $matchedOrder['phoneNumber'] : (!empty($matchedOrder['customerPhone']) ? $matchedOrder['customerPhone'] : '');
            
            $itemsList = '';
            $i = 1;
            foreach ($matchedOrder['items'] ?? [] as $it) {
                $pName = !empty($it['productName']) ? $it['productName'] : (!empty($it['title']) ? $it['title'] : 'محصول ارگانیک');
                $size = !empty($it['size']) ? $it['size'] : '';
                $qty = !empty($it['quantity']) ? (int)$it['quantity'] : 1;
                $itPrice = !empty($it['totalPrice']) ? (int)$it['totalPrice'] : 0;
                $itemsList .= "▫️ {$i}. {$pName}" . ($size && $size !== 'استاندارد' ? " ({$size})" : "") . " × {$qty} عدد" . ($itPrice > 0 ? " — " . number_format($itPrice) . " تومان" : "") . "\n";
                $i++;
            }
            if (empty($itemsList)) {
                $itemsList = "▫️ ۱. فرآورده‌های ارگانیک اونیوال\n";
            }

            $invMsg =
                "🧾 فاکتور سفارش {$orderCode}\n\n" .
                "👤 خریدار: {$buyer}" . (!empty($phone) ? " ({$phone})" : "") . "\n" .
                (!empty($matchedOrder['userAddress']) ? "📍 نشانی تحویل: {$matchedOrder['userAddress']}\n" : "") .
                "\n📦 اقلام سفارش:\n{$itemsList}\n" .
                "💰 مبلغ کل قابل پرداخت: {$amount} تومان\n\n" .
                "💳 شماره کارت جهت واریز:\n" .
                "۶۰۳۷-۹۹۷۵-۹۹۱۲-۳۴۵۶\n" .
                "به نام: مجموعه تخصصی فرآورده‌های ارگانیک اونیوال (بانک ملی)\n\n" .
                "یا پرداخت مستقیم شتابی در وب‌سایت:";

            $invButtons = [
                'inline_keyboard' => [
                    [
                        ['text' => '🌐 پرداخت آنلاین در سایت', 'url' => "{$STORE_URL}?track={$orderCode}"]
                    ]
                ]
            ];
            sendTelegramMessage($BOT_TOKEN, $chatId, $invMsg, $invButtons);
            echo json_encode(['ok' => true]);
            exit;
        }
    }

    $welcome =
        "سلام {$senderName} عزیز! 🌿\n\n" .
        "به ربات تلگرام فروشگاه تخصصی محصولات ارگانیک اونیوال (ONIVAL) خوش آمدید.\n" .
        "جهت پیگیری یا پرداخت سفارشات از گزینه‌های زیر استفاده فرمایید:";
    sendTelegramMessage($BOT_TOKEN, $chatId, $welcome, $keyboard);
    echo json_encode(['ok' => true]);
    exit;
}

// ۳. پاسخ به دکمه‌های منو
if (mb_strpos($text, 'فروشگاه') !== false) {
    sendTelegramMessage($BOT_TOKEN, $chatId, "🛍️ ورود به فروشگاه آنلاین اونیوال:\n{$STORE_URL}", [
        'inline_keyboard' => [[['text' => '🛍️ ورود به سایت', 'url' => $STORE_URL]]]
    ]);
    echo json_encode(['ok' => true]);
    exit;
}

if (mb_strpos($text, 'پیگیری') !== false) {
    sendTelegramMessage($BOT_TOKEN, $chatId, "📦 لطفاً کد رهگیری سفارش خود را ارسال فرمایید (مثال: ONV-ORD-101).", $keyboard);
    echo json_encode(['ok' => true]);
    exit;
}

if (mb_strpos($text, 'فاکتور') !== false) {
    sendTelegramMessage($BOT_TOKEN, $chatId, "🧾 شماره سفارش خود را ارسال نمایید تا فاکتور برای شما صادر گردد.", $keyboard);
    echo json_encode(['ok' => true]);
    exit;
}

// پاسخ پیش‌فرض
sendTelegramMessage($BOT_TOKEN, $chatId, "پیام شما دریافت شد. لطفاً یکی از گزینه‌های منو را انتخاب فرمایید.", $keyboard);
echo json_encode(['ok' => true]);
