import React, { useState, useEffect, useRef } from 'react';
import {
  DollarSign,
  Database,
  Download,
  Upload,
  RefreshCw,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  BookOpen,
  CreditCard,
  Wallet,
  Gift,
  Users,
  Sun,
  Moon,
} from 'lucide-react';
import { usePreferences } from '../../hooks/usePreferences';
import { useCurrency } from '../../hooks/useCurrency';
import {
  downloadBackupFile,
  validateBackupContent,
  type BackupData,
} from '../../services/backupService';
import { performStartupSync, getLastSyncTimestamp } from '../../services/syncService';
import { RestoreConfirmModal } from './RestoreConfirmModal';

const CURRENCIES = [
  { code: 'MXN', label: 'Peso Mexicano (MXN $)' },
  { code: 'USD', label: 'Dólar Estadounidense (USD $)' },
  { code: 'EUR', label: 'Euro (EUR €)' },
  { code: 'COP', label: 'Peso Colombiano (COP $)' },
  { code: 'ARS', label: 'Peso Argentino (ARS $)' },
];

interface SettingsViewProps {
  onRefresh?: () => Promise<void>;
  onOpenOnboarding?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onRefresh, onOpenOnboarding }) => {
  const { currency, setCurrency } = useCurrency();
  const { preferences, setTheme } = usePreferences();
  const currentTheme = preferences.theme || 'dark';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de sincronización
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Estados de respaldo / restauración
  const [isDownloading, setIsDownloading] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pendingBackup, setPendingBackup] = useState<BackupData | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  useEffect(() => {
    async function loadSyncInfo() {
      const ts = await getLastSyncTimestamp();
      setLastSync(ts);
    }
    loadSyncInfo();
  }, []);

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      setSyncFeedback(null);
      const result = await performStartupSync();
      setLastSync(result.timestamp);
      if (onRefresh) {
        await onRefresh();
      }
      setSyncFeedback(
        `Sincronización exitosa: ${result.recurringGenerated} cargos recurrentes generados, ${result.msiApplied} cuotas MSI aplicadas.`
      );
    } catch (err: any) {
      console.error('Error en sincronización manual:', err);
      setSyncFeedback('Error al procesar la sincronización.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      setIsDownloading(true);
      setBackupFeedback(null);
      const filename = await downloadBackupFile();
      setBackupFeedback({
        type: 'success',
        message: `Copia de seguridad descargada exitosamente: ${filename}`,
      });
    } catch (err: any) {
      console.error('Error al exportar respaldo:', err);
      setBackupFeedback({
        type: 'error',
        message: 'No se pudo generar el archivo de respaldo.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const validation = validateBackupContent(parsed);

        if (!validation.isValid) {
          setBackupFeedback({
            type: 'error',
            message: validation.error || 'El archivo seleccionado no es un respaldo válido.',
          });
          return;
        }

        setPendingBackup(parsed as BackupData);
        setIsConfirmModalOpen(true);
      } catch (parseErr) {
        console.error('Error al leer JSON de respaldo:', parseErr);
        setBackupFeedback({
          type: 'error',
          message: 'El archivo seleccionado no contiene un formato JSON válido.',
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreSuccess = async () => {
    if (onRefresh) {
      await onRefresh();
    }
    setBackupFeedback({
      type: 'success',
      message: '¡Base de datos y preferencias restauradas con éxito al 100%!',
    });
  };

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return 'Ninguna sincronización registrada aún';
    try {
      const date = new Date(ts);
      return date.toLocaleString();
    } catch {
      return ts;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div className="section-header">
        <h3 className="section-title">Ajustes del Sistema</h3>
      </div>

      {/* Apariencia y Tema (Modo Claro / Modo Oscuro) */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {currentTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Apariencia y Tema</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Elige entre el tema oscuro de alto contraste o el tema claro editorial.
            </div>
          </div>
        </div>

        <div className="theme-segmented-control">
          <button
            type="button"
            className={`theme-option-btn ${currentTheme === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme('dark')}
          >
            <Moon size={16} />
            <span>Tema Oscuro</span>
          </button>
          <button
            type="button"
            className={`theme-option-btn ${currentTheme === 'light' ? 'active' : ''}`}
            onClick={() => setTheme('light')}
          >
            <Sun size={16} />
            <span>Tema Claro</span>
          </button>
        </div>
      </div>

      {/* Moneda Predeterminada */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--income-bg)',
              color: 'var(--income)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DollarSign size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Moneda Predeterminada</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Afecta el símbolo y formateo visual de todas las cuentas y tarjetas.
            </div>
          </div>
        </div>

        <select
          className="form-select"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Sección: Cómo funciona */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-blue-light)',
                color: 'var(--accent-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BookOpen size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>Cómo funciona</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Guía clara de los conceptos clave para cuidar tu dinero sin complicaciones.
              </div>
            </div>
          </div>

          {onOpenOnboarding && (
            <button
              type="button"
              className="btn-secondary"
              onClick={onOpenOnboarding}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                padding: '7px 14px',
              }}
            >
              <Sparkles size={15} color="var(--primary)" />
              Ver tutorial interactivo
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Concepto 1 */}
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
              display: 'flex',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px',
              }}
            >
              <Wallet size={16} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Saldo neto disponible</span>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Es la cantidad real de dinero libre que tienes para gastar hoy. La aplicación suma todo lo que tienes en tus cuentas de banco y en efectivo, y le resta lo que debes en tus tarjetas y lo que necesitas apartar para tus gastos fijos del mes. Si este número es positivo, vas por muy buen camino.
              </p>
            </div>
          </div>

          {/* Concepto 2 */}
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
              display: 'flex',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(59, 130, 246, 0.12)',
                color: 'var(--accent-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px',
              }}
            >
              <CreditCard size={16} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Compra normal con tarjeta vs. Impacto Directo</span>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                En una compra normal con tarjeta, el banco paga la cuenta por ti hoy y tú acumulas esa deuda para liquidarla antes de tu fecha límite de pago. En una compra con Impacto Directo, el dinero se descuenta hoy mismo de tu cuenta de débito o efectivo. Es ideal cuando usas tu tarjeta para ganar puntos o recompensas pero tienes el dinero listo y prefieres no dejar deudas pendientes para fin de mes.
              </p>
            </div>
          </div>

          {/* Concepto 3 */}
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
              display: 'flex',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.12)',
                color: 'var(--accent-amber)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px',
              }}
            >
              <Sparkles size={16} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Meses Sin Intereses (MSI)</span>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Te permite dividir el costo total de una compra grande en pagos mensuales iguales sin pagar un centavo extra. Cada mes solo se te cobrará la cuota que toca en ese periodo, permitiéndote comprar cosas importantes sin tener que gastar todos tus ahorros de golpe.
              </p>
            </div>
          </div>

          {/* Concepto 4 */}
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
              display: 'flex',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(168, 85, 247, 0.12)',
                color: 'var(--accent-purple)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px',
              }}
            >
              <Gift size={16} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Los dos destinos del Cashback</span>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                El cashback es dinero de premio que te devuelven por tus compras. Puedes elegir dos destinos para ese dinero: Saldo a Favor en Tarjeta descuenta de inmediato lo que le debes al banco en tu estado de cuenta; Efectivo Pendiente guarda el dinero en una alcancía virtual para que lo retires a tu cuenta bancaria cuando tú lo decidas.
              </p>
            </div>
          </div>

          {/* Concepto 5 */}
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
              display: 'flex',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(236, 72, 153, 0.12)',
                color: '#ec4899',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px',
              }}
            >
              <Users size={16} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Cómo funciona un préstamo a un tercero</span>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Cuando le prestas dinero a un amigo o familiar, ese dinero sale de tu cuenta hoy, pero la aplicación recuerda que ese dinero sigue siendo tuyo y que te lo van a devolver. Por eso, no lo cuenta como un gasto perdido, sino como dinero pendiente por cobrar que suma a tu favor.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sincronización al Abrir */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(59, 130, 246, 0.1)',
                color: 'var(--accent-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RefreshCw size={18} className={isSyncing ? 'spin' : ''} />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>Sincronización Automática</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} />
                Última ejecución: {formatTimestamp(lastSync)}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleManualSync}
            disabled={isSyncing}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            <RefreshCw size={14} className={isSyncing ? 'spin' : ''} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
          </button>
        </div>

        {syncFeedback && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(59, 130, 246, 0.08)',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid rgba(59, 130, 246, 0.2)',
            }}
          >
            <CheckCircle2 size={16} color="var(--accent-blue)" />
            {syncFeedback}
          </div>
        )}
      </div>

      {/* Respaldo y Restauración (Módulo 4) */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--income)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Database size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Copia de Seguridad y Restauración</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              100% de tus datos en archivo .json local compatible con cualquier navegador.
            </div>
          </div>
        </div>

        {backupFeedback && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background:
                backupFeedback.type === 'success'
                  ? 'var(--income-bg)'
                  : 'var(--expense-bg)',
              color:
                backupFeedback.type === 'success'
                  ? 'var(--income)'
                  : 'var(--expense)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: `1px solid ${
                backupFeedback.type === 'success'
                  ? 'rgba(16, 185, 129, 0.3)'
                  : 'rgba(239, 68, 68, 0.3)'
              }`,
            }}
          >
            {backupFeedback.type === 'success' ? (
              <ShieldCheck size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            {backupFeedback.message}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleDownloadBackup}
            disabled={isDownloading}
            style={{ justifyContent: 'center' }}
          >
            <Download size={16} />
            {isDownloading ? 'Exportando...' : 'Exportar Copia (.json)'}
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            style={{ justifyContent: 'center' }}
          >
            <Upload size={16} />
            Restaurar Copia
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Puntos de Extensión Futuros (Fase 2) */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-purple-light)',
              color: 'var(--accent-purple)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Puntos de Extensión Futuros (Fase 2)</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Arquitectura modular abierta para futuras ampliaciones.
            </div>
          </div>
        </div>

        <ul
          style={{
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
          }}
        >
          <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={14} color="var(--primary)" />
            <strong>Inversiones a Rendimiento Fijo:</strong> Estructura lista con flags de capital bloqueado y liquidación al vencimiento.
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={14} color="var(--primary)" />
            <strong>Presupuestos por Categoría:</strong> Puntos de enlace en el modelo de categorías para topes mensuales.
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={14} color="var(--primary)" />
            <strong>Soporte Multimoneda & Conversión:</strong> Centralizado en useCurrency y capa de transacciones.
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={14} color="var(--primary)" />
            <strong>Sincronización en la Nube:</strong> Capa IndexedDB (Dexie) lista para acoplar sincronizador remoto.
          </li>
        </ul>
      </div>

      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
        <p>Gestor de Finanzas Personales v1.0.0 (MVP)</p>
        <p>Almacenamiento 100% local en tu dispositivo (IndexedDB / PWA)</p>
      </div>

      {/* Modal de confirmación para Restauración */}
      <RestoreConfirmModal
        isOpen={isConfirmModalOpen}
        backupData={pendingBackup}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setPendingBackup(null);
        }}
        onRestoreSuccess={handleRestoreSuccess}
      />
    </div>
  );
};
