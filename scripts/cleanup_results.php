<?php
define('STORAGE_PATH', '/var/www/medusatlo/storage');

$results = json_decode(file_get_contents(STORAGE_PATH.'/results/database.json'), true);
$now = new DateTime();
$cleaned = 0;

foreach ($results as $code => $data) {
    if (new DateTime($data['expires'] ?? '1970-01-01') < $now) {
        unset($results[$code]);
        $cleaned++;
    }
}

file_put_contents(STORAGE_PATH.'/results/database.json', json_encode($results, JSON_PRETTY_PRINT));
file_put_contents(STORAGE_PATH.'/logs/cleanup.log', 
    date('[Y-m-d H:i:s] ')."Cleaned $cleaned expired results\n", FILE_APPEND);
?>