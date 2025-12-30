#!/bin/bash
# MedusaTLO Ubuntu 22.04 VPS Setup with Cloudflare SSL
# Uses custom SSL directory: /etc/ssl/medusatlo/
# Run as: sudo bash setup_medusa_cloudflare_ssl.sh

# ========== SYSTEM SETUP ==========
echo "➤ Updating system packages..."
apt update && apt upgrade -y

echo "➤ Installing required packages..."
apt install -y apache2 php8.1 libapache2-mod-php8.1 php8.1-curl php8.1-json \
               git unzip nodejs npm

# ========== SSL CERTIFICATE SETUP ==========
echo "➤ Setting up Cloudflare SSL directory..."
mkdir -p /etc/ssl/medusatlo
chmod 750 /etc/ssl/medusatlo

# Assuming PEM files are already in ~/pems/
echo "➤ Moving Cloudflare PEM files..."
mv ~/pems/cert.pem /etc/ssl/medusatlo/
mv ~/pems/key.pem /etc/ssl/medusatlo/

# Set proper permissions
chmod 640 /etc/ssl/medusatlo/*.pem
chown -R root:www-data /etc/ssl/medusatlo

# ========== APPLICATION STRUCTURE ==========
echo "➤ Creating MedusaTLO directory structure..."
mkdir -p /var/www/medusatlo/{public,storage/{keys,results,logs},bot,scripts}

# ========== APACHE CONFIGURATION ==========
echo "➤ Creating dedicated Apache SSL config..."
cat > /etc/apache2/sites-available/medusatlo-ssl.conf <<EOL
<VirtualHost *:443>
    ServerName nebulasecurity.fr
    ServerAlias www.nebulasecurity.fr
    DocumentRoot /var/www/medusatlo/public

    SSLEngine on
    SSLCertificateFile /etc/ssl/medusatlo/cert.pem
    SSLCertificateKeyFile /etc/ssl/medusatlo/key.pem
    SSLProtocol all -SSLv2 -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite HIGH:!aNULL:!MD5:!RC4

    ErrorLog \${APACHE_LOG_DIR}/medusatlo_ssl_error.log
    CustomLog \${APACHE_LOG_DIR}/medusatlo_ssl_access.log combined

    <Directory /var/www/medusatlo/public>
        Options FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    <Directory ~ "/var/www/medusatlo/(storage|bot|scripts)">
        Require all denied
    </Directory>
</VirtualHost>

<VirtualHost *:80>
    ServerName nebulasecurity.fr
    ServerAlias www.nebulasecurity.fr
    Redirect permanent / https://nebulasecurity.fr/
</VirtualHost>
EOL

echo "➤ Enabling site and modules..."
a2ensite medusatlo-ssl
a2enmod rewrite ssl
systemctl restart apache2

# ========== FILE PERMISSIONS ==========
echo "➤ Setting MedusaTLO permissions..."
chown -R www-data:www-data /var/www/medusatlo
find /var/www/medusatlo -type d -exec chmod 750 {} \;
find /var/www/medusatlo -type f -exec chmod 640 {} \;

# Special permissions
chmod 700 /var/www/medusatlo/scripts/*
chmod 660 /var/www/medusatlo/storage/logs/*.log
chmod 750 /var/www/medusatlo/bot/bot.js

# ========== CRON JOBS ==========
echo "➤ Setting up maintenance cron jobs..."
(crontab -l 2>/dev/null; echo "0 3 * * * php /var/www/medusatlo/scripts/cleanup_codes.php >/dev/null 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "30 3 * * 0 php /var/www/medusatlo/scripts/cleanup_results.php >/dev/null 2>&1") | crontab -

# ========== SECURITY HARDENING ==========
echo "➤ Hardening PHP configuration..."
sed -i 's/^disable_functions =.*/disable_functions = exec,passthru,shell_exec,system,proc_open,popen,curl_exec,curl_multi_exec,parse_ini_file,show_source/' /etc/php/8.1/apache2/php.ini
systemctl restart apache2

# ========== APPLICATION FILES ==========
echo "➤ Creating essential files..."
touch /var/www/medusatlo/storage/{keys/access_keys.json,results/database.json,logs/{access.log,errors.log}}
touch /var/www/medusatlo/public/{index.php,access.php,results.php,footer.php}

echo "➤ Configuring .htaccess..."
cat > /var/www/medusatlo/public/.htaccess <<EOL
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Clean URLs
RewriteRule ^access/?$ access.php [L]
RewriteRule ^results/?$ results.php [L]

# Security Headers
Header set X-Content-Type-Options "nosniff"
Header set X-Frame-Options "SAMEORIGIN"
Header set Content-Security-Policy "default-src 'self'"

# Block access to .php files
RewriteCond %{THE_REQUEST} \.php[\s?]
RewriteRule ^ - [F]

Options -Indexes -MultiViews
EOL

echo "✅ MedusaTLO with Cloudflare SSL setup complete!"
echo "   SSL Config: /etc/apache2/sites-available/medusatlo-ssl.conf"
echo "   PEM Files: /etc/ssl/medusatlo/{cert.pem,key.pem}"
echo "   Web Root: /var/www/medusatlo/public"
echo "   Access: https://nebulasecurity.fr"