import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, FolderPlus } from 'lucide-react';
import type { Category, CategoryType } from '../../types/models';
import { db } from '../../db/database';
import { getCategoryIcon } from '../../utils/iconMap';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onUpdated?: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onUpdated,
}) => {
  const [activeType, setActiveType] = useState<CategoryType>('EXPENSE');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [icon, setIcon] = useState('Tag');
  const [color, setColor] = useState('#10b981');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentCategories = categories.filter(
    (c) => !c.isArchived && c.type === activeType && c.parentId === null
  );

  const getSubcategories = (catId: string) => {
    return categories.filter((c) => !c.isArchived && c.parentId === catId);
  };

  const handleOpenAdd = (parentCatId: string = '') => {
    setEditingCategory(null);
    setName('');
    setParentId(parentCatId);
    setIcon(activeType === 'EXPENSE' ? 'Tag' : 'DollarSign');
    setColor(activeType === 'EXPENSE' ? '#f43f5e' : '#10b981');
    setError(null);
    setShowAddForm(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setParentId(cat.parentId || '');
    setIcon(cat.icon);
    setColor(cat.color);
    setError(null);
    setShowAddForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('El nombre de la categoría es obligatorio');
      return;
    }

    try {
      if (editingCategory) {
        await db.categories.update(editingCategory.id, {
          name: trimmedName,
          parentId: parentId || null,
          icon,
          color,
        });
      } else {
        const newCat: Category = {
          id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: trimmedName,
          parentId: parentId || null,
          type: activeType,
          icon,
          color,
          isDefault: false,
          isArchived: false,
        };
        await db.categories.add(newCat);
      }

      setShowAddForm(false);
      setEditingCategory(null);
      setName('');
      onUpdated?.();
    } catch (err) {
      console.error('Error guardando categoría:', err);
      setError('Error al guardar categoría');
    }
  };

  const handleDelete = async (cat: Category) => {
    const confirmDelete = window.confirm(
      `¿Deseas eliminar la categoría "${cat.name}"? Si contiene subcategorías o transacciones históricas, se archivará de forma segura.`
    );
    if (!confirmDelete) return;

    try {
      // Si tiene subcategorías, archivarlas también
      const subs = getSubcategories(cat.id);
      for (const sub of subs) {
        await db.categories.update(sub.id, { isArchived: true });
      }
      await db.categories.update(cat.id, { isArchived: true });
      onUpdated?.();
    } catch (err) {
      console.error('Error eliminando categoría:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Gestión de Categorías</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Selector de tipo */}
        <div className="filter-tabs">
          <button
            className={`tab-btn ${activeType === 'EXPENSE' ? 'active' : ''}`}
            onClick={() => {
              setActiveType('EXPENSE');
              setShowAddForm(false);
            }}
          >
            Gastos
          </button>
          <button
            className={`tab-btn ${activeType === 'INCOME' ? 'active' : ''}`}
            onClick={() => {
              setActiveType('INCOME');
              setShowAddForm(false);
            }}
          >
            Ingresos
          </button>
        </div>

        {/* Botón para añadir nueva categoría principal */}
        {!showAddForm && (
          <button
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={() => handleOpenAdd('')}
          >
            <Plus size={18} />
            Nueva Categoría Principal
          </button>
        )}

        {/* Formulario de creación / edición */}
        {showAddForm && (
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
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                {editingCategory ? 'Editar Categoría' : 'Añadir Categoría'}
              </span>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAddForm(false)}
              >
                <X size={16} />
              </button>
            </div>

            {error && <div className="alert-card warning">{error}</div>}

            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. Colegiatura, Supermercado..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Pertenece a (Jerarquía)</label>
                <select
                  className="form-select"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                >
                  <option value="">-- Categoría Principal --</option>
                  {currentCategories
                    .filter((c) => !editingCategory || c.id !== editingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Color Distintivo</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    style={{
                      width: '42px',
                      height: '42px',
                      border: 'none',
                      borderRadius: '8px',
                      background: 'none',
                      cursor: 'pointer',
                    }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{color}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowAddForm(false)}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                Guardar
              </button>
            </div>
          </form>
        )}

        {/* Lista jerárquica de categorías */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '50vh', overflowY: 'auto' }}>
          {currentCategories.map((cat) => {
            const subcategories = getSubcategories(cat.id);
            return (
              <div
                key={cat.id}
                style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: cat.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                      }}
                    >
                      {getCategoryIcon(cat.icon, 16)}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{cat.name}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      className="modal-close-btn"
                      title="Agregar subcategoría"
                      onClick={() => handleOpenAdd(cat.id)}
                    >
                      <FolderPlus size={16} />
                    </button>
                    <button
                      type="button"
                      className="modal-close-btn"
                      title="Editar"
                      onClick={() => handleOpenEdit(cat)}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      className="modal-close-btn"
                      title="Eliminar"
                      onClick={() => handleDelete(cat)}
                    >
                      <Trash2 size={16} color="var(--expense)" />
                    </button>
                  </div>
                </div>

                {/* Subcategorías hijas */}
                {subcategories.length > 0 && (
                  <div
                    style={{
                      marginLeft: '24px',
                      paddingLeft: '12px',
                      borderLeft: '2px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    {subcategories.map((sub) => (
                      <div
                        key={sub.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)',
                          padding: '4px 0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>•</span>
                          <span>{sub.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <button
                            type="button"
                            className="modal-close-btn"
                            onClick={() => handleOpenEdit(sub)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="modal-close-btn"
                            onClick={() => handleDelete(sub)}
                          >
                            <Trash2 size={14} color="var(--expense)" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
