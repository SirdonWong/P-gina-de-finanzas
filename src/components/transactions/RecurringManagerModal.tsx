import React, { useState } from 'react';
import { X, Plus, Calendar, RotateCw, CheckCircle, Trash2 } from 'lucide-react';
import type { Account, Category, RecurringTransaction, RecurrenceFrequency } from '../../types/models';
import { db } from '../../db/database';
import { getTodayDateString, formatDate } from '../../utils/dateUtils';
import { parseAmount } from '../../utils/formatters';
import { useCurrency } from '../../hooks/useCurrency';
import { executeRecurringCatchupInDb } from '../../services/recurringService';

interface RecurringManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: RecurringTransaction[];
  accounts: Account[];
  categories: Category[];
  onUpdated?: () => void;
}

export const RecurringManagerModal: React.FC<RecurringManagerModalProps> = ({
  isOpen,
  onClose,
  rules,
  accounts,
  categories,
  onUpdated,
}) => {
  const { format } = useCurrency();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('MONTHLY');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleManualCatchup = async () => {
    setIsProcessing(true);
    setProcessingMessage(null);
    try {
      const generatedCount = await executeRecurringCatchupInDb();
      if (generatedCount > 0) {
        setProcessingMessage(`Se generaron exitosamente ${generatedCount} cargo(s) recurrente(s) vencido(s).`);
      } else {
        setProcessingMessage('Todos los cargos recurrentes están al día.');
      }
      onUpdated?.();
    } catch (err) {
      console.error(err);
      setProcessingMessage('Error al procesar cargos recurrentes.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = parseAmount(amountStr);
    if (amount <= 0) {
      setError('Ingresa un monto mayor a 0');
      return;
    }
    if (!name.trim()) {
      setError('Ingresa el concepto del cargo recurrente');
      return;
    }
    if (!accountId) {
      setError('Selecciona la cuenta');
      return;
    }

    const newRule: RecurringTransaction = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      amount,
      type,
      classification: 'FIXED',
      categoryId,
      accountId,
      frequency,
      startDate,
      nextDueDate: startDate,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    try {
      await db.recurringTransactions.add(newRule);
      // Run catch-up right away if start date is today or in the past
      if (startDate <= getTodayDateString()) {
        await executeRecurringCatchupInDb();
      }
      setShowAddForm(false);
      setName('');
      setAmountStr('');
      onUpdated?.();
    } catch (err) {
      console.error(err);
      setError('Error al crear la regla recurrente');
    }
  };

  const handleToggleActive = async (rule: RecurringTransaction) => {
    try {
      await db.recurringTransactions.update(rule.id, { isActive: !rule.isActive });
      onUpdated?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm('¿Deseas eliminar esta regla de cargo recurrente?')) return;
    try {
      await db.recurringTransactions.delete(ruleId);
      onUpdated?.();
    } catch (err) {
      console.error(err);
    }
  };

  const formatFrequency = (freq: RecurrenceFrequency) => {
    switch (freq) {
      case 'DAILY': return 'Diario';
      case 'WEEKLY': return 'Semanal';
      case 'BIWEEKLY': return 'Quincenal';
      case 'MONTHLY': return 'Mensual';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Gastos Fijos Recurrentes</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {processingMessage && (
          <div className="alert-card info">
            <CheckCircle size={18} />
            <span>{processingMessage}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-secondary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={handleManualCatchup}
            disabled={isProcessing}
          >
            <RotateCw size={16} className={isProcessing ? 'spin' : ''} />
            {isProcessing ? 'Procesando...' : 'Sincronizar Vencidos'}
          </button>

          {!showAddForm && (
            <button
              className="btn-primary"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={() => setShowAddForm(true)}
            >
              <Plus size={16} />
              Programar Cargo
            </button>
          )}
        </div>

        {showAddForm && (
          <form
            onSubmit={handleSaveRule}
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
              <span style={{ fontWeight: 700 }}>Nuevo Cargo Fijo Recurrente</span>
              <button type="button" className="modal-close-btn" onClick={() => setShowAddForm(false)}>
                <X size={16} />
              </button>
            </div>

            {error && <div className="alert-card warning">{error}</div>}

            <div className="filter-tabs">
              <button
                type="button"
                className={`tab-btn ${type === 'EXPENSE' ? 'active' : ''}`}
                onClick={() => setType('EXPENSE')}
              >
                Gasto Recurrente
              </button>
              <button
                type="button"
                className={`tab-btn ${type === 'INCOME' ? 'active' : ''}`}
                onClick={() => setType('INCOME')}
              >
                Ingreso Recurrente
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Concepto</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. Renta, Netflix, Gimnasio..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Monto ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="0.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Periodicidad</label>
                <select
                  className="form-select"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                >
                  <option value="MONTHLY">Mensual</option>
                  <option value="BIWEEKLY">Quincenal</option>
                  <option value="WEEKLY">Semanal</option>
                  <option value="DAILY">Diario</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Fecha de Inicio / Próximo Cargo</label>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cuenta de Cargo</label>
                <select
                  className="form-select"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  required
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select
                className="form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">-- Sin categoría --</option>
                {categories
                  .filter((c) => !c.isArchived && c.parentId === null && c.type === 'EXPENSE')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

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
                Guardar Regla
              </button>
            </div>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '50vh', overflowY: 'auto' }}>
          {rules.length === 0 ? (
            <div className="empty-state">
              <Calendar size={32} />
              <p>No tienes cargos recurrentes configurados aún.</p>
            </div>
          ) : (
            rules.map((rule) => {
              const cat = categories.find((c) => c.id === rule.categoryId);
              return (
                <div
                  key={rule.id}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    opacity: rule.isActive ? 1 : 0.6,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{rule.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                      <span className="tx-badge-type fixed">{formatFrequency(rule.frequency)}</span>
                      <span>Próximo: {formatDate(rule.nextDueDate)}</span>
                      {cat && <span>• {cat.name}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--expense)' }}>
                      -{format(rule.amount)}
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                      onClick={() => handleToggleActive(rule)}
                    >
                      {rule.isActive ? 'Activo' : 'Pausado'}
                    </button>
                    <button
                      type="button"
                      className="modal-close-btn"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 size={16} color="var(--expense)" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
