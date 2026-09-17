import type { MsiPlan, MsiInstallment } from '../types/models';
import { db } from '../db/database';
import { getTodayDateString } from '../utils/dateUtils';

/**
 * Divide un monto exacto en N cuotas cuadrando los centavos al 100%.
 * Las primeras N-1 cuotas tienen el valor base y la última absorbe el residuo de centavos.
 */
export function splitAmountIntoInstallments(totalAmount: number, n: number): number[] {
  if (n <= 0) throw new Error('El número de cuotas debe ser mayor a 0');
  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / n);
  const remainderCents = totalCents - baseCents * n;

  const result: number[] = [];
  for (let i = 0; i < n; i++) {
    const cents = i === n - 1 ? baseCents + remainderCents : baseCents;
    result.push(cents / 100);
  }
  return result;
}

/**
 * Calcula la serie de fechas de corte para cada cuota a partir de la fecha de compra y el día de corte.
 */
export function calculateMsiCutoffDates(
  purchaseDate: string,
  cutoffDay: number,
  totalInstallments: number
): string[] {
  const [yearStr, monthStr, dayStr] = purchaseDate.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) - 1; // 0-indexed
  const purchaseDay = parseInt(dayStr, 10);

  // Si la compra es igual o posterior al día de corte, la primera cuota cae en el corte del mes siguiente
  if (purchaseDay >= cutoffDay) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  const dates: string[] = [];

  for (let i = 0; i < totalInstallments; i++) {
    let currentMonth = month + i;
    let currentYear = year + Math.floor(currentMonth / 12);
    currentMonth = currentMonth % 12;

    // Ajustar si el mes tiene menos días que cutoffDay (ej. febrero o meses de 30 días)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const effectiveDay = Math.min(cutoffDay, daysInMonth);

    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(effectiveDay).padStart(2, '0')}`;
    dates.push(dateStr);
  }

  return dates;
}

/**
 * Genera el plan MSI y el desglose de cuotas individuales
 */
export function generateMsiPlanData(params: {
  creditCardId: string;
  purchaseTransactionId: string;
  concept: string;
  totalAmount: number;
  totalInstallments: number;
  purchaseDate: string;
  cutoffDay: number;
  directImpact?: boolean;
}): { plan: MsiPlan; installments: MsiInstallment[] } {
  const {
    creditCardId,
    purchaseTransactionId,
    concept,
    totalAmount,
    totalInstallments,
    purchaseDate,
    cutoffDay,
    directImpact,
  } = params;

  if (directImpact) {
    throw new Error('No se puede diferir a MSI con Impacto Directo en Liquidez (son mutuamente excluyentes)');
  }

  const installmentAmounts = splitAmountIntoInstallments(totalAmount, totalInstallments);
  const cutoffDates = calculateMsiCutoffDates(purchaseDate, cutoffDay, totalInstallments);

  const planId = `msi-plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const plan: MsiPlan = {
    id: planId,
    creditCardId,
    purchaseTransactionId,
    concept,
    totalAmount,
    totalInstallments,
    remainingInstallments: totalInstallments,
    installmentAmount: installmentAmounts[0],
    firstCutoffDate: cutoffDates[0],
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };

  const today = getTodayDateString();

  const installments: MsiInstallment[] = installmentAmounts.map((amount, index) => {
    const cutoffDate = cutoffDates[index];
    const isAlreadyDue = cutoffDate <= today;
    return {
      id: `inst-${planId}-${index + 1}`,
      msiPlanId: planId,
      creditCardId,
      installmentNumber: index + 1,
      amount,
      cutoffDate,
      status: isAlreadyDue ? 'APPLIED' : 'PENDING',
      appliedDate: isAlreadyDue ? cutoffDate : undefined,
    };
  });

  return { plan, installments };
}

/**
 * Cancela un plan de MSI a medio pagar:
 * Las cuotas 'PENDING' se marcan como 'CANCELLED' (liberando crédito).
 * Las cuotas 'APPLIED' se mantienen en histórico.
 */
export async function cancelMsiPlanInDb(planId: string): Promise<number> {
  const installments = await db.msiInstallments.where('msiPlanId').equals(planId).toArray();
  let cancelledCount = 0;

  await db.transaction('rw', db.msiPlans, db.msiInstallments, async () => {
    for (const inst of installments) {
      if (inst.status === 'PENDING') {
        await db.msiInstallments.update(inst.id, { status: 'CANCELLED' });
        cancelledCount++;
      }
    }
    await db.msiPlans.update(planId, {
      status: 'CANCELLED',
      remainingInstallments: 0,
    });
  });

  return cancelledCount;
}

/**
 * Aplica en lote cuotas de MSI pendientes que hayan alcanzado su fecha de corte
 */
export async function applyDueMsiInstallmentsInDb(
  asOfDate: string = getTodayDateString()
): Promise<number> {
  const pendingInstallments = await db.msiInstallments
    .filter((inst) => inst.status === 'PENDING' && inst.cutoffDate <= asOfDate)
    .toArray();

  if (pendingInstallments.length === 0) return 0;

  await db.transaction('rw', db.msiInstallments, db.msiPlans, async () => {
    for (const inst of pendingInstallments) {
      await db.msiInstallments.update(inst.id, {
        status: 'APPLIED',
        appliedDate: inst.cutoffDate,
      });

      // Actualizar cuotas restantes en el plan
      const plan = await db.msiPlans.get(inst.msiPlanId);
      if (plan && plan.status === 'ACTIVE') {
        const remaining = Math.max(0, plan.remainingInstallments - 1);
        await db.msiPlans.update(plan.id, {
          remainingInstallments: remaining,
          status: remaining === 0 ? 'COMPLETED' : 'ACTIVE',
        });
      }
    }
  });

  return pendingInstallments.length;
}
