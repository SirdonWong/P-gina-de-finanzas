import React from 'react';
import { Wallet } from 'lucide-react';

interface HeaderProps {
  onOpenRecurring?: () => void;
  onOpenCategories?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="app-header">
      <div className="brand-badge">
        <div className="brand-icon-wrapper">
          <Wallet size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="brand-title">Finanzas</h1>
          <div className="brand-subtitle">Control Personal</div>
        </div>
      </div>
    </header>
  );
};
