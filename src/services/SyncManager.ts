import { db } from '../db/index.ts';
import { assets, assetMappings, assetData, unmatchedData, syncLogs, settings } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { DataSourceAdapter } from './DataSourceAdapter.ts';
import { appEventBus, DepartmentType, ActorType } from './AppEventBus.ts';

const sourceToDept: Record<string, { dept: DepartmentType; actor: ActorType }> = {
  YAHOO: { dept: 'BORSA', actor: 'YAHOO_ADAPTER' },
  TEFAS: { dept: 'BORSA', actor: 'TEFAS_ADAPTER' },
  TCMB: { dept: 'MERKEZ_BANKASI', actor: 'TCMB_ADAPTER' },
  FRED: { dept: 'MERKEZ_BANKASI', actor: 'FRED_ADAPTER' },
  KAP: { dept: 'KAP', actor: 'KAP_ADAPTER' },
  CRYPTO: { dept: 'BORSA', actor: 'MARKET_SERVICE' }
};

export class SyncManager {
  private adapters: Map<string, DataSourceAdapter> = new Map();
  private runningSyncs: Set<string> = new Set();

  registerAdapter(adapter: DataSourceAdapter) {
    this.adapters.set(adapter.sourceName, adapter);
  }

  getAdapter(sourceName: string) {
    return this.adapters.get(sourceName);
  }

  // Idempotent upsert of asset mapping and getting asset ID
  async resolveOrUnmatched(
    source: string, 
    sourceCode: string, 
    assetName: string, 
    assetType: string,
    universalCode: string, // Universal Ticker (e.g. THYAO instead of THYAO.IS)
    rawData: any,
    normalizedValue: number,
    datePeriod: string
  ) {
    // Check if mapping exists
    const mapping = await db.select().from(assetMappings)
      .where(and(eq(assetMappings.source, source), eq(assetMappings.sourceCode, sourceCode)))
      .limit(1);

    let assetId: number | null = null;

    if (mapping.length > 0) {
      assetId = mapping[0].assetId;
    } else {
      // Try to find if an asset already exists with the universal code
      const existingAsset = await db.select().from(assets)
        .where(eq(assets.code, universalCode))
        .limit(1);

      if (existingAsset.length > 0) {
        assetId = existingAsset[0].id;
        // Insert mapping
        await db.insert(assetMappings).values({
          assetId: assetId,
          source: source,
          sourceCode: sourceCode
        });
      } else {
        // We will create the asset dynamically for now to avoid the unmatched queue bottleneck,
        // but if strict validation is needed, it would go to unmatched.
        // Let's create it dynamically since this is a known pull.
        const newAssetResult = await db.insert(assets).values({
          code: universalCode,
          name: assetName,
          type: assetType
        }).returning({ id: assets.id });
        
        assetId = newAssetResult[0].id;
        
        await db.insert(assetMappings).values({
          assetId: assetId,
          source: source,
          sourceCode: sourceCode
        });
      }
    }

    // Now insert/update asset_data
    if (assetId) {
      await db.insert(assetData).values({
        assetId: assetId,
        source: source,
        normalizedValue: normalizedValue.toString(),
        datePeriod: datePeriod,
        rawData: rawData
      });
      return true;
    }
    return false;
  }

  // Batch insert historical data (e.g. 5-year daily series)
  async resolveAndStoreBatch(
    source: string,
    sourceCode: string,
    assetName: string,
    assetType: string,
    universalCode: string,
    rows: Array<{
      normalizedValue: number;
      datePeriod: string;
      rawData: any;
    }>
  ): Promise<number> {
    if (!rows || rows.length === 0) return 0;

    let assetId: number | null = null;
    const mapping = await db.select().from(assetMappings)
      .where(and(eq(assetMappings.source, source), eq(assetMappings.sourceCode, sourceCode)))
      .limit(1);

    if (mapping.length > 0) {
      assetId = mapping[0].assetId;
    } else {
      const existingAsset = await db.select().from(assets)
        .where(eq(assets.code, universalCode))
        .limit(1);

      if (existingAsset.length > 0) {
        assetId = existingAsset[0].id;
        await db.insert(assetMappings).values({
          assetId: assetId,
          source: source,
          sourceCode: sourceCode
        });
      } else {
        const newAssetResult = await db.insert(assets).values({
          code: universalCode,
          name: assetName,
          type: assetType
        }).returning({ id: assets.id });

        assetId = newAssetResult[0].id;

        await db.insert(assetMappings).values({
          assetId: assetId,
          source: source,
          sourceCode: sourceCode
        });
      }
    }

    if (!assetId) return 0;

    // Insert in chunks of 200 items
    const chunkSize = 200;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize).map(r => ({
        assetId: assetId!,
        source: source,
        normalizedValue: r.normalizedValue != null ? r.normalizedValue.toString() : null,
        datePeriod: r.datePeriod,
        rawData: r.rawData
      }));

      await db.insert(assetData).values(chunk);
      inserted += chunk.length;
    }

    return inserted;
  }

  async logSync(source: string, status: 'SUCCESS' | 'ERROR', recordsProcessed: number, message: string, startedAt: Date, completedAt: Date) {
    await db.insert(syncLogs).values({
      source,
      status,
      recordsProcessed,
      message,
      startedAt,
      completedAt
    });

    const mapping = sourceToDept[source] || { dept: 'ARSIV', actor: 'SYNC_MANAGER' };
    if (status === 'SUCCESS') {
      appEventBus.emitOfficeEvent({
        type: 'DB_WRITE_BATCH_SUCCESS',
        actor: mapping.actor,
        department: mapping.dept,
        status: 'SUCCESS',
        detail: `${source} senkronizasyonu tamamlandı (${recordsProcessed} kayıt)`,
        payload: { source, recordsProcessed, durationMs: completedAt.getTime() - startedAt.getTime() }
      });
    } else {
      appEventBus.emitOfficeEvent({
        type: 'DATA_FETCH_FAILED',
        actor: mapping.actor,
        department: mapping.dept,
        status: 'ERROR',
        detail: `${source} senkronizasyonunda hata: ${message}`,
        payload: { source, error: message }
      });
    }
  }

  async triggerSync(sourceName: string) {
    const adapter = this.adapters.get(sourceName);
    if (!adapter) throw new Error(`No adapter found for ${sourceName}`);
    
    // Concurrency Lock: Prevent multiple parallel syncs on the same source
    if (this.runningSyncs.has(sourceName)) {
      console.log(`[SyncManager] Sync for ${sourceName} is already running. Skipping overlapping execution.`);
      return { 
        source: sourceName, 
        status: 'RUNNING' as const, 
        recordsProcessed: 0, 
        message: `${sourceName} senkronizasyonu zaten devam ediyor.`, 
        startedAt: new Date(), 
        completedAt: new Date() 
      };
    }

    // Check settings if this adapter is enabled
    const settingRec = await db.select().from(settings).where(eq(settings.key, `sync_enabled_${sourceName}`)).limit(1);
    const isEnabled = settingRec.length > 0 ? (settingRec[0].value as any)?.enabled : true; // Default true
    
    if (!isEnabled) {
      console.log(`Sync for ${sourceName} is disabled in settings.`);
      return { 
        source: sourceName, 
        status: 'SUCCESS' as const, 
        recordsProcessed: 0, 
        message: 'Disabled in settings', 
        startedAt: new Date(), 
        completedAt: new Date() 
      };
    }

    this.runningSyncs.add(sourceName);

    const mapping = sourceToDept[sourceName] || { dept: 'ARSIV', actor: 'SYNC_MANAGER' };
    appEventBus.emitOfficeEvent({
      type: 'SYNC_STARTED',
      actor: mapping.actor,
      department: mapping.dept,
      status: 'BUSY',
      detail: `${sourceName} veri senkronizasyonu başlatıldı`,
      payload: { source: sourceName, triggerType: 'MANUAL' }
    });

    try {
      const result = await adapter.sync();
      await this.logSync(result.source, result.status, result.recordsProcessed, result.message || '', result.startedAt, result.completedAt);
      return result;
    } catch (e: any) {
      await this.logSync(sourceName, 'ERROR', 0, e.message, new Date(), new Date());
      throw e;
    } finally {
      this.runningSyncs.delete(sourceName);
    }
  }
}

export const syncManager = new SyncManager();
