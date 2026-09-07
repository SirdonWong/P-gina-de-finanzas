import type { Account, Transaction } from '../types/models';

export interface AccountBalanceMap {
  [accountId: string]: number;
}

export interface CashflowSummary {
  totalIncome: number;
  totalExpense: number;
  fixedIncome: number;
  variableIncome: number;
  fixedExpense: number;
  variableExpense: number;
  netCashflow: number;
}

/**
 * Recalcula el saldo de cada cuenta de débito, efectivo y ahorros basándose
 * en el saldo inicial y las transacciones no anuladas.
 */
export function calculateAccountBalances(
  accounts: Account[],
  transactions: Transaction[]
): AccountBalanceMap {
  const balanceMap: AccountBalanceMap = {};

  // Inicializar con el balance inicial de cada cuenta
  for (const acc of accounts) {
    balanceMap[acc.id] = acc.initialBalance || 0;
  }

  // Ordenar transacciones cronológicamente por fecha / creación
  const activeTxs = transactions
    .filter((tx) => !tx.isCancelled)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const tx of activeTxs) {
    const amount = Number(tx.amount) || 0;

    switch (tx.type) {
      case 'INCOME':
      case 'DEBT_REPAYMENT':
        if (balanceMap[tx.accountId] !== undefined) {
          balanceMap[tx.accountId] += amount;
        }
        break;

      case 'EXPENSE':
        // Si es gasto con tarjeta de crédito sin impacto directo, no afecta cuentas de débito/efectivo
        if (tx.creditCardId && !tx.directImpact) {
          break;
        }
        if (balanceMap[tx.accountId] !== undefined) {
          balanceMap[tx.accountId] -= amount;
        }
        break;

      case 'LOAN_DISBURSEMENT':
        if (balanceMap[tx.accountId] !== undefined) {
          balanceMap[tx.accountId] -= amount;
        }
        break;

      case 'TRANSFER':
        if (balanceMap[tx.accountId] !== undefined) {
          balanceMap[tx.accountId] -= amount;
        }
        if (tx.destinationAccountId && balanceMap[tx.destinationAccountId] !== undefined) {
          balanceMap[tx.destinationAccountId] += amount;
        }
        break;

      case 'CARD_PAYMENT':
        // Pago de tarjeta: descuenta de la cuenta de débito/efectivo
        if (balanceMap[tx.accountId] !== undefined) {
          balanceMap[tx.accountId] -= amount;
        }
        break;

      default:
        break;
    }
  }

  return balanceMap;
}

/**
 * Calcula la liquidez neta total disponible (suma de cuentas CASH y DEBIT no archivadas).
 */
export function calculateNetLiquidity(
  accounts: Account[],
  transactions: Transaction[]
): number {
  const balances = calculateAccountBalances(accounts, transactions);
  let totalLiquidity = 0;

  for (const acc of accounts) {
    if (!acc.isArchived && (acc.type === 'CASH' || acc.type === 'DEBIT')) {
      totalLiquidity += balances[acc.id] || 0;
    }
  }

  return Math.round(totalLiquidity * 100) / 100;
}

/**
 * Calcula el resumen de flujo de caja (ingresos, gastos, clasificaciones) en un periodo dado.
 */
export function calculateCashflowSummary(
  transactions: Transaction[],
  startDate?: string,
  endDate?: string
): CashflowSummary {
  let totalIncome = 0;
  let totalExpense = 0;
  let fixedIncome = 0;
  let variableIncome = 0;
  let fixedExpense = 0;
  let variableExpense = 0;

  const filtered = transactions.filter((tx) => {
    if (tx.isCancelled) return false;
    if (startDate && tx.date < startDate) return false;
    if (endDate && tx.date > endDate) return false;
    return true;
  });

  for (const tx of filtered) {
    const amount = Number(tx.amount) || 0;

    if (tx.type === 'INCOME') {
      totalIncome += amount;
      if (tx.classification === 'FIXED') {
        fixedIncome += amount;
      } else {
        variableIncome += amount;
      }
    } else if (tx.type === 'EXPENSE') {
      totalExpense += amount;
      if (tx.classification === 'FIXED') {
        fixedExpense += amount;
      } else {
        variableExpense += amount;
      }
    }
  }

  return {
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100,
    fixedIncome: Math.round(fixedIncome * 100) / 100,
    variableIncome: Math.round(variableIncome * 100) / 100,
    fixedExpense: Math.round(fixedExpense * 100) / 100,
    variableExpense: Math.round(variableExpense * 100) / 100,
    netCashflow: Math.round((totalIncome - totalExpense) * 100) / 100,
  };
}
