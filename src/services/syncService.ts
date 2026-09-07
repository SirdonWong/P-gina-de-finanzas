import { db } from '../db/database';
import { executeRecurringCatchupInDb } from './recurringService';
import { applyDueMsiInstallmentsInDb } from './msiService';
import { getTodayDateString } from '../utils/dateUtils';

export interface SyncResult {
  recurringGenerated: number;
  msiApplied: number;
  timestamp: string;
}

const SYNC_METADATA_KEY = 'last_sync_timestamp';

/**
 * Procesa en lote al abrir la aplicación todos los cargos recurrentes vencidos
 * y cuotas de MSI pendientes hasta la fecha actual.
 */
export async function performStartupSync(
  asOfDate: string = getTodayDateString()
): Promise<SyncResult> {
  const [recurringCount, msiCount] = await Promise.all([
    executeRecurringCatchupInDb(asOfDate),
    applyDueMsiInstallmentsInDb(asOfDate),
  ]);

  const timestamp = new Date().toISOString();

  await db.syncMetadata.put({
    key: SYNC_METADATA_KEY,
    value: timestamp,
  });

  return {
    recurringGenerated: recurringCount,
    msiApplied: msiCount,
    timestamp,
  };
}

/**
 * Consulta la última fecha y hora de sincronización realizada
 */
export async function getLastSyncTimestamp(): Promise<string | null> {
  const record = await db.syncMetadata.get(SYNC_METADATA_KEY);
  return record ? record.value : null;
}
