import React, { useState, useMemo } from 'react';
import {
  HandCoins,
  Plus,
  ArrowDownLeft,
  Search,
  Users,
  Eye,
  TrendingUp,
} from 'lucide-react';
import type { Debt, DebtPayment, Account } from '../../types/models';
import { calculateDebtsSummary } from '../../services/debtService';
import { formatDate } from '../../utils/dateUtils';
import { useCurrency } from '../../hooks/useCurrency';
import { DebtFormModal } from './DebtFormModal';
import { DebtPaymentModal } from './DebtPaymentModal';
import { DebtDetailModal } from './DebtDetailModal';

interface DebtsViewProps {
  debts: Debt[];
  payments: DebtPayment[];
  accounts: Account[];
  onRefresh: () => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  debts,
  payments,
  accounts,
  onRefresh,
}) => {
  const { format } = useCurrency();

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPaymentDebt, setSelectedPaymentDebt] = useState<Debt | null>(null);
  const [selectedDetailDebt, setSelectedDetailDebt] = useState<Debt | null>(null);

  // Filters & Search
  const [filterStatus, setFilterStatus] = useState<'PENDING' | 'PAID' | 'ALL'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');

  const summary = useMemo(() => {
    return calculateDebtsSummary(debts);
  }, [debts]);

  const filteredDebts = useMemo(() => {
    return debts
      .filter((d) => {
        if (d.status === 'CANCELLED') return filterStatus === 'ALL';
        if (filterStatus !== 'ALL' && d.status !== filterStatus) return false;
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchesName = d.debtorName.toLowerCase().includes(term);
          const matchesNotes = d.notes?.toLowerCase().includes(term);
          if (!matchesName && !matchesNotes) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [debts, filterStatus, searchTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Panel Centralizado de Cobranza (Hero Card) */}
      <section className="hero-balance-card" style={{ background: 'linear-gradient(145deg, #122822 0%, #0d1527 100%)' }}>
        <div className="hero-label">
          <HandCoins size={16} color="var(--primary)" />
          <span>Total por Cobrar (Cuentas por Cobrar)</span>
        </div>
        <div className="hero-amount" style={{ color: summary.totalPending > 0 ? 'var(--primary-text)' : '#ffffff' }}>
          {format(summary.totalPending)}
        </div>

        <div className="hero-breakdown">
          <div className="breakdown-item">
            <div className="breakdown-icon income">
              <TrendingUp size={16} />
            </div>
            <div className="breakdown-data">
              <span className="breakdown-label">Total Recuperado</span>
              <span className="breakdown-val income">
                +{format(summary.totalCollected)}
              </span>
            </div>
          </div>

          <div className="breakdown-item">
            <div className="breakdown-icon" style={{ background: 'var(--neutral-bg)', color: 'var(--text-secondary)' }}>
              <Users size={16} />
            </div>
            <div className="breakdown-data">
              <span className="breakdown-label">Deudores Activos</span>
              <span className="breakdown-val">
                {summary.activeCount} persona(s)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Botón de Acción Principal y Búsqueda */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          id="new-loan-btn"
          type="button"
          className="btn-primary"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={18} />
          Nuevo Préstamo
        </button>
      </div>

      {/* Buscador y Pestañas de Filtrado */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ width: '100%', paddingLeft: '36px' }}
            placeholder="Buscar por nombre del deudor o notas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          <button
            className={`tab-btn ${filterStatus === 'PENDING' ? 'active' : ''}`}
            onClick={() => setFilterStatus('PENDING')}
          >
            Activas ({summary.activeCount})
          </button>
          <button
            className={`tab-btn ${filterStatus === 'PAID' ? 'active' : ''}`}
            onClick={() => setFilterStatus('PAID')}
          >
            Liquidadas ({summary.paidCount})
          </button>
          <button
            className={`tab-btn ${filterStatus === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterStatus('ALL')}
          >
            Todas ({debts.length})
          </button>
        </div>
      </div>

      {/* Listado de Deudores */}
      <section>
        <div className="section-header">
          <h3 className="section-title">Listado de Cobranza</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {filteredDebts.length} cuenta(s)
          </span>
        </div>

        {filteredDebts.length === 0 ? (
          <div className="empty-state">
            <HandCoins size={36} strokeWidth={1.5} />
            <p>No se encontraron deudas con los filtros seleccionados.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredDebts.map((debt) => {
              const totalAmortized = debt.originalAmount - debt.currentBalance;
              const progressPct = Math.min(100, Math.round((totalAmortized / debt.originalAmount) * 100));

              return (
                <div
                  key={debt.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: `4px solid ${debt.status === 'PAID' ? 'var(--income)' : 'var(--warning)'}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'var(--transition-fast)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        {debt.debtorName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Prestado: {formatDate(debt.startDate)} • Original: {format(debt.originalAmount)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: debt.status === 'PAID' ? 'var(--text-muted)' : 'var(--income)' }}>
                        {format(debt.currentBalance)}
                      </div>
                      <span
                        className={`tx-badge-type ${
                          debt.status === 'PAID' ? 'income' : debt.status === 'PENDING' ? 'variable' : 'fixed'
                        }`}
                      >
                        {debt.status === 'PAID' ? 'Liquidada' : debt.status === 'PENDING' ? 'Pendiente' : 'Cancelada'}
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso de amortización */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>Amortizado: {format(totalAmortized)}</span>
                      <span>{progressPct}% recuperado</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
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

                  {/* Botones de acción */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => setSelectedDetailDebt(debt)}
                    >
                      <Eye size={14} />
                      Historial
                    </button>

                    {debt.status === 'PENDING' && (
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ fontSize: '0.78rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => setSelectedPaymentDebt(debt)}
                      >
                        <ArrowDownLeft size={14} />
                        Registrar Abono
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modales */}
      <DebtFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        accounts={accounts}
        onSuccess={onRefresh}
      />

      <DebtPaymentModal
        isOpen={!!selectedPaymentDebt}
        debt={selectedPaymentDebt}
        accounts={accounts}
        onClose={() => setSelectedPaymentDebt(null)}
        onSuccess={onRefresh}
      />

      <DebtDetailModal
        isOpen={!!selectedDetailDebt}
        debt={selectedDetailDebt}
        payments={payments}
        onClose={() => setSelectedDetailDebt(null)}
        onUpdated={onRefresh}
      />
    </div>
  );
};
