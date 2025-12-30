<?php
define('STORAGE_PATH', '/var/www/medusatlo/storage');

$codes = json_decode(file_get_contents(STORAGE_PATH.'/keys/access_keys.json'), true);
$now = new DateTime();
$cleaned = 0;

foreach ($codes as $code => $data) {
    if (new DateTime($data['expires']) < $now || $data['used'] >= $data['max_uses']) {
        unset($codes[$code]);
        $cleaned++;
    }
}

file_put_contents(STORAGE_PATH.'/keys/access_keys.json', json_encode($codes, JSON_PRETTY_PRINT));
file_put_contents(STORAGE_PATH.'/logs/cleanup.log', 
    date('[Y-m-d H:i:s] ')."Cleaned $cleaned expired codes\n", FILE_APPEND);
?>