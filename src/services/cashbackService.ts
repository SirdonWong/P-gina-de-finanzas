import type { CashbackRecord, Transaction } from '../types/models';
import { db } from '../db/database';
import { getTodayDateString } from '../utils/dateUtils';

/**
 * Registra un nuevo cashback
 */
export async function registerCashbackInDb(data: {
  creditCardId?: string;
  sourceMerchant: string;
  amount: number;
  destination: 'CARD_BALANCE' | 'CASH_PENDING';
  date?: string;
}): Promise<CashbackRecord> {
  const newRecord: CashbackRecord = {
    id: `cb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    creditCardId: data.creditCardId,
    sourceMerchant: data.sourceMerchant,
    amount: data.amount,
    destination: data.destination,
    status: data.destination === 'CARD_BALANCE' ? 'ACCREDITED' : 'PENDING',
    date: data.date || getTodayDateString(),
    creditedDate: data.destination === 'CARD_BALANCE' ? (data.date || getTodayDateString()) : undefined,
  };

  await db.cashbackRecords.add(newRecord);
  return newRecord;
}

/**
 * Acredita un cashback en efectivo pendiente hacia una cuenta bancaria/efectivo.
 * Genera una transacción de INGRESO para que aumente la liquidez neta disponible.
 */
export async function accreditPendingCashbackInDb(
  cashbackId: string,
  targetAccountId: string
): Promise<void> {
  const cb = await db.cashbackRecords.get(cashbackId);
  if (!cb) throw new Error('Registro de cashback no encontrado');
  if (cb.status === 'ACCREDITED') return;

  const today = getTodayDateString();
  const txId = `tx-cb-${cb.id}`;

  const incomeTx: Transaction = {
    id: txId,
    date: today,
    amount: cb.amount,
    type: 'INCOME',
    classification: 'VARIABLE',
    accountId: targetAccountId,
    tags: ['cashback', 'recompensa'],
    notes: `Acreditación de Cashback: ${cb.sourceMerchant}`,
    isCancelled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.transaction('rw', db.cashbackRecords, db.transactions, async () => {
    await db.cashbackRecords.update(cashbackId, {
      status: 'ACCREDITED',
      creditedDate: today,
      creditedAccountId: targetAccountId,
    });
    await db.transactions.add(incomeTx);
  });
}
