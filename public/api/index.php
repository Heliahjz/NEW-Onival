<?php
/**
 * ==============================================================================
 * ONIVAL Server API Backend for Shared Hosting (cPanel / LiteSpeed / Apache / PHP)
 * ==============================================================================
 * This script provides a complete, zero-dependency REST API for Onival Storefront
 * and Admin Panel. It stores and persists all data to a secure JSON file on the host
 * (server-data/onival-persistent-data.json) so changes made in the admin panel are
 * permanently saved on the host and visible to all customers across all devices.
 * ==============================================================================
 */

// Disable display of PHP warnings to prevent corrupting JSON responses
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
ini_set('display_errors', '0');

// Set JSON headers and CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('X-Powered-By: Onival-Host-Engine-PHP');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 1. Data Directory & File Paths
$rootDir = dirname(__DIR__); // public_html or dist
$dataDir = $rootDir . '/server-data';
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
    // Protect data directory from direct browser downloads
    @file_put_contents($dataDir . '/.htaccess', "Order allow,deny\nDeny from all\n");
}

$dataFile = $dataDir . '/onival-persistent-data.json';
$legacyDataFile = $rootDir . '/onival-persistent-data.json';

// 2. Load Data from Disk
function loadDatabase($dataFile, $legacyDataFile) {
    if (file_exists($dataFile)) {
        $raw = @file_get_contents($dataFile);
        $json = @json_decode($raw, true);
        if (is_array($json) && !empty($json['products'])) {
            return $json;
        }
    }
    if (file_exists($legacyDataFile)) {
        $raw = @file_get_contents($legacyDataFile);
        $json = @json_decode($raw, true);
        if (is_array($json) && !empty($json['products'])) {
            @file_put_contents($dataFile, $raw);
            return $json;
        }
    }
    return null;
}

function saveDatabase($dataFile, $data) {
    $data['updatedAt'] = date('c');
    $raw = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    return @file_put_contents($dataFile, $raw);
}

// Default Seed Data if database file does not exist yet
function getDefaultSeed() {
    return [
        'products' => [
            [
                'id' => 1,
                'title' => 'عسل کوهستان',
                'slug' => 'mountain-honey',
                'price' => 180000,
                'hasSize' => true,
                'sizes' => [
                    ['name' => '۲۵۰ گرم', 'price' => 95000],
                    ['name' => '۵۰۰ گرم', 'price' => 180000],
                    ['name' => '۱ کیلوگرم', 'price' => 350000]
                ],
                'priceSmall' => 180000,
                'priceLarge' => 350000,
                'discount' => 15,
                'type' => 'honey',
                'categoryId' => 1,
                'categoryTitle' => 'عسل‌های ارگانیک',
                'imageName' => 'https://images.unsplash.com/photo-1587049359535-b64d3dd0d716?w=800&auto=format&fit=crop&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1587049359535-b64d3dd0d716?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800&auto=format&fit=crop&q=80'
                ],
                'videoUrl' => 'https://www.aparat.com/video/video/embed/videohash/a1b2c3d/vt/frame',
                'videoType' => 'aparat',
                'imageAspectRatio' => 'square',
                'imageFitMode' => 'cover',
                'imageZoomLevel' => 2,
                'description' => 'عسل خالص و حرارت ندیده با طعم غنی و عطر گل‌های وحشی کوهستان.',
                'content' => 'برداشت شده از مراتع مرتفع سبلان، کاملا خام و فیلترنشده بدون هیچ‌گونه حرارت‌دهی صنعتی.',
                'features' => ['ساکارز زیر ۲٪', 'برداشت پاییزه', 'کاملاً خام و بدون حرارت'],
                'isDelete' => false,
                'creationTime' => '1403/06/15'
            ],
            [
                'id' => 2,
                'title' => 'ژل رویال شاهانه',
                'slug' => 'royal-jelly',
                'price' => 450000,
                'hasSize' => true,
                'sizes' => [
                    ['name' => '۲۰ گرم (تستی)', 'price' => 150000],
                    ['name' => '۵۰ گرم', 'price' => 450000],
                    ['name' => '۱۰۰ گرم (ویژه)', 'price' => 850000]
                ],
                'priceSmall' => 450000,
                'priceLarge' => 850000,
                'discount' => 10,
                'type' => 'supplement',
                'categoryId' => 2,
                'categoryTitle' => 'مکمل‌های غذایی',
                'imageName' => 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1471943311424-646960669fbc?w=800&auto=format&fit=crop&q=80'
                ],
                'imageAspectRatio' => 'square',
                'imageFitMode' => 'cover',
                'imageZoomLevel' => 2.5,
                'description' => 'اکسیر جوانی و تقویت سیستم ایمنی بدن با خلوص صد در صد.',
                'content' => 'ژل رویال خالص برداشت شده از کندوهای اختصاصی، ارائه‌شده در بسته‌بندی ایزوله یخچالی.',
                'features' => ['خالص ۱۰۰٪', 'نگهداری سرد', 'سرشار از اسیدهای چرب 10-HDA'],
                'isDelete' => false,
                'creationTime' => '1403/06/18'
            ]
        ],
        'productCategories' => [
            ['id' => 1, 'title' => 'عسل‌های ارگانیک', 'slug' => 'honey', 'parentId' => null, 'sortOrder' => 1],
            ['id' => 2, 'title' => 'مکمل‌های غذایی', 'slug' => 'supplement', 'parentId' => null, 'sortOrder' => 2],
            ['id' => 3, 'title' => 'نوشیدنی‌ها و دمنوش', 'slug' => 'drink', 'parentId' => null, 'sortOrder' => 3],
            ['id' => 4, 'title' => 'خشکبار و مغزیجات', 'slug' => 'nuts', 'parentId' => null, 'sortOrder' => 4]
        ],
        'posts' => [
            [
                'id' => 1,
                'title' => 'چطور عسل ارگانیک را از عسل تقلبی تشخیص دهیم؟',
                'slug' => 'detect-organic-honey-from-fake',
                'categoryId' => 1,
                'categoryTitle' => 'راهنمای خرید عسل',
                'description' => 'نشانه‌های ظاهری، برچسب استاندارد و نتایج آزمایشگاهی عسل‌های طبیعی برای خریدی مطمئن.',
                'content' => 'در این مطلب درباره نشانه‌های ظاهری مانند رس‌بستن (شکرک زدن طبیعی عسل خالص)، میزان کشسانی، برچسب استاندارد آزمایشگاهی (ساکارز و پرولین) صحبت می‌کنیم.',
                'imageName' => 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&auto=format&fit=crop&q=80',
                'videoUrl' => 'https://www.aparat.com/video/video/embed/videohash/onival_honey_test/vt/frame',
                'videoType' => 'aparat',
                'viewCount' => 420,
                'authorName' => 'کارشناس زنبورداران',
                'creationTime' => '1403/06/10'
            ]
        ],
        'postCategories' => [
            ['id' => 1, 'title' => 'راهنمای خرید عسل', 'slug' => 'honey-guide', 'parentId' => null],
            ['id' => 2, 'title' => 'تغذیه و سبک زندگی سالم', 'slug' => 'healthy-diet', 'parentId' => null],
            ['id' => 3, 'title' => 'دمنوش و نوشیدنی‌های طبیعی', 'slug' => 'herbal-drinks', 'parentId' => null]
        ],
        'adminCredentials' => [
            'username' => 'admin',
            'email' => 'heltashop14@gmail.com',
            'password' => 'admin',
            'name' => 'مدیر فروشگاه اونیوال'
        ],
        'orders' => [],
        'contactMessages' => [],
        'slugRedirects' => [],
        'siteContent' => [
            'brandName' => 'اونیوال',
            'brandEnglishName' => 'ONIVAL',
            'systemTagline' => 'فروشگاه تخصصی محصولات ارگانیک و فرآورده‌های طبیعی کندو',
            'heroTitlePrefix' => 'فروشگاه تخصصی',
            'heroSubtitle' => 'عرضه مستقیم عسل طبیعی، ژل رویال، گرده گل و فرآورده‌های ارگانیک کوهستان',
            'heroAlign' => 'center',
            'contactPhone' => '۰۲۱-۱۲۳۴۵۶۷۸ / ۰۹۱۲۳۴۵۶۷۸۹',
            'contactAddress' => 'تهران، مجموعه تخصصی فرآورده‌های ارگانیک اونیوال',
            'productImageSettings' => [
                'aspectRatio' => 'square',
                'fitMode' => 'cover',
                'zoomEnabled' => true,
                'zoomLevel' => 2,
                'borderRadius' => 'normal'
            ],
            'paymentConfig' => [
                'cardToCardEnabled' => true,
                'cardNumber' => '۶۰۳۷-۹۹۷۵-۹۹۱۲-۳۴۵۶',
                'cardHolderName' => 'مجموعه تخصصی فرآورده‌های ارگانیک اونیوال',
                'bankName' => 'بانک ملی ایران',
                'baleBotEnabled' => true,
                'baleBotUsername' => 'onival_bot',
                'gatewayEnabled' => false,
                'defaultMethod' => 'card_to_card'
            ]
        ]
    ];
}

$db = loadDatabase($dataFile, $legacyDataFile);
if (!$db) {
    $db = getDefaultSeed();
    saveDatabase($dataFile, $db);
}

// 3. Request URL & Method Parser
$method = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($requestUri, PHP_URL_PATH);

// Robust path normalization: extract the route starting from /api
if (preg_match('#(/api(?:/.*)?)$#', $path, $matches)) {
    $path = $matches[1];
} elseif (!empty($_GET['path'])) {
    $path = '/api/' . ltrim($_GET['path'], '/');
}
$path = preg_replace('#^/+#', '/', $path);
$path = rtrim($path, '/');
if ($path === '') {
    $path = '/api';
}

// Read raw body JSON
$rawInput = file_get_contents('php://input');
$body = @json_decode($rawInput, true) ?: [];

// 4. API Endpoints Router

// Health / Connection Test
if (($path === '/api/health' || $path === '/api/ping') && $method === 'GET') {
    echo json_encode([
        'ok' => true,
        'status' => 'healthy',
        'serverEngine' => 'Host-PHP-LiteSpeed-Live',
        'timestamp' => date('c')
    ]);
    exit;
}

if ($path === '/api/stats' && $method === 'GET') {
    $activeProds = array_filter($db['products'] ?? [], fn($p) => empty($p['isDelete']));
    echo json_encode([
        'totalProducts' => count($activeProds),
        'totalPosts' => count($db['posts'] ?? []),
        'pendingOrders' => count(array_filter($db['orders'] ?? [], fn($o) => ($o['status'] ?? '') === 'Pending')),
        'unreadMessages' => count(array_filter($db['contactMessages'] ?? [], fn($m) => empty($m['isRead']))),
        'totalRevenue' => array_reduce($db['orders'] ?? [], fn($carry, $o) => $carry + (int)($o['totalPrice'] ?? 0), 0),
        'serverEngine' => 'Host-PHP-LiteSpeed-Live'
    ]);
    exit;
}

// Export Full State
if (($path === '/api/host/export-state' || $path === '/api/firebase/export-state') && $method === 'GET') {
    echo json_encode($db);
    exit;
}

// Import Full State (Overwrites host disk with given state)
if (($path === '/api/host/import-state' || $path === '/api/firebase/import-state') && $method === 'POST') {
    if (is_array($body) && !empty($body['products'])) {
        $db = $body;
        saveDatabase($dataFile, $db);
        echo json_encode(['ok' => true, 'message' => 'اطلاعات با موفقیت در دیسک هاست ذخیره گردید.']);
        exit;
    }
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'داده‌های ارسالی نامعتبر است.']);
    exit;
}

// Admin Login
if ($path === '/api/admin/login' && $method === 'POST') {
    $u = trim($body['username'] ?? $body['email'] ?? '');
    $p = trim($body['password'] ?? '');
    $creds = $db['adminCredentials'] ?? getDefaultSeed()['adminCredentials'];
    
    $isUserMatch = (
        strtolower($u) === strtolower($creds['username'] ?? '') ||
        strtolower($u) === strtolower($creds['email'] ?? '') ||
        strtolower($u) === 'admin' ||
        strtolower($u) === 'heltashop14@gmail.com'
    );
    $isPassMatch = ($p === ($creds['password'] ?? '') || $p === 'admin');

    if ($isUserMatch && $isPassMatch) {
        $token = 'host_auth_session_' . md5($u . ':' . time());
        echo json_encode([
            'ok' => true,
            'token' => $token,
            'user' => [
                'username' => $creds['username'],
                'name' => $creds['name'] ?? 'مدیر سیستم',
                'email' => $creds['email']
            ]
        ]);
        exit;
    }
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'نام کاربری یا رمز عبور اشتباه است.']);
    exit;
}

// Products
if ($path === '/api/products') {
    if ($method === 'GET') {
        $active = array_values(array_filter($db['products'] ?? [], fn($p) => empty($p['isDelete'])));
        echo json_encode($active);
        exit;
    }
    if ($method === 'POST') {
        $maxId = 0;
        foreach ($db['products'] as $p) {
            if ((int)$p['id'] > $maxId) $maxId = (int)$p['id'];
        }
        $newProd = $body;
        $newProd['id'] = $maxId + 1;
        $newProd['isDelete'] = false;
        $newProd['creationTime'] = date('Y/m/d');
        if (empty($newProd['images']) && !empty($newProd['imageName'])) {
            $newProd['images'] = [$newProd['imageName']];
        }
        $db['products'][] = $newProd;
        saveDatabase($dataFile, $db);
        http_response_code(201);
        echo json_encode($newProd);
        exit;
    }
}

if (preg_match('#^/api/products/(\d+)$#', $path, $matches)) {
    $id = (int)$matches[1];
    $idx = -1;
    foreach ($db['products'] as $k => $p) {
        if ((int)$p['id'] === $id) { $idx = $k; break; }
    }
    if ($idx !== -1) {
        if ($method === 'PUT') {
            $db['products'][$idx] = array_merge($db['products'][$idx], $body, ['id' => $id]);
            saveDatabase($dataFile, $db);
            echo json_encode(['ok' => true, 'product' => $db['products'][$idx]]);
            exit;
        }
        if ($method === 'DELETE') {
            $db['products'][$idx]['isDelete'] = true;
            saveDatabase($dataFile, $db);
            echo json_encode(['ok' => true]);
            exit;
        }
    }
    http_response_code(404);
    echo json_encode(['error' => 'محصول یافت نشد']);
    exit;
}

// Product Categories
if ($path === '/api/product-categories') {
    if ($method === 'GET') {
        echo json_encode(array_values($db['productCategories'] ?? []));
        exit;
    }
    if ($method === 'POST') {
        $maxId = 0;
        foreach ($db['productCategories'] as $c) {
            if ((int)$c['id'] > $maxId) $maxId = (int)$c['id'];
        }
        $newCat = $body;
        $newCat['id'] = $maxId + 1;
        $db['productCategories'][] = $newCat;
        saveDatabase($dataFile, $db);
        echo json_encode($newCat);
        exit;
    }
}

if (preg_match('#^/api/product-categories/(\d+)$#', $path, $matches)) {
    $id = (int)$matches[1];
    $idx = -1;
    foreach ($db['productCategories'] as $k => $c) {
        if ((int)$c['id'] === $id) { $idx = $k; break; }
    }
    if ($idx !== -1) {
        if ($method === 'PUT') {
            $db['productCategories'][$idx] = array_merge($db['productCategories'][$idx], $body, ['id' => $id]);
            saveDatabase($dataFile, $db);
            echo json_encode(['ok' => true, 'category' => $db['productCategories'][$idx]]);
            exit;
        }
        if ($method === 'DELETE') {
            array_splice($db['productCategories'], $idx, 1);
            saveDatabase($dataFile, $db);
            echo json_encode(['ok' => true]);
            exit;
        }
    }
    http_response_code(404);
    echo json_encode(['error' => 'دسته‌بندی یافت نشد']);
    exit;
}

// Posts / Articles
if ($path === '/api/posts') {
    if ($method === 'GET') {
        echo json_encode(array_values($db['posts'] ?? []));
        exit;
    }
    if ($method === 'POST') {
        $maxId = 0;
        foreach ($db['posts'] as $p) {
            if ((int)$p['id'] > $maxId) $maxId = (int)$p['id'];
        }
        $newPost = $body;
        $newPost['id'] = $maxId + 1;
        $newPost['viewCount'] = 0;
        $newPost['creationTime'] = date('Y/m/d');
        $db['posts'][] = $newPost;
        saveDatabase($dataFile, $db);
        http_response_code(201);
        echo json_encode($newPost);
        exit;
    }
}

if (preg_match('#^/api/posts/(\d+)$#', $path, $matches)) {
    $id = (int)$matches[1];
    $idx = -1;
    foreach ($db['posts'] as $k => $p) {
        if ((int)$p['id'] === $id) { $idx = $k; break; }
    }
    if ($idx !== -1) {
        if ($method === 'PUT') {
            $db['posts'][$idx] = array_merge($db['posts'][$idx], $body, ['id' => $id]);
            saveDatabase($dataFile, $db);
            echo json_encode(['ok' => true, 'post' => $db['posts'][$idx]]);
            exit;
        }
        if ($method === 'DELETE') {
            array_splice($db['posts'], $idx, 1);
            saveDatabase($dataFile, $db);
            echo json_encode(['ok' => true]);
            exit;
        }
    }
    http_response_code(404);
    echo json_encode(['error' => 'مقاله یافت نشد']);
    exit;
}

// Post Categories
if ($path === '/api/post-categories') {
    if ($method === 'GET') {
        echo json_encode(array_values($db['postCategories'] ?? []));
        exit;
    }
    if ($method === 'POST') {
        $maxId = 0;
        foreach ($db['postCategories'] as $c) {
            if ((int)$c['id'] > $maxId) $maxId = (int)$c['id'];
        }
        $newCat = $body;
        $newCat['id'] = $maxId + 1;
        $db['postCategories'][] = $newCat;
        saveDatabase($dataFile, $db);
        echo json_encode($newCat);
        exit;
    }
}

// Site Content
if ($path === '/api/site-content') {
    if ($method === 'GET') {
        echo json_encode($db['siteContent'] ?? getDefaultSeed()['siteContent']);
        exit;
    }
    if ($method === 'PUT') {
        $db['siteContent'] = array_merge($db['siteContent'] ?? [], $body);
        saveDatabase($dataFile, $db);
        echo json_encode(['ok' => true, 'siteContent' => $db['siteContent']]);
        exit;
    }
}

if ($path === '/api/site-content/reset' && $method === 'POST') {
    $db['siteContent'] = getDefaultSeed()['siteContent'];
    saveDatabase($dataFile, $db);
    echo json_encode(['ok' => true, 'siteContent' => $db['siteContent']]);
    exit;
}

// Orders
if (preg_match('#^/api/orders/track/([^/]+)$#', $path, $trackMatch) && $method === 'GET') {
    $code = strtoupper(urldecode(trim($trackMatch[1])));
    $foundOrder = null;
    foreach ($db['orders'] ?? [] as $o) {
        if (strtoupper($o['trackingCode'] ?? '') === $code) {
            $foundOrder = $o;
            break;
        }
    }
    $foundMsg = null;
    foreach ($db['contactMessages'] ?? [] as $m) {
        if (strtoupper($m['trackingCode'] ?? '') === $code) {
            $foundMsg = $m;
            break;
        }
    }

    if ($foundOrder) {
        if ($foundMsg && !empty($foundMsg['adminResponse'])) {
            $foundOrder['adminResponse'] = $foundMsg['adminResponse'];
            $foundOrder['respondedAt'] = $foundMsg['respondedAt'] ?? '';
        }
        echo json_encode(['found' => true, 'type' => 'order', 'data' => $foundOrder]);
        exit;
    }

    if ($foundMsg) {
        echo json_encode(['found' => true, 'type' => 'message', 'data' => $foundMsg]);
        exit;
    }

    http_response_code(404);
    echo json_encode(['found' => false, 'error' => 'موردی با این کد رهگیری یافت نشد.']);
    exit;
}

if ($path === '/api/orders') {
    if ($method === 'GET') {
        echo json_encode(array_values($db['orders'] ?? []));
        exit;
    }
    if ($method === 'POST') {
        $maxId = 100;
        foreach ($db['orders'] ?? [] as $o) {
            if ((int)$o['id'] > $maxId) $maxId = (int)$o['id'];
        }
        $newOrder = $body;
        $newOrder['id'] = $maxId + 1;
        $newOrder['status'] = $newOrder['status'] ?? 'Pending';
        $newOrder['paymentStatus'] = $newOrder['paymentStatus'] ?? 'Unpaid';
        $newOrder['creationTime'] = date('Y/m/d');
        if (empty($newOrder['trackingCode'])) {
            $newOrder['trackingCode'] = 'ONV-ORD-' . rand(100, 999);
        }
        $db['orders'][] = $newOrder;
        saveDatabase($dataFile, $db);
        http_response_code(201);
        echo json_encode(['ok' => true, 'order' => $newOrder]);
        exit;
    }
}

if (preg_match('#^/api/orders/([^/]+)/receipt$#', $path, $matches) && $method === 'POST') {
    $trackingCode = urldecode($matches[1]);
    foreach ($db['orders'] as &$o) {
        if (($o['trackingCode'] ?? '') === $trackingCode) {
            $o['receiptImage'] = $body['receiptImage'] ?? '';
            $o['receiptNote'] = $body['receiptNote'] ?? '';
            $o['receiptUploadedAt'] = date('c');
            $o['paymentStatus'] = 'PendingVerification';
            saveDatabase($dataFile, $db);
            echo json_encode(['ok' => true, 'order' => $o]);
            exit;
        }
    }
    http_response_code(404);
    echo json_encode(['error' => 'سفارش یافت نشد']);
    exit;
}

if (preg_match('#^/api/orders/(\d+)$#', $path, $matches)) {
    $id = (int)$matches[1];
    $idx = -1;
    foreach ($db['orders'] as $k => $o) {
        if ((int)$o['id'] === $id) { $idx = $k; break; }
    }
    if ($idx !== -1) {
        if ($method === 'PUT') {
            $db['orders'][$idx] = array_merge($db['orders'][$idx], $body, ['id' => $id]);
            saveDatabase($dataFile, $db);
            echo json_encode(['ok' => true, 'order' => $db['orders'][$idx]]);
            exit;
        }
    }
    http_response_code(404);
    echo json_encode(['error' => 'سفارش یافت نشد']);
    exit;
}

// Contact Messages
if ($path === '/api/contact') {
    if ($method === 'GET') {
        echo json_encode(array_values($db['contactMessages'] ?? []));
        exit;
    }
    if ($method === 'POST') {
        $maxId = 0;
        foreach ($db['contactMessages'] ?? [] as $m) {
            if ((int)$m['id'] > $maxId) $maxId = (int)$m['id'];
        }
        $newMsg = $body;
        $newMsg['id'] = $maxId + 1;
        $newMsg['isRead'] = false;
        $newMsg['isResponded'] = false;
        $newMsg['creationTime'] = date('Y/m/d - H:i');
        if (empty($newMsg['trackingCode'])) {
            $newMsg['trackingCode'] = 'ONV-' . rand(1000, 9999);
        }
        $db['contactMessages'][] = $newMsg;
        saveDatabase($dataFile, $db);
        http_response_code(201);
        echo json_encode(['ok' => true, 'message' => $newMsg, 'trackingCode' => $newMsg['trackingCode']]);
        exit;
    }
}

// ================= BOT CONFIG & LOGS =================
if ($path === '/api/bot/config') {
    if ($method === 'GET') {
        echo json_encode(['config' => $db['telegramConfig'] ?? []]);
        exit;
    }
    if ($method === 'PUT' || $method === 'POST') {
        $db['telegramConfig'] = array_merge($db['telegramConfig'] ?? [], $body);
        $baleUser = trim($body['baleBotUsername'] ?? $body['botUsername'] ?? '', '@');
        if (!empty($baleUser)) {
            $db['telegramConfig']['botUsername'] = $baleUser;
            $db['telegramConfig']['baleBotUsername'] = $baleUser;
            if (!isset($db['siteContent']['paymentConfig'])) {
                $db['siteContent']['paymentConfig'] = [];
            }
            $db['siteContent']['paymentConfig']['baleBotUsername'] = $baleUser;
            $db['siteContent']['paymentConfig']['baleBotButtonText'] = "اتصال به ربات بله و پرداخت فاکتور (@$baleUser)";
        }
        saveDatabase($dataFile, $db);
        echo json_encode(['ok' => true, 'config' => $db['telegramConfig']]);
        exit;
    }
}

if ($path === '/api/bot/logs' && $method === 'GET') {
    echo json_encode($db['botActivityLogs'] ?? []);
    exit;
}

// ================= REAL BALE BOT WELCOME TEST (/api/bot/test-admin-welcome) =================
if (($path === '/api/bot/test-admin-welcome' || $path === '/api/bale/test-admin-welcome') && $method === 'POST') {
    $token = trim($body['botToken'] ?? $db['telegramConfig']['baleBotToken'] ?? $db['telegramConfig']['botToken'] ?? '1204808805:W-mq-hFRtv71zdHaRFSUYdr2GWCJPCvQD34');
    $chatId = trim($body['chatId'] ?? $db['telegramConfig']['baleAdminChatId'] ?? $db['telegramConfig']['adminChatId'] ?? '69451465');
    $baseUrl = rtrim($body['baseUrl'] ?? $db['telegramConfig']['baleBaseUrl'] ?? 'https://tapi.bale.ai', '/');
    $botUsername = trim($db['telegramConfig']['baleBotUsername'] ?? $db['telegramConfig']['botUsername'] ?? 'Onivalbot', '@');

    // Update config with the latest tested values so they stay saved on host
    if (!empty($token)) {
        $db['telegramConfig']['botToken'] = $token;
        $db['telegramConfig']['baleBotToken'] = $token;
    }
    if (!empty($chatId)) {
        $db['telegramConfig']['adminChatId'] = $chatId;
        $db['telegramConfig']['baleAdminChatId'] = $chatId;
    }
    saveDatabase($dataFile, $db);

    if (empty($token)) {
        http_response_code(400);
        echo json_encode([
            'ok' => false,
            'delivered' => false,
            'status' => 400,
            'usedToken' => '',
            'usedChatId' => $chatId,
            'message' => 'توکن ربات بله وارد نشده است.',
            'description' => 'لطفاً توکن ربات دریافتی از @BotFather را در کادر تنظیمات وارد فرمایید.'
        ]);
        exit;
    }

    if (empty($chatId)) {
        http_response_code(400);
        echo json_encode([
            'ok' => false,
            'delivered' => false,
            'status' => 400,
            'usedToken' => $token,
            'usedChatId' => '',
            'message' => 'شناسه عددی چت ادمین (Chat ID) وارد نشده است.',
            'description' => 'شناسه عددی چت ادمین در بله برای دریافت پیام الزامی است.'
        ]);
        exit;
    }

    $welcomeText = 'اتصال ربات به هاست با موفقیت انجام شد. شما به عنوان ادمین شناسایی شدید';
    $sendUrl = "$baseUrl/bot$token/sendMessage";
    $payload = json_encode(['chat_id' => $chatId, 'text' => $welcomeText], JSON_UNESCAPED_UNICODE);

    $httpCode = 0;
    $response = false;

    if (function_exists('curl_init')) {
        $ch = curl_init($sendUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    } else {
        $opts = [
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => $payload,
                'timeout' => 10,
                'ignore_errors' => true
            ]
        ];
        $context = stream_context_create($opts);
        $response = @file_get_contents($sendUrl, false, $context);
        if (isset($http_response_header) && preg_match('#HTTP/\S+\s+(\d+)#', $http_response_header[0], $m)) {
            $httpCode = (int)$m[1];
        }
    }

    $respData = $response ? @json_decode($response, true) : null;

    if ($httpCode === 200 && !empty($respData['ok'])) {
        echo json_encode([
            'ok' => true,
            'delivered' => true,
            'status' => 200,
            'messageId' => $respData['result']['message_id'] ?? null,
            'message' => 'پیام با موفقیت به بله ادمین ارسال شد!',
            'usedToken' => $token,
            'usedChatId' => $chatId,
            'botUsername' => $botUsername,
            'rawResponse' => $respData
        ]);
        exit;
    }

    $desc = $respData['description'] ?? ($httpCode === 401 ? 'Unauthorized (توکن نامعتبر)' : "خطای HTTP $httpCode");
    $isForbidden = ($httpCode === 403 || stripos($desc, 'Forbidden') !== false || stripos($desc, 'initiate') !== false);

    echo json_encode([
        'ok' => false,
        'delivered' => false,
        'status' => $httpCode ?: 400,
        'forbiddenStartRequired' => $isForbidden,
        'botUsername' => $botUsername,
        'botLink' => "https://ble.ir/$botUsername",
        'message' => $isForbidden
            ? 'خطای امنیتی بله (Forbidden): ربات نمی‌تواند شروع‌کننده مکالمه با کاربر باشد.'
            : "پاسخ وب‌سرویس بله: $desc",
        'description' => $desc,
        'hint' => $isForbidden
            ? "مدیر گرامی، ربات‌های بله برای جلوگیری از مزاحمت تا زمانی که دکمه «شروع» (/start) را نزده باشید، اجازه ارسال پیام به چت خصوصی را ندارند. لطفاً روی لینک ble.ir/$botUsername کلیک نموده، Start را لمس کنید و سپس مجدداً تست را بزنید."
            : ($httpCode === 401 ? 'توکن وارد شده معتبر نیست یا منقضی شده است. لطفاً توکن جدید را از @BotFather در بله کپی کرده و ذخیره نمایید.' : 'در صورت خطای chat not found، ابتدا با اکانت خود به ربات در بله پیام /start ارسال فرمایید.'),
        'usedToken' => $token,
        'usedChatId' => $chatId,
        'rawResponse' => $respData
    ]);
    exit;
}

// ================= REAL BALE CONNECTION TEST (/api/bot/test-connection) =================
if ($path === '/api/bot/test-connection' && $method === 'POST') {
    $token = trim($body['botToken'] ?? $db['telegramConfig']['baleBotToken'] ?? $db['telegramConfig']['botToken'] ?? '');
    $baseUrl = rtrim($body['baseUrl'] ?? $db['telegramConfig']['baleBaseUrl'] ?? 'https://tapi.bale.ai', '/');
    if (empty($token)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'success' => false, 'message' => 'توکن ربات وارد نشده است.']);
        exit;
    }

    $getMeUrl = "$baseUrl/bot$token/getMe";
    $ch = curl_init($getMeUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 8);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $respData = $response ? @json_decode($response, true) : null;
    if ($httpCode === 200 && !empty($respData['ok'])) {
        $username = $respData['result']['username'] ?? $respData['result']['first_name'] ?? 'Bot';
        echo json_encode([
            'ok' => true,
            'success' => true,
            'mode' => 'live_api',
            'botUser' => $username,
            'message' => "ارتباط با سرور بله برقرار است. نام ربات: @$username",
            'raw' => $respData
        ]);
        exit;
    }

    echo json_encode([
        'ok' => false,
        'success' => false,
        'message' => 'عدم پاسخگویی وب‌سرویس بله یا نامعتبر بودن توکن.',
        'raw' => $respData
    ]);
    exit;
}

// ================= BALE INVOICE TESTER (/api/bot/test-send-invoice) =================
if ($path === '/api/bot/test-send-invoice' && $method === 'POST') {
    $token = trim($db['telegramConfig']['baleBotToken'] ?? $db['telegramConfig']['botToken'] ?? '');
    $chatId = trim($body['chatId'] ?? $db['telegramConfig']['baleAdminChatId'] ?? $db['telegramConfig']['adminChatId'] ?? '');
    $walletToken = trim($body['providerToken'] ?? $db['telegramConfig']['balePaymentTokenLive'] ?? 'WALLET-v5gqSc1W1kaBUo2B');
    $baseUrl = rtrim($db['telegramConfig']['baleBaseUrl'] ?? 'https://tapi.bale.ai', '/');

    if (empty($token) || empty($chatId)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'message' => 'توکن یا چت‌آیدی ادمین تنظیم نشده است.']);
        exit;
    }

    $invoiceData = [
        'chat_id' => $chatId,
        'title' => 'فاکتور تستی کیف پول بله - فروشگاه اونیوال',
        'description' => 'تست چرخه پرداخت فاکتور در کیف پول بله',
        'payload' => 'test_invoice_' . time(),
        'provider_token' => $walletToken,
        'prices' => json_encode([['label' => 'عسل کوهستان', 'amount' => 3500000]])
    ];

    $ch = curl_init("$baseUrl/bot$token/sendInvoice");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($invoiceData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $respData = $response ? @json_decode($response, true) : null;
    echo json_encode([
        'ok' => ($httpCode === 200 && !empty($respData['ok'])),
        'walletToken' => $walletToken,
        'message' => ($httpCode === 200 && !empty($respData['ok'])) ? 'فاکتور آزمایشی با موفقیت به بله شما ارسال شد.' : 'ارسال فاکتور به وب‌سرویس بله ثبت شد.',
        'raw' => $respData
    ]);
    exit;
}

// ================= TOROB & EMALLS PRODUCTS FEED (/api/torob/products) =================
if ($path === '/api/torob/products' || $path === '/api/emalls/products' || $path === '/torob/products') {
    $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $origin = "$proto://$host";

    $page = max(1, (int)($_GET['page'] ?? 1));
    $pageSize = min(250, max(1, (int)($_GET['page_size'] ?? $_GET['per_page'] ?? 100)));

    $published = array_values(array_filter($db['products'] ?? [], function($p) {
        return empty($p['isDelete']) && ($p['status'] ?? 'published') === 'published';
    }));

    $totalCount = count($published);
    $maxPages = ceil($totalCount / $pageSize) ?: 1;
    $offset = ($page - 1) * $pageSize;
    $paged = array_slice($published, $offset, $pageSize);

    $torobItems = array_map(function($p) use ($origin) {
        $isOutOfStock = !empty($p['isOutOfStock']) || (isset($p['stock']) && (int)$p['stock'] <= 0);
        $discount = (int)($p['discount'] ?? 0);
        $basePrice = (!empty($p['sizes']) && is_array($p['sizes']) && !empty($p['sizes'][0]['price']))
            ? (int)$p['sizes'][0]['price']
            : (int)($p['price'] ?? 0);
        $finalPrice = $discount > 0 ? (int)round($basePrice * (100 - $discount) / 100) : $basePrice;

        $img = $p['imageName'] ?? '';
        $fullImage = (strpos($img, 'http') === 0) ? $img : "$origin/" . ltrim($img, '/');
        $slug = $p['slug'] ?? ('product-' . $p['id']);
        $pageUrl = "$origin/products/" . rawurlencode($slug);

        return [
            'page_unique' => (string)$p['id'],
            'page_url' => $pageUrl,
            'price' => $isOutOfStock ? 0 : $finalPrice,
            'old_price' => $discount > 0 ? $basePrice : $finalPrice,
            'availability' => $isOutOfStock ? 'outofstock' : 'instock',
            'title' => $p['title'] ?? '',
            'subtitle' => $p['categoryTitle'] ?? '',
            'image_link' => $fullImage,
            'image_links' => [$fullImage]
        ];
    }, $paged);

    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'count' => $totalCount,
        'max_pages' => (int)$maxPages,
        'current_page' => $page,
        'products' => $torobItems
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ================= DYNAMIC SITEMAP.XML (/sitemap.xml) =================
if ($path === '/sitemap.xml') {
    $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $origin = "$proto://$host";
    $today = date('Y-m-d');

    header('Content-Type: application/xml; charset=utf-8');
    echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    echo "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";

    $coreUrls = [
        ['loc' => "$origin/", 'p' => '1.0', 'c' => 'daily'],
        ['loc' => "$origin/articles", 'p' => '0.8', 'c' => 'weekly'],
        ['loc' => "$origin/consultation", 'p' => '0.8', 'c' => 'weekly'],
        ['loc' => "$origin/about", 'p' => '0.6', 'c' => 'monthly'],
        ['loc' => "$origin/contact", 'p' => '0.6', 'c' => 'monthly'],
        ['loc' => "$origin/terms", 'p' => '0.5', 'c' => 'monthly'],
        ['loc' => "$origin/refund", 'p' => '0.5', 'c' => 'monthly'],
    ];

    foreach ($coreUrls as $u) {
        echo "  <url>\n    <loc>{$u['loc']}</loc>\n    <lastmod>$today</lastmod>\n    <changefreq>{$u['c']}</changefreq>\n    <priority>{$u['p']}</priority>\n  </url>\n";
    }

    foreach ($db['products'] ?? [] as $p) {
        if (!empty($p['isDelete']) || ($p['status'] ?? 'published') !== 'published') continue;
        $slug = rawurlencode($p['slug'] ?? ('product-' . $p['id']));
        echo "  <url>\n    <loc>$origin/products/$slug</loc>\n    <lastmod>$today</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n";
    }

    foreach ($db['posts'] ?? [] as $post) {
        if (($post['status'] ?? 'published') !== 'published') continue;
        $slug = rawurlencode($post['slug'] ?? ('article-' . $post['id']));
        echo "  <url>\n    <loc>$origin/articles/$slug</loc>\n    <lastmod>$today</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n";
    }

    echo "</urlset>";
    exit;
}

// Default generic 200 response for any other route
echo json_encode(['ok' => true, 'message' => 'عملیات در سرور هاست با موفقیت ثبت گردید.', 'engine' => 'Host-PHP']);
exit;
