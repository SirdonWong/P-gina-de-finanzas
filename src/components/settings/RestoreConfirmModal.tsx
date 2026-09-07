import React, { useState } from 'react';
import { X, AlertTriangle, Database, CheckCircle2 } from 'lucide-react';
import type { BackupData } from '../../services/backupService';
import { restoreFullBackup } from '../../services/backupService';

interface RestoreConfirmModalProps {
  isOpen: boolean;
  backupData: BackupData | null;
  onClose: () => void;
  onRestoreSuccess: () => void;
}

export const RestoreConfirmModal: React.FC<RestoreConfirmModalProps> = ({
  isOpen,
  backupData,
  onClose,
  onRestoreSuccess,
}) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !backupData) return null;

  const { data, preferences, exportedAt } = backupData;
  const formattedDate = exportedAt ? new Date(exportedAt).toLocaleString() : 'Fecha desconocida';

  const handleConfirmRestore = async () => {
    try {
      setIsRestoring(true);
      setError(null);
      await restoreFullBackup(backupData);
      onRestoreSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error restaurando base de datos:', err);
      setError(err?.message || 'Error al restaurar los datos.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={20} color="var(--expense)" />
            <h3 className="modal-title">Confirmar Restauración Total</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--expense-bg)',
              color: 'var(--expense)',
              fontSize: '0.85rem',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        {/* Warning Callout */}
        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--expense-bg)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '18px',
          }}
        >
          <AlertTriangle size={22} color="var(--expense)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
            <strong style={{ color: 'var(--expense)' }}>¡Advertencia irreversible!</strong>
            <p style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
              Esta acción <strong>reemplazará el 100%</strong> de la base de datos actual en tu navegador con la copia de seguridad seleccionada. Cualquier registro no respaldado previamente se perderá.
            </p>
          </div>
        </div>

        {/* Summary of backup content */}
        <div
          style={{
            background: 'var(--bg-card-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px',
            marginBottom: '20px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
            Respaldo generado el: <strong>{formattedDate}</strong>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              fontSize: '0.82rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} color="var(--income)" />
              <span>Cuentas: <strong>{data.accounts?.length || 0}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} color="var(--income)" />
              <span>Categorías: <strong>{data.categories?.length || 0}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} color="var(--income)" />
              <span>Transacciones: <strong>{data.transactions?.length || 0}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} color="var(--income)" />
              <span>Tarjetas: <strong>{data.creditCards?.length || 0}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} color="var(--income)" />
              <span>Planes MSI: <strong>{data.msiPlans?.length || 0}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} color="var(--income)" />
              <span>Deudas: <strong>{data.debts?.length || 0}</strong></span>
            </div>
            {preferences?.currency && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', gridColumn: '1 / -1' }}>
                <CheckCircle2 size={14} color="var(--primary)" />
                <span>Moneda preferida: <strong>{preferences.currency}</strong></span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isRestoring}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{
              background: 'var(--expense)',
              borderColor: 'var(--expense)',
            }}
            onClick={handleConfirmRestore}
            disabled={isRestoring}
          >
            {isRestoring ? 'Restaurando...' : 'Reemplazar y Restaurar Todo'}
          </button>
        </div>
      </div>
    </div>
  );
};
