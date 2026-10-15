# Plan de Implementación: Skill de Agente para Extracción OCR y Validación de Facturas

## 1. Visión y Propósito de la Skill
Crear una skill canónica en el proyecto (`skills/project_skills/invoice_ocr_validation/SKILL.md`) que instruya y guíe a cualquier agente autónomo o ingeniero en:
1. **Pipeline de Ingesta Multimodal con Gemini:** Reglas de extracción estructurada JSON de facturas y tickets (PDF, escaneos, imágenes y capturas webcam) utilizando el SDK `@google/genai` con esquemas estrictos (`responseMimeType: 'application/json'`).
2. **Validación Contable y Cuadre Fiscal Español:** Verificación automática de la identidad matemática `Total = Base + IVA + RE - IRPF`, tolerancia de $\pm 0.02\ \text{€}$, gestión de múltiples tipos de IVA en el mismo documento y cálculo de recargo de equivalencia.
3. **Control Anti-Duplicidades y Detección de Anomalías:** Algoritmos de cotejo por NIF emisor, número de factura y hash documental.
4. **Desglose Granular de Líneas de Compra:** Normalización de unidades de medida (`kg`, `litro`, `ud`, `caja`), precios unitarios netos y asignación automática de categoría de gasto.

---

## 2. Arquitectura de Archivos de la Skill

```text
skills/
└── project_skills/
    └── invoice_ocr_validation/
        ├── SKILL.md                               # Guía principal de instrucciones, workflows y directrices
        ├── references/
        │   ├── spanish_tax_reconciliation.md     # Fórmulas de liquidación, tipos de IVA/IGIC/IPSI y RE
        │   └── edge_cases_and_recovery.md        # Protocolos ante imágenes borrosas, giros o campos ausentes
        └── examples/
            ├── prompt_schema_gemini.json          # Esquema JSON canónico de inferencia de Gemini
            └── sample_extracted_invoice.json      # Ejemplo de factura completamente normalizada
```

---

## 3. Fases de Ejecución

### Fase 1: Creación del SKILL.md Principal
- Redactar `SKILL.md` con frontmatter YAML estándar (`name`, `description`).
- Definir el ciclo de vida de procesamiento:
  - Paso 1: Normalización de payload (MIME type, Base64, sanitización).
  - Paso 2: Ejecución de prompt multimodal en Gemini con esquema de salida estricto.
  - Paso 3: Validación matemática contable y cálculo de discrepancias.
  - Paso 4: Detección heurística de facturas duplicadas.
  - Paso 5: Persistencia transaccional en MySQL/MariaDB y sincronización con Sheets.

### Fase 2: Documentación de Referencia y Reglas de Negocio
- Crear `references/spanish_tax_reconciliation.md` con la tabla oficial de tramos de IVA (21%, 10%, 4%, 0%), Recargo de Equivalencia (5.2%, 1.4%, 0.5%) y retenciones IRPF (15%, 7%, 19%).
- Crear `references/edge_cases_and_recovery.md` con pautas para fotos giradas, tickets manuscritos, fechas de vencimiento ausentes y facturas multidivisa o rectificativas.

### Fase 3: Ejemplos Estructurados
- Generar `examples/prompt_schema_gemini.json` con la definición JSON Schema utilizada por el backend en `/api/gemini/extract-invoice`.
- Generar `examples/sample_extracted_invoice.json` con una factura de prueba que cubra desglose multilínea y varios tipos impositivos.

### Fase 4: Integración en AGENTS.md
- Actualizar `AGENTS.md` (y su réplica en `/Documentos/AGENTS.md`) para registrar formalmente la nueva skill en el índice de herramientas y capacidades del proyecto.

---

## 4. Criterios de Aprobación y Verificación
- Formato Markdown compatible con el cargador de skills del sistema.
- Validación de que los esquemas JSON sean 100% compatibles con la API de `/api/gemini/extract-invoice` en `server.ts` y las interfaces de `src/types.ts`.
- Ejecución de `compile_applet` y `lint_applet` para confirmar la integridad del repositorio.
