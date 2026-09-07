import React, { useState } from 'react';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import type { Account, Category, Transaction, TransactionClassification, TransactionType } from '../../types/models';
import { db } from '../../db/database';
import { getTodayDateString } from '../../utils/dateUtils';
import { parseAmount } from '../../utils/formatters';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  onSuccess?: () => void;
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  onSuccess,
}) => {
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [classification, setClassification] = useState<TransactionClassification>('VARIABLE');
  const [amountStr, setAmountStr] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [accountId, setAccountId] = useState<string>('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const effectiveAccountId = accountId || accounts.find((a) => !a.isArchived)?.id || '';

  if (!isOpen) return null;

  // Filtrar categorías principales por tipo de movimiento
  const mainCategories = categories.filter(
    (c) => !c.isArchived && c.parentId === null && (type === 'TRANSFER' || c.type === type)
  );

  // Subcategorías de la categoría seleccionada
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

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = parseAmount(amountStr);
    if (amount <= 0) {
      setError('Por favor ingresa un monto válido mayor a 0');
      return;
    }

    if (!effectiveAccountId) {
      setError('Selecciona una cuenta de origen');
      return;
    }

    if (type === 'TRANSFER') {
      if (!destinationAccountId) {
        setError('Selecciona una cuenta de destino para la transferencia');
        return;
      }
      if (effectiveAccountId === destinationAccountId) {
        setError('La cuenta origen y destino deben ser diferentes');
        return;
      }
    }

    const newTx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      date,
      amount,
      type,
      classification,
      categoryId: type !== 'TRANSFER' ? categoryId || undefined : undefined,
      subcategoryId: type !== 'TRANSFER' ? subcategoryId || undefined : undefined,
      accountId: effectiveAccountId,
      destinationAccountId: type === 'TRANSFER' ? destinationAccountId : undefined,
      tags,
      notes: notes.trim() || undefined,
      isCancelled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await db.transactions.add(newTx);
      // Reset form
      setAmountStr('');
      setNotes('');
      setTags([]);
      setCategoryId('');
      setSubcategoryId('');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Error al guardar el movimiento');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Nuevo Movimiento</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {error && <div className="alert-card warning">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Tipo de Movimiento: Gasto / Ingreso / Transferencia */}
          <div className="filter-tabs">
            <button
              type="button"
              className={`tab-btn ${type === 'EXPENSE' ? 'active' : ''}`}
              onClick={() => {
                setType('EXPENSE');
                setCategoryId('');
                setSubcategoryId('');
              }}
            >
              Gasto
            </button>
            <button
              type="button"
              className={`tab-btn ${type === 'INCOME' ? 'active' : ''}`}
              onClick={() => {
                setType('INCOME');
                setCategoryId('');
                setSubcategoryId('');
              }}
            >
              Ingreso
            </button>
            <button
              type="button"
              className={`tab-btn ${type === 'TRANSFER' ? 'active' : ''}`}
              onClick={() => {
                setType('TRANSFER');
                setCategoryId('');
                setSubcategoryId('');
              }}
            >
              Transferencia
            </button>
          </div>

          {/* Monto */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-amount-input">Monto ($)</label>
            <input
              id="tx-amount-input"
              className="form-input form-input-amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              autoFocus
              required
            />
          </div>

          {/* Clasificación: Fijo vs Variable (Solo para gasto/ingreso) */}
          {type !== 'TRANSFER' && (
            <div className="form-group">
              <label className="form-label">Clasificación de Flujo</label>
              <div className="filter-tabs">
                <button
                  type="button"
                  className={`tab-btn ${classification === 'VARIABLE' ? 'active' : ''}`}
                  onClick={() => setClassification('VARIABLE')}
                >
                  Variable
                </button>
                <button
                  type="button"
                  className={`tab-btn ${classification === 'FIXED' ? 'active' : ''}`}
                  onClick={() => setClassification('FIXED')}
                >
                  Fijo (Recurrente / Obligatorio)
                </button>
              </div>
            </div>
          )}

          {/* Fecha y Cuenta */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="tx-date-input">Fecha</label>
              <input
                id="tx-date-input"
                className="form-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tx-account-select">
                {type === 'TRANSFER' ? 'Cuenta Origen' : type === 'INCOME' ? 'Cuenta Depósito' : 'Cuenta Pago'}
              </label>
              <select
                id="tx-account-select"
                className="form-select"
                value={effectiveAccountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Si es transferencia, cuenta destino */}
          {type === 'TRANSFER' && (
            <div className="form-group">
              <label className="form-label" htmlFor="tx-dest-account-select">Cuenta Destino</label>
              <select
                id="tx-dest-account-select"
                className="form-select"
                value={destinationAccountId}
                onChange={(e) => setDestinationAccountId(e.target.value)}
                required
              >
                <option value="">-- Seleccionar cuenta destino --</option>
                {accounts
                  .filter((acc) => acc.id !== accountId)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Categoría y Subcategoría (para Ingreso / Gasto) */}
          {type !== 'TRANSFER' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="tx-cat-select">Categoría</label>
                <select
                  id="tx-cat-select"
                  className="form-select"
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setSubcategoryId('');
                  }}
                >
                  <option value="">-- Seleccionar categoría --</option>
                  {mainCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="tx-subcat-select">Subcategoría</label>
                <select
                  id="tx-subcat-select"
                  className="form-select"
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
                  disabled={!categoryId || subcategories.length === 0}
                >
                  <option value="">
                    {subcategories.length === 0 ? 'Sin subcategorías' : '-- Opcional --'}
                  </option>
                  {subcategories.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Etiquetas / Tags */}
          <div className="form-group">
            <label className="form-label">Etiquetas (Tags)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="form-input"
                style={{ flex: 1 }}
                type="text"
                placeholder="Ej. supermercado, viaje, auto..."
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
                    onClick={() => handleRemoveTag(tag)}
                  >
                    <TagIcon size={11} />
                    #{tag}
                    <X size={11} />
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-notes-input">Notas / Concepto (Opcional)</label>
            <input
              id="tx-notes-input"
              className="form-input"
              type="text"
              placeholder="Descripción breve del movimiento"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button id="tx-submit-btn" type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
            Guardar Movimiento
          </button>
        </form>
      </div>
    </div>
  );
};
