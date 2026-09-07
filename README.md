# Gestor de Finanzas Personales (MVP v1)

Una aplicación web progresiva (PWA) de finanzas personales, rápida, minimalista y con diseño premium dark-mode. Diseñada para un solo usuario, con **almacenamiento 100% local en el dispositivo** mediante IndexedDB (Dexie.js), sin servidores externos, sin tracking y con funcionamiento sin conexión (*offline-first*).

---

## Características Principales

### 1. Transacciones y Flujo de Caja (Módulo 1)
- **Múltiples Cuentas:** Soporte para cuentas de débito, efectivo y ahorro con saldos independientes.
- **Categorías Jerárquicas:** Categorías de ingresos y gastos con subcategorías y colores distintivos.
- **Clasificación Financiera:** Distinción clara entre gastos **fijos** y **variables**.
- **Cálculo de Liquidez Neta en Tiempo Real:** Algoritmo financiero auditado que excluye registros cancelados (*soft delete*) y transferencias entre cuentas para evitar duplicidad.
- **Motor de Transacciones Recurrentes:** Programación de gastos fijos (mensual, quincenal, semanal) con generación y puesta al día (*catch-up*) automática.

### 2. Tarjetas de Crédito y Meses Sin Intereses (MSI) (Módulo 2)
- **Control de Línea de Crédito:** Límite, ocupación actual, saldo adeudado y crédito disponible.
- **Compras Directas vs. Pasivo (`directImpact`):**
  - Si una compra con tarjeta se marca con impacto directo, se descuenta de inmediato de la cuenta de débito/efectivo seleccionada y **no genera pasivo en la tarjeta**, evitando duplicar el descuento al pagar el corte.
  - Si no tiene impacto directo, se acumula en el pasivo de la tarjeta y se descuenta de liquidez solo cuando se registra el abono/pago de la tarjeta.
- **Motor de MSI con Ajuste Exacto de Centavos:**
  - Distribuye el importe en $N$ cuotas mensuales exactas.
  - Ajusta el residuo de centavos en la última cuota para garantizar que la suma de cuotas coincida al centavo con el importe original.
  - Generación de cuotas por fecha de corte y cancelación anticipada segura sin corromper transacciones pasadas.
- **Gestión de Cashback:** Registro con destino a saldo a favor en la tarjeta (`CARD_BALANCE`) o pendiente de recibir en efectivo/cuenta (`CASH_PENDING`).

### 3. Cuentas por Cobrar / Deudas (Módulo 3)
- **Registro de Préstamos:** Al registrar un préstamo otorgado a un tercero, se deduce de inmediato de la liquidez de la cuenta origen (`LOAN_DISBURSEMENT`).
- **Amortizaciones Parciales y Totales:** Cada abono recibido incrementa la liquidez de la cuenta destino y reduce el saldo pendiente de la deuda (`DEBT_REPAYMENT`).
- **Protección contra Sobrepago:** Validación estricta que bloquea abonos mayores al saldo adeudado actual y botón de "Liquidar Total".
- **Cancelación Segura:** Permite anular préstamos revirtiendo el impacto según la política de transacciones.

### 4. Persistencia, Sincronización y Respaldo (Módulo 4)
- **100% Local (IndexedDB + Dexie.js):** Toda la información reside en tu navegador, garantizando privacidad absoluta.
- **Sincronización Automática al Abrir:** Al iniciar la app se procesan en lote las reglas recurrentes vencidas y las cuotas de MSI correspondientes a la fecha actual.
- **Exportación en JSON:** Descarga una copia de seguridad completa (100% de tablas, relaciones y preferencia de moneda) con un solo clic.
- **Restauración Segura:** Importa un archivo `.json` previo con validación de estructura y modal de advertencia/confirmación explícita para evitar pérdidas accidentales.

---

## Pila Tecnológica

- **Frontend:** React 19 + TypeScript + Vite.
- **Estilos:** Vanilla CSS modular con variables de diseño, glassmorphism, tipografía moderna y micro-animaciones (sin TailwindCSS).
- **Persistencia:** Dexie.js (`IndexedDB`) + `dexie-react-hooks`. Preferencias ligeras en `localStorage`.
- **PWA:** `vite-plugin-pwa` con Workbox y Web App Manifest para instalación offline en móviles y escritorio.
- **Iconos:** Lucide React.
- **Testing:** Vitest + `fake-indexeddb` con 40 pruebas unitarias y de integración end-to-end.
- **Linter:** Oxlint (0 advertencias, 0 errores).

---

## Guía de Ejecución Local

### Prerrequisitos
- [Node.js](https://nodejs.org/) v18 o superior.
- Gestor de paquetes `npm` (incluido con Node.js).

### 1. Clonar o descargar el repositorio
Navega a la carpeta del proyecto en tu terminal:
```bash
cd Gestor_de_Finanzas
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Iniciar el servidor de desarrollo
```bash
npm run dev
```
Abre tu navegador en [http://localhost:5173/](http://localhost:5173/).

### 4. Ejecutar la suite de pruebas automatizadas
```bash
npm test
# o para una sola ejecución con reporte detallado:
npx vitest run
```

### 5. Verificar sintaxis y linter
```bash
npm run lint
```

### 6. Compilar para producción (Bundle PWA)
```bash
npm run build
```
Los archivos optimizados y el service worker se generarán en la carpeta `dist/`.

---

## Guía de Despliegue en Vercel (Sin Fricción)

Dado que la aplicación es 100% estática y almacena los datos en el navegador del usuario (IndexedDB), el despliegue en [Vercel](https://vercel.com/) toma menos de 2 minutos y no requiere configurar bases de datos remotas ni variables de entorno.

### Opción A: Desde la interfaz web de Vercel (Recomendada)
1. Sube tu código a un repositorio en **GitHub**, **GitLab** o **Bitbucket**.
2. Inicia sesión en [Vercel](https://vercel.com/).
3. Haz clic en **"Add New..."** > **"Project"**.
4. Importa tu repositorio `Gestor_de_Finanzas`.
5. Vercel detectará automáticamente **Vite**:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
6. Haz clic en **"Deploy"**.
7. ¡Listo! Vercel te proporcionará una URL pública con HTTPS (por ejemplo `https://tu-gestor.vercel.app`), indispensable para que el Service Worker y la instalación PWA funcionen correctamente.

### Opción B: Mediante Vercel CLI
```bash
# Instalar Vercel CLI globalmente si no lo tienes
npm i -g vercel

# Iniciar sesión y desplegar
vercel
```
Acepta los valores predeterminados y tu sitio estará en producción de inmediato.

---

## Guía No Técnica para Instalar la PWA en Android Chrome

Puedes usar esta aplicación como si fuera una app nativa instalada desde Google Play Store en tu teléfono Android, con icono propio, pantalla completa y funcionando sin conexión a internet:

1. **Abre Chrome en tu celular:**
   - Entra a la dirección web de tu aplicación (por ejemplo la URL de Vercel con `https://`).
2. **Abre el menú de opciones:**
   - Toca el botón de los **tres puntos verticales (⋮)** ubicado en la esquina superior derecha del navegador.
3. **Selecciona la opción de instalación:**
   - Busca y presiona la opción **"Agregar a la pantalla principal"** o **"Instalar aplicación"**.
4. **Confirma la instalación:**
   - Verás una ventana con el nombre **"Finanzas Personales"** y el icono de la aplicación.
   - Toca el botón **"Instalar"** o **"Agregar"**.
5. **¡Listo!**
   - En unos segundos, el icono de la aplicación aparecerá en la pantalla de inicio y en tu lista de aplicaciones de tu teléfono.
   - Al abrirla, la app se iniciará a pantalla completa (sin la barra de direcciones del navegador) y podrás registrar tus transacciones incluso si estás en modo avión o sin señal.

---

## Puntos de Extensión Futuros (Fase 2)

La arquitectura del sistema fue diseñada con desacoplamiento modular para permitir incorporar fácilmente las siguientes características en fases posteriores:

1. **Inversiones a Rendimiento Fijo:** Modelo de cuenta preparado con banderas de capital bloqueado (*locked capital*), fecha de vencimiento y generación de transacción automática por liquidación de rendimientos.
2. **Presupuestos por Categoría:** Estructura en el modelo `Category` para fijar límites mensuales de gasto con alertas de porcentaje consumido.
3. **Soporte Multimoneda & Conversión:** Capa centralizada en `useCurrency` y campo de tipo de cambio en `Transaction` para consolidar carteras internacionales.
4. **Sincronización en la Nube:** Adaptador de sincronización bidireccional sobre Dexie (por ejemplo Dexie Cloud, Supabase o Firebase) sin reescribir la lógica de cálculo local.

---

## Licencia

Desarrollado para uso personal. Código libre bajo licencia MIT.
