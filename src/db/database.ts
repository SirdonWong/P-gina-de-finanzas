import Dexie, { type Table } from 'dexie';
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
import { INITIAL_ACCOUNTS, INITIAL_CATEGORIES } from './initialData';

export class FinanceDatabase extends Dexie {
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  recurringTransactions!: Table<RecurringTransaction, string>;
  creditCards!: Table<CreditCard, string>;
  msiPlans!: Table<MsiPlan, string>;
  msiInstallments!: Table<MsiInstallment, string>;
  cashbackRecords!: Table<CashbackRecord, string>;
  debts!: Table<Debt, string>;
  debtPayments!: Table<DebtPayment, string>;
  syncMetadata!: Table<SyncMetadata, string>;

  constructor() {
    super('GestorFinanzasDB');
    this.version(1).stores({
      accounts: 'id, name, type, isArchived',
      categories: 'id, name, parentId, type, isArchived',
      transactions: 'id, date, type, classification, accountId, creditCardId, debtId, recurringRuleId, isCancelled, createdAt',
      recurringTransactions: 'id, nextDueDate, frequency, isActive',
      creditCards: 'id, name, isArchived',
      msiPlans: 'id, creditCardId, status',
      msiInstallments: 'id, msiPlanId, creditCardId, cutoffDate, status',
      cashbackRecords: 'id, creditCardId, status, destination',
      debts: 'id, debtorName, status',
      debtPayments: 'id, debtId, transactionId',
      syncMetadata: 'key',
    });
  }

  async populateDefaultsIfEmpty() {
    const accCount = await this.accounts.count();
    if (accCount === 0) {
      await this.accounts.bulkPut(INITIAL_ACCOUNTS);
    }
    const catCount = await this.categories.count();
    if (catCount === 0) {
      await this.categories.bulkPut(INITIAL_CATEGORIES);
    }
  }
}

export const db = new FinanceDatabase();
