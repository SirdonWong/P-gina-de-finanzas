import { describe, it, expect } from 'vitest';
import {
  calculateCardCurrentBalance,
  calculateCardOccupiedCredit,
  getCardMetrics,
  calculateAllCardsSummary,
} from '../services/cardBalanceService';
import type { CreditCard, Transaction, MsiInstallment, CashbackRecord } from '../types/models';

describe('Card Balance Service Engine', () => {
  const mockCard: CreditCard = {
    id: 'card-nu',
    name: 'Nu Tarjeta',
    creditLimit: 20000,
    cutoffDay: 15,
    paymentDueDay: 5,
    isArchived: false,
    createdAt: '2026-01-01',
  };

  it('adds normal credit card purchases to card balance (liability)', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-cc-1',
        date: '2026-03-01',
        amount: 2500,
        type: 'EXPENSE',
        classification: 'VARIABLE',
        accountId: 'acc-debit',
        creditCardId: 'card-nu',
        directImpact: false, // Normal credit card expense
        tags: [],
        isCancelled: false,
        createdAt: '2026-03-01',
        updatedAt: '2026-03-01',
      },
    ];

    const balance = calculateCardCurrentBalance('card-nu', txs);
    expect(balance).toBe(2500);
  });

  it('EXCLUDES purchases with directImpact: true from card balance to prevent double deduction', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-cc-direct',
        date: '2026-03-02',
        amount: 4000,
        type: 'EXPENSE',
        classification: 'VARIABLE',
        accountId: 'acc-debit',
        creditCardId: 'card-nu',
        directImpact: true, // Direct impact - already deducted from debit!
        tags: ['electronica'],
        isCancelled: false,
        createdAt: '2026-03-02',
        updatedAt: '2026-03-02',
      },
    ];

    // Card balance to pay must be 0 because it was already charged to debit
    const balance = calculateCardCurrentBalance('card-nu', txs);
    expect(balance).toBe(0);
  });

  it('reduces card balance when paying the card (CARD_PAYMENT)', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-cc-buy',
        date: '2026-03-01',
        amount: 5000,
        type: 'EXPENSE',
        classification: 'VARIABLE',
        accountId: 'acc-debit',
        creditCardId: 'card-nu',
        tags: [],
        isCancelled: false,
        createdAt: '2026-03-01',
        updatedAt: '2026-03-01',
      },
      {
        id: 'tx-cc-pay',
        date: '2026-03-10',
        amount: 3000,
        type: 'CARD_PAYMENT',
        classification: 'FIXED',
        accountId: 'acc-debit',
        creditCardId: 'card-nu',
        tags: ['pago-tarjeta'],
        isCancelled: false,
        createdAt: '2026-03-10',
        updatedAt: '2026-03-10',
      },
    ];

    const balance = calculateCardCurrentBalance('card-nu', txs);
    expect(balance).toBe(2000); // 5000 - 3000
  });

  it('includes applied MSI installments in due balance, while pending MSI installments only occupy credit limit', () => {
    const txs: Transaction[] = []; // Parent MSI purchase doesn't add to balance directly

    const installments: MsiInstallment[] = [
      {
        id: 'inst-1',
        msiPlanId: 'plan-macbook',
        creditCardId: 'card-nu',
        installmentNumber: 1,
        amount: 1000,
        cutoffDate: '2026-03-15',
        status: 'APPLIED', // Ya venció / aplicada al corte
      },
      {
        id: 'inst-2',
        msiPlanId: 'plan-macbook',
        creditCardId: 'card-nu',
        installmentNumber: 2,
        amount: 1000,
        cutoffDate: '2026-04-15',
        status: 'PENDING', // Futura
      },
      {
        id: 'inst-3',
        msiPlanId: 'plan-macbook',
        creditCardId: 'card-nu',
        installmentNumber: 3,
        amount: 1000,
        cutoffDate: '2026-05-15',
        status: 'PENDING', // Futura
      },
    ];

    // Current balance due to pay is only the applied installment
    const currentBalance = calculateCardCurrentBalance('card-nu', txs, installments);
    expect(currentBalance).toBe(1000);

    // Occupied credit includes both applied (1000) and pending (2000) = 3000
    const occupiedCredit = calculateCardOccupiedCredit('card-nu', txs, installments);
    expect(occupiedCredit).toBe(3000);

    // Available credit is 20000 - 3000 = 17000
    const metrics = getCardMetrics(mockCard, txs, installments);
    expect(metrics.availableCredit).toBe(17000);
  });

  it('reduces card balance when cashback is credited to card balance', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-cc-1',
        date: '2026-03-01',
        amount: 2000,
        type: 'EXPENSE',
        classification: 'VARIABLE',
        accountId: 'acc-debit',
        creditCardId: 'card-nu',
        tags: [],
        isCancelled: false,
        createdAt: '2026-03-01',
        updatedAt: '2026-03-01',
      },
    ];

    const cashback: CashbackRecord[] = [
      {
        id: 'cb-1',
        creditCardId: 'card-nu',
        sourceMerchant: 'Promo Nu',
        amount: 150,
        destination: 'CARD_BALANCE',
        status: 'ACCREDITED', // Acreditado a la tarjeta
        date: '2026-03-05',
      },
      {
        id: 'cb-pending',
        creditCardId: 'card-nu',
        sourceMerchant: 'Cashback Pendiente',
        amount: 300,
        destination: 'CASH_PENDING',
        status: 'PENDING', // Aún no acreditado
        date: '2026-03-05',
      },
    ];

    const balance = calculateCardCurrentBalance('card-nu', txs, [], cashback);
    expect(balance).toBe(1850); // 2000 - 150 (ignores pending)
  });

  it('excludes cancelled transactions from card balance', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-cc-cancelled',
        date: '2026-03-01',
        amount: 1200,
        type: 'EXPENSE',
        classification: 'VARIABLE',
        accountId: 'acc-debit',
        creditCardId: 'card-nu',
        tags: [],
        isCancelled: true, // Anulada
        cancelledAt: '2026-03-02',
        cancelReason: 'Cargo no reconocido',
        createdAt: '2026-03-01',
        updatedAt: '2026-03-02',
      },
    ];

    const balance = calculateCardCurrentBalance('card-nu', txs);
    expect(balance).toBe(0);
  });

  it('aggregates multiple cards into a global summary accurately', () => {
    const cards: CreditCard[] = [
      mockCard, // limit 20000
      {
        id: 'card-bbva',
        name: 'BBVA Oro',
        creditLimit: 30000,
        cutoffDay: 20,
        paymentDueDay: 10,
        isArchived: false,
        createdAt: '2026-01-01',
      },
    ];

    const txs: Transaction[] = [
      {
        id: 'tx-1',
        date: '2026-03-01',
        amount: 2000,
        type: 'EXPENSE',
        classification: 'VARIABLE',
        accountId: 'acc-debit',
        creditCardId: 'card-nu',
        tags: [],
        isCancelled: false,
        createdAt: '2026-03-01',
        updatedAt: '2026-03-01',
      },
      {
        id: 'tx-2',
        date: '2026-03-02',
        amount: 5000,
        type: 'EXPENSE',
        classification: 'VARIABLE',
        accountId: 'acc-debit',
        creditCardId: 'card-bbva',
        tags: [],
        isCancelled: false,
        createdAt: '2026-03-02',
        updatedAt: '2026-03-02',
      },
    ];

    const summary = calculateAllCardsSummary(cards, txs);
    expect(summary.totalCreditLimit).toBe(50000); // 20000 + 30000
    expect(summary.totalCurrentBalance).toBe(7000); // 2000 + 5000
    expect(summary.totalAvailableCredit).toBe(43000); // 50000 - 7000
  });
});
