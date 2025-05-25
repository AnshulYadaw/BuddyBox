const express = require('express');
const { Pool } = require('pg');
const { exec } = require('child_process');
const { promisify } = require('util');
const { body, validationResult } = require('express-validator');
const { authorize } = require('../middleware/auth');

const router = express.Router();
const execAsync = promisify(exec);

// PostgreSQL connection pool
const createPool = (config = {}) => {
  return new Pool({
    user: config.user || process.env.DB_USER || 'postgres',
    host: config.host || process.env.DB_HOST || 'localhost',
    database: config.database || process.env.DB_NAME || 'postgres',
    password: config.password || process.env.DB_PASSWORD,
    port: config.port || process.env.DB_PORT || 5432,
  });
};

// Get database connection status
router.get('/status', authorize(['admin', 'db_admin']), async (req, res) => {
  try {
    const pool = createPool();
    const client = await pool.connect();
    
    const versionResult = await client.query('SELECT version()');
    const uptimeResult = await client.query('SELECT pg_postmaster_start_time()');
    const statsResult = await client.query(`
      SELECT 
        pg_database_size(current_database()) as db_size,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
        (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections
    `);
    
    client.release();
    await pool.end();

    const status = {
      connected: true,
      version: versionResult.rows[0].version,
      uptime: uptimeResult.rows[0].pg_postmaster_start_time,
      database_size: statsResult.rows[0].db_size,
      active_connections: parseInt(statsResult.rows[0].active_connections),
      max_connections: parseInt(statsResult.rows[0].max_connections)
    };

    res.json({ success: true, status });
  } catch (error) {
    console.error('Database status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to connect to database',
      details: error.message 
    });
  }
});

// Get list of databases
router.get('/databases', authorize(['admin', 'db_admin']), async (req, res) => {
  try {
    const pool = createPool();
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        datname as name,
        pg_database_size(datname) as size,
        datcollate as collation,
        datctype as character_type,
        (SELECT rolname FROM pg_roles WHERE oid = datdba) as owner
      FROM pg_database 
      WHERE datistemplate = false
      ORDER BY datname
    `);
    
    client.release();
    await pool.end();

    res.json({ success: true, databases: result.rows });
  } catch (error) {
    console.error('Database list error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch databases' });
  }
});

// Create new database
router.post('/databases', 
  authorize(['admin', 'db_admin']),
  [
    body('name').matches(/^[a-zA-Z][a-zA-Z0-9_]*$/).isLength({ max: 63 }),
    body('owner').isLength({ min: 1 }).optional(),
    body('encoding').isLength({ min: 1 }).optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name, owner, encoding = 'UTF8' } = req.body;
      
      const pool = createPool();
      const client = await pool.connect();

      // Check if database exists
      const existsResult = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [name]
      );

      if (existsResult.rows.length > 0) {
        client.release();
        await pool.end();
        return res.status(400).json({ success: false, error: 'Database already exists' });
      }

      // Create database
      let query = `CREATE DATABASE "${name}" WITH ENCODING '${encoding}'`;
      if (owner) {
        query += ` OWNER "${owner}"`;
      }

      await client.query(query);
      
      client.release();
      await pool.end();

      res.status(201).json({ 
        success: true, 
        message: 'Database created successfully',
        database: { name, owner, encoding }
      });

    } catch (error) {
      console.error('Database creation error:', error);
      res.status(500).json({ success: false, error: 'Failed to create database' });
    }
  }
);

// Delete database
router.delete('/databases/:name', authorize(['admin', 'db_admin']), async (req, res) => {
  try {
    const { name } = req.params;
    
    if (name === 'postgres' || name === 'template0' || name === 'template1') {
      return res.status(400).json({ success: false, error: 'Cannot delete system database' });
    }

    const pool = createPool();
    const client = await pool.connect();

    // Terminate active connections to the database
    await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [name]);

    // Drop database
    await client.query(`DROP DATABASE "${name}"`);
    
    client.release();
    await pool.end();

    res.json({ success: true, message: 'Database deleted successfully' });

  } catch (error) {
    console.error('Database deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete database' });
  }
});

// Get database users/roles
router.get('/users', authorize(['admin', 'db_admin']), async (req, res) => {
  try {
    const pool = createPool();
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        rolname as username,
        rolsuper as is_superuser,
        rolcreaterole as can_create_role,
        rolcreatedb as can_create_db,
        rolcanlogin as can_login,
        rolconnlimit as connection_limit,
        rolvaliduntil as valid_until
      FROM pg_roles
      WHERE rolname NOT LIKE 'pg_%'
      ORDER BY rolname
    `);
    
    client.release();
    await pool.end();

    res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error('Database users fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch database users' });
  }
});

// Create database user
router.post('/users', 
  authorize(['admin', 'db_admin']),
  [
    body('username').matches(/^[a-zA-Z][a-zA-Z0-9_]*$/).isLength({ max: 63 }),
    body('password').isLength({ min: 8 }),
    body('canCreateDB').isBoolean().optional(),
    body('canCreateRole').isBoolean().optional(),
    body('connectionLimit').isNumeric().optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { 
        username, 
        password, 
        canCreateDB = false, 
        canCreateRole = false,
        connectionLimit = -1 
      } = req.body;
      
      const pool = createPool();
      const client = await pool.connect();

      // Check if user exists
      const existsResult = await client.query(
        'SELECT 1 FROM pg_roles WHERE rolname = $1',
        [username]
      );

      if (existsResult.rows.length > 0) {
        client.release();
        await pool.end();
        return res.status(400).json({ success: false, error: 'User already exists' });
      }

      // Create user
      let query = `CREATE USER "${username}" WITH PASSWORD $1`;
      if (canCreateDB) query += ' CREATEDB';
      if (canCreateRole) query += ' CREATEROLE';
      if (connectionLimit >= 0) query += ` CONNECTION LIMIT ${connectionLimit}`;

      await client.query(query, [password]);
      
      client.release();
      await pool.end();

      res.status(201).json({ 
        success: true, 
        message: 'Database user created successfully',
        user: { username, canCreateDB, canCreateRole, connectionLimit }
      });

    } catch (error) {
      console.error('Database user creation error:', error);
      res.status(500).json({ success: false, error: 'Failed to create database user' });
    }
  }
);

// Delete database user
router.delete('/users/:username', authorize(['admin', 'db_admin']), async (req, res) => {
  try {
    const { username } = req.params;
    
    if (username === 'postgres') {
      return res.status(400).json({ success: false, error: 'Cannot delete postgres user' });
    }

    const pool = createPool();
    const client = await pool.connect();

    await client.query(`DROP USER "${username}"`);
    
    client.release();
    await pool.end();

    res.json({ success: true, message: 'Database user deleted successfully' });

  } catch (error) {
    console.error('Database user deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete database user' });
  }
});

// Execute SQL query
router.post('/query', 
  authorize(['admin', 'db_admin']),
  [
    body('sql').isLength({ min: 1 }),
    body('database').isLength({ min: 1 }).optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { sql, database } = req.body;
      
      // Basic SQL injection protection
      const dangerousKeywords = ['DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE'];
      const sqlUpper = sql.toUpperCase();
      
      if (dangerousKeywords.some(keyword => sqlUpper.includes(keyword))) {
        return res.status(400).json({ 
          success: false, 
          error: 'Dangerous SQL operations are not allowed through this interface' 
        });
      }

      const poolConfig = database ? { database } : {};
      const pool = createPool(poolConfig);
      const client = await pool.connect();
      
      const startTime = Date.now();
      const result = await client.query(sql);
      const executionTime = Date.now() - startTime;
      
      client.release();
      await pool.end();

      res.json({ 
        success: true, 
        result: {
          rows: result.rows,
          rowCount: result.rowCount,
          fields: result.fields?.map(field => ({
            name: field.name,
            dataTypeID: field.dataTypeID
          })),
          executionTime
        }
      });

    } catch (error) {
      console.error('SQL query error:', error);
      res.status(400).json({ 
        success: false, 
        error: 'SQL query failed',
        details: error.message 
      });
    }
  }
);

// Get database performance metrics
router.get('/metrics', authorize(['admin', 'db_admin']), async (req, res) => {
  try {
    const pool = createPool();
    const client = await pool.connect();
    
    const queries = {
      connections: `
        SELECT state, count(*) as count
        FROM pg_stat_activity
        GROUP BY state
      `,
      transactions: `
        SELECT 
          xact_commit as committed,
          xact_rollback as rolled_back,
          tup_returned as tuples_returned,
          tup_fetched as tuples_fetched,
          tup_inserted as tuples_inserted,
          tup_updated as tuples_updated,
          tup_deleted as tuples_deleted
        FROM pg_stat_database
        WHERE datname = current_database()
      `,
      tableStats: `
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          seq_scan as sequential_scans,
          seq_tup_read as sequential_reads,
          idx_scan as index_scans,
          idx_tup_fetch as index_reads
        FROM pg_stat_user_tables
        ORDER BY (n_tup_ins + n_tup_upd + n_tup_del) DESC
        LIMIT 10
      `
    };

    const results = {};
    for (const [key, query] of Object.entries(queries)) {
      const result = await client.query(query);
      results[key] = result.rows;
    }
    
    client.release();
    await pool.end();

    res.json({ success: true, metrics: results });
  } catch (error) {
    console.error('Database metrics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch database metrics' });
  }
});

// Backup database
router.post('/backup/:database', authorize(['admin', 'db_admin']), async (req, res) => {
  try {
    const { database } = req.params;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `/tmp/backup_${database}_${timestamp}.sql`;

    const { stdout, stderr } = await execAsync(
      `pg_dump -h ${process.env.DB_HOST} -U ${process.env.DB_USER} -d ${database} -f ${backupFile}`,
      { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD } }
    );

    if (stderr && !stderr.includes('Warning')) {
      throw new Error(stderr);
    }

    res.json({ 
      success: true, 
      message: 'Database backup created successfully',
      backupFile: backupFile
    });

  } catch (error) {
    console.error('Database backup error:', error);
    res.status(500).json({ success: false, error: 'Failed to create database backup' });
  }
});

module.exports = router;
