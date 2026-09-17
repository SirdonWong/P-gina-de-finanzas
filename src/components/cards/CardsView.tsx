import React, { useState, useMemo } from 'react';
import {
  CreditCard as CardIcon,
  Plus,
  ArrowRight,
  Sparkles,
  Gift,
  Calendar,
  Edit2,
  Trash2,
} from 'lucide-react';
import type {
  CreditCard,
  Transaction,
  MsiPlan,
  MsiInstallment,
  CashbackRecord,
  Account,
  Category,
} from '../../types/models';
import {
  calculateAllCardsSummary,
  getCardMetrics,
} from '../../services/cardBalanceService';
import { useCurrency } from '../../hooks/useCurrency';
import { CreditCardFormModal } from './CreditCardFormModal';
import { PayCardModal } from './PayCardModal';
import { MsiPlanListModal } from './MsiPlanListModal';
import { CashbackModal } from './CashbackModal';
import { CardPurchaseModal } from './CardPurchaseModal';
import { db } from '../../db/database';

interface CardsViewProps {
  cards: CreditCard[];
  transactions: Transaction[];
  msiPlans: MsiPlan[];
  msiInstallments: MsiInstallment[];
  cashbackRecords: CashbackRecord[];
  accounts: Account[];
  categories: Category[];
  onRefresh: () => void;
}

export const CardsView: React.FC<CardsViewProps> = ({
  cards,
  transactions,
  msiPlans,
  msiInstallments,
  cashbackRecords,
  accounts,
  categories,
  onRefresh,
}) => {
  const { format } = useCurrency();

  // Modals
  const [showAddCard, setShowAddCard] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [preselectedPayCardId, setPreselectedPayCardId] = useState<string | undefined>();
  const [showMsiList, setShowMsiList] = useState(false);
  const [showCashback, setShowCashback] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  // Global calculations
  const globalSummary = useMemo(() => {
    return calculateAllCardsSummary(cards, transactions, msiInstallments, cashbackRecords);
  }, [cards, transactions, msiInstallments, cashbackRecords]);

  const activeCards = cards.filter((c) => !c.isArchived);

  const handleOpenPayForCard = (cardId: string) => {
    setPreselectedPayCardId(cardId);
    setShowPayModal(true);
  };

  const handleArchiveCard = async (cardId: string) => {
    if (!window.confirm('¿Deseas archivar esta tarjeta de crédito?')) return;
    try {
      await db.creditCards.update(cardId, { isArchived: true });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Resumen Global de Crédito */}
      <section className="hero-balance-card" style={{ background: 'var(--bg-hero-cards)' }}>
        <div className="hero-label">
          <CardIcon size={16} color="var(--accent-purple)" />
          <span>Pasivo Total en Tarjetas</span>
        </div>
        <div className="hero-amount" style={{ color: globalSummary.totalCurrentBalance > 0 ? 'var(--expense)' : 'var(--text-primary)' }}>
          {format(globalSummary.totalCurrentBalance)}
        </div>

        <div className="hero-breakdown">
          <div className="breakdown-item">
            <div className="breakdown-icon" style={{ background: 'var(--accent-purple-light)', color: 'var(--accent-purple)' }}>
              <Sparkles size={16} />
            </div>
            <div className="breakdown-data">
              <span className="breakdown-label">Crédito Comprometido</span>
              <span className="breakdown-val" style={{ color: 'var(--accent-purple)' }}>
                {format(globalSummary.totalOccupiedCredit)}
              </span>
            </div>
          </div>

          <div className="breakdown-item">
            <div className="breakdown-icon" style={{ background: 'var(--income-bg)', color: 'var(--income)' }}>
              <CardIcon size={16} />
            </div>
            <div className="breakdown-data">
              <span className="breakdown-label">Línea Libre Disponible</span>
              <span className="breakdown-val income">
                {format(globalSummary.totalAvailableCredit)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Botones de Acción Rápida del Módulo */}
      <section className="quick-actions-bar">
        <button
          className="quick-action-btn"
          onClick={() => {
            setPreselectedPayCardId(undefined);
            setShowPayModal(true);
          }}
          disabled={activeCards.length === 0}
        >
          <div className="action-icon-circle" style={{ background: 'var(--income)' }}>
            <ArrowRight size={18} />
          </div>
          <span>Pagar TC</span>
        </button>

        <button
          className="quick-action-btn"
          onClick={() => setShowPurchaseModal(true)}
          disabled={activeCards.length === 0}
        >
          <div className="action-icon-circle" style={{ background: 'var(--expense)' }}>
            <Plus size={18} />
          </div>
          <span>Compra TC</span>
        </button>

        <button
          className="quick-action-btn"
          onClick={() => setShowMsiList(true)}
        >
          <div className="action-icon-circle" style={{ background: 'var(--accent-blue)' }}>
            <Calendar size={18} />
          </div>
          <span>Planes MSI</span>
        </button>

        <button
          className="quick-action-btn"
          onClick={() => setShowCashback(true)}
        >
          <div className="action-icon-circle" style={{ background: 'var(--warning)' }}>
            <Gift size={18} />
          </div>
          <span>Cashback</span>
        </button>
      </section>

      {/* Tarjetas de Crédito Registradas */}
      <section>
        <div className="section-header">
          <h3 className="section-title">Mis Tarjetas de Crédito</h3>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={() => {
              setEditingCard(null);
              setShowAddCard(true);
            }}
          >
            <Plus size={14} />
            Nueva Tarjeta
          </button>
        </div>

        {activeCards.length === 0 ? (
          <div className="empty-state">
            <CardIcon size={36} strokeWidth={1.5} />
            <p>Aún no has registrado ninguna tarjeta de crédito.</p>
            <button
              type="button"
              className="btn-primary"
              style={{ fontSize: '0.85rem', padding: '8px 16px', marginTop: '6px' }}
              onClick={() => setShowAddCard(true)}
            >
              Registrar Mi Primera Tarjeta
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {activeCards.map((card) => {
              const metrics = getCardMetrics(card, transactions, msiInstallments, cashbackRecords);
              const usagePct = Math.min(100, Math.round((metrics.occupiedCredit / card.creditLimit) * 100));

              return (
                <div
                  key={card.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-strong)',
                    borderLeft: `5px solid ${card.color || 'var(--accent-purple)'}`,
                    borderRadius: 'var(--radius-xl)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.15rem' }}>{card.name}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '10px', marginTop: '3px' }}>
                        <span>Corte: <strong>Día {card.cutoffDay}</strong></span>
                        <span>•</span>
                        <span>Pago: <strong>Día {card.paymentDueDay}</strong></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        className="modal-close-btn"
                        onClick={() => {
                          setEditingCard(card);
                          setShowAddCard(true);
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        className="modal-close-btn"
                        onClick={() => handleArchiveCard(card.id)}
                      >
                        <Trash2 size={16} color="var(--expense)" />
                      </button>
                    </div>
                  </div>

                  {/* Cifras: Saldo Exigible y Crédito Disponible */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--bg-card)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Saldo Exigible Actual</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: metrics.currentBalance > 0 ? 'var(--expense)' : 'var(--text-primary)' }}>
                        {format(metrics.currentBalance)}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Crédito Disponible</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--income)' }}>
                        {format(metrics.availableCredit)}
                      </div>
                    </div>
                  </div>

                  {/* Barra de utilización de línea */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>Comprometido: {format(metrics.occupiedCredit)} ({usagePct}%)</span>
                      <span>Límite: {format(card.creditLimit)}</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--bg-input)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${usagePct}%`,
                          height: '100%',
                          background: usagePct > 80 ? 'var(--expense)' : usagePct > 50 ? 'var(--warning)' : 'var(--primary)',
                          transition: 'width 300ms ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Botón rápido para pagar esta tarjeta */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ fontSize: '0.82rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => handleOpenPayForCard(card.id)}
                    >
                      <ArrowRight size={15} />
                      Pagar Tarjeta
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modales */}
      <CreditCardFormModal
        isOpen={showAddCard}
        editingCard={editingCard}
        onClose={() => {
          setShowAddCard(false);
          setEditingCard(null);
        }}
        onSuccess={onRefresh}
      />

      <PayCardModal
        isOpen={showPayModal}
        cards={activeCards}
        accounts={accounts}
        preselectedCardId={preselectedPayCardId}
        transactions={transactions}
        msiInstallments={msiInstallments}
        cashbackRecords={cashbackRecords}
        onClose={() => setShowPayModal(false)}
        onSuccess={onRefresh}
      />

      <MsiPlanListModal
        isOpen={showMsiList}
        plans={msiPlans}
        installments={msiInstallments}
        cards={activeCards}
        onClose={() => setShowMsiList(false)}
        onUpdated={onRefresh}
      />

      <CashbackModal
        isOpen={showCashback}
        cards={activeCards}
        accounts={accounts}
        cashbackRecords={cashbackRecords}
        onClose={() => setShowCashback(false)}
        onUpdated={onRefresh}
      />

      <CardPurchaseModal
        isOpen={showPurchaseModal}
        cards={activeCards}
        categories={categories}
        accounts={accounts}
        onClose={() => setShowPurchaseModal(false)}
        onSuccess={onRefresh}
      />
    </div>
  );
};
