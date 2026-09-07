import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import { calculateNetLiquidity, calculateCashflowSummary } from '../services/balanceCalculator';
import {
  calculateCardCurrentBalance,
  getCardMetrics,
} from '../services/cardBalanceService';
import { generateMsiPlanData, cancelMsiPlanInDb } from '../services/msiService';
import { registerCashbackInDb, accreditPendingCashbackInDb } from '../services/cashbackService';
import { getTodayDateString } from '../utils/dateUtils';
import type { CreditCard, Account, Transaction } from '../types/models';

describe('Module 2: Credit Cards, MSI & Cashback Integration Lifecycle', () => {
  let debitAccount: Account;
  let testCard: CreditCard;

  beforeEach(async () => {
    await db.delete();
    await db.open();

    debitAccount = {
      id: 'acc-debit-m2',
      name: 'Nómina BBVA',
      type: 'DEBIT',
      initialBalance: 10000,
      isArchived: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    await db.accounts.add(debitAccount);

    testCard = {
      id: 'card-nu-m2',
      name: 'Tarjeta Nu',
      creditLimit: 20000,
      cutoffDay: 15,
      paymentDueDay: 5,
      color: '#8b5cf6',
      isArchived: false,
      createdAt: '2026-01-01',
    };
    await db.creditCards.add(testCard);
  });

  it('runs complete lifecycle: normal purchase, direct impact, MSI projection, payment without duplication, and cashback', async () => {
    let accounts = await db.accounts.toArray();
    let txs = await db.transactions.toArray();
    let msiInsts = await db.msiInstallments.toArray();
    let cashbacks = await db.cashbackRecords.toArray();

    // 1. Estado inicial
    expect(calculateNetLiquidity(accounts, txs)).toBe(10000);
    expect(calculateCardCurrentBalance(testCard.id, txs, msiInsts, cashbacks)).toBe(0);
    let metrics = getCardMetrics(testCard, txs, msiInsts, cashbacks);
    expect(metrics.availableCredit).toBe(20000);

    // 2. Compra normal de $1,500 con tarjeta (sin impacto directo)
    const normalBuyTx: Transaction = {
      id: 'tx-cc-normal',
      date: getTodayDateString(),
      amount: 1500,
      type: 'EXPENSE',
      classification: 'VARIABLE',
      accountId: debitAccount.id,
      creditCardId: testCard.id,
      directImpact: false,
      tags: ['restaurante'],
      isCancelled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.transactions.add(normalBuyTx);

    txs = await db.transactions.toArray();
    // La liquidez bancaria NO se reduce todavía
    expect(calculateNetLiquidity(accounts, txs)).toBe(10000);
    // El pasivo de la tarjeta sube a $1,500
    expect(calculateCardCurrentBalance(testCard.id, txs, msiInsts, cashbacks)).toBe(1500);
    expect(getCardMetrics(testCard, txs, msiInsts, cashbacks).availableCredit).toBe(18500);

    // 3. Compra con directImpact: true de $2,000
    const directImpactTx: Transaction = {
      id: 'tx-cc-direct',
      date: getTodayDateString(),
      amount: 2000,
      type: 'EXPENSE',
      classification: 'VARIABLE',
      accountId: debitAccount.id,
      creditCardId: testCard.id,
      directImpact: true, // Se descuenta de inmediato de débito
      tags: ['vuelo'],
      isCancelled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.transactions.add(directImpactTx);

    txs = await db.transactions.toArray();
    // La liquidez bancaria baja inmediatamente a $8,000 (10000 - 2000)
    expect(calculateNetLiquidity(accounts, txs)).toBe(8000);
    // REGLA CLAVE: El pasivo de la tarjeta SE MANTIENE en $1,500 (NO suma los 2,000 para evitar doble cobro)
    expect(calculateCardCurrentBalance(testCard.id, txs, msiInsts, cashbacks)).toBe(1500);

    // 4. Compra a 3 MSI por $3,000 ($1,000 x 3 cuotas)
    const { plan, installments } = generateMsiPlanData({
      creditCardId: testCard.id,
      purchaseTransactionId: 'tx-msi-buy',
      concept: 'Pantalla 4K',
      totalAmount: 3000,
      totalInstallments: 3,
      purchaseDate: getTodayDateString(),
      cutoffDay: testCard.cutoffDay,
    });
    // Forzamos que la primera cuota esté APPLIED (simulando que cortó) y las otras 2 PENDING
    installments[0].status = 'APPLIED';
    installments[1].status = 'PENDING';
    installments[2].status = 'PENDING';

    await db.msiPlans.add(plan);
    await db.msiInstallments.bulkAdd(installments);

    msiInsts = await db.msiInstallments.toArray();
    // Saldo adeudado de la tarjeta = $1,500 (compra normal) + $1,000 (cuota 1 MSI) = $2,500
    expect(calculateCardCurrentBalance(testCard.id, txs, msiInsts, cashbacks)).toBe(2500);

    // 5. Módulo "Pagar Tarjeta": Pago del saldo exigible de $2,500 desde débito
    const payCardTx: Transaction = {
      id: 'tx-pay-card',
      date: getTodayDateString(),
      amount: 2500,
      type: 'CARD_PAYMENT',
      classification: 'FIXED',
      accountId: debitAccount.id,
      creditCardId: testCard.id,
      destinationAccountId: testCard.id,
      tags: ['pago-tarjeta'],
      isCancelled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.transactions.add(payCardTx);

    txs = await db.transactions.toArray();
    // Saldo de débito baja a $5,500 (8000 - 2500)
    expect(calculateNetLiquidity(accounts, txs)).toBe(5500);
    // Saldo adeudado de la tarjeta vuelve a $0
    expect(calculateCardCurrentBalance(testCard.id, txs, msiInsts, cashbacks)).toBe(0);

    // Verificación de no duplicidad de gasto en cashflow
    const flow = calculateCashflowSummary(txs);
    // Los gastos de consumo registrados fueron 1,500 (normal) + 2,000 (directImpact) = 3,500.
    // El pago de tarjeta (2,500) NO se sumó como gasto duplicado de consumo.
    expect(flow.totalExpense).toBe(3500);

    // 6. Tratamiento de Cashback:
    // A) Cashback aplicado como saldo a favor en tarjeta ($200)
    await registerCashbackInDb({
      creditCardId: testCard.id,
      sourceMerchant: 'Promo Nu',
      amount: 200,
      destination: 'CARD_BALANCE',
    });

    cashbacks = await db.cashbackRecords.toArray();
    // La tarjeta ahora tiene saldo a favor: -200
    expect(calculateCardCurrentBalance(testCard.id, txs, msiInsts, cashbacks)).toBe(-200);

    // B) Cashback en efectivo pendiente ($300)
    const pendingCb = await registerCashbackInDb({
      creditCardId: testCard.id,
      sourceMerchant: 'Recompensa Externa',
      amount: 300,
      destination: 'CASH_PENDING',
    });

    cashbacks = await db.cashbackRecords.toArray();
    // Aún no entra a liquidez
    expect(calculateNetLiquidity(accounts, txs)).toBe(5500);

    // Acreditar en cuenta de débito
    await accreditPendingCashbackInDb(pendingCb.id, debitAccount.id);

    txs = await db.transactions.toArray();
    // La liquidez bancaria ahora sí sube a $5,800 (5500 + 300)
    expect(calculateNetLiquidity(accounts, txs)).toBe(5800);

    // 7. Cancelar compra MSI a medio pagar
    const cancelledCount = await cancelMsiPlanInDb(plan.id);
    expect(cancelledCount).toBe(2); // Cuotas 2 y 3 canceladas
    const updatedPlan = await db.msiPlans.get(plan.id);
    expect(updatedPlan?.status).toBe('CANCELLED');
  });
});
