export interface OnboardingStepMeta {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  highlight: string;
}

export const ONBOARDING_STEPS_DATA: OnboardingStepMeta[] = [
  {
    id: 'saldo-neto',
    badge: 'Paso 1 de 5',
    title: 'Saldo Neto Disponible',
    subtitle: 'Tu dinero real y libre',
    description: 'El Saldo Neto Disponible es el dinero real que tienes en tus manos y en tus cuentas de débito o efectivo en este momento.',
    highlight: 'Aquí no se suma el dinero que el banco te presta en tarjetas de crédito. Es el monto exacto con el que cuentas hoy para tus gastos sin endeudarte.',
  },
  {
    id: 'compra-vs-impacto',
    badge: 'Paso 2 de 5',
    title: 'Compra Normal vs. Impacto Directo',
    subtitle: 'Dos maneras inteligentes de usar tu tarjeta',
    description: 'En una compra normal con tarjeta el banco paga por ti hoy y acumulas deuda para pagarla en tu fecha límite. Con Impacto Directo se descuenta hoy mismo de tu débito o efectivo como si fuera de contado, ideal para ganar puntos sin dejar deudas acumuladas.',
    highlight: 'Elige compra normal si pagarás al corte; elige Impacto Directo si tienes el dinero listo y prefieres no dejar deudas pendientes para fin de mes.',
  },
  {
    id: 'msi',
    badge: 'Paso 3 de 5',
    title: 'Meses Sin Intereses (MSI)',
    subtitle: 'Divide compras grandes sin pagar de más',
    description: 'Las compras a Meses Sin Intereses (MSI) te permiten diferir una compra en cuotas mensuales fijas sin comisiones extra.',
    highlight: 'En cada fecha de corte de tu tarjeta, solo se cobra la cuota correspondiente a ese mes, protegiendo tu liquidez.',
  },
  {
    id: 'cashback',
    badge: 'Paso 4 de 5',
    title: 'Recompensas y Cashback',
    subtitle: 'El dinero que tu tarjeta te devuelve',
    description: 'Saldo a Favor se aplica directo a tu tarjeta para bajar lo que le debes al banco. Efectivo Pendiente se guarda como recompensa lista para transferirse a tu cuenta bancaria cuando quieras.',
    highlight: 'Tú decides si quieres abonarlo a tu tarjeta o cobrarlo en tu cuenta de banco.',
  },
  {
    id: 'prestamos',
    badge: 'Paso 5 de 5',
    title: 'Préstamos a Terceros',
    subtitle: 'Control total de lo que te deben',
    description: 'Cuando le prestas dinero a un amigo, familiar o conocido, el dinero sale de tu saldo disponible hoy, pero la aplicación recuerda que ese dinero sigue siendo tuyo.',
    highlight: 'Conforme te vayan pagando en un solo pago o en abonos, ese dinero regresa automáticamente a tu saldo disponible.',
  },
];
