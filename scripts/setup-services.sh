#!/bin/bash

# BuddyBox Service Integration Setup Script
# This script configures PowerDNS, Postfix, Dovecot, and Fail2Ban for BuddyBox

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration variables
BUDDYBOX_USER="buddybox"
BUDDYBOX_GROUP="buddybox"
BUDDYBOX_HOME="/opt/buddybox"
MYSQL_ROOT_PASSWORD=""
MYSQL_BUDDYBOX_PASSWORD=""
MAIL_DOMAIN="buddybox.local"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        exit 1
    fi
}

# Detect operating system
detect_os() {
    if [[ -f /etc/debian_version ]]; then
        OS="debian"
        if [[ -f /etc/lsb-release ]]; then
            . /etc/lsb-release
            if [[ $DISTRIB_ID == "Ubuntu" ]]; then
                OS="ubuntu"
            fi
        fi
    elif [[ -f /etc/redhat-release ]]; then
        OS="centos"
    else
        print_error "Unsupported operating system"
        exit 1
    fi
    print_status "Detected OS: $OS"
}

# Create BuddyBox user
create_buddybox_user() {
    print_status "Creating BuddyBox user and group..."
    
    if ! getent group $BUDDYBOX_GROUP > /dev/null 2>&1; then
        groupadd $BUDDYBOX_GROUP
        print_success "Created group: $BUDDYBOX_GROUP"
    fi
    
    if ! getent passwd $BUDDYBOX_USER > /dev/null 2>&1; then
        useradd -r -g $BUDDYBOX_GROUP -d $BUDDYBOX_HOME -s /bin/bash $BUDDYBOX_USER
        print_success "Created user: $BUDDYBOX_USER"
    fi
    
    mkdir -p $BUDDYBOX_HOME/{logs,backups,configs}
    chown -R $BUDDYBOX_USER:$BUDDYBOX_GROUP $BUDDYBOX_HOME
}

# Install required packages
install_packages() {
    print_status "Installing required packages..."
    
    case $OS in
        "ubuntu"|"debian")
            apt-get update
            apt-get install -y \
                mysql-server \
                postfix \
                dovecot-core dovecot-imapd dovecot-pop3d dovecot-lmtpd dovecot-mysql \
                pdns-server pdns-backend-mysql \
                fail2ban \
                nginx \
                certbot python3-certbot-nginx \
                ufw \
                logrotate \
                cron
            ;;
        "centos")
            yum update -y
            yum install -y \
                mariadb-server \
                postfix \
                dovecot dovecot-mysql \
                pdns pdns-backend-mysql \
                fail2ban \
                nginx \
                certbot python3-certbot-nginx \
                firewalld \
                logrotate \
                cronie
            ;;
    esac
    
    print_success "Packages installed successfully"
}

# Configure MySQL/MariaDB
configure_database() {
    print_status "Configuring database..."
    
    # Start database service
    case $OS in
        "ubuntu"|"debian")
            systemctl start mysql
            systemctl enable mysql
            ;;
        "centos")
            systemctl start mariadb
            systemctl enable mariadb
            ;;
    esac
    
    # Secure MySQL installation (basic setup)
    if [[ -z "$MYSQL_ROOT_PASSWORD" ]]; then
        read -s -p "Enter MySQL root password: " MYSQL_ROOT_PASSWORD
        echo
    fi
    
    if [[ -z "$MYSQL_BUDDYBOX_PASSWORD" ]]; then
        read -s -p "Enter password for BuddyBox database user: " MYSQL_BUDDYBOX_PASSWORD
        echo
    fi
    
    # Create database and user
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" << EOF
CREATE DATABASE IF NOT EXISTS buddybox;
CREATE USER IF NOT EXISTS 'buddybox'@'localhost' IDENTIFIED BY '$MYSQL_BUDDYBOX_PASSWORD';
GRANT ALL PRIVILEGES ON buddybox.* TO 'buddybox'@'localhost';
FLUSH PRIVILEGES;
EOF
    
    # Import schema
    if [[ -f "$BUDDYBOX_HOME/database/schema.sql" ]]; then
        mysql -u root -p"$MYSQL_ROOT_PASSWORD" buddybox < "$BUDDYBOX_HOME/database/schema.sql"
        print_success "Database schema imported"
    fi
}

# Configure PowerDNS
configure_powerdns() {
    print_status "Configuring PowerDNS..."
    
    # Create PowerDNS configuration
    cat > /etc/powerdns/pdns.conf << EOF
# PowerDNS configuration for BuddyBox
launch=gmysql
gmysql-host=localhost
gmysql-dbname=buddybox
gmysql-user=buddybox
gmysql-password=$MYSQL_BUDDYBOX_PASSWORD
gmysql-dnssec=yes

# API configuration
api=yes
api-key=$(openssl rand -hex 32)
webserver=yes
webserver-address=127.0.0.1
webserver-port=8081
webserver-allow-from=127.0.0.1

# Security
security-poll-suffix=
setgid=pdns
setuid=pdns
EOF
    
    # Create PowerDNS database tables
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" buddybox << EOF
CREATE TABLE IF NOT EXISTS domains (
  id INT AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  master VARCHAR(128) DEFAULT NULL,
  last_check INT DEFAULT NULL,
  type VARCHAR(6) NOT NULL,
  notified_serial INT DEFAULT NULL,
  account VARCHAR(40) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY name_index (name)
) Engine=InnoDB;

CREATE TABLE IF NOT EXISTS records (
  id INT AUTO_INCREMENT,
  domain_id INT DEFAULT NULL,
  name VARCHAR(255) DEFAULT NULL,
  type VARCHAR(10) DEFAULT NULL,
  content VARCHAR(64000) DEFAULT NULL,
  ttl INT DEFAULT NULL,
  prio INT DEFAULT NULL,
  change_date INT DEFAULT NULL,
  disabled TINYINT(1) DEFAULT 0,
  ordername VARCHAR(255) BINARY DEFAULT NULL,
  auth TINYINT(1) DEFAULT 1,
  PRIMARY KEY (id),
  KEY nametype_index (name,type),
  KEY domain_id (domain_id)
) Engine=InnoDB;

CREATE TABLE IF NOT EXISTS supermasters (
  ip VARCHAR(64) NOT NULL,
  nameserver VARCHAR(255) NOT NULL,
  account VARCHAR(40) NOT NULL,
  PRIMARY KEY (ip, nameserver)
) Engine=InnoDB;
EOF
    
    systemctl enable pdns
    systemctl start pdns
    print_success "PowerDNS configured and started"
}

# Configure Postfix
configure_postfix() {
    print_status "Configuring Postfix..."
    
    # Main Postfix configuration
    cat > /etc/postfix/main.cf << EOF
# BuddyBox Postfix Configuration
myhostname = mail.$MAIL_DOMAIN
mydomain = $MAIL_DOMAIN
myorigin = \$mydomain
inet_interfaces = all
inet_protocols = ipv4
mydestination = localhost

# Virtual domains
virtual_mailbox_domains = mysql:/etc/postfix/mysql-virtual-mailbox-domains.cf
virtual_mailbox_maps = mysql:/etc/postfix/mysql-virtual-mailbox-maps.cf
virtual_alias_maps = mysql:/etc/postfix/mysql-virtual-alias-maps.cf
virtual_mailbox_base = /var/mail/vhosts
virtual_minimum_uid = 100
virtual_uid_maps = static:5000
virtual_gid_maps = static:5000

# SMTP Authentication
smtpd_sasl_type = dovecot
smtpd_sasl_path = private/auth
smtpd_sasl_auth_enable = yes
smtpd_sasl_security_options = noanonymous
smtpd_sasl_local_domain = \$myhostname

# TLS/SSL
smtpd_tls_cert_file = /etc/ssl/certs/mail.pem
smtpd_tls_key_file = /etc/ssl/private/mail.key
smtpd_use_tls = yes
smtpd_tls_auth_only = yes
smtp_tls_security_level = may
smtpd_tls_security_level = may

# Restrictions
smtpd_recipient_restrictions =
    permit_sasl_authenticated,
    permit_mynetworks,
    reject_unauth_destination

# Message size limit (50MB)
message_size_limit = 52428800
EOF
    
    # MySQL connection files
    cat > /etc/postfix/mysql-virtual-mailbox-domains.cf << EOF
user = buddybox
password = $MYSQL_BUDDYBOX_PASSWORD
hosts = localhost
dbname = buddybox
query = SELECT 1 FROM email_accounts WHERE domain_name='%s' AND is_active=1 LIMIT 1
EOF
    
    cat > /etc/postfix/mysql-virtual-mailbox-maps.cf << EOF
user = buddybox
password = $MYSQL_BUDDYBOX_PASSWORD
hosts = localhost
dbname = buddybox
query = SELECT 1 FROM email_accounts WHERE email_address='%s' AND is_active=1
EOF
    
    cat > /etc/postfix/mysql-virtual-alias-maps.cf << EOF
user = buddybox
password = $MYSQL_BUDDYBOX_PASSWORD
hosts = localhost
dbname = buddybox
query = SELECT destination_address FROM email_aliases WHERE alias_address='%s' AND is_active=1
EOF
    
    # Set permissions
    chmod 600 /etc/postfix/mysql-*.cf
    
    # Create virtual mailbox directory
    mkdir -p /var/mail/vhosts
    groupadd -g 5000 vmail || true
    useradd -g vmail -u 5000 vmail -d /var/mail/vhosts -m || true
    chown -R vmail:vmail /var/mail/vhosts
    
    systemctl enable postfix
    systemctl start postfix
    print_success "Postfix configured and started"
}

# Configure Dovecot
configure_dovecot() {
    print_status "Configuring Dovecot..."
    
    # Main Dovecot configuration
    cat > /etc/dovecot/dovecot.conf << EOF
# BuddyBox Dovecot Configuration
protocols = imap pop3 lmtp
listen = *, ::

# Mail location
mail_location = maildir:/var/mail/vhosts/%d/%n

# Authentication
auth_mechanisms = plain login
disable_plaintext_auth = no

# SSL/TLS
ssl = required
ssl_cert = </etc/ssl/certs/mail.pem
ssl_key = </etc/ssl/private/mail.key

# Logging
log_path = /var/log/dovecot.log
info_log_path = /var/log/dovecot-info.log
debug_log_path = /var/log/dovecot-debug.log

# Process limits
default_process_limit = 1000
default_client_limit = 1000

# Include other configuration files
!include conf.d/*.conf
!include_try local.conf
EOF
    
    # SQL authentication
    cat > /etc/dovecot/dovecot-sql.conf.ext << EOF
driver = mysql
connect = host=localhost dbname=buddybox user=buddybox password=$MYSQL_BUDDYBOX_PASSWORD
default_pass_scheme = SHA512-CRYPT

password_query = SELECT email_address as user, password_hash as password FROM email_accounts WHERE email_address='%u' AND is_active=1;
user_query = SELECT '/var/mail/vhosts/%d/%n' as home, 'maildir:/var/mail/vhosts/%d/%n' as mail, 5000 AS uid, 5000 AS gid FROM email_accounts WHERE email_address='%u' AND is_active=1;
EOF
    
    chmod 600 /etc/dovecot/dovecot-sql.conf.ext
    
    systemctl enable dovecot
    systemctl start dovecot
    print_success "Dovecot configured and started"
}

# Configure Fail2Ban
configure_fail2ban() {
    print_status "Configuring Fail2Ban..."
    
    # Main Fail2Ban configuration
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = auto

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[postfix-sasl]
enabled = true
port = smtp,465,submission
logpath = /var/log/mail.log
maxretry = 3

[dovecot]
enabled = true
port = pop3,pop3s,imap,imaps,submission,465,sieve
logpath = /var/log/mail.log
maxretry = 3

[apache-auth]
enabled = true
port = http,https
logpath = /var/log/apache2/*error.log
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3
EOF
    
    systemctl enable fail2ban
    systemctl start fail2ban
    print_success "Fail2Ban configured and started"
}

# Configure firewall
configure_firewall() {
    print_status "Configuring firewall..."
    
    case $OS in
        "ubuntu"|"debian")
            ufw --force enable
            ufw default deny incoming
            ufw default allow outgoing
            ufw allow ssh
            ufw allow 80/tcp
            ufw allow 443/tcp
            ufw allow 25/tcp
            ufw allow 587/tcp
            ufw allow 993/tcp
            ufw allow 995/tcp
            ufw allow 53/tcp
            ufw allow 53/udp
            ;;
        "centos")
            systemctl enable firewalld
            systemctl start firewalld
            firewall-cmd --permanent --add-service=ssh
            firewall-cmd --permanent --add-service=http
            firewall-cmd --permanent --add-service=https
            firewall-cmd --permanent --add-service=smtp
            firewall-cmd --permanent --add-service=smtp-submission
            firewall-cmd --permanent --add-service=imaps
            firewall-cmd --permanent --add-service=pop3s
            firewall-cmd --permanent --add-service=dns
            firewall-cmd --reload
            ;;
    esac
    
    print_success "Firewall configured"
}

# Configure log rotation
configure_logrotate() {
    print_status "Configuring log rotation..."
    
    cat > /etc/logrotate.d/buddybox << EOF
/opt/buddybox/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 buddybox buddybox
    postrotate
        systemctl reload buddybox || true
    endscript
}

/var/log/dovecot*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    postrotate
        systemctl reload dovecot || true
    endscript
}
EOF
    
    print_success "Log rotation configured"
}

# Generate SSL certificates
generate_ssl_certs() {
    print_status "Generating SSL certificates..."
    
    mkdir -p /etc/ssl/certs /etc/ssl/private
    
    # Generate self-signed certificate for mail services
    openssl req -new -x509 -days 365 -nodes \
        -out /etc/ssl/certs/mail.pem \
        -keyout /etc/ssl/private/mail.key \
        -subj "/C=US/ST=State/L=City/O=BuddyBox/CN=mail.$MAIL_DOMAIN"
    
    chmod 600 /etc/ssl/private/mail.key
    chmod 644 /etc/ssl/certs/mail.pem
    
    print_success "SSL certificates generated"
    print_warning "Consider replacing self-signed certificates with Let's Encrypt certificates for production use"
}

# Create systemd service
create_systemd_service() {
    print_status "Creating BuddyBox systemd service..."
    
    cat > /etc/systemd/system/buddybox.service << EOF
[Unit]
Description=BuddyBox Web Management Panel
After=network.target mysql.service

[Service]
Type=simple
User=buddybox
Group=buddybox
WorkingDirectory=/opt/buddybox
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

# Logging
StandardOutput=append:/opt/buddybox/logs/buddybox.log
StandardError=append:/opt/buddybox/logs/buddybox-error.log

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/buddybox

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable buddybox
    
    print_success "BuddyBox systemd service created"
}

# Main installation function
main() {
    print_status "Starting BuddyBox service integration setup..."
    
    check_root
    detect_os
    
    # Prompt for configuration
    read -p "Enter mail domain (default: buddybox.local): " input_domain
    MAIL_DOMAIN=${input_domain:-$MAIL_DOMAIN}
    
    create_buddybox_user
    install_packages
    configure_database
    configure_powerdns
    configure_postfix
    configure_dovecot
    configure_fail2ban
    configure_firewall
    configure_logrotate
    generate_ssl_certs
    create_systemd_service
    
    print_success "BuddyBox service integration setup completed!"
    print_status "Next steps:"
    echo "1. Copy your BuddyBox application files to $BUDDYBOX_HOME"
    echo "2. Install Node.js dependencies: cd $BUDDYBOX_HOME && npm install"
    echo "3. Update configuration files with your specific settings"
    echo "4. Start BuddyBox service: systemctl start buddybox"
    echo "5. Access BuddyBox at http://your-server-ip:3000"
    echo ""
    print_warning "Default admin credentials: admin / admin123"
    print_warning "Please change the default password immediately!"
}

# Run main function
main "$@"
