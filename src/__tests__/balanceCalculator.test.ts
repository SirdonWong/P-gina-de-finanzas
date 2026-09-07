import { describe, it, expect } from 'vitest';
import {
  calculateAccountBalances,
  calculateNetLiquidity,
  calculateCashflowSummary,
} from '../services/balanceCalculator';
import type { Account, Transaction } from '../types/models';

describe('Balance Calculator & Cashflow Engine', () => {
  const mockAccounts: Account[] = [
    {
      id: 'acc-cash',
      name: 'Efectivo',
      type: 'CASH',
      initialBalance: 1000,
      isArchived: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'acc-debit',
      name: 'Nómina BBVA',
      type: 'DEBIT',
      initialBalance: 5000,
      isArchived: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'acc-savings',
      name: 'Fondo Ahorro',
      type: 'SAVINGS',
      initialBalance: 10000,
      isArchived: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  it('calculates initial liquidity correctly without transactions (excluding SAVINGS if configured)', () => {
    // Net liquidity includes CASH (1000) + DEBIT (5000) = 6000
    const liquidity = calculateNetLiquidity(mockAccounts, []);
    expect(liquidity).toBe(6000);
  });

  it('reflects income and expenses on specific accounts', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-1',
        date: '2026-03-01',
        amount: 2000,
        type: 'INCOME',
        classification: 'FIXED',
        accountId: 'acc-debit',
        tags: [],
        isCancelled: false,
        createdAt: '2026-03-01',
        updatedAt: '2026-03-01',
      },
      {
        id: 'tx-2',
        date: '2026-03-02',
        amount: 300,
        type: 'EXPENSE',
        classification: 'VARIABLE',
        accountId: 'acc-cash',
        tags: [],
        isCancelled: false,
        createdAt: '2026-03-02',
        updatedAt: '2026-03-02',
      },
    ];

    const balances = calculateAccountBalances(mockAccounts, txs);
    expect(balances['acc-debit']).toBe(7000); // 5000 + 2000
    expect(balances['acc-cash']).toBe(700); // 1000 - 300
    expect(calculateNetLiquidity(mockAccounts, txs)).toBe(7700);
  });

  it('ignores cancelled (soft-deleted) transactions', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-active',
        date: '2026-03-01',
        amount: 500,
        type: 'EXPENSE',
        classification: 'VARIABLE',
        accountId: 'acc-cash',
        tags: [],
        isCancelled: false,
        createdAt: '2026-03-01',
        updatedAt: '2026-03-01',
      },
      {
        id: 'tx-cancelled',
        date: '2026-03-02',
        amount: 400,
        type: 'EXPENSE',
        classification: 'VARIABLE',
        accountId: 'acc-cash',
        tags: [],
        isCancelled: true,
        cancelledAt: '2026-03-03',
        cancelReason: 'Error de captura',
        createdAt: '2026-03-02',
        updatedAt: '2026-03-03',
      },
    ];

    const balances = calculateAccountBalances(mockAccounts, txs);
    expect(balances['acc-cash']).toBe(500); // 1000 - 500 (ignores 400)
    expect(calculateNetLiquidity(mockAccounts, txs)).toBe(5500);
  });

  it('does NOT deduct from debit/cash for credit card purchases without directImpact', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-cc-normal',
        date: '2026-03-01',
        amount: 1200,
        type: 'EXPENSE',
        classification: 'VARIABLE',
        accountId: 'acc-debit',
        creditCardId: 'card-1',
        directImpact: false,
        tags: ['electronica'],
        isCancelled: false,
        createdAt: '2026-03-01',
        updatedAt: '2026-03-01',
      },
    ];

    const balances = calculateAccountBalances(mockAccounts, txs);
    expect(balances['acc-debit']).toBe(5000); // Intact
    expect(calculateNetLiquidity(mockAccounts, txs)).toBe(6000); // Intact
  });

  it('DOES deduct from debit/cash for credit card purchases WITH directImpact', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-cc-direct',
        date: '2026-03-01',
        amount: 1200,
        type: 'EXPENSE',
        classification: 'VARIABLE',
        accountId: 'acc-debit',
        creditCardId: 'card-1',
        directImpact: true, // Impacto directo activado
        tags: ['vuelo'],
        isCancelled: false,
        createdAt: '2026-03-01',
        updatedAt: '2026-03-01',
      },
    ];

    const balances = calculateAccountBalances(mockAccounts, txs);
    expect(balances['acc-debit']).toBe(3800); // 5000 - 1200
    expect(calculateNetLiquidity(mockAccounts, txs)).toBe(4800);
  });

  it('deducts loan disbursements and adds debt repayments', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-loan',
        date: '2026-03-01',
        amount: 1500,
        type: 'LOAN_DISBURSEMENT',
        classification: 'VARIABLE',
        accountId: 'acc-debit',
        debtId: 'debt-123',
        tags: ['prestamo'],
        isCancelled: false,
        createdAt: '2026-03-01',
        updatedAt: '2026-03-01',
      },
      {
        id: 'tx-repay',
        date: '2026-03-10',
        amount: 500,
        type: 'DEBT_REPAYMENT',
        classification: 'VARIABLE',
        accountId: 'acc-cash',
        debtId: 'debt-123',
        tags: ['abono'],
        isCancelled: false,
        createdAt: '2026-03-10',
        updatedAt: '2026-03-10',
      },
    ];

    const balances = calculateAccountBalances(mockAccounts, txs);
    expect(balances['acc-debit']).toBe(3500); // 5000 - 1500
    expect(balances['acc-cash']).toBe(1500); // 1000 + 500
    expect(calculateNetLiquidity(mockAccounts, txs)).toBe(5000);
  });

  it('handles transfers and card payments correctly', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-transfer',
        date: '2026-03-01',
        amount: 1000,
        type: 'TRANSFER',
        classification: 'FIXED',
        accountId: 'acc-debit',
        destinationAccountId: 'acc-cash',
        tags: [],
        isCancelled: false,
        createdAt: '2026-03-01',
        updatedAt: '2026-03-01',
      },
      {
        id: 'tx-card-pay',
        date: '2026-03-05',
        amount: 800,
        type: 'CARD_PAYMENT',
        classification: 'FIXED',
        accountId: 'acc-debit',
        tags: [],
        isCancelled: false,
        createdAt: '2026-03-05',
        updatedAt: '2026-03-05',
      },
    ];

    const balances = calculateAccountBalances(mockAccounts, txs);
    expect(balances['acc-debit']).toBe(3200); // 5000 - 1000 - 800
    expect(balances['acc-cash']).toBe(2000); // 1000 + 1000
    // Total liquidity = 3200 + 2000 = 5200 (original 6000 - 800 card payment)
    expect(calculateNetLiquidity(mockAccounts, txs)).toBe(5200);
  });

  it('calculates cashflow summary distinguishing fixed and variable', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-1',
        date: '2026-03-01',
        amount: 15000,
        type: 'INCOME',
        classification: 'FIXED', // Salario
        accountId: 'acc-debit',
        tags: [],
        isCancelled: false,
        createdAt: '2026-03-01',
        updatedAt: '2026-03-01',
      },
      {
        id: 'tx-2',
        date: '2026-03-02',
        amount: 2500,
        type: 'INCOME',
        classification: 'VARIABLE', // Venta
        accountId: 'acc-cash',
        tags: [],
        isCancelled: false,
        createdAt: '2026-03-02',
        updatedAt: '2026-03-02',
      },
      {
        id: 'tx-3',
        date: '2026-03-03',
        amount: 6000,
        type: 'EXPENSE',
        classification: 'FIXED', // Renta
        accountId: 'acc-debit',
        tags: [],
        isCancelled: false,
        createdAt: '2026-03-03',
        updatedAt: '2026-03-03',
      },
      {
        id: 'tx-4',
        date: '2026-03-04',
        amount: 1200,
        type: 'EXPENSE',
        classification: 'VARIABLE', // Salida restaurante
        accountId: 'acc-cash',
        tags: [],
        isCancelled: false,
        createdAt: '2026-03-04',
        updatedAt: '2026-03-04',
      },
    ];

    const summary = calculateCashflowSummary(txs);
    expect(summary.totalIncome).toBe(17500);
    expect(summary.fixedIncome).toBe(15000);
    expect(summary.variableIncome).toBe(2500);
    expect(summary.totalExpense).toBe(7200);
    expect(summary.fixedExpense).toBe(6000);
    expect(summary.variableExpense).toBe(1200);
    expect(summary.netCashflow).toBe(10300); // 17500 - 7200
  });
});
