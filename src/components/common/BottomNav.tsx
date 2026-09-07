import React from 'react';
import { ArrowLeftRight, CreditCard, HandCoins, Settings, Plus } from 'lucide-react';

export type NavTab = 'transactions' | 'cards' | 'debts' | 'settings';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onQuickAdd: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onQuickAdd,
}) => {
  return (
    <nav className="bottom-nav">
      <button
        id="nav-tab-transactions"
        className={`nav-item ${currentTab === 'transactions' ? 'active' : ''}`}
        onClick={() => onSelectTab('transactions')}
        aria-label="Flujo de caja"
      >
        <ArrowLeftRight size={20} strokeWidth={currentTab === 'transactions' ? 2.5 : 2} />
        <span>Flujo</span>
      </button>

      <button
        id="nav-tab-cards"
        className={`nav-item ${currentTab === 'cards' ? 'active' : ''}`}
        onClick={() => onSelectTab('cards')}
        aria-label="Tarjetas de crédito"
      >
        <CreditCard size={20} strokeWidth={currentTab === 'cards' ? 2.5 : 2} />
        <span>Tarjetas</span>
      </button>

      {/* Floating Center Action */}
      <button
        id="nav-quick-add-btn"
        className="nav-center-action"
        onClick={onQuickAdd}
        aria-label="Registrar movimiento"
      >
        <Plus size={26} strokeWidth={3} />
      </button>

      <button
        id="nav-tab-debts"
        className={`nav-item ${currentTab === 'debts' ? 'active' : ''}`}
        onClick={() => onSelectTab('debts')}
        aria-label="Deudas por cobrar"
      >
        <HandCoins size={20} strokeWidth={currentTab === 'debts' ? 2.5 : 2} />
        <span>Deudas</span>
      </button>

      <button
        id="nav-tab-settings"
        className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`}
        onClick={() => onSelectTab('settings')}
        aria-label="Ajustes y respaldo"
      >
        <Settings size={20} strokeWidth={currentTab === 'settings' ? 2.5 : 2} />
        <span>Ajustes</span>
      </button>
    </nav>
  );
};
