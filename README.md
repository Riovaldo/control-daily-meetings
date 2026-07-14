# Control Daily Meetings

Aplicación web en **Angular 17+** con Standalone Components para gestionar la rotación de responsables de la daily del equipo de forma determinística y sincronizada.

## Características

- **100% Stateless**: No utiliza backend ni base de datos. El calendario se calcula matemáticamente al cargar la página, garantizando que todos los integrantes vean exactamente el mismo resultado.
- **Bloques de 3 Días Hábiles**: Los turnos se asignan en bloques de 3 días hábiles consecutivos (lunes a viernes, excluyendo feriados).
- **Horizonte de 3 Meses**: Siempre muestra los próximos 3 meses de calendario desde el día actual.
- **Sistema de Períodos**: Soporta cambios en el equipo (altas/bajas) conservando el historial pasado intacto.
- **Feriados Configurables**: Los días festivos se excluyen automáticamente de la asignación.
- **Auto-scroll**: Al cargar, la vista se posiciona automáticamente en el turno activo del día.
- **UI Moderna**: Angular Material, tema oscuro, glassmorphism y animaciones fluidas.

## Requisitos Previos

- Node.js (v18 o superior)
- npm

## Instalación

```bash
npm install
```

## Ejecución local

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:4200`.

## Despliegue en Vercel

Hacer `git push` es suficiente. Vercel detecta los cambios y despliega automáticamente. No es necesario compilar manualmente.

---

## Configuración (`src/assets/team-config.json`)

Toda la configuración vive en un único archivo JSON. **No es necesario recompilar** para aplicar cambios: basta con hacer `git push` y los usuarios que refresquen la página verán los datos actualizados.

### Estructura completa

```json
{
  "periods": [
    {
      "startDate": "2026-05-13",
      "members": [
        "Laura Mendez",
        "Carlos Ríos",
        "Sofia Paredes",
        "Andrés Molina",
        "Valentina Cruz",
        "Diego Herrera",
        "Camila Torres",
        "Martín López"
      ]
    }
  ],
  "holidays": [
    "2026-01-01",
    "2026-05-01",
    "2026-12-08",
    "2026-12-25"
  ]
}
```

### Campos

| Campo | Descripción |
|---|---|
| `periods` | Lista de períodos del equipo. Debe tener al menos uno. |
| `periods[].startDate` | Fecha de inicio del período en formato `YYYY-MM-DD`. El primer período define el ancla del calendario. |
| `periods[].members` | Lista de nombres de los integrantes activos en ese período. |
| `holidays` | Lista de fechas feriadas en formato `YYYY-MM-DD`. Estos días se saltan en la asignación de turnos. |

---

## Gestión de cambios en el equipo

Cuando alguien entra o sale del equipo, **no modifiques el período existente**. En su lugar, agrega un nuevo período con la fecha del cambio y la lista actualizada:

```json
{
  "periods": [
    {
      "startDate": "2026-05-13",
      "members": ["Laura Mendez", "Carlos Ríos", "Sofia Paredes", "Andrés Molina"]
    },
    {
      "startDate": "2026-07-14",
      "members": ["Laura Mendez", "Carlos Ríos", "Sofia Paredes"]
    }
  ]
}
```

**¿Qué ocurre con el historial?**
- Los turnos anteriores al nuevo `startDate` se recalculan con la lista y semilla del período original → **el historial no cambia**.
- Los turnos a partir del nuevo `startDate` se calculan con la nueva lista → el cambio aplica solo hacia el futuro.

---

## Tecnologías

| Tecnología | Uso |
|---|---|
| Angular 17 | Framework principal (Standalone + Signals) |
| Angular Material | Componentes de UI |
| date-fns | Cálculo de días hábiles y formato de fechas |
| seedrandom | Aleatoriedad determinística por período |
| TypeScript | Tipado estricto |
| SCSS | Estilos con variables CSS y glassmorphism |
