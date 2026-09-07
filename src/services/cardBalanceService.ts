import type {
  CreditCard,
  Transaction,
  MsiInstallment,
  CashbackRecord,
} from '../types/models';

export interface CardBalanceResult {
  cardId: string;
  cardName: string;
  creditLimit: number;
  currentBalance: number; // Saldo adeudado actual pendiente de liquidar
  occupiedCredit: number; // Crédito total comprometido (deuda actual + MSI futuros)
  availableCredit: number; // Línea de crédito disponible (límite - comprometido)
}

export interface GlobalCardsSummary {
  totalCreditLimit: number;
  totalCurrentBalance: number;
  totalOccupiedCredit: number;
  totalAvailableCredit: number;
  cards: CardBalanceResult[];
}

/**
 * Calcula el saldo adeudado de una tarjeta de crédito específica.
 *
 * REGLA CRÍTICA:
 * - Compras normales con TC (directImpact = false o undefined) -> SÍ generan pasivo por pagar.
 * - Compras con directImpact = true -> NO generan pasivo por pagar en la tarjeta (ya se cobraron de débito).
 * - Cuotas MSI con estado 'APPLIED' -> SÍ generan pasivo exigible al corte.
 * - Pagos de tarjeta ('CARD_PAYMENT') -> RESTAN el pasivo de la tarjeta.
 * - Cashback con destino 'CARD_BALANCE' y estado 'ACCREDITED' -> RESTA el pasivo de la tarjeta.
 */
export function calculateCardCurrentBalance(
  cardId: string,
  transactions: Transaction[],
  msiInstallments: MsiInstallment[] = [],
  cashbackRecords: CashbackRecord[] = []
): number {
  let balance = 0;

  // 1. Compras directas con esta tarjeta
  for (const tx of transactions) {
    if (tx.isCancelled) continue;
    if (tx.creditCardId !== cardId) continue;

    // Si es compra a MSI, la deuda exigible no entra completa de golpe;
    // se procesa a través de sus cuotas individuales aplicadas (msiInstallments).
    if (tx.msiPlanId) continue;

    if (tx.type === 'EXPENSE') {
      // IMPORTANTE: si tiene impacto directo, ya se debitó de la cuenta bancaria.
      // NO genera deuda por pagar en la tarjeta para evitar doble descuento.
      if (!tx.directImpact) {
        balance += Number(tx.amount) || 0;
      }
    }
  }

  // 2. Cuotas MSI aplicadas/vencidas
  for (const inst of msiInstallments) {
    if (inst.creditCardId === cardId && inst.status === 'APPLIED') {
      balance += Number(inst.amount) || 0;
    }
  }

  // 3. Pagos realizados a esta tarjeta ('CARD_PAYMENT')
  for (const tx of transactions) {
    if (tx.isCancelled) continue;
    if (tx.type === 'CARD_PAYMENT') {
      // Puede vincularse por creditCardId o destinationAccountId
      if (tx.creditCardId === cardId || tx.destinationAccountId === cardId) {
        balance -= Number(tx.amount) || 0;
      }
    }
  }

  // 4. Cashback acreditado a favor de la tarjeta
  for (const cb of cashbackRecords) {
    if (
      cb.creditCardId === cardId &&
      cb.destination === 'CARD_BALANCE' &&
      cb.status === 'ACCREDITED'
    ) {
      balance -= Number(cb.amount) || 0;
    }
  }

  return Math.round(balance * 100) / 100;
}

/**
 * Calcula el crédito total ocupado de la tarjeta (incluye deuda actual + cuotas MSI pendientes futuras).
 */
export function calculateCardOccupiedCredit(
  cardId: string,
  transactions: Transaction[],
  msiInstallments: MsiInstallment[] = [],
  cashbackRecords: CashbackRecord[] = []
): number {
  // Saldo exigible actual
  let occupied = calculateCardCurrentBalance(cardId, transactions, msiInstallments, cashbackRecords);

  // Más cuotas MSI pendientes que aún no han vencido (siguen ocupando línea de crédito)
  for (const inst of msiInstallments) {
    if (inst.creditCardId === cardId && inst.status === 'PENDING') {
      occupied += Number(inst.amount) || 0;
    }
  }

  return Math.max(0, Math.round(occupied * 100) / 100);
}

/**
 * Retorna las métricas completas de una tarjeta (saldo adeudado, crédito ocupado y disponible).
 */
export function getCardMetrics(
  card: CreditCard,
  transactions: Transaction[],
  msiInstallments: MsiInstallment[] = [],
  cashbackRecords: CashbackRecord[] = []
): CardBalanceResult {
  const currentBalance = calculateCardCurrentBalance(
    card.id,
    transactions,
    msiInstallments,
    cashbackRecords
  );
  const occupiedCredit = calculateCardOccupiedCredit(
    card.id,
    transactions,
    msiInstallments,
    cashbackRecords
  );
  const availableCredit = Math.round((card.creditLimit - occupiedCredit) * 100) / 100;

  return {
    cardId: card.id,
    cardName: card.name,
    creditLimit: card.creditLimit,
    currentBalance,
    occupiedCredit,
    availableCredit,
  };
}

/**
 * Consolidado global de todas las tarjetas de crédito activas.
 */
export function calculateAllCardsSummary(
  cards: CreditCard[],
  transactions: Transaction[],
  msiInstallments: MsiInstallment[] = [],
  cashbackRecords: CashbackRecord[] = []
): GlobalCardsSummary {
  let totalCreditLimit = 0;
  let totalCurrentBalance = 0;
  let totalOccupiedCredit = 0;
  let totalAvailableCredit = 0;

  const cardResults: CardBalanceResult[] = [];

  for (const card of cards) {
    if (card.isArchived) continue;

    const metrics = getCardMetrics(card, transactions, msiInstallments, cashbackRecords);
    cardResults.push(metrics);

    totalCreditLimit += metrics.creditLimit;
    totalCurrentBalance += metrics.currentBalance;
    totalOccupiedCredit += metrics.occupiedCredit;
    totalAvailableCredit += metrics.availableCredit;
  }

  return {
    totalCreditLimit: Math.round(totalCreditLimit * 100) / 100,
    totalCurrentBalance: Math.round(totalCurrentBalance * 100) / 100,
    totalOccupiedCredit: Math.round(totalOccupiedCredit * 100) / 100,
    totalAvailableCredit: Math.round(totalAvailableCredit * 100) / 100,
    cards: cardResults,
  };
}
