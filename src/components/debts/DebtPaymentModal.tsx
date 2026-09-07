import React, { useState } from 'react';
import { X, ArrowDownLeft, AlertTriangle } from 'lucide-react';
import type { Debt, Account } from '../../types/models';
import { recordDebtPaymentInDb, validatePaymentAmount } from '../../services/debtService';
import { getTodayDateString } from '../../utils/dateUtils';
import { parseAmount } from '../../utils/formatters';
import { useCurrency } from '../../hooks/useCurrency';

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt | null;
  accounts: Account[];
  onSuccess?: () => void;
}

export const DebtPaymentModal: React.FC<DebtPaymentModalProps> = ({
  isOpen,
  onClose,
  debt,
  accounts,
  onSuccess,
}) => {
  const { format } = useCurrency();
  const [amountStr, setAmountStr] = useState('');
  const [targetAccountId, setTargetAccountId] = useState(
    accounts.find((a) => !a.isArchived)?.id || ''
  );
  const [date, setDate] = useState(getTodayDateString());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const effectiveTargetAccountId = targetAccountId || accounts.find((a) => !a.isArchived)?.id || accounts[0]?.id || '';

  const handleClose = () => {
    setAmountStr('');
    setError(null);
    setNotes('');
    onClose();
  };

  if (!isOpen || !debt) return null;

  const parsedAmount = parseAmount(amountStr);
  const isOverpaying = parsedAmount > debt.currentBalance;

  const handlePayFull = () => {
    setAmountStr(debt.currentBalance.toString());
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validatePaymentAmount(parsedAmount, debt.currentBalance);
    if (!validation.isValid) {
      setError(validation.errorMessage || 'Monto de abono inválido');
      return;
    }
    if (!effectiveTargetAccountId) {
      setError('Selecciona la cuenta donde se depositará el abono');
      return;
    }

    try {
      await recordDebtPaymentInDb({
        debtId: debt.id,
        amount: parsedAmount,
        targetAccountId: effectiveTargetAccountId,
        date,
        notes: notes.trim() || undefined,
      });

      setAmountStr('');
      setError(null);
      setNotes('');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al registrar el abono');
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Registrar Abono a Deuda</h2>
          <button className="modal-close-btn" onClick={handleClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Tarjeta con info de la deuda */}
        <div
          style={{
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Deudor</div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{debt.debtorName}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Préstamo original: {format(debt.originalAmount)}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Saldo Pendiente</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--income)' }}>
              {format(debt.currentBalance)}
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.72rem', padding: '4px 8px', marginTop: '4px' }}
              onClick={handlePayFull}
            >
              Liquidar Total
            </button>
          </div>
        </div>

        {/* Alerta si intenta sobrepagar */}
        {isOverpaying && (
          <div className="alert-card warning">
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>Sobrepago no permitido:</strong> El abono ingresado ({format(parsedAmount)}) supera el saldo adeudado ({format(debt.currentBalance)}). No se permiten saldos negativos.
            </div>
          </div>
        )}

        {error && <div className="alert-card warning">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="debt-payment-amount">Monto del Abono ($)</label>
            <input
              id="debt-payment-amount"
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

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="debt-dest-account">Cuenta de Depósito</label>
              <select
                id="debt-dest-account"
                className="form-select"
                value={effectiveTargetAccountId}
                onChange={(e) => setTargetAccountId(e.target.value)}
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
              <label className="form-label" htmlFor="debt-payment-date">Fecha del Abono</label>
              <input
                id="debt-payment-date"
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="debt-payment-notes">Notas (Opcional)</label>
            <input
              id="debt-payment-notes"
              type="text"
              className="form-input"
              placeholder="Ej. Transferencia bancaria, abono quincenal..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button
            id="debt-payment-submit-btn"
            type="submit"
            className="btn-primary"
            style={{ marginTop: '6px' }}
            disabled={isOverpaying}
          >
            <ArrowDownLeft size={18} />
            Aplicar Abono
          </button>
        </form>
      </div>
    </div>
  );
};
