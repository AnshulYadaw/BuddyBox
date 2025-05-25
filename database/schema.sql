-- BuddyBox Database Schema
-- This script creates the necessary tables for the BuddyBox application

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS buddybox;
USE buddybox;

-- Users table for authentication and user management
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user', 'readonly') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- DNS Records table for PowerDNS integration
CREATE TABLE IF NOT EXISTS dns_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    domain_name VARCHAR(255) NOT NULL,
    record_type ENUM('A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR') NOT NULL,
    record_name VARCHAR(255) NOT NULL,
    record_value TEXT NOT NULL,
    ttl INT DEFAULT 3600,
    priority INT DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_domain_type (domain_name, record_type),
    INDEX idx_record_name (record_name)
);

-- Email Accounts table for Postfix/Dovecot integration
CREATE TABLE IF NOT EXISTS email_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email_address VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    domain_name VARCHAR(255) NOT NULL,
    mailbox_path VARCHAR(500),
    quota_bytes BIGINT DEFAULT 0,
    used_bytes BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    forward_to TEXT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_domain (domain_name),
    INDEX idx_email (email_address)
);

-- Email Aliases table
CREATE TABLE IF NOT EXISTS email_aliases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    alias_address VARCHAR(255) NOT NULL,
    destination_address VARCHAR(255) NOT NULL,
    domain_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_alias (alias_address),
    INDEX idx_domain_alias (domain_name)
);

-- Backup Records table
CREATE TABLE IF NOT EXISTS backups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    backup_name VARCHAR(255) NOT NULL,
    backup_type ENUM('full', 'incremental', 'differential') NOT NULL,
    backup_path VARCHAR(500) NOT NULL,
    file_size BIGINT DEFAULT 0,
    compression_type VARCHAR(50) DEFAULT 'gzip',
    status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    error_message TEXT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_type (backup_type),
    INDEX idx_created (created_at)
);

-- Security Events table for Fail2Ban and security monitoring
CREATE TABLE IF NOT EXISTS security_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_type ENUM('intrusion_attempt', 'failed_login', 'banned_ip', 'firewall_block', 'malware_detection') NOT NULL,
    source_ip VARCHAR(45) NOT NULL,
    target_service VARCHAR(100),
    event_description TEXT,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    is_resolved BOOLEAN DEFAULT FALSE,
    resolution_notes TEXT NULL,
    resolved_by INT NULL,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_event_type (event_type),
    INDEX idx_source_ip (source_ip),
    INDEX idx_severity (severity),
    INDEX idx_created (created_at)
);

-- System Monitoring Alerts table
CREATE TABLE IF NOT EXISTS monitoring_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    alert_name VARCHAR(255) NOT NULL,
    metric_type ENUM('cpu', 'memory', 'disk', 'network', 'service', 'custom') NOT NULL,
    threshold_value DECIMAL(10,2) NOT NULL,
    comparison_operator ENUM('>', '<', '=', '>=', '<=') NOT NULL,
    current_value DECIMAL(10,2) NULL,
    alert_level ENUM('info', 'warning', 'error', 'critical') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_triggered BOOLEAN DEFAULT FALSE,
    last_triggered TIMESTAMP NULL,
    notification_emails TEXT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_metric_type (metric_type),
    INDEX idx_alert_level (alert_level),
    INDEX idx_triggered (is_triggered)
);

-- Cron Jobs table for scheduled tasks
CREATE TABLE IF NOT EXISTS cron_jobs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_name VARCHAR(255) NOT NULL,
    command TEXT NOT NULL,
    cron_expression VARCHAR(100) NOT NULL,
    description TEXT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    last_run TIMESTAMP NULL,
    next_run TIMESTAMP NULL,
    last_output TEXT NULL,
    last_exit_code INT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_enabled (is_enabled),
    INDEX idx_next_run (next_run)
);

-- Activity Logs table for audit trail
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100) NULL,
    details JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_action (user_id, action),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_created (created_at)
);

-- System Settings table for configuration
CREATE TABLE IF NOT EXISTS system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT NULL,
    is_sensitive BOOLEAN DEFAULT FALSE,
    updated_by INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_setting_key (setting_key)
);

-- Insert default admin user (password: admin123 - change immediately!)
INSERT INTO users (username, email, password_hash, role) 
VALUES ('admin', 'admin@buddybox.local', '$2b$10$rQ8kE.3YvYm0Kk4vX.kJ8uOZz1vKl.VxGF0Jk9mR8fE2Nj6vL4iG.', 'admin')
ON DUPLICATE KEY UPDATE username = username;

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('site_name', 'BuddyBox', 'string', 'Name of the BuddyBox installation'),
('site_url', 'http://localhost:3000', 'string', 'Base URL of the BuddyBox installation'),
('email_from', 'admin@buddybox.local', 'string', 'Default email sender address'),
('backup_retention_days', '30', 'number', 'Number of days to keep backups'),
('max_failed_logins', '5', 'number', 'Maximum failed login attempts before account lockout'),
('session_timeout', '3600', 'number', 'Session timeout in seconds'),
('enable_2fa', 'false', 'boolean', 'Enable two-factor authentication'),
('debug_mode', 'false', 'boolean', 'Enable debug mode for development')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_dns_records_active ON dns_records(is_active);
CREATE INDEX IF NOT EXISTS idx_email_accounts_active ON email_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_email_aliases_active ON email_aliases(is_active);
CREATE INDEX IF NOT EXISTS idx_backups_date_type ON backups(created_at, backup_type);
CREATE INDEX IF NOT EXISTS idx_security_events_date_severity ON security_events(created_at, severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_active_triggered ON monitoring_alerts(is_active, is_triggered);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date_user ON activity_logs(created_at, user_id);

-- Create views for common queries
CREATE OR REPLACE VIEW active_dns_records AS
SELECT * FROM dns_records WHERE is_active = TRUE;

CREATE OR REPLACE VIEW active_email_accounts AS
SELECT * FROM email_accounts WHERE is_active = TRUE;

CREATE OR REPLACE VIEW recent_security_events AS
SELECT * FROM security_events 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY created_at DESC;

CREATE OR REPLACE VIEW triggered_alerts AS
SELECT * FROM monitoring_alerts 
WHERE is_active = TRUE AND is_triggered = TRUE
ORDER BY last_triggered DESC;

-- Grant permissions (adjust as needed for your setup)
-- These would typically be run with appropriate user credentials
-- GRANT SELECT, INSERT, UPDATE, DELETE ON buddybox.* TO 'buddybox_user'@'localhost';
-- FLUSH PRIVILEGES;
