import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import { performStartupSync, getLastSyncTimestamp } from '../services/syncService';

describe('Startup Sync Service', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await db.populateDefaultsIfEmpty();
  });

  it('initially has no last sync timestamp before first sync', async () => {
    const timestamp = await getLastSyncTimestamp();
    expect(timestamp).toBeNull();
  });

  it('runs catchup and updates last sync timestamp in metadata', async () => {
    const syncResult = await performStartupSync('2026-03-01');
    expect(syncResult.timestamp).toBeDefined();
    expect(typeof syncResult.recurringGenerated).toBe('number');
    expect(typeof syncResult.msiApplied).toBe('number');

    const lastSync = await getLastSyncTimestamp();
    expect(lastSync).toBe(syncResult.timestamp);
  });

  it('generates recurring transactions on sync if rules exist and are due', async () => {
    const account = await db.accounts.toCollection().first();
    const category = await db.categories.toCollection().first();

    // Agregar regla recurrente pendiente
    await db.recurringTransactions.add({
      id: 'rec-sync-test',
      name: 'Gimnasio recurrente',
      frequency: 'MONTHLY',
      amount: 450,
      type: 'EXPENSE',
      classification: 'FIXED',
      accountId: account!.id,
      categoryId: category!.id,
      startDate: '2026-01-01',
      nextDueDate: '2026-02-01',
      isActive: true,
      createdAt: '2026-01-01',
    });

    const result = await performStartupSync('2026-02-05');
    // Debe haber generado el mes de febrero
    expect(result.recurringGenerated).toBe(1);

    const txs = await db.transactions.where('recurringRuleId').equals('rec-sync-test').toArray();
    expect(txs).toHaveLength(1);
    expect(txs[0].amount).toBe(450);
  });
});
