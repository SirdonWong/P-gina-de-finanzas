import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/database';
import { Header } from './components/common/Header';
import { BottomNav, type NavTab } from './components/common/BottomNav';
import { TransactionsView } from './components/transactions/TransactionsView';
import { CardsView } from './components/cards/CardsView';
import { DebtsView } from './components/debts/DebtsView';
import { SettingsView } from './components/settings/SettingsView';
import { performStartupSync } from './services/syncService';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('transactions');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Inicializar base de datos con cuentas y categorías precargadas y sincronización al abrir
  useEffect(() => {
    async function init() {
      try {
        await db.populateDefaultsIfEmpty();
        await performStartupSync();
      } catch (err) {
        console.error('Error inicializando base de datos:', err);
      } finally {
        setIsReady(true);
      }
    }
    init();
  }, []);

  // Consultas reactivas con Dexie useLiveQuery
  const accounts = useLiveQuery(() => db.accounts.filter((a) => !a.isArchived).toArray(), []) || [];
  const categories = useLiveQuery(() => db.categories.filter((c) => !c.isArchived).toArray(), []) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) || [];
  const recurringRules = useLiveQuery(() => db.recurringTransactions.toArray(), []) || [];
  const creditCards = useLiveQuery(() => db.creditCards.toArray(), []) || [];
  const msiPlans = useLiveQuery(() => db.msiPlans.toArray(), []) || [];
  const msiInstallments = useLiveQuery(() => db.msiInstallments.toArray(), []) || [];
  const cashbackRecords = useLiveQuery(() => db.cashbackRecords.toArray(), []) || [];
  const debts = useLiveQuery(() => db.debts.toArray(), []) || [];
  const debtPayments = useLiveQuery(() => db.debtPayments.toArray(), []) || [];

  const handleRefresh = async () => {
    await performStartupSync();
  };

  if (!isReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Iniciando gestor de finanzas...
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header />

      <main style={{ flex: 1, paddingBottom: '20px' }}>
        {currentTab === 'transactions' && (
          <TransactionsView
            accounts={accounts}
            categories={categories}
            transactions={transactions}
            recurringRules={recurringRules}
            onRefresh={handleRefresh}
            openAddModal={isAddModalOpen}
            onCloseAddModal={() => setIsAddModalOpen(!isAddModalOpen)}
          />
        )}

        {currentTab === 'cards' && (
          <CardsView
            cards={creditCards}
            transactions={transactions}
            msiPlans={msiPlans}
            msiInstallments={msiInstallments}
            cashbackRecords={cashbackRecords}
            accounts={accounts}
            categories={categories}
            onRefresh={handleRefresh}
          />
        )}

        {currentTab === 'debts' && (
          <DebtsView
            debts={debts}
            payments={debtPayments}
            accounts={accounts}
            onRefresh={handleRefresh}
          />
        )}

        {currentTab === 'settings' && <SettingsView onRefresh={handleRefresh} />}
      </main>

      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onQuickAdd={() => setIsAddModalOpen(true)}
      />
    </div>
  );
}
