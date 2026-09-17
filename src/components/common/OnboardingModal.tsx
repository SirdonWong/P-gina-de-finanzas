import React, { useState } from 'react';
import {
  Wallet,
  CreditCard,
  Sparkles,
  Gift,
  HandCoins,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
} from 'lucide-react';

import {
  ONBOARDING_STEPS_DATA,
  type OnboardingStepMeta,
} from '../../constants/onboardingContent';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface StepItem extends OnboardingStepMeta {
  icon: React.ReactNode;
  body: React.ReactNode;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps: StepItem[] = [
    {
      ...ONBOARDING_STEPS_DATA[0],
      icon: <Wallet size={32} color="var(--primary)" />,
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p>{ONBOARDING_STEPS_DATA[0].description}</p>
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: 'var(--text-primary)' }}>Regla de oro: </strong>
            {ONBOARDING_STEPS_DATA[0].highlight}
          </div>
        </div>
      ),
    },
    {
      ...ONBOARDING_STEPS_DATA[1],
      icon: <CreditCard size={32} color="var(--accent-blue)" />,
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--accent-purple)', marginBottom: '4px' }}>
              1. Compra normal con tarjeta
            </div>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              El banco paga por ti hoy. No te descuenta dinero de inmediato; se acumula como deuda para que lo pagues cuando llegue la fecha de pago de tu tarjeta.
            </p>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '4px' }}>
              2. Impacto Directo en Liquidez
            </div>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Se descuenta hoy mismo de tu cuenta de débito o efectivo, como si pagaras de contado. Ideal para ganar puntos o recompensas de la tarjeta sin acumular deuda para fin de mes.
            </p>
          </div>
        </div>
      ),
    },
    {
      ...ONBOARDING_STEPS_DATA[2],
      icon: <Sparkles size={32} color="var(--primary)" />,
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p>{ONBOARDING_STEPS_DATA[2].description}</p>
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: 'var(--text-primary)' }}>Cobro mes a mes: </strong>
            {ONBOARDING_STEPS_DATA[2].highlight}
          </div>
        </div>
      ),
    },
    {
      ...ONBOARDING_STEPS_DATA[3],
      icon: <Gift size={32} color="var(--warning)" />,
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p>
            Cuando ganas dinero de recompensa por tus compras, la aplicación te ofrece dos destinos claros:
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              fontSize: '0.82rem',
            }}
          >
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '10px',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--income)', marginBottom: '4px' }}>
                Saldo a Favor
              </div>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                Se aplica directo a tu tarjeta para bajar lo que le debes al banco.
              </p>
            </div>

            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '10px',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--warning)', marginBottom: '4px' }}>
                Efectivo Pendiente
              </div>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                Se guarda como recompensa lista para transferirse a tu cuenta bancaria cuando quieras.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      ...ONBOARDING_STEPS_DATA[4],
      icon: <HandCoins size={32} color="var(--primary)" />,
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p>{ONBOARDING_STEPS_DATA[4].description}</p>
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: 'var(--text-primary)' }}>Recuperación paso a paso: </strong>
            {ONBOARDING_STEPS_DATA[4].highlight}
          </div>
        </div>
      ),
    },
  ];

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content onboarding-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        {/* Header con botón de omitir y cerrar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--primary)',
              background: 'var(--primary-light)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {step.badge}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="onboarding-skip-btn"
              onClick={handleSkip}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Saltar tutorial
            </button>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Cerrar modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Indicadores de progreso (Pill dots) */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {steps.map((s, idx) => (
            <div
              key={s.id}
              onClick={() => setCurrentStep(idx)}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background:
                  idx === currentStep
                    ? 'var(--primary)'
                    : idx < currentStep
                    ? 'rgba(16, 185, 129, 0.4)'
                    : 'var(--border-strong)',
                cursor: 'pointer',
                transition: 'background var(--transition-fast)',
              }}
            />
          ))}
        </div>

        {/* Icono y Título del Paso */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingTop: '4px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {step.icon}
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              {step.title}
            </h2>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {step.subtitle}
            </div>
          </div>
        </div>

        {/* Cuerpo del paso */}
        <div
          style={{
            minHeight: '170px',
            fontSize: '0.9rem',
            color: 'var(--text-primary)',
            lineHeight: 1.55,
          }}
        >
          {step.body}
        </div>

        {/* Botones de Navegación */}
        <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
          {currentStep > 0 && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handlePrev}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px' }}
            >
              <ArrowLeft size={16} />
              <span>Anterior</span>
            </button>
          )}

          <button
            type="button"
            className="btn-primary"
            onClick={handleNext}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 20px',
              fontWeight: 700,
            }}
          >
            {isLast ? (
              <>
                <Check size={18} strokeWidth={2.5} />
                <span>Comenzar a usar la app</span>
              </>
            ) : (
              <>
                <span>Siguiente</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
