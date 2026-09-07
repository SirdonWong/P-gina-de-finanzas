export type AccountType = 'CASH' | 'DEBIT' | 'SAVINGS';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  color?: string;
  icon?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CategoryType = 'EXPENSE' | 'INCOME';

export interface Category {
  id: string;
  name: string;
  parentId: string | null; // null for top-level, parentId for subcategory
  type: CategoryType;
  icon: string;
  color: string;
  isDefault: boolean;
  isArchived: boolean;
}

export type TransactionType =
  | 'INCOME'
  | 'EXPENSE'
  | 'TRANSFER'
  | 'LOAN_DISBURSEMENT'
  | 'DEBT_REPAYMENT'
  | 'CARD_PAYMENT';

export type TransactionClassification = 'FIXED' | 'VARIABLE';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // Always positive
  type: TransactionType;
  classification: TransactionClassification;
  categoryId?: string;
  subcategoryId?: string;
  accountId: string; // Source account (or deposit account for income)
  destinationAccountId?: string; // For transfers / card payment
  tags: string[];
  notes?: string;

  // Soft delete / Cancellation
  isCancelled: boolean;
  cancelledAt?: string;
  cancelReason?: string;

  // Cross-module linking
  creditCardId?: string;
  directImpact?: boolean; // If true, card purchase immediately deducts from accountId
  msiPlanId?: string;
  debtId?: string;
  recurringRuleId?: string;

  createdAt: string;
  updatedAt: string;
}

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  classification: 'FIXED';
  categoryId: string;
  subcategoryId?: string;
  accountId: string;
  frequency: RecurrenceFrequency;
  startDate: string; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD
  lastProcessedDate?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreditCard {
  id: string;
  name: string;
  creditLimit: number;
  cutoffDay: number; // 1 - 31
  paymentDueDay: number; // 1 - 31
  color?: string;
  isArchived: boolean;
  createdAt: string;
}

export type MsiStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface MsiPlan {
  id: string;
  creditCardId: string;
  purchaseTransactionId: string;
  concept: string;
  totalAmount: number;
  totalInstallments: number;
  remainingInstallments: number;
  installmentAmount: number;
  firstCutoffDate: string; // YYYY-MM-DD
  status: MsiStatus;
  createdAt: string;
}

export type InstallmentStatus = 'PENDING' | 'APPLIED' | 'CANCELLED';

export interface MsiInstallment {
  id: string;
  msiPlanId: string;
  creditCardId: string;
  installmentNumber: number;
  amount: number;
  cutoffDate: string; // YYYY-MM-DD
  status: InstallmentStatus;
  appliedDate?: string;
  appliedTransactionId?: string;
}

export type CashbackDestination = 'CARD_BALANCE' | 'CASH_PENDING';
export type CashbackStatus = 'PENDING' | 'ACCREDITED';

export interface CashbackRecord {
  id: string;
  creditCardId?: string;
  sourceMerchant: string;
  amount: number;
  destination: CashbackDestination;
  status: CashbackStatus;
  date: string;
  creditedDate?: string;
  creditedAccountId?: string;
}

export type DebtStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export interface Debt {
  id: string;
  debtorName: string;
  originalAmount: number;
  currentBalance: number;
  disbursementTransactionId: string;
  startDate: string;
  status: DebtStatus;
  notes?: string;
  createdAt: string;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  date: string;
  transactionId: string;
  notes?: string;
  createdAt: string;
}

export interface SyncMetadata {
  key: string;
  value: string;
}

export interface AppPreferences {
  currency: string;
  theme: 'dark' | 'light';
  hasCompletedOnboarding: boolean;
}
