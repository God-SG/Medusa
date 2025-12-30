#!/bin/bash
# Set ownership
sudo chown -R www-data:www-data /var/www/medusatlo

# Set directory permissions
find /var/www/medusatlo -type d -exec chmod 750 {} \;

# Set file permissions
find /var/www/medusatlo -type f -exec chmod 640 {} \;

# Special permissions
chmod 750 /var/www/medusatlo/scripts/*
chmod 750 /var/www/medusatlo/bot/*
chmod 660 /var/www/medusatlo/storage/logs/cleanup.log
chmod 600 /var/www/medusatlo/config/*

# Make storage files writable
chmod 640 /var/www/medusatlo/storage/keys/access_keys.json
chmod 640 /var/www/medusatlo/storage/results/database.json

# Allow execution of cleanup scripts
chmod 700 /var/www/medusatlo/scripts/cleanup_*.php

# Set ACL for Apache
setfacl -Rm u:www-data:rx /var/www/medusatlo
setfacl -Rm u:www-data:rw /var/www/medusatlo/storage