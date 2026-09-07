import React, { useState } from 'react';
import { X, HandCoins } from 'lucide-react';
import type { Account } from '../../types/models';
import { createDebtInDb } from '../../services/debtService';
import { getTodayDateString } from '../../utils/dateUtils';
import { parseAmount } from '../../utils/formatters';

interface DebtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onSuccess?: () => void;
}

export const DebtFormModal: React.FC<DebtFormModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onSuccess,
}) => {
  const [debtorName, setDebtorName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState(
    accounts.find((a) => !a.isArchived)?.id || ''
  );
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = parseAmount(amountStr);
    if (!debtorName.trim()) {
      setError('Ingresa el nombre del deudor');
      return;
    }
    if (amount <= 0) {
      setError('Ingresa un monto mayor a 0');
      return;
    }
    if (!sourceAccountId) {
      setError('Selecciona la cuenta de donde sale el dinero prestado');
      return;
    }

    try {
      await createDebtInDb({
        debtorName: debtorName.trim(),
        amount,
        sourceAccountId,
        startDate,
        notes: notes.trim() || undefined,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Error al registrar el préstamo');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Registrar Préstamo (Cuenta por Cobrar)</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="alert-card info">
          <HandCoins size={18} style={{ flexShrink: 0 }} />
          <span>
            El monto prestado se descontará <strong>inmediatamente de tu saldo neto disponible</strong> como salida de efectivo/débito.
          </span>
        </div>

        {error && <div className="alert-card warning">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="debtor-name-input">Nombre del Deudor / Tercero</label>
            <input
              id="debtor-name-input"
              type="text"
              className="form-input"
              placeholder="Ej. Juan Pérez, Hermana, Compañero de trabajo..."
              value={debtorName}
              onChange={(e) => setDebtorName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="debt-amount-input">Monto Prestado ($)</label>
            <input
              id="debt-amount-input"
              type="number"
              step="0.01"
              className="form-input form-input-amount"
              placeholder="0.00"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="debt-account-select">Cuenta de Salida (Desembolso)</label>
              <select
                id="debt-account-select"
                className="form-select"
                value={sourceAccountId}
                onChange={(e) => setSourceAccountId(e.target.value)}
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
              <label className="form-label" htmlFor="debt-date-input">Fecha del Préstamo</label>
              <input
                id="debt-date-input"
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="debt-notes-input">Motivo / Notas (Opcional)</label>
            <input
              id="debt-notes-input"
              type="text"
              className="form-input"
              placeholder="Ej. Apoyo para emergencia, plazo 3 semanas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button id="debt-submit-btn" type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
            Registrar Préstamo
          </button>
        </form>
      </div>
    </div>
  );
};
