import React, { useState } from 'react';
import { X, Plus, Gift, ArrowDownLeft } from 'lucide-react';
import { HelpButton } from '../common/HelpButton';
import type { CashbackRecord, CreditCard, Account } from '../../types/models';
import { registerCashbackInDb, accreditPendingCashbackInDb } from '../../services/cashbackService';
import { parseAmount } from '../../utils/formatters';
import { formatDate } from '../../utils/dateUtils';
import { useCurrency } from '../../hooks/useCurrency';

interface CashbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: CreditCard[];
  accounts: Account[];
  cashbackRecords: CashbackRecord[];
  onUpdated?: () => void;
}

export const CashbackModal: React.FC<CashbackModalProps> = ({
  isOpen,
  onClose,
  cards,
  accounts,
  cashbackRecords,
  onUpdated,
}) => {
  const { format } = useCurrency();
  const [showAddForm, setShowAddForm] = useState(false);
  const [accreditingCbId, setAccreditingCbId] = useState<string | null>(null);
  const [targetAccountId, setTargetAccountId] = useState(accounts[0]?.id || '');

  // Form state
  const [sourceMerchant, setSourceMerchant] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [destination, setDestination] = useState<'CARD_BALANCE' | 'CASH_PENDING'>('CARD_BALANCE');
  const [creditCardId, setCreditCardId] = useState(cards[0]?.id || '');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = parseAmount(amountStr);
    if (!sourceMerchant.trim()) {
      setError('Ingresa el comercio o entidad emisora');
      return;
    }
    if (amount <= 0) {
      setError('Ingresa un monto mayor a 0');
      return;
    }
    if (destination === 'CARD_BALANCE' && !creditCardId) {
      setError('Selecciona la tarjeta donde se aplicará el saldo a favor');
      return;
    }

    try {
      await registerCashbackInDb({
        sourceMerchant: sourceMerchant.trim(),
        amount,
        destination,
        creditCardId: destination === 'CARD_BALANCE' ? creditCardId : undefined,
      });

      setShowAddForm(false);
      setSourceMerchant('');
      setAmountStr('');
      onUpdated?.();
    } catch (err) {
      console.error(err);
      setError('Error al registrar cashback');
    }
  };

  const handleAccredit = async (cbId: string) => {
    if (!targetAccountId) return;
    try {
      await accreditPendingCashbackInDb(cbId, targetAccountId);
      setAccreditingCbId(null);
      onUpdated?.();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Recompensas y Cashback</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="alert-card info">
          <Gift size={18} style={{ flexShrink: 0 }} />
          <span>
            <strong>Caso borde resuelto:</strong> El cashback en efectivo pendiente NO reduce la deuda de tu tarjeta hasta que lo cobres o lo abones explícitamente a tu plástico.
          </span>
        </div>

        {!showAddForm && (
          <button
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={18} />
            Registrar Nuevo Cashback
          </button>
        )}

        {showAddForm && (
          <form
            onSubmit={handleRegister}
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
              <span style={{ fontWeight: 700 }}>Nuevo Cashback / Recompensa</span>
              <button type="button" className="modal-close-btn" onClick={() => setShowAddForm(false)}>
                <X size={16} />
              </button>
            </div>

            {error && <div className="alert-card warning">{error}</div>}

            <div className="form-group">
              <label className="form-label">Comercio o Fuente Emisora</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. Nu Rewards, Costco, Mercado Pago..."
                value={sourceMerchant}
                onChange={(e) => setSourceMerchant(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Monto de la Recompensa ($)</label>
              <input
                type="number"
                step="0.01"
                className="form-input form-input-amount"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0 }}>Destino del Cashback</label>
                <HelpButton
                  title="Destinos del Cashback"
                  description="Elige Saldo a Favor si quieres reducir de inmediato la deuda en tu tarjeta. Elige Efectivo Pendiente si prefieres acumular la recompensa y transferirla a tu cuenta bancaria después."
                />
              </div>
              <div className="filter-tabs">
                <button
                  type="button"
                  className={`tab-btn ${destination === 'CARD_BALANCE' ? 'active' : ''}`}
                  onClick={() => setDestination('CARD_BALANCE')}
                >
                  Saldo a Favor en Tarjeta
                </button>
                <button
                  type="button"
                  className={`tab-btn ${destination === 'CASH_PENDING' ? 'active' : ''}`}
                  onClick={() => setDestination('CASH_PENDING')}
                >
                  Efectivo Pendiente
                </button>
              </div>
            </div>

            {destination === 'CARD_BALANCE' && (
              <div className="form-group">
                <label className="form-label">Tarjeta a Acreditar</label>
                <select
                  className="form-select"
                  value={creditCardId}
                  onChange={(e) => setCreditCardId(e.target.value)}
                  required
                >
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowAddForm(false)}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                Guardar Cashback
              </button>
            </div>
          </form>
        )}

        {/* Listado de Cashbacks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '50vh', overflowY: 'auto' }}>
          {cashbackRecords.length === 0 ? (
            <div className="empty-state">
              <Gift size={32} />
              <p>No tienes registros de cashback aún.</p>
            </div>
          ) : (
            cashbackRecords.map((cb) => {
              const card = cards.find((c) => c.id === cb.creditCardId);
              const isAccrediting = accreditingCbId === cb.id;

              return (
                <div
                  key={cb.id}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{cb.sourceMerchant}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatDate(cb.date)} •{' '}
                        {cb.destination === 'CARD_BALANCE'
                          ? `Saldo a favor en ${card?.name || 'Tarjeta'}`
                          : 'Efectivo por cobrar'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--income)', fontSize: '1rem' }}>
                        +{format(cb.amount)}
                      </div>
                      <span
                        className={`tx-badge-type ${
                          cb.status === 'ACCREDITED' ? 'income' : 'variable'
                        }`}
                      >
                        {cb.status === 'ACCREDITED' ? 'Acreditado' : 'Pendiente'}
                      </span>
                    </div>
                  </div>

                  {/* Si es efectivo pendiente, botón para depositar en cuenta */}
                  {cb.destination === 'CASH_PENDING' && cb.status === 'PENDING' && (
                    <div style={{ paddingTop: '4px' }}>
                      {!isAccrediting ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{
                            fontSize: '0.75rem',
                            padding: '6px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            width: '100%',
                            justifyContent: 'center',
                          }}
                          onClick={() => setAccreditingCbId(cb.id)}
                        >
                          <ArrowDownLeft size={14} color="var(--income)" />
                          Acreditar en Cuenta Líquida
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <select
                            className="form-select"
                            style={{ flex: 1, padding: '6px 8px', fontSize: '0.8rem' }}
                            value={targetAccountId}
                            onChange={(e) => setTargetAccountId(e.target.value)}
                          >
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.type})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                            onClick={() => handleAccredit(cb.id)}
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            className="modal-close-btn"
                            onClick={() => setAccreditingCbId(null)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
