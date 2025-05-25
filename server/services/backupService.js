const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');

class BackupService {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
    this.initializeBackupDir();
  }

  async initializeBackupDir() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      console.error('Error creating backup directory:', error);
    }
  }

  async performDailyBackup() {
    try {
      console.log('Starting daily backup...');
      
      const backupId = uuidv4();
      const timestamp = new Date().toISOString().split('T')[0];
      
      const metadata = {
        id: backupId,
        type: 'daily_auto',
        description: `Automated daily backup - ${timestamp}`,
        createdAt: new Date().toISOString(),
        status: 'in_progress',
        automated: true
      };
      
      // Save initial metadata
      await this.saveBackupMetadata(metadata);
      
      // Perform backup
      await this.createSystemBackup(backupId);
      
      // Update metadata
      metadata.status = 'completed';
      metadata.completedAt = new Date().toISOString();
      await this.saveBackupMetadata(metadata);
      
      // Clean up old backups (keep last 7 daily backups)
      await this.cleanupOldBackups(7);
      
      console.log(`Daily backup ${backupId} completed successfully`);
      
      return { success: true, backupId };
    } catch (error) {
      console.error('Daily backup failed:', error);
      throw error;
    }
  }

  async createSystemBackup(backupId) {
    const backupPath = path.join(this.backupDir, `${backupId}.tar.gz`);
    const tempDir = path.join(this.backupDir, `temp_${backupId}`);
    
    try {
      // Create temporary directory
      await fs.mkdir(tempDir, { recursive: true });
      
      // Backup application configuration
      await this.backupApplicationConfig(tempDir);
      
      // Backup database schemas (not data for daily backup)
      await this.backupDatabaseSchemas(tempDir);
      
      // Backup logs (last 7 days)
      await this.backupRecentLogs(tempDir);
      
      // Create archive
      await this.createArchive(tempDir, backupPath);
      
      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true });
      
      return backupPath;
    } catch (error) {
      // Clean up on error
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {}
      throw error;
    }
  }

  async backupApplicationConfig(tempDir) {
    const configDir = path.join(tempDir, 'config');
    await fs.mkdir(configDir, { recursive: true });
    
    try {
      // Backup environment file
      const envPath = path.join(process.cwd(), '.env');
      if (await this.fileExists(envPath)) {
        await fs.copyFile(envPath, path.join(configDir, '.env'));
      }
      
      // Backup package.json files
      const packagePath = path.join(process.cwd(), 'package.json');
      if (await this.fileExists(packagePath)) {
        await fs.copyFile(packagePath, path.join(configDir, 'package.json'));
      }
      
      const clientPackagePath = path.join(process.cwd(), 'client', 'package.json');
      if (await this.fileExists(clientPackagePath)) {
        await fs.copyFile(clientPackagePath, path.join(configDir, 'client-package.json'));
      }
      
      // Backup custom configuration files
      const customConfigPath = path.join(process.cwd(), 'config');
      if (await this.fileExists(customConfigPath)) {
        await this.copyDirectory(customConfigPath, path.join(configDir, 'custom'));
      }
    } catch (error) {
      console.warn('Error backing up application config:', error.message);
    }
  }

  async backupDatabaseSchemas(tempDir) {
    const dbDir = path.join(tempDir, 'database_schemas');
    await fs.mkdir(dbDir, { recursive: true });
    
    try {
      // For a quick daily backup, we'll just backup the schema structure
      // Full data backups would be done weekly or manually
      
      // This is a placeholder - in a real implementation, you would
      // connect to your actual databases and export schemas
      const schemaInfo = {
        timestamp: new Date().toISOString(),
        databases: ['buddybox_main', 'buddybox_logs'],
        note: 'Schema backup only - full data backup available separately'
      };
      
      await fs.writeFile(
        path.join(dbDir, 'schema_info.json'),
        JSON.stringify(schemaInfo, null, 2)
      );
    } catch (error) {
      console.warn('Error backing up database schemas:', error.message);
    }
  }

  async backupRecentLogs(tempDir) {
    const logsDir = path.join(tempDir, 'logs');
    await fs.mkdir(logsDir, { recursive: true });
    
    try {
      // Backup application logs
      const appLogsPath = path.join(process.cwd(), 'logs');
      if (await this.fileExists(appLogsPath)) {
        await this.copyDirectory(appLogsPath, logsDir);
      }
      
      // Create a log summary
      const logSummary = {
        timestamp: new Date().toISOString(),
        backup_period: '7_days',
        log_types: ['application', 'error', 'access']
      };
      
      await fs.writeFile(
        path.join(logsDir, 'backup_summary.json'),
        JSON.stringify(logSummary, null, 2)
      );
    } catch (error) {
      console.warn('Error backing up logs:', error.message);
    }
  }

  async createArchive(sourceDir, targetPath) {
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(targetPath);
      const archive = archiver('tar', { gzip: true });
      
      output.on('close', () => {
        console.log(`Archive created: ${archive.pointer()} total bytes`);
        resolve();
      });
      
      archive.on('error', (err) => reject(err));
      
      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  async saveBackupMetadata(metadata) {
    const metadataPath = path.join(this.backupDir, `${metadata.id}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  async cleanupOldBackups(keepCount) {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];
      
      // Get all backup metadata files
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const metadataPath = path.join(this.backupDir, file);
            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
            
            if (metadata.automated) {
              backups.push(metadata);
            }
          } catch (error) {
            console.warn(`Error reading backup metadata ${file}:`, error);
          }
        }
      }
      
      // Sort by creation date (newest first)
      backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Remove old backups
      const toDelete = backups.slice(keepCount);
      
      for (const backup of toDelete) {
        try {
          const backupPath = path.join(this.backupDir, `${backup.id}.tar.gz`);
          const metadataPath = path.join(this.backupDir, `${backup.id}.json`);
          
          if (await this.fileExists(backupPath)) {
            await fs.unlink(backupPath);
          }
          if (await this.fileExists(metadataPath)) {
            await fs.unlink(metadataPath);
          }
          
          console.log(`Cleaned up old backup: ${backup.id}`);
        } catch (error) {
          console.warn(`Error cleaning up backup ${backup.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  async copyDirectory(source, destination) {
    try {
      await fs.mkdir(destination, { recursive: true });
      const items = await fs.readdir(source);
      
      for (const item of items) {
        const sourcePath = path.join(source, item);
        const destPath = path.join(destination, item);
        const stat = await fs.stat(sourcePath);
        
        if (stat.isDirectory()) {
          await this.copyDirectory(sourcePath, destPath);
        } else {
          await fs.copyFile(sourcePath, destPath);
        }
      }
    } catch (error) {
      throw new Error(`Error copying directory ${source}: ${error.message}`);
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout);
      });
    });
  }
}

module.exports = new BackupService();
