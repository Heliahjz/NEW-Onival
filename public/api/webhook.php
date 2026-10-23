<?php
/**
 * ==============================================================================
 * ONIVAL Standalone PHP Webhook Bridge for Bale & Telegram
 * ==============================================================================
 * Compatible with all PHP shared hosts (cPanel, DirectAdmin, Apache, LiteSpeed, Nginx)
 * - Zero external dependencies (native PHP + cURL)
 * - Full support for Bale Wallet Invoices (sendInvoice, answerPreCheckoutQuery, successful_payment)
 * - Full support for Telegram Bot API
 * - Interactive Persistent Keyboards (Buttons) & Inline Links
 * - Secure atomic file-locking persistence with server-data/onival-persistent-data.json
 * - STRICT RULE: Admin notifications are ONLY dispatched when payment is confirmed!
 * ==============================================================================
 */

// Error silencing to protect JSON response integrity
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
ini_set('display_errors', '0');

// JSON & CORS Headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('X-Powered-By: Onival-PHP-Webhook-Bridge');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['ok' => true]);
    exit;
}

// ------------------------------------------------------------------------------
// 1. Resolve Persistence Database File
// ------------------------------------------------------------------------------
$rootDir = dirname(__DIR__); // public or dist root
$parentDir = dirname(dirname(__DIR__));

$candidateDataPaths = [
    $parentDir . '/server-data/onival-persistent-data.json',
    $rootDir . '/server-data/onival-persistent-data.json',
    __DIR__ . '/server-data/onival-persistent-data.json',
    __DIR__ . '/../server-data/onival-persistent-data.json',
    $parentDir . '/onival-persistent-data.json',
    $rootDir . '/onival-persistent-data.json',
    sys_get_temp_dir() . '/onival-persistent-data.json'
];

$activeDataFile = null;
foreach ($candidateDataPaths as $cand) {
    if (!empty($cand) && file_exists($cand)) {
        $activeDataFile = $cand;
        break;
    }
}

if (!$activeDataFile) {
    // Attempt to initialize in parent server-data directory or local server-data
    $targetDir = is_dir($parentDir) ? ($parentDir . '/server-data') : ($rootDir . '/server-data');
    if (!is_dir($targetDir)) {
        @mkdir($targetDir, 0755, true);
        @file_put_contents($targetDir . '/.htaccess', "Order allow,deny\nDeny from all\n");
    }
    $activeDataFile = $targetDir . '/onival-persistent-data.json';
}

function loadDb($dataFile) {
    if (!file_exists($dataFile)) return [];
    $raw = @file_get_contents($dataFile);
    if (!$raw) return [];
    $parsed = @json_decode($raw, true);
    return is_array($parsed) ? $parsed : [];
}

function saveDb($dataFile, $data) {
    if (empty($dataFile)) return false;
    $data['updatedAt'] = date('c');
    $raw = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
    // Write with atomic file lock
    $dir = dirname($dataFile);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    $res = @file_put_contents($dataFile, $raw, LOCK_EX);
    
    // Also mirror to other reachable server-data locations to keep in sync
    $parentDir = dirname(dirname(__DIR__));
    $mirror = $parentDir . '/server-data/onival-persistent-data.json';
    if ($mirror !== $dataFile && is_dir(dirname($mirror))) {
        @file_put_contents($mirror, $raw, LOCK_EX);
    }
    return $res !== false;
}

$db = loadDb($activeDataFile);
$telegramConfig = $db['telegramConfig'] ?? [];
$siteContent = $db['siteContent'] ?? [];

// ------------------------------------------------------------------------------
// 2. HTTP GET Diagnostics (Test connection from browser or admin dashboard)
// ------------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $currentUrl = "$proto://$host" . ($_SERVER['REQUEST_URI'] ?? '/api/webhook.php');
    
    echo json_encode([
        'ok' => true,
        'status' => 'active',
        'service' => 'ONIVAL Standalone PHP Webhook Bridge',
        'version' => '1.1.0',
        'engine' => 'PHP ' . PHP_VERSION,
        'timestamp' => date('Y-m-d H:i:s'),
        'dataFile' => basename(dirname($activeDataFile)) . '/' . basename($activeDataFile),
        'dataFileExists' => file_exists($activeDataFile),
        'ordersCount' => count($db['orders'] ?? []),
        'productsCount' => count($db['products'] ?? []),
        'baleCustomerBot' => '@' . ltrim($telegramConfig['baleBotUsername'] ?? 'Onivalbot', '@'),
        'baleAdminBot' => '@' . ltrim($telegramConfig['baleAdminUsername'] ?? 'hasti_hjz', '@'),
        'adminChatId' => $telegramConfig['baleAdminChatId'] ?? $telegramConfig['adminChatId'] ?? '69451465',
        'paymentMode' => $telegramConfig['balePaymentMode'] ?? 'live',
        'webhookUrl' => $currentUrl,
        'message' => 'وبهوک اختصاصی PHP فروشگاه اونیوال روی هاست فعال و آماده دریافت درخواست‌های بله و تلگرام است.'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// ------------------------------------------------------------------------------
// 3. Receive Incoming Webhook Payload
// ------------------------------------------------------------------------------
$rawInput = file_get_contents('php://input');
$update = @json_decode($rawInput, true);

if (!$update || !is_array($update)) {
    echo json_encode(['ok' => false, 'error' => 'No valid JSON payload received']);
    exit;
}

// Identify Platform & Target Bot Scope
$queryPlatform = strtolower(trim($_GET['platform'] ?? ''));
$queryBot = strtolower(trim($_GET['bot'] ?? 'customer'));

$isTelegram = ($queryPlatform === 'telegram' || strpos($_SERVER['REQUEST_URI'] ?? '', 'telegram') !== false);
$platform = $isTelegram ? 'telegram' : 'bale';

// Resolve Tokens & Base URLs
$baleCustomerToken = trim($telegramConfig['baleBotToken'] ?? $telegramConfig['botToken'] ?? '1204808805:W-mq-hFRtv71zdHaRFSUYdr2GWCJPCvQD34');
$baleAdminToken = trim($telegramConfig['baleAdminBotToken'] ?? '');
$telegramToken = trim($telegramConfig['telegramBotToken'] ?? '');

$baleBaseUrl = rtrim($telegramConfig['baleBaseUrl'] ?? $telegramConfig['baseUrl'] ?? 'https://tapi.bale.ai', '/');
$telegramBaseUrl = rtrim($telegramConfig['telegramBaseUrl'] ?? 'https://api.telegram.org', '/');

$activeBaseUrl = $isTelegram ? $telegramBaseUrl : $baleBaseUrl;
$activeToken = $isTelegram ? $telegramToken : ($queryBot === 'admin' && !empty($baleAdminToken) ? $baleAdminToken : $baleCustomerToken);

// Wallet Provider Token for Bale Invoices
$walletToken = '';
$baleMode = strtolower($telegramConfig['balePaymentMode'] ?? 'test');
if ($baleMode === 'test') {
    $walletToken = trim($telegramConfig['balePaymentTokenTest'] ?? 'WALLET-TEST-1111111111111111');
} else {
    if (!empty($telegramConfig['balePaymentTokenLive'])) {
        $walletToken = trim($telegramConfig['balePaymentTokenLive']);
    } elseif (!empty($telegramConfig['balePaymentToken'])) {
        $walletToken = trim($telegramConfig['balePaymentToken']);
    } else {
        $walletToken = 'WALLET-TEST-1111111111111111';
    }
}
if (empty($walletToken)) {
    $walletToken = 'WALLET-TEST-1111111111111111';
}

$configuredAdminChat = trim($telegramConfig['baleAdminChatId'] ?? $telegramConfig['adminChatId'] ?? '69451465');
$configuredAdminUser = strtolower(trim($telegramConfig['baleAdminUsername'] ?? 'hasti_hjz', '@'));

// cURL API Request Helper
function callBotApi($baseUrl, $token, $method, $payload = []) {
    if (empty($token)) return ['ok' => false, 'description' => 'Bot token is empty'];
    
    $url = "$baseUrl/bot$token/$method";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_UNICODE));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json; charset=utf-8']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 8);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $data = @json_decode($response, true);
    return is_array($data) ? $data : ['ok' => ($httpCode === 200), 'raw' => $response, 'httpCode' => $httpCode];
}

// Convert Persian/Arabic digits to English digits
function toEnglishDigitsPhp($str) {
    if (!$str) return '';
    $persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    $arabic  = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    $english = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    $str = str_replace($persian, $english, $str);
    return str_replace($arabic, $english, $str);
}

// Extract Tracking Code from user message text
function extractTrackingCodeFromTextPhp($text) {
    if (!$text || !is_string($text)) return null;
    $trimmed = trim(toEnglishDigitsPhp($text));
    
    // Ignore generic menu commands
    if (preg_match('#^[/!#]?(start|help|admin|orders|شروع|راهنما|سفارشات|فروشگاه|محصولات|تماس|پشتیبانی|پیگیری|پرداخت)$#iu', $trimmed)) {
        return null;
    }
    if (preg_match('#^(🛍️|🛒|📞|☎️|📦|🔍|💳|🧾)#u', $trimmed)) {
        return null;
    }
    
    // 1. /start with parameter: /start pay_ONV-ORD-949 or /start 949 or /start ONV_ORD_91542
    if (preg_match('#^/start(?:[\s_]+)(?:pay_|order_|پرداخت_)?([A-Za-z0-9_-]+)#iu', $trimmed, $m)) {
        $cand = trim(preg_replace('#^(?:pay_|order_|پرداخت_)#iu', '', $m[1]));
        if (!empty($cand) && !preg_match('#^(admin|help|orders|start)$#iu', $cand)) {
            return $cand;
        }
    }

    // 2. /confirm_CODE or /approve_CODE
    if (preg_match('#^/(?:confirm_|approve_|تایید_)([A-Za-z0-9_-]+)#iu', $trimmed, $m)) {
        return trim($m[1]);
    }
    
    // 3. Direct ONV-ORD or ORD or prefix pattern
    if (preg_match('#(ONV[-_]?[A-Za-z0-9_-]+|ORD[-_]?[A-Za-z0-9_-]+)#iu', $trimmed, $m)) {
        return trim($m[1]);
    }
    
    // 4. Persian prefix queries: e.g. "فاکتور 91542", "سفارش 10482", "رسید 915"
    if (preg_match('#(?:فاکتور|سفارش|کد|رهگیری|پرداخت|شماره|فیش|رسید|invoice|order)\s*[:#-]?\s*([A-Za-z0-9_-]+)#iu', $trimmed, $m)) {
        if (preg_match('#\d#', $m[1])) {
            return trim($m[1]);
        }
    }
    
    // 5. Standalone tracking code (digits of any length 1-15 or alphanumeric)
    if (!str_starts_with($trimmed, '/') && preg_match('#^[A-Za-z0-9_-]{2,30}$#', $trimmed) && preg_match('#\d#', $trimmed)) {
        return $trimmed;
    }

    // 6. Any number sequence of 3 to 15 digits
    if (preg_match('#\b\d{3,15}\b#', $trimmed, $m)) {
        return $m[0];
    }
    
    return null;
}

// Find Order by Tracking Code or ID (flexible without digit limits)
function findOrderPhp(&$db, $code) {
    if (!$code) return null;
    $raw = trim((string)$code);
    $clean = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $raw));
    $clean = preg_replace('/^(PAY|ORDER)/', '', $clean);
    
    foreach ($db['orders'] ?? [] as &$o) {
        $oRaw = trim($o['trackingCode'] ?? '');
        $oClean = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $oRaw));
        $oId = (string)($o['id'] ?? '');
        $oNum = trim($o['orderNumber'] ?? '');
        
        if (strcasecmp($oRaw, $raw) === 0 || strcasecmp($oNum, $raw) === 0 || $oId === $raw) {
            return $o;
        }
        
        if (!empty($clean)) {
            if ($oClean === $clean || $oId === $clean) {
                return $o;
            }
            if (strlen($clean) >= 3 && (strpos($oClean, $clean) !== false || strpos($clean, $oClean) !== false)) {
                return $o;
            }
        }
        
        // Match numbers of arbitrary length
        preg_match('/\d+/', $raw, $qDigits);
        if (!empty($qDigits[0])) {
            preg_match('/\d+/', $oRaw, $tDigits);
            if (!empty($tDigits[0]) && $qDigits[0] === $tDigits[0]) {
                return $o;
            }
            if ($oId === $qDigits[0] || $oNum === $qDigits[0]) {
                return $o;
            }
        }
    }
    return null;
}

// Send Admin Bot Notification (Strictly used for actual payments, not invoice browsing)
function sendAdminNotification($baseUrl, $token, $adminChatId, $text) {
    if (empty($adminChatId) || empty($token)) return false;
    return callBotApi($baseUrl, $token, 'sendMessage', [
        'chat_id' => $adminChatId,
        'text' => $text
    ]);
}

// ------------------------------------------------------------------------------
// 4. Handle Bale Pre-Checkout Query (Bale Wallet Payment Gateway Step 1)
// ------------------------------------------------------------------------------
if (!empty($update['pre_checkout_query'])) {
    $pcq = $update['pre_checkout_query'];
    $pcqId = $pcq['id'] ?? '';
    
    // Automatically approve pre-checkout
    $ansRes = callBotApi($activeBaseUrl, $activeToken, 'answerPreCheckoutQuery', [
        'pre_checkout_query_id' => $pcqId,
        'ok' => true
    ]);
    
    $db['botActivityLogs'] = $db['botActivityLogs'] ?? [];
    array_unshift($db['botActivityLogs'], [
        'id' => time() * 1000,
        'time' => date('H:i'),
        'type' => 'bale_pre_checkout',
        'platform' => $platform,
        'text' => "تاییدیه کیف پول بله (pre_checkout_query) برای سفارش با موفقیت پاسخ داده شد.",
        'status' => 'success',
        'rawResponse' => $ansRes
    ]);
    saveDb($activeDataFile, $db);
    
    echo json_encode(['ok' => true]);
    exit;
}

// ------------------------------------------------------------------------------
// 5. Handle Successful Payment (Bale Wallet Payment Gateway Step 2)
// ------------------------------------------------------------------------------
if (!empty($update['message']['successful_payment'])) {
    $msg = $update['message'];
    $sp = $msg['successful_payment'];
    $customerChatId = $msg['chat']['id'] ?? '';
    $invoicePayload = $sp['invoice_payload'] ?? '';
    
    // Extract tracking code from invoice payload: e.g. "order_ONV-ORD-949"
    $extractedCode = preg_replace('/^order_/i', '', $invoicePayload);
    $order = findOrderPhp($db, $extractedCode);
    
    if ($order) {
        $order['paymentStatus'] = 'Paid';
        $order['status'] = 'Processing';
        $order['paymentMethod'] = 'bale_bot';
        
        $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $siteHost = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $siteTrackUrl = "$proto://$siteHost/?track=" . urlencode($order['trackingCode']);
        
        // 1. Reply to Customer in Bale with receipt confirmation
        $customerReceipt =
            "✅ پرداخت فاکتور با موفقیت در بله انجام شد!\n\n" .
            "🧾 فاکتور سفارش: {$order['trackingCode']}\n" .
            "💰 مبلغ پرداخت شده: " . number_format((int)($order['totalPrice'] ?? 0)) . " تومان\n" .
            "📦 وضعیت سفارش: در حال آماده‌سازی و بسته‌بندی مرسوله\n\n" .
            "🔍 پیگیری لحظه‌ای مرسوله در وب‌سایت اونیوال:\n$siteTrackUrl\n\n" .
            "از حسن انتخاب و اعتماد شما سپاسگزاریم 🍯🌿";
            
        callBotApi($activeBaseUrl, $activeToken, 'sendMessage', [
            'chat_id' => $customerChatId,
            'text' => $customerReceipt
        ]);
        
        // 2. CRITICAL FIX: NOTIFY STORE ADMIN ONLY NOW WHEN PAYMENT IS ACTUALLY PAID!
        $adminTokenToUse = !empty($baleAdminToken) ? $baleAdminToken : $activeToken;
        if (!empty($configuredAdminChat)) {
            $itemsSummary = '';
            foreach ($order['items'] ?? [] as $it) {
                $pName = $it['productName'] ?? 'محصول';
                $size = $it['size'] ?? 'استاندارد';
                $qty = $it['quantity'] ?? 1;
                $itemsSummary .= "▫️ $pName ($size) × $qty عدد\n";
            }
            
            $adminAlert =
                "💰 تراکنش جدید در کیف پول بله!\n\n" .
                "🔖 کد رهگیری: {$order['trackingCode']}\n" .
                "👤 خریدار: {$order['userFullName']} ({$order['phoneNumber']})\n" .
                "💵 مبلغ تسویه شده: " . number_format((int)($order['totalPrice'] ?? 0)) . " تومان\n" .
                (!empty($order['userAddress']) ? "📍 آدرس تحویل: {$order['userAddress']}\n\n" : "\n") .
                "🛍 اقلام فاکتور:\n" . ($itemsSummary ?: "▫️ سفارش ثبت شده\n") . "\n" .
                "⚡ وضعیت سفارش به طور خودکار به «در حال پردازش / آماده‌سازی» تغییر یافت.\n" .
                "🔗 مشاهده در پنل و سایت: $siteTrackUrl";
                
            sendAdminNotification($activeBaseUrl, $adminTokenToUse, $configuredAdminChat, $adminAlert);
        }
        
        $db['botActivityLogs'] = $db['botActivityLogs'] ?? [];
        array_unshift($db['botActivityLogs'], [
            'id' => time() * 1000,
            'time' => date('H:i'),
            'type' => 'bale_payment_success',
            'platform' => $platform,
            'text' => "تراکنش فاکتور {$order['trackingCode']} در کیف پول بله تسویه گردید و اعلان به ادمین ($configuredAdminChat) ارسال شد.",
            'status' => 'success'
        ]);
        saveDb($activeDataFile, $db);
    }
    
    echo json_encode(['ok' => true]);
    exit;
}

// ------------------------------------------------------------------------------
// 6. Handle Incoming Messages & Commands
// ------------------------------------------------------------------------------
if (!empty($update['message'])) {
    $msg = $update['message'];
    $senderChatId = (string)($msg['chat']['id'] ?? '');
    $senderUsername = strtolower(trim($msg['from']['username'] ?? '', '@'));
    $text = trim($msg['text'] ?? ($msg['caption'] ?? ''));
    
    $isAdmin = (
        $senderChatId === $configuredAdminChat ||
        (!empty($configuredAdminUser) && $senderUsername === $configuredAdminUser) ||
        $queryBot === 'admin' ||
        $senderChatId === '69451465'
    );
    
    // Resolve dynamic site URLs
    $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $siteHost = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $storeUrl = (!empty($telegramConfig['panelBaseUrl']) && !strpos($telegramConfig['panelBaseUrl'], 'localhost'))
        ? rtrim($telegramConfig['panelBaseUrl'], '/')
        : "$proto://$siteHost";
        
    $supportUser = ltrim($telegramConfig['baleSupportId'] ?? $telegramConfig['baleBotUsername'] ?? 'onival_bale_support', '@');
    $supportUrl = "https://ble.ir/$supportUser";
    
    // Standard Persistent Quick Keyboard (Bottom persistent reply keyboard for customer)
    $replyKeyboard = [
        'keyboard' => [
            [['text' => '🧾 استعلام و پرداخت فاکتور من']],
            [['text' => '🛍️ فروشگاه اونیوال'], ['text' => '📦 پیگیری سفارش']],
            [['text' => '💳 راهنمای روش‌های پرداخت'], ['text' => '📞 تماس با ما و پشتیبانی']]
        ],
        'resize_keyboard' => true,
        'one_time_keyboard' => false
    ];

    // --------------------------------------------------------------------------
    // Photo Receipt Processing (Customer card-to-card receipt photo upload)
    // --------------------------------------------------------------------------
    $hasPhoto = !empty($msg['photo']) && is_array($msg['photo']);
    $hasDocImage = !empty($msg['document']) && strpos($msg['document']['mime_type'] ?? '', 'image') !== false;
    
    if ($hasPhoto || $hasDocImage) {
        $photoArray = $msg['photo'] ?? [];
        $fileId = $hasPhoto ? end($photoArray)['file_id'] : ($msg['document']['file_id'] ?? '');
        $captionText = trim($msg['caption'] ?? '');
        $codeCand = extractTrackingCodeFromTextPhp($captionText);
        $matched = null;
        if ($codeCand) {
            $matched = findOrderPhp($db, $codeCand);
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
                    $ord['baleChatId'] = $senderChatId;
                    $ord['paymentMethod'] = 'card_to_card';
                    $ord['paymentStatus'] = 'PendingVerification';
                    $ord['receiptUploadedAt'] = date('c');
                    $matched = $ord;
                    break;
                }
            }
            saveDb($activeDataFile, $db);
        }

        $orderCode = $matched['trackingCode'] ?? ($codeCand ?: 'سفارش ثبت‌شده');
        $custName = !empty($matched['userFullName']) ? $matched['userFullName'] : (!empty($matched['customerName']) ? $matched['customerName'] : 'مشتری گرامی');
        $custPhone = !empty($matched['phoneNumber']) ? $matched['phoneNumber'] : (!empty($matched['customerPhone']) ? $matched['customerPhone'] : 'ثبت‌نشده');
        $amountToman = (int)($matched['finalTotal'] ?? $matched['totalPrice'] ?? $matched['total'] ?? 0);

        // 1. Thank customer and acknowledge
        $custThanks =
            "از خرید و حسن اعتماد شما به محصولات ارگانیک اونیوال صمیمانه سپاسگزاریم! 🌿🍯\n\n" .
            "📸 تصویر فیش واریزی شما با موفقیت در سامانه ثبت شد و جهت بررسی و تأیید نهایی در اختیار مدیریت فروشگاه قرار گرفت.\n\n" .
            "🔖 شماره فاکتور: {$orderCode}\n" .
            ($amountToman > 0 ? "💰 مبلغ فاکتور: " . number_format($amountToman) . " تومان\n" : "") .
            "⏳ وضعیت: در انتظار بررسی و تأیید مدیریت\n\n" .
            "به محض بررسی و تأیید رسید توسط مدیریت، پیام تایید نهایی و آغاز آماده‌سازی مرسوله از همین طریق برای شما ارسال خواهد شد. 📦✨";

        callBotApi($activeBaseUrl, $activeToken, 'sendMessage', [
            'chat_id' => $senderChatId,
            'text' => $custThanks,
            'reply_markup' => $replyKeyboard
        ]);

        // 2. Forward to Admin
        if (!empty($configuredAdminChat)) {
            $adminTokenToUse = !empty($baleAdminToken) ? $baleAdminToken : $activeToken;
            $itemsList = '';
            foreach ($matched['items'] ?? [] as $it) {
                $pName = $it['productName'] ?? $it['title'] ?? 'محصول ارگانیک';
                $qty = $it['quantity'] ?? 1;
                $itemsList .= "▫️ $pName × $qty عدد\n";
            }
            if (empty($itemsList)) $itemsList = "▫️ فیش واریز مستقیم\n";

            $adminCaption =
                "🔔 رسید واریز کارت‌به‌کارت جدید دریافت شد!\n\n" .
                "📦 شماره فاکتور: {$orderCode}\n" .
                "👤 خریدار: {$custName}\n" .
                "📱 تلفن مشتری: {$custPhone}\n" .
                "💰 مبلغ فاکتور: " . number_format($amountToman) . " تومان\n" .
                "⏰ زمان ارسال رسید: " . date('Y/m/d - H:i') . "\n\n" .
                "📦 اقلام سفارش:\n{$itemsList}\n" .
                "⚡ جهت تایید رسید و تغییر وضعیت به پرداخت شده روی دستور زیر کلیک فرمایید:\n" .
                "/confirm_{$orderCode}";

            $adminButtons = [
                'inline_keyboard' => [
                    [['text' => '✅ تایید این فیش واریزی', 'callback_data' => "confirm_{$orderCode}"]],
                    [['text' => '🌐 مشاهده سفارش در سایت', 'url' => "$storeUrl/?track={$orderCode}"]]
                ]
            ];

            $photoSendRes = callBotApi($activeBaseUrl, $adminTokenToUse, 'sendPhoto', [
                'chat_id' => $configuredAdminChat,
                'photo' => $fileId,
                'caption' => mb_substr($adminCaption, 0, 1024, 'UTF-8'),
                'reply_markup' => $adminButtons
            ]);

            if (empty($photoSendRes['ok'])) {
                callBotApi($activeBaseUrl, $adminTokenToUse, 'sendMessage', [
                    'chat_id' => $configuredAdminChat,
                    'text' => $adminCaption,
                    'reply_markup' => $adminButtons
                ]);
            }
        }

        echo json_encode(['ok' => true]);
        exit;
    }

    // Helper: Deliver Invoice to Customer (WITHOUT prematurely notifying admin)
    $deliverInvoiceToCustomer = function($order, $heading = '') use ($senderChatId, $activeBaseUrl, $activeToken, $walletToken, $storeUrl, $supportUrl, $replyKeyboard, &$db, $activeDataFile, $platform) {
        $trackCode = $order['trackingCode'] ?? 'ONV-ORD';
        $totalToman = 0;
        if (!empty($order['finalTotal']) && is_numeric($order['finalTotal']) && (int)$order['finalTotal'] > 0) {
            $totalToman = (int)$order['finalTotal'];
        } elseif (!empty($order['totalPrice']) && is_numeric($order['totalPrice']) && (int)$order['totalPrice'] > 0) {
            $totalToman = (int)$order['totalPrice'];
        } elseif (!empty($order['total']) && is_numeric($order['total']) && (int)$order['total'] > 0) {
            $totalToman = (int)$order['total'];
        } elseif (!empty($order['price']) && is_numeric($order['price']) && (int)$order['price'] > 0) {
            $totalToman = (int)$order['price'];
        } else {
            $totalToman = 150000;
        }
        $totalFormatted = number_format($totalToman);
        $buyer = !empty($order['userFullName']) ? $order['userFullName'] : (!empty($order['customerName']) ? $order['customerName'] : 'مشتری گرامی');
        $phone = !empty($order['phoneNumber']) ? $order['phoneNumber'] : (!empty($order['customerPhone']) ? $order['customerPhone'] : '');
        $isPaid = ($order['paymentStatus'] ?? '') === 'Paid';
        
        $itemsText = '';
        $idx = 1;
        foreach ($order['items'] ?? [] as $it) {
            $pName = !empty($it['productName']) ? $it['productName'] : (!empty($it['title']) ? $it['title'] : (!empty($it['name']) ? $it['name'] : 'محصول ارگانیک'));
            $size = !empty($it['size']) ? $it['size'] : (!empty($it['weight']) ? $it['weight'] : 'استاندارد');
            $qty = !empty($it['quantity']) ? (int)$it['quantity'] : (!empty($it['count']) ? (int)$it['count'] : 1);
            $itemPrice = !empty($it['totalPrice']) ? (int)$it['totalPrice'] : (!empty($it['unitPrice']) ? ((int)$it['unitPrice'] * $qty) : (!empty($it['price']) ? ((int)$it['price'] * $qty) : 0));
            $itemsText .= "▫️ $idx. $pName" . ($size && $size !== 'استاندارد' ? " ($size)" : "") . " × $qty عدد - " . number_format($itemPrice) . " تومان\n";
            $idx++;
        }
        
        $siteTrackUrl = "$storeUrl/?track=" . urlencode($trackCode);
        
        $msgText = "🧾 فاکتور سفارش فروشگاه اونیوال (ONIVAL):\n\n";
        if (!empty($heading)) {
            $msgText .= "💡 $heading\n\n";
        }
        $msgText .=
            "🔖 شماره فاکتور: $trackCode\n" .
            "👤 خریدار: $buyer" . (!empty($phone) ? " ($phone)" : "") . "\n" .
            "💰 مبلغ کل قابل پرداخت: $totalFormatted تومان\n" .
            (!empty($order['userAddress']) ? "📍 نشانی تحویل: {$order['userAddress']}\n\n" : "\n") .
            "📦 اقلام سفارش:\n" . ($itemsText ?: "▫️ اقلام سبد خرید\n") . "\n" .
            "⏳ وضعیت پرداخت: " . ($isPaid ? "✅ پرداخت شده و ثبت نهایی (در حال آماده‌سازی و ارسال)" : "⏳ در انتظار پرداخت") . "\n\n";
            
        if (!$isPaid) {
            $msgText .=
                "──────────────────\n" .
                "💳 روش‌های پرداخت سریع:\n" .
                "۱️⃣ دکمه «پرداخت» کارت کیف پول بله در زیر\n" .
                "۲️⃣ پرداخت آنلاین شتابی در سایت\n" .
                "۳️⃣ کارت به کارت شتابی و ارسال فیش\n\n";
        }
        
        $msgText .= "🔍 پیگیری لحظه‌ای سفارش در وب‌سایت:\n$siteTrackUrl";
        
        $inlineKb = [
            'inline_keyboard' => [
                [
                    ['text' => ($isPaid ? '✅ مشاهده فاکتور در سایت' : "💳 پرداخت اینترنتی ($trackCode)"), 'url' => $siteTrackUrl]
                ],
                [
                    ['text' => '🔍 پیگیری سفارش در سایت', 'url' => $siteTrackUrl],
                    ['text' => '📞 پشتیبانی فروشگاه', 'url' => $supportUrl]
                ]
            ]
        ];
        
        // 1. Send details message with buttons
        $msgRes = callBotApi($activeBaseUrl, $activeToken, 'sendMessage', [
            'chat_id' => $senderChatId,
            'text' => $msgText,
            'reply_markup' => $inlineKb
        ]);
        
        // Fallback without reply_markup if Telegram/Bale rejected URL format
        if (empty($msgRes['ok'])) {
            callBotApi($activeBaseUrl, $activeToken, 'sendMessage', [
                'chat_id' => $senderChatId,
                'text' => $msgText
            ]);
        }
        
        // 2. If Bale and unpaid, send native Wallet sendInvoice
        if ($platform === 'bale' && !$isPaid && !empty($walletToken)) {
            $priceRial = max(10000, (int)($totalToman * 10));
            $invoicePayload = [
                'chat_id' => is_numeric($senderChatId) ? (int)$senderChatId : $senderChatId,
                'title' => mb_substr("فاکتور $trackCode", 0, 32, 'UTF-8'),
                'description' => mb_substr("پرداخت سفارش $trackCode فروشگاه اونیوال", 0, 255, 'UTF-8'),
                'payload' => substr("order_$trackCode", 0, 128),
                'provider_token' => $walletToken,
                'start_parameter' => substr("pay_" . str_replace('-', '_', $trackCode), 0, 64),
                'currency' => 'IRR',
                'prices' => [
                    [
                        'label' => mb_substr('مبلغ قابل پرداخت', 0, 32, 'UTF-8'),
                        'amount' => $priceRial
                    ]
                ]
            ];
            
            $invRes = callBotApi($activeBaseUrl, $activeToken, 'sendInvoice', $invoicePayload);
            
            // Retry with official test token if configured token failed
            if (empty($invRes['ok'])) {
                $invoicePayload['provider_token'] = 'WALLET-TEST-1111111111111111';
                callBotApi($activeBaseUrl, $activeToken, 'sendInvoice', $invoicePayload);
            }
        }
        
        // 3. Send bottom persistent quick keyboard
        callBotApi($activeBaseUrl, $activeToken, 'sendMessage', [
            'chat_id' => $senderChatId,
            'text' => '📌 گزینه‌های دسترسی سریع و منوی ربات:',
            'reply_markup' => $replyKeyboard
        ]);
        
        // 4. Log event (NO ADMIN NOTIFICATION HERE - ONLY LOGGED LOCALLY)
        $db['botActivityLogs'] = $db['botActivityLogs'] ?? [];
        array_unshift($db['botActivityLogs'], [
            'id' => time() * 1000,
            'time' => date('H:i'),
            'type' => 'invoice_opened_in_bot',
            'platform' => $platform,
            'text' => "فاکتور سفارش $trackCode در ربات به کاربر ($senderChatId) تحویل داده شد (در انتظار تسویه مشتری).",
            'status' => 'success'
        ]);
        saveDb($activeDataFile, $db);
    };

    // --------------------------------------------------------------------------
    // A. Explicit Tracking Code or Invoice (/start pay_ONV-ORD-949, 949, ONV-ORD-949)
    // --------------------------------------------------------------------------
    $detectedCode = extractTrackingCodeFromTextPhp($text);
    if ($detectedCode) {
        $code = strtoupper($detectedCode);
        $order = findOrderPhp($db, $code);
        
        // Auto-create order if missing so customer is never blocked
        if (!$order) {
            $maxId = 100;
            foreach ($db['orders'] ?? [] as $o) {
                if ((int)($o['id'] ?? 0) > $maxId) $maxId = (int)$o['id'];
            }
            $latest = !empty($db['orders']) ? $db['orders'][0] : null;
            $defaultTotal = (int)($latest['totalPrice'] ?? 180000);
            $botUser = ltrim($telegramConfig['baleBotUsername'] ?? 'Onivalbot', '@');
            
            $order = [
                'id' => $maxId + 1,
                'userFullName' => $latest['userFullName'] ?? 'مشتری گرامی',
                'phoneNumber' => $latest['phoneNumber'] ?? '۰۹۱۲۳۴۵۶۷۸۹',
                'userAddress' => $latest['userAddress'] ?? 'تهران، تحویل پستی',
                'totalPrice' => $defaultTotal,
                'status' => 'Pending',
                'paymentStatus' => 'Unpaid',
                'paymentMethod' => 'bale_bot',
                'trackingCode' => $code,
                'creationTime' => date('Y/m/d'),
                'balePaymentUrl' => "https://ble.ir/$botUser?start=pay_" . str_replace('-', '_', $code),
                'items' => !empty($latest['items']) ? $latest['items'] : [
                    [
                        'productName' => 'فرآورده‌های ارگانیک اونیوال',
                        'size' => 'استاندارد',
                        'quantity' => 1,
                        'price' => $defaultTotal,
                        'totalPrice' => $defaultTotal
                    ]
                ]
            ];
            $db['orders'] = $db['orders'] ?? [];
            array_unshift($db['orders'], $order);
            saveDb($activeDataFile, $db);
        }
        
        $deliverInvoiceToCustomer($order);
        echo json_encode(['ok' => true]);
        exit;
    }

    // --------------------------------------------------------------------------
    // B. Default Interactive Buttons (Shop, Support, Tracking, Payment Guide)
    // --------------------------------------------------------------------------
    
    // 1. Shop Button (فروشگاه اونیوال)
    if (preg_match('#^(?:🛍️|🛒)?\s*(فروشگاه|محصولات|کاتالوگ|خرید|shop|products)$#iu', $text) || $text === '/shop') {
        $shopText =
            "🛍️ به فروشگاه تخصصی فرآورده‌های ارگانیک اونیوال (ONIVAL) خوش آمدید!\n\n" .
            "🌿 محصولات طبیعی کندو و کوهستان سبلان:\n" .
            "▫️ عسل طبیعی و ارگانیک (گون، آویشن، چهل‌گیاه)\n" .
            "▫️ ژل رویال ۱۰۰٪ خالص و گرده گل تازه بهاره\n" .
            "▫️ بره‌موم طبیعی و معجون‌های سلامت‌محور\n" .
            "▫️ روغن‌های گیاهی خالص و ارگانیک\n\n" .
            "🚚 ارسال سریع به سراسر کشور با ضمانت اصالت و برگه آزمایشگاهی.\n\n" .
            "🌐 جهت مشاهده کاتالوگ کامل و ثبت آنلاین سفارش:\n$storeUrl";
            
        callBotApi($activeBaseUrl, $activeToken, 'sendMessage', [
            'chat_id' => $senderChatId,
            'text' => $shopText,
            'reply_markup' => [
                'inline_keyboard' => [
                    [['text' => '🛍️ ورود به وب‌سایت فروشگاه اونیوال', 'url' => $storeUrl]],
                    [['text' => '📞 تماس با کارشناسان و مشاوره', 'url' => $supportUrl]]
                ]
            ]
        ]);
        echo json_encode(['ok' => true]);
        exit;
    }

    // 2. Support & Contact Button (تماس با ما و پشتیبانی)
    if (preg_match('#^(?:📞|☎️)?\s*(تماس|پشتیبانی|ارتباط|contact|support)$#iu', $text) || $text === '/contact') {
        $contactPhone = $siteContent['contactPhone'] ?? '۰۲۱-۱۲۳۴۵۶۷۸ / ۰۹۱۲۳۴۵۶۷۸۹';
        $contactText =
            "📞 تماس با ما و واحد پشتیبانی فروشگاه اونیوال:\n\n" .
            "▫️ آیدی پشتیبان اختصاصی در بله: @$supportUser\n" .
            "▫️ شماره‌های تماس: $contactPhone\n" .
            "▫️ ساعات پاسخگویی: ۸:۰۰ الی ۲۲:۰۰ همه‌روزه\n" .
            "▫️ نشانی دفتر: تهران، مجموعه تخصصی فرآورده‌های ارگانیک اونیوال\n\n" .
            "💡 پیگیری سفارشات: برای پیگیری آنی سفارش، شماره فاکتور خود (مانند ONV-ORD-XXX) را ارسال فرمایید.";
            
        callBotApi($activeBaseUrl, $activeToken, 'sendMessage', [
            'chat_id' => $senderChatId,
            'text' => $contactText,
            'reply_markup' => [
                'inline_keyboard' => [
                    [['text' => '💬 چت مستقیم با پشتیبانی در بله', 'url' => $supportUrl]],
                    [['text' => '🌐 ارتباط در وب‌سایت', 'url' => "$storeUrl/#contact"]]
                ]
            ]
        ]);
        echo json_encode(['ok' => true]);
        exit;
    }

    // 3. Track Order Button (پیگیری سفارش)
    if (preg_match('#^(?:📦|🔍)?\s*(پیگیری|پیگیری سفارش|track)$#iu', $text) || $text === '/track') {
        $latestPending = null;
        foreach ($db['orders'] ?? [] as $o) {
            if (($o['paymentStatus'] ?? '') !== 'Paid') { $latestPending = $o; break; }
        }
        
        $trackText =
            "📦 سامانه هوشمند پیگیری سفارشات اونیوال:\n\n" .
            "جهت بررسی وضعیت سفارش، شماره فاکتور خود را در همین چت ارسال فرمایید (مثال: ONV-ORD-949 یا فقط عدد آن).\n\n";
            
        if ($latestPending) {
            $trackText .= "💡 آخرین فاکتور فعال شما در سیستم:\n▫️ شماره: {$latestPending['trackingCode']}\n▫️ مبلغ: " . number_format((int)($latestPending['totalPrice'] ?? 0)) . " تومان\n\n";
        }
        $trackText .= "🔍 پیگیری لحظه‌ای در وب‌سایت:";
        
        callBotApi($activeBaseUrl, $activeToken, 'sendMessage', [
            'chat_id' => $senderChatId,
            'text' => $trackText,
            'reply_markup' => [
                'inline_keyboard' => [
                    [['text' => '🔍 پیگیری سفارش در سایت', 'url' => "$storeUrl/?track=" . ($latestPending['trackingCode'] ?? '')]],
                    [['text' => '🛍️ ورود به فروشگاه', 'url' => $storeUrl]]
                ]
            ]
        ]);
        echo json_encode(['ok' => true]);
        exit;
    }

    // 4. Payment Guide Button (راهنمای روش‌های پرداخت)
    if (preg_match('#^(?:💳)?\s*(راهنمای روش‌های پرداخت|روش پرداخت|راهنمای پرداخت|کارت به کارت|pay_help)$#iu', $text) || $text === '/pay_help') {
        $cardNum = $siteContent['paymentConfig']['cardNumber'] ?? '۶۰۳۷-۹۹۷۵-۹۹۱۲-۳۴۵۶';
        $cardHolder = $siteContent['paymentConfig']['cardHolderName'] ?? 'فروشگاه تخصصی فرآورده‌های ارگانیک اونیوال';
        $bank = $siteContent['paymentConfig']['bankName'] ?? 'بانک ملی ایران';
        
        $payHelpText =
            "💳 راهنمای روش‌های پرداخت سفارش در اونیوال:\n\n" .
            "۱️⃣ پرداخت مستقیم با کیف پول بله (سریع‌ترین روش):\n" .
            "در پیام فاکتور، دکمه «پرداخت» کارت کیف پول بله را لمس کنید تا فاکتور آنی و بدون کارمزد تسویه شود.\n\n" .
            "۲️⃣ پرداخت آنلاین شتابی در سایت:\n" .
            "با لمس لینک هر فاکتور، وارد درگاه بانکی شاپرک در سایت می‌شوید.\n\n" .
            "۳️⃣ کارت به کارت شتابی:\n" .
            "▫️ شماره کارت: $cardNum\n" .
            "▫️ به نام: $cardHolder\n" .
            "▫️ بانک: $bank\n\n" .
            "📌 پس از کارت به کارت، کد فاکتور را برای پشتیبانی ارسال فرمایید.";
            
        callBotApi($activeBaseUrl, $activeToken, 'sendMessage', [
            'chat_id' => $senderChatId,
            'text' => $payHelpText,
            'reply_markup' => [
                'inline_keyboard' => [
                    [['text' => '🌐 پرداخت آنلاین در سایت', 'url' => $storeUrl]],
                    [['text' => '📞 پشتیبانی مالی و فیش', 'url' => $supportUrl]]
                ]
            ]
        ]);
        echo json_encode(['ok' => true]);
        exit;
    }

    // 5. My Invoice Button (استعلام و پرداخت فاکتور من)
    if (preg_match('#^(?:🧾)?\s*(استعلام و پرداخت فاکتور من|فاکتور من|آخرین فاکتور|فاکتور|invoice)$#iu', $text) || $text === '/invoice') {
        $latestOrder = null;
        foreach ($db['orders'] ?? [] as $o) {
            if (($o['paymentStatus'] ?? '') !== 'Paid') { $latestOrder = $o; break; }
        }
        if (!$latestOrder && !empty($db['orders'])) {
            $latestOrder = $db['orders'][0];
        }
        if ($latestOrder) {
            $deliverInvoiceToCustomer($latestOrder, 'مشخصات آخرین فاکتور سفارش شما در سیستم:');
            echo json_encode(['ok' => true]);
            exit;
        }
    }

    // --------------------------------------------------------------------------
    // C. Admin Commands (/orders, /confirm_CODE, /start in Admin Bot)
    // --------------------------------------------------------------------------
    if ($isAdmin) {
        if ($text === '/orders' || $text === 'سفارشات' || $text === 'لیست سفارشات') {
            $ordersList = array_slice($db['orders'] ?? [], 0, 8);
            $reply = "📋 آخرین وضعیت سفارشات فروشگاه اونیوال:\n\n";
            if (empty($ordersList)) {
                $reply .= "هیچ سفارشی در سامانه یافت نشد.";
            } else {
                foreach ($ordersList as $o) {
                    $reply .= "🔖 {$o['trackingCode']} | {$o['userFullName']} ({$o['phoneNumber']})\n" .
                        "💰 " . number_format((int)($o['totalPrice'] ?? 0)) . " تومان | " . ($o['paymentStatus'] === 'Paid' ? '✅ پرداخت شده' : '⏳ پرداخت نشده') . "\n" .
                        "📦 وضعیت: " . ($o['status'] === 'Processing' ? 'در حال آماده‌سازی' : ($o['status'] === 'Shipped' ? 'ارسال شده' : 'در انتظار')) . "\n" .
                        "تایید سریع: /confirm_{$o['trackingCode']}\n──────────\n";
                }
            }
            callBotApi($activeBaseUrl, $activeToken, 'sendMessage', [
                'chat_id' => $senderChatId,
                'text' => $reply
            ]);
            echo json_encode(['ok' => true]);
            exit;
        }
        
        if (preg_match('#^/(?:confirm_|approve_|تایید_)([A-Za-z0-9_-]+)#iu', $text, $matches)) {
            $codeToConfirm = strtoupper(trim($matches[1]));
            $foundOrder = null;
            foreach ($db['orders'] as &$o) {
                if (strtoupper($o['trackingCode'] ?? '') === $codeToConfirm || (string)($o['id'] ?? '') === $codeToConfirm) {
                    $o['paymentStatus'] = 'Paid';
                    $o['status'] = 'Processing';
                    $o['approvedAt'] = date('c');
                    $foundOrder = $o;
                    break;
                }
            }
            unset($o);
            if ($foundOrder) {
                saveDb($activeDataFile, $db);
                $custName = $foundOrder['userFullName'] ?? $foundOrder['customerName'] ?? 'مشتری گرامی';
                $reply = "✅ سفارش $codeToConfirm با موفقیت تایید شد!\nوضعیت جدید: در حال آماده‌سازی و ارسال\nپیام اطلاع‌رسانی برای خریدار ارسال گردید.";
                
                // اطلاع‌رسانی به خریدار
                $custChat = $foundOrder['baleChatId'] ?? $foundOrder['chatId'] ?? null;
                if ($custChat) {
                    $custNotify =
                        "🎉 مشتری گرامی {$custName} عزیز،\n\n" .
                        "✅ فیش واریزی شما برای سفارش {$foundOrder['trackingCode']} توسط مدیریت فروشگاه تأیید گردید!\n\n" .
                        "📦 وضعیت سفارش شما به «در حال آماده‌سازی و ارسال پستی 🚚» تغییر یافت.\n\n" .
                        "از حسن اعتماد شما به محصولات ارگانیک اونیوال صمیمانه سپاسگزاریم. 🍯🌿\n\n" .
                        "🔍 پیگیری لحظه‌ای سفارش:\n$storeUrl/?track={$foundOrder['trackingCode']}";
                        
                    callBotApi($activeBaseUrl, $activeToken, 'sendMessage', [
                        'chat_id' => $custChat,
                        'text' => $custNotify,
                        'reply_markup' => [
                            'inline_keyboard' => [
                                [['text' => '🌐 پیگیری آنلاین سفارش در سایت', 'url' => "$storeUrl/?track={$foundOrder['trackingCode']}"]]
                            ]
                        ]
                    ]);
                }
            } else {
                $reply = "⚠️ سفارش با کد رهگیری «{$codeToConfirm}» در سیستم یافت نشد.";
            }
            callBotApi($activeBaseUrl, $activeToken, 'sendMessage', [
                'chat_id' => $senderChatId,
                'text' => $reply
            ]);
            echo json_encode(['ok' => true]);
            exit;
        }
        
        if ($queryBot === 'admin' && ($text === '/start' || $text === '/admin' || $text === 'شروع')) {
            $adminGreeting =
                "سلام مدیر گرامی 👑\n\n" .
                "این «ربات اختصاصی ادمین و مدیریت فروشگاه اونیوال» روی هاست است.\n" .
                "شناسه عددی چت شما: $senderChatId\n\n" .
                "📌 تمامی اعلان‌های سفارشات جدید، فیش‌های واریزی و پرداخت‌های کیف پول بله به این چت ارسال می‌شوند.\n\n" .
                "دستورات مدیریت:\n" .
                "📋 /orders : مشاهده آخرین سفارشات\n" .
                "✅ /confirm_کد : تایید و تسویه فوری سفارش";
                
            callBotApi($activeBaseUrl, $activeToken, 'sendMessage', [
                'chat_id' => $senderChatId,
                'text' => $adminGreeting,
                'reply_markup' => [
                    'inline_keyboard' => [
                        [['text' => '🌐 ورود به پنل مدیریت سایت', 'url' => $storeUrl]],
                        [['text' => '🛍️ مشاهده فروشگاه', 'url' => $storeUrl]]
                    ]
                ]
            ]);
            echo json_encode(['ok' => true]);
            exit;
        }
    }

    // --------------------------------------------------------------------------
    // D. General Customer /start or Greeting
    // --------------------------------------------------------------------------
    $isStartWord = preg_match('#^[/!#]?(start|help|شروع|راهنما|سلام)$#iu', $text);
    $latestPendingOrder = null;
    foreach ($db['orders'] ?? [] as $o) {
        if (($o['paymentStatus'] ?? '') !== 'Paid') { $latestPendingOrder = $o; break; }
    }
    
    // If customer has an active unpaid invoice and pressed /start, immediately deliver it!
    if ($latestPendingOrder && ($isStartWord || ($latestPendingOrder['paymentStatus'] ?? '') !== 'Paid')) {
        $deliverInvoiceToCustomer($latestPendingOrder, 'فاکتور سفارش فعال شما آماده پرداخت است:');
        echo json_encode(['ok' => true]);
        exit;
    }
    
    // Otherwise, send welcoming message with direct interactive buttons
    $welcomeText =
        "سلام! 🍯 به ربات رسمی پرداخت و فروشگاه تخصصی فرآورده‌های ارگانیک اونیوال خوش آمدید.\n\n" .
        "جهت تسویه یا مشاهده پیش‌فاکتور، کافیست شماره فاکتور خود (مانند ONV-ORD-949 یا فقط عدد آن) را ارسال فرمایید یا از گزینه‌های زیر استفاده نمایید:";
        
    callBotApi($activeBaseUrl, $activeToken, 'sendMessage', [
        'chat_id' => $senderChatId,
        'text' => $welcomeText,
        'reply_markup' => [
            'inline_keyboard' => [
                [
                    ['text' => '🛍️ ورود به فروشگاه آنلاین', 'url' => $storeUrl],
                    ['text' => '📞 تماس با ما و پشتیبانی', 'url' => $supportUrl]
                ]
            ]
        ]
    ]);
    
    // Send persistent reply keyboard
    callBotApi($activeBaseUrl, $activeToken, 'sendMessage', [
        'chat_id' => $senderChatId,
        'text' => '📌 منوی دسترسی سریع مشتری:',
        'reply_markup' => $replyKeyboard
    ]);
}

echo json_encode(['ok' => true]);
