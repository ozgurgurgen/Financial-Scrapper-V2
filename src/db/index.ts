import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 25,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 30000, // 30s to allow Cloud SQL to warm up / resume from scale-to-zero
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      statement_timeout: 45000,
    });
    global._postgresPool.on('error', (err) => {
      console.warn('[PostgresPool] Background idle client notice (auto-managed):', err.message);
    });
  }
  return global._postgresPool;
};

const defaultPool = createPool();
const defaultDb = drizzle(defaultPool, { schema });

let currentPool = defaultPool;
let currentDb = drizzle(currentPool, { schema });
let currentConfig: { host?: string, user?: string, password?: string, database?: string, connectionString?: string } | null = null;

export const getCurrentDbConfig = () => currentConfig;

/**
 * Ensures the database is reachable before executing startup tasks,
 * retrying up to maxRetries times with exponential backoff.
 */
export const ensureDatabaseConnected = async (maxRetries = 6, initialDelayMs = 2000): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await currentPool.query('SELECT 1');
      return true;
    } catch (err: any) {
      if (attempt === maxRetries) {
        console.warn(`[DB Connection] Database connection check failed after ${maxRetries} attempts:`, err.message);
        return false;
      }
      const delay = initialDelayMs * attempt;
      console.log(`[DB Connection] Database warming up (attempt ${attempt}/${maxRetries}), waiting ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
};

export const ensureLocalSchema = async (config: any) => {
  try {
    const { exec } = await import('child_process');
    const util = await import('util');
    const execPromise = util.promisify(exec);

    const env = { ...process.env };
    if (config?.connectionString) {
      env.DATABASE_URL = config.connectionString;
      delete env.SQL_HOST;
      delete env.SQL_USER;
      delete env.SQL_PASSWORD;
      delete env.SQL_DB_NAME;
      delete env.SQL_ADMIN_USER;
      delete env.SQL_ADMIN_PASSWORD;
    } else if (config?.host) {
      delete env.DATABASE_URL;
      env.SQL_HOST = config.host;
      env.SQL_USER = config.user;
      env.SQL_PASSWORD = config.password;
      env.SQL_DB_NAME = config.database;
      env.SQL_ADMIN_USER = config.user;
      env.SQL_ADMIN_PASSWORD = config.password;
    } else {
      return;
    }

    console.log('[DB Sync] Hedef yerel veritabanı şeması otomatik hazırlanıyor (drizzle-kit push)...');
    await execPromise('npx drizzle-kit push --config=./src/db/drizzle.config.ts', { env });
    console.log('[DB Sync] Şema başarıyla hazırlandı ve tablolar oluşturuldu.');
  } catch (err: any) {
    console.warn('[DB Sync] Şema otomatik oluşturulurken uyarı/not:', err.message);
  }
};

export const switchDatabase = async (config: { host?: string, user?: string, password?: string, database?: string, connectionString?: string }) => {
  currentConfig = config && Object.keys(config).length > 0 ? config : null;

  if (currentPool && currentPool !== defaultPool) {
    await currentPool.end().catch(() => {});
  }
  
  if (!config || Object.keys(config).length === 0 || (!config.connectionString && !config.host)) {
    currentPool = defaultPool;
    currentDb = drizzle(currentPool, { schema });
    return;
  }

  const poolConfig = config.connectionString 
    ? { connectionString: config.connectionString, max: 10, connectionTimeoutMillis: 15000 }
    : {
        host: config.host || process.env.SQL_HOST,
        user: config.user || process.env.SQL_USER,
        password: config.password || process.env.SQL_PASSWORD,
        database: config.database || process.env.SQL_DB_NAME,
        max: 10,
        connectionTimeoutMillis: 15000,
      };

  currentPool = new Pool(poolConfig);
  currentPool.on('error', (err) => {
    console.error('Unexpected error on idle SQL pool client:', err);
  });
  
  currentDb = drizzle(currentPool, { schema });
};

// Cloud to Local Migration Utility with Topological Dependency Ordering & Batching
export interface SyncOptions {
  includeLargeHistory?: boolean; // If true, syncs massive historical time-series (tefas_historical_navs, asset_data, crypto_candles)
  maxHistoryRowsPerTable?: number; // Optional cap for massive tables (e.g. 50000)
  batchSize?: number;
  autoInitSchema?: boolean; // Automatically create tables if missing in target
}

export interface SyncResult {
  totalRows: number;
  tableStats: Record<string, number>;
  errors: string[];
}

// STRICT TOPOLOGICAL ORDER: Parent tables first, foreign-key dependent tables second, massive history last
const ORDERED_TABLE_KEYS = [
  // 1. Independent parent tables
  'users',
  'settings',
  'assets',
  'kapCompanies',
  'tefasFunds',
  'bistStocks',
  'cryptoCoins',
  'usStocks',
  'usEtfs',
  'macroIndicators',
  'ipos',
  'marketNews',
  'cryptoNews',
  'backfillSyncState',
  'syncLogs',
  // 2. Dependent tables (Foreign keys to assets, tefasFunds, etc.)
  'assetMappings',
  'kapDisclosures',
  'tefasPrices',
  'tefasFundHoldings',
  'cryptoPrices',
  'cryptoOnChain',
  'cryptoSyncMetadata',
  'analystReports',
  'unmatchedData',
  'usHistoricalCandles',
  // 3. Massive time-series tables (Millions of bars)
  'assetData',
  'tefasHistoricalNavs',
  'cryptoCandles',
];

const MASSIVE_HISTORY_TABLES = new Set(['assetData', 'tefasHistoricalNavs', 'cryptoCandles']);

export const exportDatabaseToJson = async (includeLargeHistory = false): Promise<any> => {
  const exportData: Record<string, any[]> = {};
  for (const tableKey of ORDERED_TABLE_KEYS) {
    if (MASSIVE_HISTORY_TABLES.has(tableKey) && !includeLargeHistory) continue;
    const table = (schema as any)[tableKey];
    if (!table) continue;
    const records = await defaultDb.select().from(table as any);
    if (records.length > 0) {
      exportData[table[Symbol.for('drizzle:Name')]] = records;
    }
  }
  return exportData;
};

export const importDatabaseFromJson = async (data: Record<string, any[]>): Promise<SyncResult> => {
  const tableStats: Record<string, number> = {};
  const errors: string[] = [];
  let totalRows = 0;

  for (const tableKey of ORDERED_TABLE_KEYS) {
    const table = (schema as any)[tableKey];
    if (!table) continue;
    const tableName = table[Symbol.for('drizzle:Name')];
    const records = data[tableName];
    
    if (!records || records.length === 0) continue;

    try {
      const chunkSize = 1000;
      let inserted = 0;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        await defaultDb.insert(table as any).values(chunk).onConflictDoNothing();
        inserted += chunk.length;
      }
      tableStats[tableName] = inserted;
      totalRows += inserted;
    } catch (e: any) {
      errors.push(`Table ${tableName} import error: ${e.message}`);
    }
  }

  return { totalRows, tableStats, errors };
};

export const syncFromCloudToLocal = async (options: SyncOptions = {}): Promise<SyncResult> => {
  if (currentPool === defaultPool) {
    throw new Error('Şu an zaten varsayılan Cloud veritabanına bağlısınız. Hedef Local veritabanı olmalıdır. Lütfen önce Local DB seçip "Bağlantıyı Uygula" butonuna basınız.');
  }

  const {
    includeLargeHistory = false,
    maxHistoryRowsPerTable = 10000,
    batchSize = 1000,
    autoInitSchema = true
  } = options;

  // Check if tables exist in Local DB; if not, automatically run schema creation!
  if (autoInitSchema) {
    try {
      const checkRes = await currentPool.query(`SELECT to_regclass('public."users"') as tbl_exists`);
      if (!checkRes.rows[0]?.tbl_exists && currentConfig) {
        await ensureLocalSchema(currentConfig);
      }
    } catch (e: any) {
      console.warn('[DB Sync] Tablo kontrol uyarısı, şema oluşturuluyor:', e.message);
      if (currentConfig) {
        await ensureLocalSchema(currentConfig);
      }
    }
  }

  let totalRows = 0;
  const tableStats: Record<string, number> = {};
  const errors: string[] = [];

  for (const tableKey of ORDERED_TABLE_KEYS) {
    const table = (schema as any)[tableKey];
    if (!table || typeof table !== 'object' || !(Symbol.for('drizzle:Name') in table)) {
      continue;
    }

    const tableName = table[Symbol.for('drizzle:Name')];

    // Check if large history should be skipped or capped
    const isMassive = MASSIVE_HISTORY_TABLES.has(tableKey);
    if (isMassive && !includeLargeHistory) {
      tableStats[tableName] = 0;
      continue;
    }

    try {
      // Get count first to batch properly without loading all into memory
      const countRes = await defaultPool.query(`SELECT count(*) FROM "${tableName}"`);
      let count = parseInt(countRes.rows[0]?.count || '0', 10);

      if (isMassive && maxHistoryRowsPerTable && count > maxHistoryRowsPerTable) {
        count = maxHistoryRowsPerTable;
      }

      if (count === 0) {
        tableStats[tableName] = 0;
        continue;
      }

      let insertedForTable = 0;

      // Paged streaming in chunks to prevent Node.js memory exhaustion or connection drop
      for (let offset = 0; offset < count; offset += batchSize) {
        const fetchLimit = Math.min(batchSize, count - offset);
        const chunk = await (defaultDb.select().from(table as any) as any)
          .limit(fetchLimit)
          .offset(offset);

        if (!chunk || chunk.length === 0) break;

        await currentDb.insert(table as any).values(chunk).onConflictDoNothing();
        insertedForTable += chunk.length;
      }

      tableStats[tableName] = insertedForTable;
      totalRows += insertedForTable;

      // Synchronize PostgreSQL sequence if the table uses serial primary key
      try {
        await currentPool.query(`SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), COALESCE(max(id), 1)) FROM "${tableName}"`);
      } catch {
        // Sequence does not exist for non-serial PK tables, safe to ignore
      }

    } catch (e: any) {
      console.error(`Tablo aktarım hatası [${tableName}]:`, e.message);
      errors.push(`${tableName}: ${e.message}`);
    }
  }

  return { totalRows, tableStats, errors };
};

export const syncFromLocalToCloud = async (options: SyncOptions = {}): Promise<SyncResult> => {
  if (currentPool === defaultPool) {
    throw new Error('Şu an varsayılan Cloud veritabanına bağlısınız. Kaynak Local veritabanı olmalıdır. Lütfen önce Local DB seçip "Bağlantıyı Uygula" butonuna basınız.');
  }

  const {
    includeLargeHistory = false,
    maxHistoryRowsPerTable = 10000,
    batchSize = 1000
  } = options;

  let totalRows = 0;
  const tableStats: Record<string, number> = {};
  const errors: string[] = [];

  for (const tableKey of ORDERED_TABLE_KEYS) {
    const table = (schema as any)[tableKey];
    if (!table || typeof table !== 'object' || !(Symbol.for('drizzle:Name') in table)) {
      continue;
    }

    const tableName = table[Symbol.for('drizzle:Name')];
    const isMassive = MASSIVE_HISTORY_TABLES.has(tableKey);
    if (isMassive && !includeLargeHistory) {
      tableStats[tableName] = 0;
      continue;
    }

    try {
      // Check if table exists in local DB first
      const existsRes = await currentPool.query(`SELECT to_regclass('public."${tableName}"') as tbl_exists`);
      if (!existsRes.rows[0]?.tbl_exists) {
        tableStats[tableName] = 0;
        continue;
      }

      const countRes = await currentPool.query(`SELECT count(*) FROM "${tableName}"`);
      let count = parseInt(countRes.rows[0]?.count || '0', 10);

      if (isMassive && maxHistoryRowsPerTable && count > maxHistoryRowsPerTable) {
        count = maxHistoryRowsPerTable;
      }

      if (count === 0) {
        tableStats[tableName] = 0;
        continue;
      }

      let insertedForTable = 0;

      for (let offset = 0; offset < count; offset += batchSize) {
        const fetchLimit = Math.min(batchSize, count - offset);
        const chunk = await (currentDb.select().from(table as any) as any)
          .limit(fetchLimit)
          .offset(offset);

        if (!chunk || chunk.length === 0) break;

        await defaultDb.insert(table as any).values(chunk).onConflictDoNothing();
        insertedForTable += chunk.length;
      }

      tableStats[tableName] = insertedForTable;
      totalRows += insertedForTable;

      try {
        await defaultPool.query(`SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), COALESCE(max(id), 1)) FROM "${tableName}"`);
      } catch {
        // Sequence does not exist for non-serial PK tables, safe ignore
      }
    } catch (e: any) {
      console.error(`Local -> Cloud aktarım hatası [${tableName}]:`, e.message);
      errors.push(`${tableName}: ${e.message}`);
    }
  }

  return { totalRows, tableStats, errors };
};

export const syncBidirectional = async (options: SyncOptions = {}): Promise<SyncResult & { directionBreakdown: { cloudToLocal: number; localToCloud: number } }> => {
  const c2l = await syncFromCloudToLocal(options);
  const l2c = await syncFromLocalToCloud(options);

  const combinedStats: Record<string, number> = {};
  for (const [table, count] of Object.entries(c2l.tableStats)) {
    combinedStats[table] = (combinedStats[table] || 0) + count;
  }
  for (const [table, count] of Object.entries(l2c.tableStats)) {
    combinedStats[table] = (combinedStats[table] || 0) + count;
  }

  return {
    totalRows: c2l.totalRows + l2c.totalRows,
    tableStats: combinedStats,
    errors: [...c2l.errors, ...l2c.errors],
    directionBreakdown: {
      cloudToLocal: c2l.totalRows,
      localToCloud: l2c.totalRows
    }
  };
};

export const db = new Proxy({} as any, {
  get: (target, prop) => {
    const value = (currentDb as any)[prop];
    if (typeof value === 'function') {
      return value.bind(currentDb);
    }
    return value;
  }
}) as ReturnType<typeof drizzle>;
