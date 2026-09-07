import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import {
  registerCashbackInDb,
  accreditPendingCashbackInDb,
} from '../services/cashbackService';
import { calculateCardCurrentBalance } from '../services/cardBalanceService';
import { calculateNetLiquidity } from '../services/balanceCalculator';
import type { Account, CreditCard, Transaction } from '../types/models';

describe('Cashback Service Dedicated Tests', () => {
  let debitAccount: Account;
  let testCard: CreditCard;

  beforeEach(async () => {
    await db.delete();
    await db.open();

    // Cuenta de débito con $5,000 de saldo inicial
    debitAccount = {
      id: 'acc-debit-cb',
      name: 'Nómina',
      type: 'DEBIT',
      initialBalance: 5000,
      isArchived: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    await db.accounts.add(debitAccount);

    // Tarjeta de crédito con $20,000 de límite
    testCard = {
      id: 'card-cb-test',
      name: 'Tarjeta Oro',
      creditLimit: 20000,
      cutoffDay: 15,
      paymentDueDay: 5,
      isArchived: false,
      createdAt: '2026-01-01',
    };
    await db.creditCards.add(testCard);
  });

  it('registers CARD_BALANCE cashback as ACCREDITED and immediately reduces card balance', async () => {
    // Compra de $1,200 en la tarjeta
    const purchaseTx: Transaction = {
      id: 'tx-purchase-1',
      date: '2026-02-10',
      amount: 1200,
      type: 'EXPENSE',
      classification: 'VARIABLE',
      accountId: debitAccount.id,
      creditCardId: testCard.id,
      tags: ['super'],
      isCancelled: false,
      createdAt: '2026-02-10',
      updatedAt: '2026-02-10',
    };
    await db.transactions.add(purchaseTx);

    // Cashback de $60 directamente a saldo de tarjeta
    const cb = await registerCashbackInDb({
      creditCardId: testCard.id,
      sourceMerchant: 'Supermercado Promo',
      amount: 60,
      destination: 'CARD_BALANCE',
      date: '2026-02-10',
    });

    expect(cb.status).toBe('ACCREDITED');
    expect(cb.destination).toBe('CARD_BALANCE');

    const allTxs = await db.transactions.toArray();
    const allCbs = await db.cashbackRecords.toArray();

    // Saldo adeudado: $1,200 - $60 = $1,140
    const cardBalance = calculateCardCurrentBalance(testCard.id, allTxs, [], allCbs);
    expect(cardBalance).toBe(1140);
  });

  it('registers CASH_PENDING cashback as PENDING without reducing card balance or affecting liquidity yet', async () => {
    // Compra de $1,000 en la tarjeta
    const purchaseTx: Transaction = {
      id: 'tx-purchase-2',
      date: '2026-02-10',
      amount: 1000,
      type: 'EXPENSE',
      classification: 'VARIABLE',
      accountId: debitAccount.id,
      creditCardId: testCard.id,
      tags: ['tienda'],
      isCancelled: false,
      createdAt: '2026-02-10',
      updatedAt: '2026-02-10',
    };
    await db.transactions.add(purchaseTx);

    // Cashback en efectivo pendiente de $50
    const cb = await registerCashbackInDb({
      creditCardId: testCard.id,
      sourceMerchant: 'Tienda Departamental',
      amount: 50,
      destination: 'CASH_PENDING',
      date: '2026-02-10',
    });

    expect(cb.status).toBe('PENDING');

    const allTxs = await db.transactions.toArray();
    const allCbs = await db.cashbackRecords.toArray();
    const accounts = await db.accounts.toArray();

    // El saldo adeudado de la tarjeta sigue siendo $1,000 completos
    const cardBalance = calculateCardCurrentBalance(testCard.id, allTxs, [], allCbs);
    expect(cardBalance).toBe(1000);

    // La liquidez neta del usuario sigue en $5,000 (el cashback pendiente aún no entra al banco)
    const netLiquidity = calculateNetLiquidity(accounts, allTxs);
    expect(netLiquidity).toBe(5000);
  });

  it('handles scenario: paying card in full before CASH_PENDING cashback is accredited', async () => {
    // PASO 1: Compra con tarjeta de crédito por $1,000 (sin impacto directo)
    const purchaseTx: Transaction = {
      id: 'tx-card-buy-1000',
      date: '2026-02-10',
      amount: 1000,
      type: 'EXPENSE',
      classification: 'VARIABLE',
      accountId: debitAccount.id,
      creditCardId: testCard.id,
      tags: ['electronica'],
      isCancelled: false,
      createdAt: '2026-02-10',
      updatedAt: '2026-02-10',
    };
    await db.transactions.add(purchaseTx);

    // PASO 2: Se genera cashback de $50 marcado como CASH_PENDING
    const cb = await registerCashbackInDb({
      creditCardId: testCard.id,
      sourceMerchant: 'Promo Electrónica',
      amount: 50,
      destination: 'CASH_PENDING',
      date: '2026-02-10',
    });
    expect(cb.status).toBe('PENDING');

    let txs = await db.transactions.toArray();
    let cbs = await db.cashbackRecords.toArray();
    let accounts = await db.accounts.toArray();

    // Antes de pagar: saldo adeudado = $1,000, liquidez bancaria = $5,000
    expect(calculateCardCurrentBalance(testCard.id, txs, [], cbs)).toBe(1000);
    expect(calculateNetLiquidity(accounts, txs)).toBe(5000);

    // PASO 3: Llega la fecha límite y el usuario paga la tarjeta por completo ($1,000)
    // El cashback sigue PENDING en este momento.
    const payCardTx: Transaction = {
      id: 'tx-pay-card-full',
      date: '2026-02-25',
      amount: 1000,
      type: 'CARD_PAYMENT',
      classification: 'VARIABLE',
      accountId: debitAccount.id, // Sale dinero de la cuenta de nómina
      destinationAccountId: testCard.id, // Hacia la tarjeta
      creditCardId: testCard.id,
      tags: ['pago-tarjeta'],
      notes: 'Pago total del corte',
      isCancelled: false,
      createdAt: '2026-02-25',
      updatedAt: '2026-02-25',
    };
    await db.transactions.add(payCardTx);

    txs = await db.transactions.toArray();
    cbs = await db.cashbackRecords.toArray();
    accounts = await db.accounts.toArray();

    // Saldo de la tarjeta queda saldado en $0
    expect(calculateCardCurrentBalance(testCard.id, txs, [], cbs)).toBe(0);
    // Liquidez de la cuenta bajó a $4,000 ($5,000 - $1,000 pagados)
    expect(calculateNetLiquidity(accounts, txs)).toBe(4000);

    // PASO 4: Días después, el cashback en efectivo se acredita y deposita a la cuenta de débito
    await accreditPendingCashbackInDb(cb.id, debitAccount.id);

    txs = await db.transactions.toArray();
    cbs = await db.cashbackRecords.toArray();
    accounts = await db.accounts.toArray();

    const updatedCb = await db.cashbackRecords.get(cb.id);
    expect(updatedCb?.status).toBe('ACCREDITED');
    expect(updatedCb?.creditedAccountId).toBe(debitAccount.id);

    // La tarjeta PERMANECE en $0 (no genera saldo a favor negativo indebido en la tarjeta)
    expect(calculateCardCurrentBalance(testCard.id, txs, [], cbs)).toBe(0);

    // La cuenta de débito RECIBE los $50 como nuevo ingreso, quedando en $4,050
    expect(calculateNetLiquidity(accounts, txs)).toBe(4050);

    // Verificar que se creó la transacción de ingreso correspondiente
    const incomeTxs = txs.filter((t) => t.type === 'INCOME' && t.tags.includes('cashback'));
    expect(incomeTxs).toHaveLength(1);
    expect(incomeTxs[0].amount).toBe(50);
    expect(incomeTxs[0].accountId).toBe(debitAccount.id);
  });

  it('is idempotent: accreditPendingCashbackInDb does not duplicate income if called twice', async () => {
    const cb = await registerCashbackInDb({
      sourceMerchant: 'Promo Especial',
      amount: 100,
      destination: 'CASH_PENDING',
    });

    await accreditPendingCashbackInDb(cb.id, debitAccount.id);
    let txs = await db.transactions.where('type').equals('INCOME').toArray();
    expect(txs).toHaveLength(1);

    // Segunda llamada accidental
    await accreditPendingCashbackInDb(cb.id, debitAccount.id);
    txs = await db.transactions.where('type').equals('INCOME').toArray();
    expect(txs).toHaveLength(1);
  });

  it('throws an error if cashback record is not found', async () => {
    await expect(accreditPendingCashbackInDb('cb-inexistente', debitAccount.id)).rejects.toThrow(
      'Registro de cashback no encontrado'
    );
  });
});
