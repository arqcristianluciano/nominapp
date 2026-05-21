# Lighthouse Targets - NominaAPP PWA

## 1. Objetivos de Puntuación Lighthouse

La aplicación debe alcanzar los siguientes scores en Lighthouse v12+:

| Categoría | Target | Estado Esperado |
|-----------|--------|-----------------|
| **Performance** | >90 | ⚠️ Por optimizar |
| **Accessibility** | >90 | ✅ Bueno (85+) |
| **Best Practices** | >90 | ✅ Bueno |
| **SEO** | >90 | ⚠️ Por mejorar |
| **PWA** | >90 | ✅ Presente |

---

## 2. Checklist PWA - Items Requeridos

### ✅ CUMPLIDO

- [x] **HTTPS**: Deployado en Vercel con HTTPS obligatorio
- [x] **Manifest válido** (`/manifest.json`): Present con name, short_name, display, icons, theme_color
- [x] **Service Worker registrado**: Registrado en `/public/sw.js`, estrategias de cache implementadas
- [x] **Icons en tamaños correctos**: 
  - 192x192 PNG (favicon.png)
  - 512x512 PNG (icon-512.png)
  - 512x512 maskable PNG (icon-maskable-512.png)
  - SVG (favicon.svg)
- [x] **theme-color**: Definido en `manifest.json` (#1e40af) y en meta tags dinámicos
- [x] **Viewport correcto**: `viewport-fit=cover` para notch devices
- [x] **Display standalone**: Configurado en manifest
- [x] **Apple touch icons**: Definidos para iOS
- [x] **Offline page**: `/offline.html` implementada con UX clara
- [x] **Start URL**: `/` configurada correctamente

---

## 3. Hallazgos Comunes NO Cumplidos

### 🔴 SEO (Priority: Alta)

1. **robots.txt NO EXISTE**
   - **Archivo**: No existe en `/public/robots.txt`
   - **Impacto**: Los buscadores no tienen directivas de crawl
   - **Recomendación**: Crear `robots.txt` con:
     ```
     User-agent: *
     Allow: /
     Disallow: /admin
     Sitemap: https://nominaapp.com/sitemap.xml
     ```

2. **sitemap.xml NO EXISTE**
   - **Archivo**: No existe en `/public/`
   - **Impacto**: Google no puede descubrir todas las rutas de la SPA
   - **Recomendación**: Generar automáticamente durante build o mantener estático con rutas principales

3. **Open Graph meta tags FALTANTES**
   - **Ubicación**: `index.html`
   - **Faltantes**: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
   - **Impacto**: Compartir en redes sociales con preview vacío
   - **Nota**: Solo hay `description` estática; no hay tags dinámicos por ruta

4. **Twitter Card meta tags FALTANTES**
   - **Faltantes**: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
   - **Impacto**: Preview incorrecto al compartir en Twitter

5. **Canonical tag FALTANTE**
   - **Ubicación**: No existe en `index.html`
   - **Impacto**: Posibles problemas de duplicate content (aunque SPA mitiga esto)
   - **Recomendación**: Implementar dinámicamente con React Router

### ⚠️ Performance (Priority: Alta)

6. **NO hay preconnect a Supabase**
   - **Ubicación**: `index.html` línea 13 (manifest link)
   - **Faltantes**: `<link rel="preconnect" href="https://<project>.supabase.co">`
   - **Impacto**: Latencia inicial en llamadas API
   - **Lighthouse Impact**: -3 a -5 puntos en Performance

7. **NO hay dns-prefetch ni prefetch**
   - **Faltantes**: Pre-carga de dominios de terceros (Sentry, CDNs)
   - **Impacto**: Menor, pero afecta métricas de red

8. **Lazy loading NO implementado globalmente**
   - **Status**: Route-based lazy loading implementado (React.lazy + Suspense ✅)
   - **Faltante**: Image lazy loading (`loading="lazy"`) en componentes
   - **Ubicación**: Componentes con imágenes sin atributo `loading`
   - **Impacto**: Carga innecesaria de imágenes offscreen

9. **NO hay optimización de imágenes**
   - **Status**: Solo 3 PNG + 1 SVG en `/public/`
   - **Faltante**: No usar formato modern (WebP, AVIF) con fallbacks
   - **Impacto**: Tamaño de bundle más grande (192, 512, maskable 512 son 5.9 KB total, aceptable)

### 🟡 Best Practices (Priority: Media)

10. **Web Vitals NO monitoreados**
    - **Faltante**: No hay integración de `web-vitals` package
    - **Ubicación**: `src/main.tsx` (Sentry inicializado pero sin CWV tracking específico)
    - **Impacto**: No se reportan LCP, FID, CLS a Sentry
    - **Recomendación**: Integrar `@vitejs/plugin-web-vitals` o `web-vitals` library

11. **Security headers INCOMPLETOS**
    - **Ubicación**: `vercel.json` solo tiene Cache-Control
    - **Faltantes**:
      - `X-Content-Type-Options: nosniff`
      - `X-Frame-Options: DENY` o `SAMEORIGIN`
      - `X-XSS-Protection: 1; mode=block`
      - `Referrer-Policy: strict-origin-when-cross-origin`
      - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
    - **Impacto**: -3 a -5 puntos en Best Practices

12. **Vite source maps en producción**
    - **Ubicación**: `vite.config.ts` línea 26: `sourcemap: 'hidden'`
    - **Status**: ✅ Correcto (hidden evita exposición)
    - **Recomendación**: Mantener así; monitorear con Sentry

### 🟢 Accessibility (Priority: Media)

13. **Buena cobertura de ARIA**
    - **Status**: 85+ líneas con `aria-*`, `role=`, `tabindex`
    - **Hallazgo**: Offline page tiene `role="alert"` ✅
    - **Faltante menor**: Revisar focus management en modales y drawers

14. **HTML semántico CORRECTO**
    - **Status**: No hay `<div role="button">` ni divs con onclick
    - **Status**: ✅ Uso correcto de `<button>`, `<a>`

### 🟢 PWA (Priority: Baja)

15. **Service Worker BIEN implementado**
    - **Status**: ✅ Precache, network-first, stale-while-revalidate, offline fallback
    - **Strategies**: Optimizadas por tipo de contenido
    - **Faltante menor**: No hay Background Sync para queue offline (aunque está el listener)

---

## 4. Plan de Acción Priorizado

### FASE 1: SEO (3-4 horas)
1. Crear `/public/robots.txt`
2. Generar `/public/sitemap.xml` (rutas estáticas)
3. Agregar Open Graph meta tags dinámicos a `index.html`
4. Agregar Twitter Card meta tags
5. Implementar canonical dinámico (React Router integration)

### FASE 2: Performance (2-3 horas)
1. Agregar `preconnect` a Supabase en `index.html`
2. Auditar y agregar `loading="lazy"` a imágenes
3. Implementar Web Vitals tracking (Sentry integration)
4. Revisar bundle size con `npm run build --report` (si hay plugin)

### FASE 3: Security Headers (1-2 horas)
1. Actualizar `vercel.json` con security headers completos
2. Revisar y actualizar CORS en Supabase
3. Configurar Content Security Policy (CSP)

### FASE 4: Validación Final (1 hora)
1. Ejecutar Lighthouse en modo SPA
2. Validar manifest con: https://www.pwabuilder.com/
3. Revisar Core Web Vitals en PageSpeed Insights

---

## 5. Recursos de Validación

- **Lighthouse**: Chrome DevTools (F12 → Lighthouse tab)
- **PWA Builder**: https://www.pwabuilder.com/
- **Mobile-Friendly Test**: https://search.google.com/test/mobile-friendly
- **Core Web Vitals**: https://pagespeed.web.dev/
- **Accessibility Audit**: https://www.achecker.ca/

---

## 6. Notas Técnicas

- **Framework**: Vite + React 19 (SPA)
- **Styling**: Tailwind CSS 4 + dark mode
- **Routing**: React Router v7 con code splitting
- **Error Tracking**: Sentry (integrado)
- **Backend**: Supabase (Auth + DB + Functions)
- **Deployment**: Vercel (HTTPS, auto-scaling)
- **HTTPS**: ✅ Obligatorio en Vercel
- **Compression**: ✅ Gzip automático en Vercel

---

**Última actualización**: 2026-05-21  
**Estado**: 🔴 5/7 hallazgos principales por corregir
