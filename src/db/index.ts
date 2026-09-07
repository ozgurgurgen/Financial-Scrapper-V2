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
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
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

export const switchDatabase = async (config: { host?: string, user?: string, password?: string, database?: string, connectionString?: string }) => {
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
}

export interface SyncResult {
  totalRows: number;
  tableStats: Record<string, number>;
  errors: string[];
}

export const syncFromCloudToLocal = async (options: SyncOptions = {}): Promise<SyncResult> => {
  if (currentPool === defaultPool) {
    throw new Error('Şu an zaten varsayılan Cloud veritabanına bağlısınız. Hedef Local veritabanı olmalıdır.');
  }

  const {
    includeLargeHistory = false,
    maxHistoryRowsPerTable = 10000,
    batchSize = 1000
  } = options;

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
        // Sequence does not exist for non-serial PK tables (like settings or backfill_sync_state), ignore safely
      }

    } catch (e: any) {
      console.error(`Tablo aktarım hatası [${tableName}]:`, e.message);
      errors.push(`${tableName}: ${e.message}`);
    }
  }

  return { totalRows, tableStats, errors };
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
