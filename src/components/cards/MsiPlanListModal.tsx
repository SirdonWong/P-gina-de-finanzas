import React, { useState } from 'react';
import { X, Calendar, Ban, ChevronDown, ChevronUp } from 'lucide-react';
import type { MsiPlan, MsiInstallment, CreditCard } from '../../types/models';
import { cancelMsiPlanInDb } from '../../services/msiService';
import { formatDate } from '../../utils/dateUtils';
import { useCurrency } from '../../hooks/useCurrency';

interface MsiPlanListModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: MsiPlan[];
  installments: MsiInstallment[];
  cards: CreditCard[];
  onUpdated?: () => void;
}

export const MsiPlanListModal: React.FC<MsiPlanListModalProps> = ({
  isOpen,
  onClose,
  plans,
  installments,
  cards,
  onUpdated,
}) => {
  const { format } = useCurrency();
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [confirmCancelPlanId, setConfirmCancelPlanId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCancelPlan = async (planId: string) => {
    try {
      await cancelMsiPlanInDb(planId);
      setConfirmCancelPlanId(null);
      onUpdated?.();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Planes de Meses Sin Intereses (MSI)</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {plans.length === 0 ? (
          <div className="empty-state">
            <Calendar size={36} />
            <p>No tienes compras diferidas a MSI registradas.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {plans.map((plan) => {
              const card = cards.find((c) => c.id === plan.creditCardId);
              const planInstallments = installments
                .filter((i) => i.msiPlanId === plan.id)
                .sort((a, b) => a.installmentNumber - b.installmentNumber);

              const appliedCount = planInstallments.filter((i) => i.status === 'APPLIED').length;
              const pendingCount = planInstallments.filter((i) => i.status === 'PENDING').length;
              const progressPct = (appliedCount / plan.totalInstallments) * 100;

              const isExpanded = expandedPlanId === plan.id;
              const isConfirming = confirmCancelPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    opacity: plan.status === 'CANCELLED' ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{plan.concept}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {card?.name || 'Tarjeta'} • {plan.totalInstallments} cuotas de {format(plan.installmentAmount)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary)' }}>
                        {format(plan.totalAmount)}
                      </div>
                      <span
                        className={`tx-badge-type ${
                          plan.status === 'ACTIVE'
                            ? 'fixed'
                            : plan.status === 'COMPLETED'
                            ? 'income'
                            : 'variable'
                        }`}
                      >
                        {plan.status === 'ACTIVE'
                          ? 'Activo'
                          : plan.status === 'COMPLETED'
                          ? 'Completado'
                          : 'Cancelado'}
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>Progreso: {appliedCount}/{plan.totalInstallments} cuotas aplicadas</span>
                      <span>{Math.round(progressPct)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${progressPct}%`,
                          height: '100%',
                          background: plan.status === 'CANCELLED' ? 'var(--neutral)' : 'var(--primary)',
                          transition: 'width 300ms ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {isExpanded ? 'Ocultar Cuotas' : 'Ver Calendario de Cuotas'}
                    </button>

                    {plan.status === 'ACTIVE' && pendingCount > 0 && !isConfirming && (
                      <button
                        type="button"
                        className="btn-danger"
                        style={{ fontSize: '0.75rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => setConfirmCancelPlanId(plan.id)}
                      >
                        <Ban size={13} />
                        Cancelar Plan
                      </button>
                    )}
                  </div>

                  {/* Confirmación de cancelación */}
                  {isConfirming && (
                    <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>
                        ¿Seguro que deseas cancelar las {pendingCount} cuotas restantes? Se anularán de inmediato liberando la línea de crédito. Las cuotas ya aplicadas ({appliedCount}) permanecerán en tu histórico.
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ flex: 1, fontSize: '0.75rem' }}
                          onClick={() => setConfirmCancelPlanId(null)}
                        >
                          Volver
                        </button>
                        <button
                          type="button"
                          className="btn-danger"
                          style={{ flex: 1, fontSize: '0.75rem' }}
                          onClick={() => handleCancelPlan(plan.id)}
                        >
                          Confirmar Cancelación
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Desglose de cuotas individuales */}
                  {isExpanded && (
                    <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                      {planInstallments.map((inst) => (
                        <div
                          key={inst.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.8rem',
                            padding: '4px 0',
                            borderBottom: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 600 }}>Cuota {inst.installmentNumber}</span>
                            <span style={{ color: 'var(--text-muted)' }}>({formatDate(inst.cutoffDate)})</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600 }}>{format(inst.amount)}</span>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background:
                                  inst.status === 'APPLIED'
                                    ? 'var(--income-bg)'
                                    : inst.status === 'PENDING'
                                    ? 'var(--warning-bg)'
                                    : 'var(--neutral-bg)',
                                color:
                                  inst.status === 'APPLIED'
                                    ? 'var(--income)'
                                    : inst.status === 'PENDING'
                                    ? 'var(--warning)'
                                    : 'var(--neutral)',
                              }}
                            >
                              {inst.status === 'APPLIED'
                                ? 'Aplicada al corte'
                                : inst.status === 'PENDING'
                                ? 'Pendiente'
                                : 'Cancelada'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
