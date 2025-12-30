#!/bin/bash

# Auto-Screener for Node.js Discord Bot with NVM and systemd support
# Usage: ./bot-screener.sh [start|stop|restart|status|install-service]

# Configuration
BOT_NAME="MedusaTLO"
BOT_DIR="/var/www/medusatlo/bot"
BOT_FILE="bot.js"
LOG_FILE="/var/log/medusatlo-bot.log"
SERVICE_NAME="medusatlo-bot"
RUN_AS_USER=$(stat -c '%U' "$BOT_DIR")  # Gets owner of bot directory
NVM_DIR="/home/$RUN_AS_USER/.nvm"       # Standard NVM installation path

# Load NVM if available
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Check if script is run as root
if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root" >&2
  exit 1
fi

install_dependencies() {
  echo "Checking dependencies..."
  if ! command -v node &> /dev/null; then
    echo "Node.js not found. Please install using NVM first as $RUN_AS_USER:"
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
    echo "  source ~/.nvm/nvm.sh"
    echo "  nvm install --lts"
    exit 1
  fi

  if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo -u $RUN_AS_USER bash -c "source $NVM_DIR/nvm.sh && npm install -g pm2"
  fi
}

setup_systemd_service() {
  echo "Configuring systemd service..."
  SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"
  
  cat > $SERVICE_FILE <<EOL
[Unit]
Description=$BOT_NAME Discord Bot
After=network.target

[Service]
Type=simple
User=$RUN_AS_USER
WorkingDirectory=$BOT_DIR
Environment="NVM_DIR=$NVM_DIR"
ExecStart=/bin/bash -c 'source $NVM_DIR/nvm.sh && nvm use default && pm2 start $BOT_FILE --name $BOT_NAME --no-daemon'
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

  systemctl daemon-reload
  systemctl enable $SERVICE_NAME
  echo "Systemd service configured. Start with: systemctl start $SERVICE_NAME"
}

start_bot() {
  echo "Starting $BOT_NAME..."
  if [ -f "/etc/systemd/system/$SERVICE_NAME.service" ]; then
    systemctl start $SERVICE_NAME
  else
    sudo -u $RUN_AS_USER bash -c "source $NVM_DIR/nvm.sh && pm2 start $BOT_DIR/$BOT_FILE --name $BOT_NAME --log $LOG_FILE"
    pm2 save
  fi
  echo "$BOT_NAME started successfully."
}

stop_bot() {
  echo "Stopping $BOT_NAME..."
  if [ -f "/etc/systemd/system/$SERVICE_NAME.service" ]; then
    systemctl stop $SERVICE_NAME
  else
    sudo -u $RUN_AS_USER bash -c "source $NVM_DIR/nvm.sh && pm2 stop $BOT_NAME && pm2 delete $BOT_NAME"
  fi
  echo "$BOT_NAME stopped successfully."
}

status_bot() {
  if [ -f "/etc/systemd/system/$SERVICE_NAME.service" ]; then
    systemctl status $SERVICE_NAME
  else
    sudo -u $RUN_AS_USER bash -c "source $NVM_DIR/nvm.sh && pm2 list | grep $BOT_NAME"
  fi
}

case "$1" in
  start)
    install_dependencies
    start_bot
    ;;
  stop)
    stop_bot
    ;;
  restart)
    stop_bot
    sleep 2
    start_bot
    ;;
  status)
    status_bot
    ;;
  install-service)
    install_dependencies
    setup_systemd_service
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|install-service}"
    echo ""
    echo "Options:"
    echo "  install-service  - Configure as a systemd service (recommended)"
    echo "  start            - Start the bot (using existing method)"
    echo "  stop             - Stop the bot"
    echo "  restart          - Restart the bot"
    echo "  status           - Show bot status"
    exit 1
    ;;
esac

exit 0