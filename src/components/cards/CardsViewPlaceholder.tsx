import React from 'react';
import { CreditCard } from 'lucide-react';

export const CardsViewPlaceholder: React.FC = () => {
  return (
    <div className="empty-state" style={{ padding: '60px 20px' }}>
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--accent-blue-light)',
          color: 'var(--accent-blue)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px',
        }}
      >
        <CreditCard size={28} />
      </div>
      <h3 style={{ fontSize: '1.15rem' }}>Módulo 2: Tarjetas de Crédito y MSI</h3>
      <p style={{ maxWidth: '340px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Se habilitará en el Módulo 2 para gestionar líneas de crédito, proyección de cuotas a meses sin intereses (MSI), pagos sin duplicar gasto y recompensas en cashback.
      </p>
    </div>
  );
};
