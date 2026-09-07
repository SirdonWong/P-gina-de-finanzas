import React, { useState } from 'react';
import { X, CheckCircle2, ArrowRight } from 'lucide-react';
import type { CreditCard, Account, Transaction, MsiInstallment, CashbackRecord } from '../../types/models';
import { db } from '../../db/database';
import { calculateCardCurrentBalance } from '../../services/cardBalanceService';
import { getTodayDateString } from '../../utils/dateUtils';
import { parseAmount } from '../../utils/formatters';
import { useCurrency } from '../../hooks/useCurrency';

interface PayCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: CreditCard[];
  accounts: Account[];
  preselectedCardId?: string;
  transactions: Transaction[];
  msiInstallments: MsiInstallment[];
  cashbackRecords: CashbackRecord[];
  onSuccess?: () => void;
}

export const PayCardModal: React.FC<PayCardModalProps> = ({
  isOpen,
  onClose,
  cards,
  accounts,
  preselectedCardId,
  transactions,
  msiInstallments,
  cashbackRecords,
  onSuccess,
}) => {
  const { format } = useCurrency();
  const [cardIdState, setCardIdState] = useState<string>('');
  const [sourceAccountIdState, setSourceAccountIdState] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const cardId = cardIdState || preselectedCardId || cards[0]?.id || '';
  const defaultDebit = accounts.find((a) => !a.isArchived && a.type === 'DEBIT') || accounts[0];
  const sourceAccountId = sourceAccountIdState || defaultDebit?.id || '';

  const selectedCard = cards.find((c) => c.id === cardId);
  const currentBalanceDue = selectedCard
    ? calculateCardCurrentBalance(selectedCard.id, transactions, msiInstallments, cashbackRecords)
    : 0;

  const handlePayFullBalance = () => {
    if (currentBalanceDue > 0) {
      setAmountStr(currentBalanceDue.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = parseAmount(amountStr);
    if (amount <= 0) {
      setError('Por favor ingresa un monto mayor a 0');
      return;
    }
    if (!cardId) {
      setError('Selecciona una tarjeta');
      return;
    }
    if (!sourceAccountId) {
      setError('Selecciona la cuenta bancaria de donde saldrá el pago');
      return;
    }

    const payTx: Transaction = {
      id: `tx-paycard-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date,
      amount,
      type: 'CARD_PAYMENT',
      classification: 'FIXED',
      accountId: sourceAccountId,
      creditCardId: cardId,
      destinationAccountId: cardId,
      tags: ['pago-tarjeta', 'amortizacion'],
      notes: notes.trim() || `Pago a tarjeta: ${selectedCard?.name || ''}`,
      isCancelled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await db.transactions.add(payTx);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Error al registrar el pago de tarjeta');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Pagar Tarjeta de Crédito</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="alert-card info">
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>
            Este movimiento se registra como amortización de pasivo: reduce tu deuda y descuenta de tu cuenta de débito <strong>sin duplicar gastos</strong> en tu historial.
          </span>
        </div>

        {error && <div className="alert-card warning">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Selector de Tarjeta */}
          <div className="form-group">
            <label className="form-label" htmlFor="pay-card-select">Tarjeta a Pagar</label>
            <select
              id="pay-card-select"
              className="form-select"
              value={cardId}
              onChange={(e) => setCardIdState(e.target.value)}
              required
            >
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Límite: {format(c.creditLimit)})
                </option>
              ))}
            </select>
          </div>

          {/* Información del saldo adeudado */}
          <div
            style={{
              background: 'var(--bg-elevated)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Saldo Exigible Actual</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--expense)' }}>
                {format(currentBalanceDue)}
              </div>
            </div>
            {currentBalanceDue > 0 && (
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                onClick={handlePayFullBalance}
              >
                Pagar Total
              </button>
            )}
          </div>

          {/* Monto del Pago */}
          <div className="form-group">
            <label className="form-label" htmlFor="pay-amount-input">Monto a Pagar ($)</label>
            <input
              id="pay-amount-input"
              type="number"
              step="0.01"
              className="form-input form-input-amount"
              placeholder="0.00"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              autoFocus
              required
            />
          </div>

          {/* Cuenta de Origen y Fecha */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="pay-source-acc">Cuenta de Origen (Débito/Efectivo)</label>
              <select
                id="pay-source-acc"
                className="form-select"
                value={sourceAccountId}
                onChange={(e) => setSourceAccountIdState(e.target.value)}
                required
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="pay-date-input">Fecha del Pago</label>
              <input
                id="pay-date-input"
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Notas */}
          <div className="form-group">
            <label className="form-label" htmlFor="pay-notes-input">Notas (Opcional)</label>
            <input
              id="pay-notes-input"
              type="text"
              className="form-input"
              placeholder="Ej. Pago para no generar intereses"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button id="pay-submit-btn" type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
            <ArrowRight size={18} />
            Aplicar Pago a Tarjeta
          </button>
        </form>
      </div>
    </div>
  );
};
