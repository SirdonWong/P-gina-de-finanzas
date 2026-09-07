import { db } from '../db/database';
import type {
  Account,
  Category,
  Transaction,
  RecurringTransaction,
  CreditCard,
  MsiPlan,
  MsiInstallment,
  CashbackRecord,
  Debt,
  DebtPayment,
  SyncMetadata,
} from '../types/models';

export interface BackupData {
  version: string;
  exportedAt: string;
  preferences: {
    currency: string;
  };
  data: {
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
    recurringTransactions: RecurringTransaction[];
    creditCards: CreditCard[];
    msiPlans: MsiPlan[];
    msiInstallments: MsiInstallment[];
    cashbackRecords: CashbackRecord[];
    debts: Debt[];
    debtPayments: DebtPayment[];
    syncMetadata: SyncMetadata[];
  };
}

export interface RestoreSummary {
  accountsCount: number;
  categoriesCount: number;
  transactionsCount: number;
  cardsCount: number;
  debtsCount: number;
  msiPlansCount: number;
}

/**
 * Genera el objeto de respaldo completo con todas las tablas de IndexedDB y preferencias
 */
export async function createFullBackup(): Promise<BackupData> {
  const [
    accounts,
    categories,
    transactions,
    recurringTransactions,
    creditCards,
    msiPlans,
    msiInstallments,
    cashbackRecords,
    debts,
    debtPayments,
    syncMetadata,
  ] = await Promise.all([
    db.accounts.toArray(),
    db.categories.toArray(),
    db.transactions.toArray(),
    db.recurringTransactions.toArray(),
    db.creditCards.toArray(),
    db.msiPlans.toArray(),
    db.msiInstallments.toArray(),
    db.cashbackRecords.toArray(),
    db.debts.toArray(),
    db.debtPayments.toArray(),
    db.syncMetadata.toArray(),
  ]);

  const currency =
    typeof globalThis !== 'undefined' && globalThis.localStorage
      ? globalThis.localStorage.getItem('gestor_finanzas_currency') || 'MXN'
      : 'MXN';

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    preferences: {
      currency,
    },
    data: {
      accounts,
      categories,
      transactions,
      recurringTransactions,
      creditCards,
      msiPlans,
      msiInstallments,
      cashbackRecords,
      debts,
      debtPayments,
      syncMetadata,
    },
  };
}

/**
 * Descarga el archivo de respaldo en formato .json al dispositivo del usuario
 */
export async function downloadBackupFile(): Promise<string> {
  const backup = await createFullBackup();
  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
  const filename = `gestor_finanzas_backup_${dateStr}_${timeStr}.json`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return filename;
}

/**
 * Valida la estructura y coherencia del archivo de respaldo antes de restaurar
 */
export function validateBackupContent(content: any): { isValid: boolean; error?: string } {
  if (!content || typeof content !== 'object') {
    return { isValid: false, error: 'El archivo no contiene un JSON válido.' };
  }
  if (!content.version || !content.data) {
    return { isValid: false, error: 'Estructura de respaldo incompatible o dañada.' };
  }
  const { data } = content;
  if (
    !Array.isArray(data.accounts) ||
    !Array.isArray(data.categories) ||
    !Array.isArray(data.transactions)
  ) {
    return { isValid: false, error: 'Faltan tablas esenciales (cuentas, categorías o transacciones).' };
  }

  return { isValid: true };
}

/**
 * Restaura el 100% de la información desde un objeto de respaldo validado
 */
export async function restoreFullBackup(backup: BackupData): Promise<RestoreSummary> {
  const validation = validateBackupContent(backup);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Respaldo inválido');
  }

  const { data, preferences } = backup;

  await db.transaction(
    'rw',
    [
      db.accounts,
      db.categories,
      db.transactions,
      db.recurringTransactions,
      db.creditCards,
      db.msiPlans,
      db.msiInstallments,
      db.cashbackRecords,
      db.debts,
      db.debtPayments,
      db.syncMetadata,
    ],
    async () => {
      // Limpiar tablas actuales
      await Promise.all([
        db.accounts.clear(),
        db.categories.clear(),
        db.transactions.clear(),
        db.recurringTransactions.clear(),
        db.creditCards.clear(),
        db.msiPlans.clear(),
        db.msiInstallments.clear(),
        db.cashbackRecords.clear(),
        db.debts.clear(),
        db.debtPayments.clear(),
        db.syncMetadata.clear(),
      ]);

      // Restaurar datos completos
      if (data.accounts?.length) await db.accounts.bulkAdd(data.accounts);
      if (data.categories?.length) await db.categories.bulkAdd(data.categories);
      if (data.transactions?.length) await db.transactions.bulkAdd(data.transactions);
      if (data.recurringTransactions?.length) await db.recurringTransactions.bulkAdd(data.recurringTransactions);
      if (data.creditCards?.length) await db.creditCards.bulkAdd(data.creditCards);
      if (data.msiPlans?.length) await db.msiPlans.bulkAdd(data.msiPlans);
      if (data.msiInstallments?.length) await db.msiInstallments.bulkAdd(data.msiInstallments);
      if (data.cashbackRecords?.length) await db.cashbackRecords.bulkAdd(data.cashbackRecords);
      if (data.debts?.length) await db.debts.bulkAdd(data.debts);
      if (data.debtPayments?.length) await db.debtPayments.bulkAdd(data.debtPayments);
      if (data.syncMetadata?.length) await db.syncMetadata.bulkAdd(data.syncMetadata);
    }
  );

  // Restaurar preferencias de moneda si vienen en el archivo
  if (preferences?.currency && typeof globalThis !== 'undefined' && globalThis.localStorage) {
    globalThis.localStorage.setItem('gestor_finanzas_currency', preferences.currency);
  }

  return {
    accountsCount: data.accounts?.length || 0,
    categoriesCount: data.categories?.length || 0,
    transactionsCount: data.transactions?.length || 0,
    cardsCount: data.creditCards?.length || 0,
    debtsCount: data.debts?.length || 0,
    msiPlansCount: data.msiPlans?.length || 0,
  };
}
