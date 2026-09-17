import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowLeftRight,
  FolderTree,
  Repeat,
  SlidersHorizontal,
  Search,
} from 'lucide-react';
import type { Account, Category, Transaction, RecurringTransaction } from '../../types/models';
import { calculateAccountBalances, calculateNetLiquidity, calculateCashflowSummary } from '../../services/balanceCalculator';
import { formatDate } from '../../utils/dateUtils';
import { useCurrency } from '../../hooks/useCurrency';
import { getCategoryIcon } from '../../utils/iconMap';
import { TransactionFormModal } from './TransactionFormModal';
import { TransactionDetailModal } from './TransactionDetailModal';
import { CategoryManagerModal } from './CategoryManagerModal';
import { RecurringManagerModal } from './RecurringManagerModal';
import { AccountManagerModal } from './AccountManagerModal';

interface TransactionsViewProps {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  recurringRules: RecurringTransaction[];
  onRefresh: () => void;
  openAddModal: boolean;
  onCloseAddModal: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  accounts,
  categories,
  transactions,
  recurringRules,
  onRefresh,
  openAddModal,
  onCloseAddModal,
}) => {
  const { format } = useCurrency();

  // Modals state
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Filters state
  const [filterType, setFilterType] = useState<'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER'>('ALL');
  const [filterClassification, setFilterClassification] = useState<'ALL' | 'FIXED' | 'VARIABLE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Financial calculations
  const netLiquidity = useMemo(() => {
    return calculateNetLiquidity(accounts, transactions);
  }, [accounts, transactions]);

  const accountBalances = useMemo(() => {
    return calculateAccountBalances(accounts, transactions);
  }, [accounts, transactions]);

  const cashflow = useMemo(() => {
    return calculateCashflowSummary(transactions);
  }, [transactions]);

  // Filtered transactions sorted chronologically (latest first)
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (filterType !== 'ALL' && tx.type !== filterType) return false;
        if (filterClassification !== 'ALL' && tx.classification !== filterClassification) return false;
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchesNote = tx.notes?.toLowerCase().includes(term);
          const matchesTag = tx.tags?.some((t) => t.toLowerCase().includes(term));
          const cat = categories.find((c) => c.id === tx.categoryId);
          const matchesCat = cat?.name.toLowerCase().includes(term);
          if (!matchesNote && !matchesTag && !matchesCat) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt.localeCompare(a.createdAt));
  }, [transactions, filterType, filterClassification, searchTerm, categories]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Tarjeta Hero: Saldo Neto en Tiempo Real (Nivel Visual Único) */}
      <section className="hero-balance-card">
        <div className="hero-label">
          <Wallet size={14} color="var(--primary)" />
          <span>Saldo Neto Disponible</span>
        </div>
        <div className="hero-amount">{format(netLiquidity)}</div>

        <div className="hero-metrics-row">
          <div className="hero-metric">
            <span className="hero-metric-label">
              <span className="metric-dot income" /> Ingresos Totales
            </span>
            <span className="hero-metric-val income">
              +{format(cashflow.totalIncome)}
            </span>
          </div>

          <div className="hero-metric-divider" />

          <div className="hero-metric">
            <span className="hero-metric-label">
              <span className="metric-dot expense" /> Gastos Totales
            </span>
            <span className="hero-metric-val expense">
              -{format(cashflow.totalExpense)}
            </span>
          </div>
        </div>
      </section>

      {/* Jerarquía de Acciones: Primaria Destacada + Navegación Secundaria */}
      <section className="view-actions-container">
        <button
          id="btn-new-transaction"
          type="button"
          className="btn-primary-hero"
          onClick={onCloseAddModal}
          aria-label="Nuevo Movimiento"
        >
          <div className="btn-primary-hero-icon">
            <Plus size={18} strokeWidth={2.5} />
          </div>
          <span>Nuevo Movimiento</span>
        </button>

        <div className="secondary-nav-group">
          <button
            id="btn-manage-accounts"
            type="button"
            className="secondary-nav-btn"
            onClick={() => setShowAccountModal(true)}
            aria-label="Administrar Cuentas"
          >
            <Wallet size={15} />
            <span>Cuentas</span>
          </button>

          <button
            id="btn-manage-categories"
            type="button"
            className="secondary-nav-btn"
            onClick={() => setShowCategoryModal(true)}
            aria-label="Administrar Categorías"
          >
            <FolderTree size={15} />
            <span>Categorías</span>
          </button>

          <button
            id="btn-manage-recurring"
            type="button"
            className="secondary-nav-btn"
            onClick={() => setShowRecurringModal(true)}
            aria-label="Gastos Recurrentes"
          >
            <Repeat size={15} />
            <span>Recurrentes</span>
          </button>
        </div>
      </section>

      {/* Filtros y Búsqueda */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Barra de Búsqueda */}
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ width: '100%', paddingLeft: '36px' }}
            placeholder="Buscar por concepto, categoría o #etiqueta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Pestañas de Tipo */}
        <div className="filter-tabs">
          <button
            className={`tab-btn ${filterType === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterType('ALL')}
          >
            Todos ({transactions.length})
          </button>
          <button
            className={`tab-btn ${filterType === 'EXPENSE' ? 'active' : ''}`}
            onClick={() => setFilterType('EXPENSE')}
          >
            Gastos
          </button>
          <button
            className={`tab-btn ${filterType === 'INCOME' ? 'active' : ''}`}
            onClick={() => setFilterType('INCOME')}
          >
            Ingresos
          </button>
          <button
            className={`tab-btn ${filterType === 'TRANSFER' ? 'active' : ''}`}
            onClick={() => setFilterType('TRANSFER')}
          >
            Transf.
          </button>
        </div>

        {/* Filtro Fijo / Variable */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', overflowX: 'auto' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <SlidersHorizontal size={12} /> Flujo:
          </span>
          <button
            className={`tx-badge-type ${filterClassification === 'ALL' ? 'fixed' : 'variable'}`}
            style={{ cursor: 'pointer', border: 'none', background: filterClassification === 'ALL' ? 'var(--primary)' : 'var(--bg-elevated)', color: '#fff' }}
            onClick={() => setFilterClassification('ALL')}
          >
            Todos
          </button>
          <button
            className={`tx-badge-type ${filterClassification === 'FIXED' ? 'fixed' : 'variable'}`}
            style={{ cursor: 'pointer', border: 'none', background: filterClassification === 'FIXED' ? 'var(--accent-blue)' : 'var(--bg-elevated)', color: '#fff' }}
            onClick={() => setFilterClassification('FIXED')}
          >
            Fijos ({cashflow.fixedExpense > 0 ? format(cashflow.fixedExpense) : '0'})
          </button>
          <button
            className={`tx-badge-type ${filterClassification === 'VARIABLE' ? 'fixed' : 'variable'}`}
            style={{ cursor: 'pointer', border: 'none', background: filterClassification === 'VARIABLE' ? 'var(--warning)' : 'var(--bg-elevated)', color: '#fff' }}
            onClick={() => setFilterClassification('VARIABLE')}
          >
            Variables
          </button>
        </div>
      </section>

      {/* Listado del Libro Diario Cronológico */}
      <section>
        <div className="section-header">
          <h3 className="section-title">Libro Diario</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {filteredTransactions.length} movimiento(s)
          </span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="empty-state">
            <Wallet size={36} strokeWidth={1.5} />
            <p>No se encontraron movimientos registrados con estos filtros.</p>
          </div>
        ) : (
          <div className="tx-list">
            {filteredTransactions.map((tx) => {
              const category = categories.find((c) => c.id === tx.categoryId);
              const account = accounts.find((a) => a.id === tx.accountId);

              return (
                <div
                  key={tx.id}
                  className={`tx-item ${tx.isCancelled ? 'cancelled' : ''}`}
                  onClick={() => setSelectedTx(tx)}
                >
                  <div className="tx-left">
                    <div
                      className="tx-category-badge"
                      style={{
                        background:
                          tx.type === 'INCOME'
                            ? 'var(--income)'
                            : tx.type === 'EXPENSE'
                            ? category?.color || 'var(--expense)'
                            : 'var(--accent-blue)',
                      }}
                    >
                      {tx.type === 'INCOME' ? (
                        <ArrowDownLeft size={20} />
                      ) : tx.type === 'EXPENSE' ? (
                        getCategoryIcon(category?.icon, 20)
                      ) : (
                        <ArrowLeftRight size={20} />
                      )}
                    </div>

                    <div className="tx-details">
                      <div className="tx-title-row">
                        <span className="tx-title">
                          {tx.notes || category?.name || (tx.type === 'TRANSFER' ? 'Transferencia' : 'Movimiento')}
                        </span>
                        {tx.isCancelled && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--expense)', fontWeight: 700 }}>
                            (ANULADO)
                          </span>
                        )}
                      </div>

                      <div className="tx-meta">
                        <span>{formatDate(tx.date)}</span>
                        <span>•</span>
                        <span>{account?.name || 'Cuenta'}</span>
                        {tx.tags?.map((tag) => (
                          <span key={tag} className="tx-tag">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="tx-right">
                    <div
                      className={`tx-amount ${
                        tx.type === 'INCOME' ? 'income' : tx.type === 'EXPENSE' ? 'expense' : 'transfer'
                      }`}
                    >
                      {tx.type === 'EXPENSE' ? '-' : '+'}
                      {format(tx.amount)}
                    </div>
                    <span className={`tx-badge-type ${tx.classification === 'FIXED' ? 'fixed' : 'variable'}`}>
                      {tx.classification === 'FIXED' ? 'Fijo' : 'Variable'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modales */}
      <TransactionFormModal
        isOpen={openAddModal}
        onClose={onCloseAddModal}
        accounts={accounts}
        categories={categories}
        onSuccess={onRefresh}
      />

      <TransactionDetailModal
        transaction={selectedTx}
        accounts={accounts}
        categories={categories}
        onClose={() => setSelectedTx(null)}
        onUpdated={onRefresh}
      />

      <CategoryManagerModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        categories={categories}
        onUpdated={onRefresh}
      />

      <RecurringManagerModal
        isOpen={showRecurringModal}
        onClose={() => setShowRecurringModal(false)}
        rules={recurringRules}
        accounts={accounts}
        categories={categories}
        onUpdated={onRefresh}
      />

      <AccountManagerModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        accounts={accounts}
        balances={accountBalances}
        onUpdated={onRefresh}
      />
    </div>
  );
};
