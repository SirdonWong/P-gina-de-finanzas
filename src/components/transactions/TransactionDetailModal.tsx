import React, { useState } from 'react';
import { X, AlertTriangle, RotateCcw } from 'lucide-react';
import type { Account, Category, Transaction } from '../../types/models';
import { db } from '../../db/database';
import { formatDate } from '../../utils/dateUtils';
import { useCurrency } from '../../hooks/useCurrency';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
  onUpdated?: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  accounts,
  categories,
  onClose,
  onUpdated,
}) => {
  const { format } = useCurrency();
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!transaction) return null;

  const account = accounts.find((a) => a.id === transaction.accountId);
  const destAccount = accounts.find((a) => a.id === transaction.destinationAccountId);
  const category = categories.find((c) => c.id === transaction.categoryId);
  const subcategory = categories.find((c) => c.id === transaction.subcategoryId);

  const handleCancelTransaction = async () => {
    try {
      await db.transactions.update(transaction.id, {
        isCancelled: true,
        cancelledAt: new Date().toISOString(),
        cancelReason: cancelReason.trim() || 'Anulación solicitada por el usuario',
        updatedAt: new Date().toISOString(),
      });
      onUpdated?.();
      onClose();
    } catch (err) {
      console.error('Error al anular transacción:', err);
    }
  };

  const handleReactivateTransaction = async () => {
    try {
      await db.transactions.update(transaction.id, {
        isCancelled: false,
        cancelledAt: undefined,
        cancelReason: undefined,
        updatedAt: new Date().toISOString(),
      });
      onUpdated?.();
      onClose();
    } catch (err) {
      console.error('Error al reactivar transacción:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Detalle del Movimiento</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {transaction.isCancelled && (
          <div className="alert-card warning">
            <AlertTriangle size={18} />
            <div>
              <strong>Movimiento Anulado</strong>
              <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                Motivo: {transaction.cancelReason || 'Sin motivo especificado'}
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {transaction.type === 'INCOME'
              ? 'Ingreso'
              : transaction.type === 'EXPENSE'
              ? 'Gasto'
              : transaction.type === 'TRANSFER'
              ? 'Transferencia'
              : transaction.type}
          </div>
          <div
            style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              color:
                transaction.isCancelled
                  ? 'var(--text-muted)'
                  : transaction.type === 'INCOME'
                  ? 'var(--income)'
                  : transaction.type === 'EXPENSE'
                  ? 'var(--expense)'
                  : 'var(--accent-blue)',
            }}
          >
            {transaction.type === 'EXPENSE' ? '-' : '+'}
            {format(transaction.amount)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {formatDate(transaction.date)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Clasificación</span>
            <span className={`tx-badge-type ${transaction.classification === 'FIXED' ? 'fixed' : 'variable'}`}>
              {transaction.classification === 'FIXED' ? 'Fijo' : 'Variable'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Cuenta</span>
            <span style={{ fontWeight: 600 }}>{account?.name || 'Desconocida'}</span>
          </div>

          {destAccount && (
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Destino</span>
              <span style={{ fontWeight: 600 }}>{destAccount.name}</span>
            </div>
          )}

          {category && (
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Categoría</span>
              <span style={{ fontWeight: 600 }}>
                {category.name}
                {subcategory ? ` › ${subcategory.name}` : ''}
              </span>
            </div>
          )}

          {transaction.notes && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Notas</span>
              <span style={{ fontStyle: 'italic' }}>{transaction.notes}</span>
            </div>
          )}

          {transaction.tags && transaction.tags.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Etiquetas</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {transaction.tags.map((tag) => (
                  <span key={tag} className="tx-tag">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Acciones de anulación / reactivación */}
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!transaction.isCancelled ? (
            !showCancelConfirm ? (
              <button
                type="button"
                className="btn-danger"
                onClick={() => setShowCancelConfirm(true)}
              >
                Anular Movimiento
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-elevated)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--expense)' }}>
                  ¿Confirmas la anulación? Se preservará en el historial pero dejará de afectar saldos.
                </span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Motivo de la anulación (opcional)"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setShowCancelConfirm(false)}
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    style={{ flex: 1 }}
                    onClick={handleCancelTransaction}
                  >
                    Confirmar Anulación
                  </button>
                </div>
              </div>
            )
          ) : (
            <button
              type="button"
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={handleReactivateTransaction}
            >
              <RotateCcw size={16} />
              Reactivar Movimiento
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
