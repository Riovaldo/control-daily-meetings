# Daily Raffle - Aplicación de Sorteo

Esta es una aplicación web desarrollada en **Angular 17+** utilizando **Standalone Components** para administrar el sorteo de responsables de dirigir la daily del equipo.

## Características

- **Sorteo Automático**: Genera planificación para los próximos 2 meses.
- **Bloques de 3 Días**: Asignación automática en bloques de 3 días hábiles consecutivos (lunes a viernes).
- **Stateless & Sincronizado**: No utiliza backend. El calendario se calcula de forma determinística usando una semilla basada en la fecha actual, lo que garantiza que todos los usuarios vean el mismo resultado.
- **Restricción de Sorteo**: El botón de sorteo solo se habilita cuando faltan 2 días hábiles o menos para terminar el último turno.
- **Persistencia**: Los resultados se guardan en `localStorage` bajo la clave `daily-schedule`.
- **UI Moderna**: Diseñada con Angular Material, tema oscuro, glassmorphism y animaciones fluidas.

## Requisitos Previos

- Node.js (v18 o superior recomendado)
- npm

## Instalación

1. Clona o descarga este repositorio.
2. Abre una terminal en la carpeta del proyecto.
3. Instala las dependencias:
   ```bash
   npm install
   ```

## Ejecución

Para iniciar el servidor de desarrollo, ejecuta:
```bash
npm run dev
```
O si prefieres usar el CLI de Angular directamente:
```bash
npx ng serve
```

La aplicación estará disponible en `http://localhost:4200`.

## Configuración de inicio de sorteo

Para modificar la fecha de inicio de sorteo, edita el archivo `src/assets/team-config.json`. La aplicación cargará los cambios automáticamente en tiempo de ejecución.

```json
{
   "startDate": "2026-001-01"
}
```

## Configuración del Equipo

Para modificar los integrantes del equipo, edita el archivo `src/assets/team-config.json`. La aplicación cargará los cambios automáticamente en tiempo de ejecución.

```json
{
  "members": ["Ana García", "Carlos López", "María Torres", "Juan Pérez", "Sofía Ramírez", "Diego Martín"]
}
```

## Configuración de feriados

Para modificar los feriados, edita el archivo `src/assets/team-config.json`. La aplicación cargará los cambios automáticamente en tiempo de ejecución.

```json
{
  "holidays": ["2026-01-01", "2026-05-01", "2026-12-08", "2026-12-25"]
}
```

## Tecnologías Utilizadas

- **Angular 17**: Standalone Components & Signals.
- **Angular Material**: Componentes de UI.
- **date-fns**: Manipulación de fechas y lógica de días hábiles.
- **seedrandom**: Generación de aleatoriedad determinística.
- **TypeScript**: Tipado estricto.
- **SCSS**: Estilos personalizados con variables CSS y glassmorphism.
