const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');

const BACKUP_DIR = process.env.BACKUP_DIR || '/var/backups/buddybox';

// Ensure backup directory exists
(async () => {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating backup directory:', error);
  }
})();

// Get backup list
router.get('/', async (req, res) => {
  try {
    const backups = await getBackupList();
    res.json({ success: true, backups });
  } catch (error) {
    console.error('Error getting backup list:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create full system backup
router.post('/full', async (req, res) => {
  try {
    const { description, includeDatabases = true, includeConfigs = true } = req.body;
    const backupId = uuidv4();
    
    // Start backup process in background
    createFullBackup(backupId, description, { includeDatabases, includeConfigs })
      .catch(error => console.error('Backup failed:', error));
    
    res.json({ 
      success: true, 
      backupId, 
      message: 'Backup started in background' 
    });
  } catch (error) {
    console.error('Error starting backup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create database backup
router.post('/database', async (req, res) => {
  try {
    const { databases, description } = req.body;
    const backupId = uuidv4();
    
    // Start database backup process
    createDatabaseBackup(backupId, databases, description)
      .catch(error => console.error('Database backup failed:', error));
    
    res.json({ 
      success: true, 
      backupId, 
      message: 'Database backup started' 
    });
  } catch (error) {
    console.error('Error starting database backup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create configuration backup
router.post('/config', async (req, res) => {
  try {
    const { services, description } = req.body;
    const backupId = uuidv4();
    
    // Start config backup process
    createConfigBackup(backupId, services, description)
      .catch(error => console.error('Config backup failed:', error));
    
    res.json({ 
      success: true, 
      backupId, 
      message: 'Configuration backup started' 
    });
  } catch (error) {
    console.error('Error starting config backup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get backup status
router.get('/status/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;
    const status = await getBackupStatus(backupId);
    res.json({ success: true, status });
  } catch (error) {
    console.error('Error getting backup status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download backup
router.get('/download/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;
    const backupPath = await getBackupPath(backupId);
    
    if (!backupPath || !(await fileExists(backupPath))) {
      return res.status(404).json({ success: false, error: 'Backup not found' });
    }
    
    res.download(backupPath, `backup-${backupId}.tar.gz`);
  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Restore from backup
router.post('/restore/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;
    const { restoreOptions } = req.body;
    
    const restoreId = uuidv4();
    
    // Start restore process in background
    restoreBackup(backupId, restoreId, restoreOptions)
      .catch(error => console.error('Restore failed:', error));
    
    res.json({ 
      success: true, 
      restoreId, 
      message: 'Restore started in background' 
    });
  } catch (error) {
    console.error('Error starting restore:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete backup
router.delete('/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;
    await deleteBackup(backupId);
    res.json({ success: true, message: 'Backup deleted successfully' });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get backup schedule
router.get('/schedule', async (req, res) => {
  try {
    const schedule = await getBackupSchedule();
    res.json({ success: true, schedule });
  } catch (error) {
    console.error('Error getting backup schedule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update backup schedule
router.put('/schedule', async (req, res) => {
  try {
    const { schedule } = req.body;
    await updateBackupSchedule(schedule);
    res.json({ success: true, message: 'Backup schedule updated' });
  } catch (error) {
    console.error('Error updating backup schedule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper functions
async function getBackupList() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backups = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const metadataPath = path.join(BACKUP_DIR, file);
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
          
          // Check if backup file exists
          const backupPath = path.join(BACKUP_DIR, `${metadata.id}.tar.gz`);
          const backupExists = await fileExists(backupPath);
          
          if (backupExists) {
            const stats = await fs.stat(backupPath);
            backups.push({
              ...metadata,
              size: stats.size,
              path: backupPath
            });
          }
        } catch (error) {
          console.error(`Error reading backup metadata ${file}:`, error);
        }
      }
    }
    
    return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error('Error listing backups:', error);
    return [];
  }
}

async function createFullBackup(backupId, description, options) {
  const metadata = {
    id: backupId,
    type: 'full',
    description: description || 'Full system backup',
    createdAt: new Date().toISOString(),
    status: 'in_progress',
    options
  };
  
  try {
    // Save metadata
    await saveBackupMetadata(metadata);
    
    const backupPath = path.join(BACKUP_DIR, `${backupId}.tar.gz`);
    const tempDir = path.join(BACKUP_DIR, `temp_${backupId}`);
    
    // Create temporary directory
    await fs.mkdir(tempDir, { recursive: true });
    
    // Backup configurations
    if (options.includeConfigs) {
      await backupConfigurations(tempDir);
    }
    
    // Backup databases
    if (options.includeDatabases) {
      await backupDatabases(tempDir);
    }
    
    // Backup application data
    await backupApplicationData(tempDir);
    
    // Create archive
    await createArchive(tempDir, backupPath);
    
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
    
    // Update metadata
    metadata.status = 'completed';
    metadata.completedAt = new Date().toISOString();
    await saveBackupMetadata(metadata);
    
    console.log(`Backup ${backupId} completed successfully`);
  } catch (error) {
    console.error(`Backup ${backupId} failed:`, error);
    
    // Update metadata with error
    metadata.status = 'failed';
    metadata.error = error.message;
    metadata.completedAt = new Date().toISOString();
    await saveBackupMetadata(metadata);
  }
}

async function createDatabaseBackup(backupId, databases, description) {
  const metadata = {
    id: backupId,
    type: 'database',
    description: description || 'Database backup',
    createdAt: new Date().toISOString(),
    status: 'in_progress',
    databases
  };
  
  try {
    await saveBackupMetadata(metadata);
    
    const backupPath = path.join(BACKUP_DIR, `${backupId}.tar.gz`);
    const tempDir = path.join(BACKUP_DIR, `temp_${backupId}`);
    
    await fs.mkdir(tempDir, { recursive: true });
    
    // Backup specified databases
    for (const db of databases) {
      await backupDatabase(db, tempDir);
    }
    
    await createArchive(tempDir, backupPath);
    await fs.rm(tempDir, { recursive: true, force: true });
    
    metadata.status = 'completed';
    metadata.completedAt = new Date().toISOString();
    await saveBackupMetadata(metadata);
    
    console.log(`Database backup ${backupId} completed successfully`);
  } catch (error) {
    console.error(`Database backup ${backupId} failed:`, error);
    
    metadata.status = 'failed';
    metadata.error = error.message;
    metadata.completedAt = new Date().toISOString();
    await saveBackupMetadata(metadata);
  }
}

async function createConfigBackup(backupId, services, description) {
  const metadata = {
    id: backupId,
    type: 'config',
    description: description || 'Configuration backup',
    createdAt: new Date().toISOString(),
    status: 'in_progress',
    services
  };
  
  try {
    await saveBackupMetadata(metadata);
    
    const backupPath = path.join(BACKUP_DIR, `${backupId}.tar.gz`);
    const tempDir = path.join(BACKUP_DIR, `temp_${backupId}`);
    
    await fs.mkdir(tempDir, { recursive: true });
    
    // Backup configurations for specified services
    for (const service of services) {
      await backupServiceConfig(service, tempDir);
    }
    
    await createArchive(tempDir, backupPath);
    await fs.rm(tempDir, { recursive: true, force: true });
    
    metadata.status = 'completed';
    metadata.completedAt = new Date().toISOString();
    await saveBackupMetadata(metadata);
    
    console.log(`Config backup ${backupId} completed successfully`);
  } catch (error) {
    console.error(`Config backup ${backupId} failed:`, error);
    
    metadata.status = 'failed';
    metadata.error = error.message;
    metadata.completedAt = new Date().toISOString();
    await saveBackupMetadata(metadata);
  }
}

async function backupConfigurations(tempDir) {
  const configPaths = [
    '/etc/nginx',
    '/etc/apache2',
    '/etc/postfix',
    '/etc/dovecot',
    '/etc/bind',
    '/etc/fail2ban',
    '/etc/mysql',
    '/etc/postgresql'
  ];
  
  for (const configPath of configPaths) {
    try {
      if (await fileExists(configPath)) {
        const serviceName = path.basename(configPath);
        const targetPath = path.join(tempDir, 'configs', serviceName);
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await execCommand(`cp -r ${configPath} ${targetPath}`);
      }
    } catch (error) {
      console.warn(`Failed to backup config ${configPath}:`, error.message);
    }
  }
}

async function backupDatabases(tempDir) {
  const dbDir = path.join(tempDir, 'databases');
  await fs.mkdir(dbDir, { recursive: true });
  
  // Backup PostgreSQL databases
  try {
    const pgDatabases = await execCommand("sudo -u postgres psql -l -t | awk -F'|' '{print $1}' | grep -v template | grep -v postgres | sed 's/^ *//g' | grep -v '^$'");
    const databases = pgDatabases.split('\n').filter(db => db.trim());
    
    for (const db of databases) {
      if (db.trim()) {
        const dumpPath = path.join(dbDir, `${db.trim()}.sql`);
        await execCommand(`sudo -u postgres pg_dump ${db.trim()} > ${dumpPath}`);
      }
    }
  } catch (error) {
    console.warn('Failed to backup PostgreSQL databases:', error.message);
  }
  
  // Backup MySQL databases
  try {
    const mysqlDatabases = await execCommand("mysql -e 'SHOW DATABASES;' | grep -v Database | grep -v information_schema | grep -v performance_schema | grep -v mysql | grep -v sys");
    const databases = mysqlDatabases.split('\n').filter(db => db.trim());
    
    for (const db of databases) {
      if (db.trim()) {
        const dumpPath = path.join(dbDir, `${db.trim()}.sql`);
        await execCommand(`mysqldump ${db.trim()} > ${dumpPath}`);
      }
    }
  } catch (error) {
    console.warn('Failed to backup MySQL databases:', error.message);
  }
}

async function backupApplicationData(tempDir) {
  const appDir = path.join(tempDir, 'application');
  await fs.mkdir(appDir, { recursive: true });
  
  // Backup BuddyBox application data
  const appPaths = [
    process.cwd(),
    '/var/www',
    '/home/buddybox'
  ];
  
  for (const appPath of appPaths) {
    try {
      if (await fileExists(appPath)) {
        const appName = path.basename(appPath);
        const targetPath = path.join(appDir, appName);
        await execCommand(`cp -r ${appPath} ${targetPath}`);
      }
    } catch (error) {
      console.warn(`Failed to backup application data ${appPath}:`, error.message);
    }
  }
}

async function backupDatabase(dbName, tempDir) {
  const dbDir = path.join(tempDir, 'databases');
  await fs.mkdir(dbDir, { recursive: true });
  
  try {
    // Try PostgreSQL first
    const dumpPath = path.join(dbDir, `${dbName}.sql`);
    await execCommand(`sudo -u postgres pg_dump ${dbName} > ${dumpPath}`);
  } catch (pgError) {
    try {
      // Try MySQL
      const dumpPath = path.join(dbDir, `${dbName}.sql`);
      await execCommand(`mysqldump ${dbName} > ${dumpPath}`);
    } catch (mysqlError) {
      throw new Error(`Failed to backup database ${dbName}: ${mysqlError.message}`);
    }
  }
}

async function backupServiceConfig(serviceName, tempDir) {
  const configMap = {
    nginx: '/etc/nginx',
    apache: '/etc/apache2',
    postfix: '/etc/postfix',
    dovecot: '/etc/dovecot',
    bind: '/etc/bind',
    fail2ban: '/etc/fail2ban',
    mysql: '/etc/mysql',
    postgresql: '/etc/postgresql'
  };
  
  const configPath = configMap[serviceName];
  if (!configPath) {
    throw new Error(`Unknown service: ${serviceName}`);
  }
  
  if (await fileExists(configPath)) {
    const targetPath = path.join(tempDir, 'configs', serviceName);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await execCommand(`cp -r ${configPath} ${targetPath}`);
  }
}

async function createArchive(sourceDir, targetPath) {
  return new Promise((resolve, reject) => {
    const output = require('fs').createWriteStream(targetPath);
    const archive = archiver('tar', { gzip: true });
    
    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));
    
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function saveBackupMetadata(metadata) {
  const metadataPath = path.join(BACKUP_DIR, `${metadata.id}.json`);
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
}

async function getBackupStatus(backupId) {
  try {
    const metadataPath = path.join(BACKUP_DIR, `${backupId}.json`);
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    return metadata;
  } catch (error) {
    throw new Error('Backup not found');
  }
}

async function getBackupPath(backupId) {
  const backupPath = path.join(BACKUP_DIR, `${backupId}.tar.gz`);
  return await fileExists(backupPath) ? backupPath : null;
}

async function deleteBackup(backupId) {
  const backupPath = path.join(BACKUP_DIR, `${backupId}.tar.gz`);
  const metadataPath = path.join(BACKUP_DIR, `${backupId}.json`);
  
  try {
    if (await fileExists(backupPath)) {
      await fs.unlink(backupPath);
    }
    if (await fileExists(metadataPath)) {
      await fs.unlink(metadataPath);
    }
  } catch (error) {
    throw new Error(`Failed to delete backup: ${error.message}`);
  }
}

async function restoreBackup(backupId, restoreId, options) {
  // Implementation would depend on specific restore requirements
  console.log(`Restore ${restoreId} from backup ${backupId} with options:`, options);
  // This is a placeholder - actual restore implementation would be more complex
}

async function getBackupSchedule() {
  try {
    const schedulePath = path.join(BACKUP_DIR, 'schedule.json');
    if (await fileExists(schedulePath)) {
      return JSON.parse(await fs.readFile(schedulePath, 'utf8'));
    }
    return {
      enabled: false,
      fullBackup: { cron: '0 2 * * 0', enabled: true }, // Weekly
      dbBackup: { cron: '0 3 * * *', enabled: true },   // Daily
      configBackup: { cron: '0 4 * * 1', enabled: true } // Weekly
    };
  } catch (error) {
    throw new Error(`Failed to get backup schedule: ${error.message}`);
  }
}

async function updateBackupSchedule(schedule) {
  try {
    const schedulePath = path.join(BACKUP_DIR, 'schedule.json');
    await fs.writeFile(schedulePath, JSON.stringify(schedule, null, 2));
  } catch (error) {
    throw new Error(`Failed to update backup schedule: ${error.message}`);
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function execCommand(command) {
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

module.exports = router;
