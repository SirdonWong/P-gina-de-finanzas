import React, { useState } from 'react';
import { X, Sparkles, Tag as TagIcon, Plus } from 'lucide-react';
import { HelpButton } from '../common/HelpButton';
import type { CreditCard, Category, Account } from '../../types/models';
import { getTodayDateString } from '../../utils/dateUtils';
import { parseAmount, formatCurrency } from '../../utils/formatters';
import { calculateMsiCutoffDates } from '../../services/msiService';
import { registerCardPurchaseInDb } from '../../services/cardBalanceService';

interface CardPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: CreditCard[];
  categories: Category[];
  accounts: Account[];
  onSuccess?: () => void;
}

export const CardPurchaseModal: React.FC<CardPurchaseModalProps> = ({
  isOpen,
  onClose,
  cards,
  categories,
  accounts,
  onSuccess,
}) => {
  const [creditCardId, setCreditCardId] = useState(cards[0]?.id || '');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [concept, setConcept] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');

  // Flags (MSI e Impacto Directo son mutuamente excluyentes)
  const [isMsi, setIsMsi] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState<number>(3);
  const [directImpact, setDirectImpact] = useState(false);
  const [debitAccountId, setDebitAccountId] = useState(
    accounts.find((a) => !a.isArchived && a.type === 'DEBIT')?.id || accounts[0]?.id || ''
  );

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedCard = cards.find((c) => c.id === creditCardId) || cards[0];
  const parsedAmount = parseAmount(amountStr);

  const mainCategories = categories.filter(
    (c) => !c.isArchived && c.parentId === null && c.type === 'EXPENSE'
  );
  const subcategories = categoryId
    ? categories.filter((c) => !c.isArchived && c.parentId === categoryId)
    : [];

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleMsiToggle = (checked: boolean) => {
    setIsMsi(checked);
    if (checked) {
      setDirectImpact(false);
    }
  };

  const handleDirectImpactToggle = (checked: boolean) => {
    setDirectImpact(checked);
    if (checked) {
      setIsMsi(false);
    }
  };

  const previewCutoffDates = selectedCard && isMsi && installmentsCount > 0
    ? calculateMsiCutoffDates(date, selectedCard.cutoffDay, installmentsCount)
    : [];

  const previewInstallmentAmount = isMsi && installmentsCount > 0 && parsedAmount > 0
    ? parsedAmount / installmentsCount
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (parsedAmount <= 0) {
      setError('Ingresa un monto válido mayor a 0');
      return;
    }
    if (!creditCardId) {
      setError('Selecciona una tarjeta de crédito');
      return;
    }
    if (isMsi && directImpact) {
      setError('MSI e Impacto Directo en Liquidez son mutuamente excluyentes');
      return;
    }
    if (directImpact && !debitAccountId) {
      setError('Selecciona la cuenta de débito/efectivo para el impacto directo');
      return;
    }

    try {
      await registerCardPurchaseInDb({
        creditCardId,
        amount: parsedAmount,
        date,
        concept,
        categoryId: categoryId || undefined,
        subcategoryId: subcategoryId || undefined,
        tags,
        isMsi,
        installmentsCount,
        cutoffDay: selectedCard?.cutoffDay,
        directImpact,
        debitAccountId,
      });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Error al registrar la compra con tarjeta';
      setError(message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Compra con Tarjeta de Crédito</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {error && <div className="alert-card warning">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Tarjeta */}
          <div className="form-group">
            <label className="form-label" htmlFor="card-select">Tarjeta Utilizada</label>
            <select
              id="card-select"
              className="form-select"
              value={creditCardId}
              onChange={(e) => setCreditCardId(e.target.value)}
              required
            >
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Corte día {c.cutoffDay})
                </option>
              ))}
            </select>
          </div>

          {/* Monto Total */}
          <div className="form-group">
            <label className="form-label" htmlFor="card-tx-amount">Monto Total de la Compra ($)</label>
            <input
              id="card-tx-amount"
              type="number"
              step="0.01"
              className="form-input form-input-amount"
              placeholder="0.00"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              autoFocus
              required
            />
          </div>

          {/* Concepto y Fecha */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fecha de Compra</label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Concepto</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. Vuelos, Laptop..."
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Categoría */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select
                className="form-select"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setSubcategoryId('');
                }}
              >
                <option value="">-- Seleccionar --</option>
                {mainCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Subcategoría</label>
              <select
                className="form-select"
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                disabled={!categoryId || subcategories.length === 0}
              >
                <option value="">{subcategories.length === 0 ? 'Sin subcategorías' : '-- Opcional --'}</option>
                {subcategories.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Etiquetas */}
          <div className="form-group">
            <label className="form-label">Etiquetas (Tags)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="form-input"
                style={{ flex: 1 }}
                type="text"
                placeholder="Ej. vuelos, tecnologia, muebles..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <button type="button" className="btn-secondary" onClick={handleAddTag}>
                <Plus size={16} />
              </button>
            </div>

            {tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="tx-tag"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                  >
                    <TagIcon size={11} />
                    #{tag}
                    <X size={11} />
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Toggle Meses Sin Intereses */}
          {!directImpact && (
            <div
              style={{
                background: 'var(--bg-elevated)',
                border: isMsi ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="var(--primary)" />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Diferir a Meses Sin Intereses (MSI)</span>
                  <HelpButton
                    title="Meses Sin Intereses (MSI)"
                    description="Divide tu compra en cuotas mensuales fijas sin costo adicional. Cada mes solo pagas la parte que corresponde a ese periodo, sin acumular intereses."
                  />
                </div>
                <input
                  type="checkbox"
                  checked={isMsi}
                  onChange={(e) => handleMsiToggle(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
              </label>

              {isMsi && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[3, 6, 9, 12, 18, 24].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`tab-btn ${installmentsCount === n ? 'active' : ''}`}
                        style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                        onClick={() => setInstallmentsCount(n)}
                      >
                        {n} MSI
                      </button>
                    ))}
                  </div>

                  {parsedAmount > 0 && previewCutoffDates.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                      <span>{installmentsCount} cuotas de <strong>{formatCurrency(previewInstallmentAmount)}</strong></span>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        1er corte programado: <strong>{previewCutoffDates[0]}</strong>
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    * Al diferir a MSI, la opción de Impacto Directo en Liquidez queda desactivada.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Toggle Impacto Directo en Liquidez */}
          {!isMsi && (
            <div
              style={{
                background: 'var(--bg-elevated)',
                border: directImpact ? '1px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div style={{ flex: 1, paddingRight: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Impacto Directo en Liquidez</span>
                    <HelpButton
                      title="Impacto Directo en Liquidez"
                      description="Resta el dinero hoy mismo de tu cuenta bancaria o efectivo. Úsalo si tienes el dinero listo y no quieres arrastrar deuda para la fecha de pago de tu tarjeta."
                    />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Descuenta el dinero inmediatamente de tu cuenta bancaria (no genera deuda por pagar en la tarjeta).
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={directImpact}
                  onChange={(e) => handleDirectImpactToggle(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-blue)' }}
                />
              </label>

              {directImpact && (
                <>
                  <div className="form-group" style={{ paddingTop: '4px' }}>
                    <label className="form-label">Cuenta de respaldo (donde se descuenta hoy)</label>
                    <select
                      className="form-select"
                      value={debitAccountId}
                      onChange={(e) => setDebitAccountId(e.target.value)}
                      required
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.type})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    * Al descontar de contado hoy en tu liquidez, la opción de diferir a MSI queda desactivada.
                  </div>
                </>
              )}
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ marginTop: '6px' }}>
            Registrar Compra con Tarjeta
          </button>
        </form>
      </div>
    </div>
  );
};
