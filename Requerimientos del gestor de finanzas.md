## Documento de Especificación de Requerimientos: Gestor de Finanzas Personales

El presente documento consolida la visión, alcance funcional, reglas de negocio y restricciones técnicas para el desarrollo de una aplicación web/móvil enfocada en la administración contable y financiera personal de **Iván**.

---

### 1. Resumen Ejecutivo y Objetivo

Desarrollar una aplicación de finanzas personales visualmente atractiva, ligera e intuitiva, orientada principalmente a dispositivos móviles. El sistema operará como una solución de contabilidad personal local (sin servidor backend inicial) para registrar ingresos, egresos fijos y variables, controlar líneas de crédito, administrar deudas por cobrar y proyectar inversiones a tasa fija.

---

### 2. Módulos y Requerimientos Funcionales

#### 2.1. Gestión de Transacciones y Flujo de Caja

* **Libro diario:** Registro cronológico de ingresos y gastos clasificados por tipo (fijo o variable).
* **Categorización jerárquica:** Creación dinámica y personalizada de categorías y subcategorías con soporte para etiquetas (*tags*).
* **Cálculo de saldo neto:** Visualización en tiempo real de la liquidez total disponible basada en las cuentas de débito y efectivo.
* **Gastos fijos recurrentes:** Ejecución automática de cargos fijos programados según el período establecido (diario, semanal, quincenal, mensual).
* **Gestión de anulaciones:** Capacidad de cancelar o anular cualquier movimiento sin romper la integridad del historial.

#### 2.2. Tarjetas de Crédito y Financiamiento (MSI)

* **Diferenciación de liquidez:** Los consumos con Tarjeta de Crédito (TC) no descuentan liquidez inmediata del saldo en débito/efectivo, a menos que el usuario active la opción de impacto directo.
* **Meses Sin Intereses (MSI):** Al diferir una compra, el sistema proyecta y divide el total en $N$ cuotas automáticas, aplicándose cada una exactamente el día de corte configurado para la tarjeta.
* **Módulo "Pagar Tarjeta":** Función dedicada para registrar la liquidación del saldo de la tarjeta desde una cuenta de débito/efectivo. Este movimiento se procesa como una transferencia de fondos/amortización de pasivo para evitar la duplicación de gastos.
* **Tratamiento de Cashback:** Registro condicional de recompensas por compras, permitiendo catalogarlas como saldo a favor en la tarjeta o ingreso en efectivo pendiente de acreditación, identificando la fuente emisora.

#### 2.3. Control de Deudas (Cuentas por Cobrar)

* **Registro de préstamos:** La salida de dinero prestado a terceros se deduce inmediatamente del saldo neto disponible.
* **Submódulo de cobranza:** Panel centralizado para visualizar deudores y saldos pendientes.
* **Abonos parciales:** Capacidad de asociar ingresos directos a una deuda específica, recalculando y amortizando el saldo restante hasta su liquidación total.

#### 2.4. Inversiones a Rendimiento Fijo

* **Clasificación de liquidez:** Capacidad de etiquetar el capital invertido como "Capital bloqueado" (excluido del saldo disponible) o "Saldo disponible".
* **Liquidación de intereses:** Cálculo y acreditación automática del capital más los rendimientos devengados al vencer la fecha de plazo pactada.

#### 2.5. Presupuestos y Analítica

* **Topes por categoría:** Configuración de techos presupuestales mensuales con emisión de alertas visuales preventivas y de superación de límites.
* **Reportes periódicos:** Vistas analíticas con resúmenes diarios, semanales y mensuales, incorporando selector de período histórico y comparativas.
* **Exportación a hojas de cálculo:** Capacidad de generar y descargar reportes y listados completos de movimientos en formato Excel (`.xlsx`).

---

### 3. Arquitectura y Persistencia de Datos

| Componente | Definición Técnica y Regla Operativa |
| :---: | --- |
| **Almacenamiento** | Persistencia local (*LocalStorage* / *IndexedDB*) dentro del navegador del dispositivo. |
| **Sincronización en Apertura** | Al no existir servidor continuo, los cargos recurrentes, cuotas de MSI y vencimientos de inversión pendientes se procesan en lote al abrir la aplicación. |
| **Respaldo y Migración** | Módulo de importación y exportación de respaldos completos en formato estructurado (`.json`) para prevenir pérdida de datos por limpieza de caché. |
| **Importación de Datos** | Lector interno de plantillas predefinidas en `.csv` o `.xlsx` procesadas exclusivamente en el cliente (sin conexión a APIs bancarias externas). |
| **Diseño** | Interfaz adaptativa optimizada bajo el enfoque *Mobile-First*. |

---

### 4. Alcance del Proyecto

**Fuera del Alcance (Exclusiones Explícitas):**

* Registro o seguimiento de inversiones de renta variable (acciones, criptomonedas, ETFs sin tasa garantizada).
* Conexión directa mediante *Open Banking* o scraping a entidades bancarias reales.

**Fases Futuras (Fase 2):**

* Soporte multimoneda con conversión dinámica de tipos de cambio.
* Módulo de autenticación (usuarios y contraseñas) con persistencia en base de datos en la nube para sincronización multidispositivo.