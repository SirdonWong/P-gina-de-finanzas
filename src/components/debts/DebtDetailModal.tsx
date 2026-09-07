import React, { useState } from 'react';
import { X, Ban, History } from 'lucide-react';
import type { Debt, DebtPayment } from '../../types/models';
import { cancelDebtInDb } from '../../services/debtService';
import { formatDate } from '../../utils/dateUtils';
import { useCurrency } from '../../hooks/useCurrency';

interface DebtDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt | null;
  payments: DebtPayment[];
  onUpdated?: () => void;
}

export const DebtDetailModal: React.FC<DebtDetailModalProps> = ({
  isOpen,
  onClose,
  debt,
  payments,
  onUpdated,
}) => {
  const { format } = useCurrency();
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (!isOpen || !debt) return null;

  const debtPayments = payments
    .filter((p) => p.debtId === debt.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalCollected = debt.originalAmount - debt.currentBalance;
  const progressPct = Math.min(100, Math.round((totalCollected / debt.originalAmount) * 100));

  const handleCancel = async () => {
    try {
      await cancelDebtInDb(debt.id, cancelReason.trim() || 'Cancelación de préstamo');
      setShowConfirmCancel(false);
      onUpdated?.();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Detalle de Cuenta por Cobrar</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Encabezado del Deudor */}
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{debt.debtorName}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Fecha de Préstamo: {formatDate(debt.startDate)}
          </div>
        </div>

        {/* Cifras clave */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--bg-elevated)', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Préstamo Original</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{format(debt.originalAmount)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Saldo Pendiente</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: debt.currentBalance > 0 ? 'var(--income)' : 'var(--text-muted)' }}>
              {format(debt.currentBalance)}
            </div>
          </div>
        </div>

        {/* Barra de Progreso de Amortización */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            <span>Recuperado: {format(totalCollected)}</span>
            <span>{progressPct}% amortizado</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'var(--bg-input)', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progressPct}%`,
                height: '100%',
                background: debt.status === 'PAID' ? 'var(--income)' : 'var(--primary)',
                transition: 'width 300ms ease',
              }}
            />
          </div>
        </div>

        {debt.notes && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
            <strong>Notas:</strong> {debt.notes}
          </div>
        )}

        {/* Historial de Abonos */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px' }}>
            <History size={16} />
            <span>Historial de Abonos ({debtPayments.length})</span>
          </div>

          {debtPayments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Aún no se han registrado abonos a esta deuda.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '30vh', overflowY: 'auto' }}>
              {debtPayments.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>+{format(p.amount)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {formatDate(p.date)}{p.notes ? ` • ${p.notes}` : ''}
                    </div>
                  </div>
                  <span className="tx-badge-type fixed" style={{ fontSize: '0.65rem' }}>
                    Amortizado
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cancelación de deuda */}
        {debt.status === 'PENDING' && (
          <div style={{ marginTop: '8px' }}>
            {!showConfirmCancel ? (
              <button
                type="button"
                className="btn-danger"
                style={{ width: '100%', fontSize: '0.8rem', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => setShowConfirmCancel(true)}
              >
                <Ban size={15} />
                Anular / Cancelar Préstamo
              </button>
            ) : (
              <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--expense)' }}>
                  ¿Confirmas anular este préstamo? Se anulará el desembolso y el dinero se reintegrará a tu saldo neto.
                </span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Motivo de anulación (opcional)"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ flex: 1, fontSize: '0.75rem' }}
                    onClick={() => setShowConfirmCancel(false)}
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    style={{ flex: 1, fontSize: '0.75rem' }}
                    onClick={handleCancel}
                  >
                    Confirmar Anulación
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
