import { createPool } from './src/db/index.ts';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './src/db/schema.ts';
import { sql } from 'drizzle-orm';

(async () => {
  console.log("Fixing sequences...");
  const pool = createPool();
  const db = drizzle(pool, { schema });
  
  for (const tableKey of Object.keys(schema)) {
    const table = (schema as any)[tableKey];
    if (table && table[Symbol.for('drizzle:Name')]) {
      const tableName = table[Symbol.for('drizzle:Name')];
      try {
        if ('id' in table) {
           await db.execute(sql.raw(`SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM "${tableName}";`));
           console.log(`Reset sequence for ${tableName}`);
        }
      } catch (e: any) {
        // console.log(`Skipped ${tableName}: ${e.message}`);
      }
    }
  }
  console.log("Done!");
  process.exit(0);
})();
