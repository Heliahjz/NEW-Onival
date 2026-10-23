<?php
/**
 * ==============================================================================
 * ⚙️ ONIVAL - پیکربندی و راهنمای استقرار ربات‌ها در public_html
 * ==============================================================================
 * فایل‌های آماده برای آپلود در پوشه public_html:
 * 
 * ۱. bale-bot.php      -> ربات بله (Webhook URL: https://yourdomain.com/bale-bot.php)
 * ۲. telegram-bot.php  -> ربات تلگرام (Webhook URL: https://yourdomain.com/telegram-bot.php)
 * 
 * این فایل‌ها کاملاً مستقل (Zero Dependencies) هستند و به هیچ کامپایلر یا Node.js نیاز ندارند.
 * ==============================================================================
 */

return [
    'version' => '1.1.0',
    'bale' => [
        'bot_username' => 'Onivalbot',
        'bot_token' => '1204808805:W-mq-hFRtv71zdHaRFSUYdr2GWCJPCvQD34',
        'admin_chat_id' => '69451465',
        'webhook_file' => 'bale-bot.php'
    ],
    'telegram' => [
        'bot_username' => 'Onivalbot',
        'bot_token' => '1204808805:W-mq-hFRtv71zdHaRFSUYdr2GWCJPCvQD34',
        'admin_chat_id' => '69451465',
        'webhook_file' => 'telegram-bot.php'
    ]
];
