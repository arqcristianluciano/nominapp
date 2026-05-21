# NominaAPP

Sistema de administración de construcción para THE HOUSE & CO.

## Stack

- React 19 + TypeScript + Vite 8
- Tailwind CSS v4
- Supabase (PostgreSQL + Auth + RLS + Storage)
- Zustand (estado global)
- React Router v7
- PWA responsive

## Setup

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Ejecutar migraciones en Supabase SQL Editor:
# 1. supabase/migrations/001_schema.sql
# 2. supabase/seed.sql

# Iniciar desarrollo
npm run dev
```

## Estructura

```
src/
  components/     → UI y features
  pages/          → Páginas/rutas
  hooks/          → Lógica reutilizable
  services/       → Interacción con Supabase
  stores/         → Estado global (Zustand)
  types/          → Interfaces TypeScript
  utils/          → Funciones puras
  constants/      → Valores fijos
  lib/            → Config (Supabase, Router)
```

## Tests

```bash
npm test
```

## Deploy

Vercel automatico al push a main.

## Compatibilidad con estatePRO

Mismo stack, misma arquitectura, mismas convenciones. Diseñado para fusionarse en el futuro bajo un solo proyecto.
