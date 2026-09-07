import React, { useState } from 'react';
import { X, Plus, Wallet, Edit2, Trash2 } from 'lucide-react';
import type { Account, AccountType } from '../../types/models';
import { db } from '../../db/database';
import { parseAmount } from '../../utils/formatters';
import { useCurrency } from '../../hooks/useCurrency';

interface AccountManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  balances: { [accId: string]: number };
  onUpdated?: () => void;
}

export const AccountManagerModal: React.FC<AccountManagerModalProps> = ({
  isOpen,
  onClose,
  accounts,
  balances,
  onUpdated,
}) => {
  const { format } = useCurrency();
  const [showAdd, setShowAdd] = useState(false);
  const [editingAcc, setEditingAcc] = useState<Account | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('DEBIT');
  const [initialBalanceStr, setInitialBalanceStr] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setEditingAcc(null);
    setName('');
    setType('DEBIT');
    setInitialBalanceStr('0');
    setError(null);
    setShowAdd(true);
  };

  const handleOpenEdit = (acc: Account) => {
    setEditingAcc(acc);
    setName(acc.name);
    setType(acc.type);
    setInitialBalanceStr(acc.initialBalance.toString());
    setError(null);
    setShowAdd(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('El nombre de la cuenta es obligatorio');
      return;
    }

    const initialBalance = parseAmount(initialBalanceStr);

    try {
      if (editingAcc) {
        await db.accounts.update(editingAcc.id, {
          name: name.trim(),
          type,
          initialBalance,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const newAcc: Account = {
          id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: name.trim(),
          type,
          initialBalance,
          color: type === 'CASH' ? '#10b981' : '#3b82f6',
          icon: type === 'CASH' ? 'Banknote' : 'CreditCard',
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await db.accounts.add(newAcc);
      }

      setShowAdd(false);
      setEditingAcc(null);
      onUpdated?.();
    } catch (err) {
      console.error(err);
      setError('Error al guardar la cuenta');
    }
  };

  const handleArchive = async (accId: string) => {
    if (!window.confirm('¿Deseas archivar esta cuenta?')) return;
    try {
      await db.accounts.update(accId, { isArchived: true });
      onUpdated?.();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Cuentas de Liquidez</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {!showAdd && (
          <button
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={handleOpenAdd}
          >
            <Plus size={18} />
            Nueva Cuenta
          </button>
        )}

        {showAdd && (
          <form
            onSubmit={handleSave}
            style={{
              background: 'var(--bg-elevated)',
              padding: '16px',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>
                {editingAcc ? 'Editar Cuenta' : 'Añadir Cuenta'}
              </span>
              <button type="button" className="modal-close-btn" onClick={() => setShowAdd(false)}>
                <X size={16} />
              </button>
            </div>

            {error && <div className="alert-card warning">{error}</div>}

            <div className="form-group">
              <label className="form-label">Nombre de la Cuenta</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. BBVA Débito, Efectivo Cartera..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select
                  className="form-select"
                  value={type}
                  onChange={(e) => setType(e.target.value as AccountType)}
                >
                  <option value="DEBIT">Débito Bancario</option>
                  <option value="CASH">Efectivo Físico</option>
                  <option value="SAVINGS">Ahorros / Apartado</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Saldo Inicial ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={initialBalanceStr}
                  onChange={(e) => setInitialBalanceStr(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowAdd(false)}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                Guardar
              </button>
            </div>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {accounts.map((acc) => {
            const currentBal = balances[acc.id] ?? acc.initialBalance;
            return (
              <div
                key={acc.id}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: 'var(--radius-md)',
                      background: acc.type === 'CASH' ? 'var(--income-bg)' : 'var(--accent-blue-light)',
                      color: acc.type === 'CASH' ? 'var(--income)' : 'var(--accent-blue)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Wallet size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{acc.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {acc.type === 'CASH' ? 'Efectivo' : acc.type === 'DEBIT' ? 'Débito' : 'Ahorros'} • Inicial: {format(acc.initialBalance)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: currentBal >= 0 ? 'var(--text-primary)' : 'var(--expense)' }}>
                      {format(currentBal)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Disponible</div>
                  </div>

                  <div style={{ display: 'flex', gap: '2px' }}>
                    <button type="button" className="modal-close-btn" onClick={() => handleOpenEdit(acc)}>
                      <Edit2 size={16} />
                    </button>
                    {accounts.length > 1 && (
                      <button type="button" className="modal-close-btn" onClick={() => handleArchive(acc.id)}>
                        <Trash2 size={16} color="var(--expense)" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
