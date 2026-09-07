import type { RecurringTransaction, Transaction } from '../types/models';
import { calculateNextDueDate, getTodayDateString } from '../utils/dateUtils';
import { db } from '../db/database';

export interface RecurringProcessingResult {
  generatedTransactions: Transaction[];
  updatedRules: RecurringTransaction[];
}

/**
 * Función pura que procesa reglas recurrentes vencidas hasta una fecha dada
 */
export function processRecurringRules(
  rules: RecurringTransaction[],
  asOfDate: string = getTodayDateString()
): RecurringProcessingResult {
  const generatedTransactions: Transaction[] = [];
  const updatedRules: RecurringTransaction[] = [];

  for (const rule of rules) {
    if (!rule.isActive) continue;

    let currentNextDue = rule.nextDueDate;
    let ruleModified = false;
    let updatedRule = { ...rule };

    // Mientras la fecha de cobro programada sea menor o igual a la fecha actual
    while (currentNextDue <= asOfDate) {
      const txId = `tx-rec-${rule.id}-${currentNextDue}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newTx: Transaction = {
        id: txId,
        date: currentNextDue,
        amount: rule.amount,
        type: rule.type,
        classification: 'FIXED',
        categoryId: rule.categoryId,
        subcategoryId: rule.subcategoryId,
        accountId: rule.accountId,
        tags: ['recurrente', 'fijo'],
        notes: `Cargo automático: ${rule.name}`,
        isCancelled: false,
        recurringRuleId: rule.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      generatedTransactions.push(newTx);
      ruleModified = true;

      // Avanzar al siguiente periodo
      const nextDue = calculateNextDueDate(currentNextDue, rule.frequency);
      updatedRule = {
        ...updatedRule,
        nextDueDate: nextDue,
        lastProcessedDate: currentNextDue,
      };

      // Si la fecha no avanzó (evitar bucle infinito de seguridad)
      if (nextDue <= currentNextDue) {
        break;
      }

      currentNextDue = nextDue;
    }

    if (ruleModified) {
      updatedRules.push(updatedRule);
    }
  }

  return { generatedTransactions, updatedRules };
}

/**
 * Ejecuta el procesamiento de cargos recurrentes directamente en la base de datos
 */
export async function executeRecurringCatchupInDb(
  asOfDate: string = getTodayDateString()
): Promise<number> {
  const activeRules = await db.recurringTransactions
    .filter((r) => r.isActive && r.nextDueDate <= asOfDate)
    .toArray();

  if (activeRules.length === 0) return 0;

  const result = processRecurringRules(activeRules, asOfDate);

  if (result.generatedTransactions.length > 0) {
    await db.transaction('rw', db.transactions, db.recurringTransactions, async () => {
      await db.transactions.bulkAdd(result.generatedTransactions);
      for (const rule of result.updatedRules) {
        await db.recurringTransactions.put(rule);
      }
    });
  }

  return result.generatedTransactions.length;
}
