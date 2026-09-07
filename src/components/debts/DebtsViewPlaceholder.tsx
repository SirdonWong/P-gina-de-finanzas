import React from 'react';
import { HandCoins } from 'lucide-react';

export const DebtsViewPlaceholder: React.FC = () => {
  return (
    <div className="empty-state" style={{ padding: '60px 20px' }}>
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--income-bg)',
          color: 'var(--income)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px',
        }}
      >
        <HandCoins size={28} />
      </div>
      <h3 style={{ fontSize: '1.15rem' }}>Módulo 3: Cuentas por Cobrar (Deudas)</h3>
      <p style={{ maxWidth: '340px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Se habilitará en el Módulo 3 para registrar préstamos a terceros con descuento inmediato de liquidez, panel centralizado de deudores y abonos parciales amortizantes.
      </p>
    </div>
  );
};
