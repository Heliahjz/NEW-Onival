<?php
/**
 * Dedicated Bale Bot Webhook Entry Point
 * URL: https://yourdomain.com/api/bale-webhook.php
 */
$_GET['platform'] = 'bale';
require __DIR__ . '/webhook.php';
