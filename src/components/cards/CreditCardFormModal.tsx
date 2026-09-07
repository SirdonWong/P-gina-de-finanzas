import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { CreditCard } from '../../types/models';
import { db } from '../../db/database';
import { parseAmount } from '../../utils/formatters';

interface CreditCardFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCard?: CreditCard | null;
  onSuccess?: () => void;
}

export const CreditCardFormModal: React.FC<CreditCardFormModalProps> = ({
  isOpen,
  onClose,
  editingCard,
  onSuccess,
}) => {
  const [name, setName] = useState(editingCard?.name || '');
  const [creditLimitStr, setCreditLimitStr] = useState(
    editingCard ? editingCard.creditLimit.toString() : ''
  );
  const [cutoffDay, setCutoffDay] = useState(editingCard ? editingCard.cutoffDay : 15);
  const [paymentDueDay, setPaymentDueDay] = useState(
    editingCard ? editingCard.paymentDueDay : 5
  );
  const [color, setColor] = useState(editingCard?.color || '#8b5cf6');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const limit = parseAmount(creditLimitStr);
    if (!name.trim()) {
      setError('Ingresa el nombre de la tarjeta');
      return;
    }
    if (limit <= 0) {
      setError('Ingresa un límite de crédito mayor a 0');
      return;
    }

    try {
      if (editingCard) {
        await db.creditCards.update(editingCard.id, {
          name: name.trim(),
          creditLimit: limit,
          cutoffDay,
          paymentDueDay,
          color,
        });
      } else {
        const newCard: CreditCard = {
          id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: name.trim(),
          creditLimit: limit,
          cutoffDay,
          paymentDueDay,
          color,
          isArchived: false,
          createdAt: new Date().toISOString(),
        };
        await db.creditCards.add(newCard);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Error al guardar la tarjeta de crédito');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {editingCard ? 'Editar Tarjeta de Crédito' : 'Nueva Tarjeta de Crédito'}
          </h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {error && <div className="alert-card warning">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="card-name-input">Nombre / Banco Emisor</label>
            <input
              id="card-name-input"
              type="text"
              className="form-input"
              placeholder="Ej. Nu, BBVA Oro, Citibanamex Rewards..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="card-limit-input">Límite de Crédito Total ($)</label>
            <input
              id="card-limit-input"
              type="number"
              step="0.01"
              className="form-input"
              placeholder="Ej. 25000"
              value={creditLimitStr}
              onChange={(e) => setCreditLimitStr(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="card-cutoff-select">Día de Corte</label>
              <select
                id="card-cutoff-select"
                className="form-select"
                value={cutoffDay}
                onChange={(e) => setCutoffDay(parseInt(e.target.value, 10))}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Día {d} de cada mes
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="card-payday-select">Día Límite de Pago</label>
              <select
                id="card-payday-select"
                className="form-select"
                value={paymentDueDay}
                onChange={(e) => setPaymentDueDay(parseInt(e.target.value, 10))}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Día {d} de cada mes
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Color del Plástico</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#0f172a', '#e11d48'].map(
                (c) => (
                  <button
                    key={c}
                    type="button"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: c,
                      border: color === c ? '3px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                      transform: color === c ? 'scale(1.15)' : 'none',
                      transition: 'transform 150ms ease',
                    }}
                    onClick={() => setColor(c)}
                  />
                )
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>
              {editingCard ? 'Guardar Cambios' : 'Crear Tarjeta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
