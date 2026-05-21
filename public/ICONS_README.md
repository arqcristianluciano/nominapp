# PWA Icons — Placeholders

Los archivos `icon-192.png`, `icon-512.png` e `icon-maskable-512.png` en este directorio son **placeholders** generados programáticamente (cuadrados sólidos en color de marca `#1e40af`). Son PNGs válidos y permiten que el manifest pase auditorías de Lighthouse/PWA, pero **deberían reemplazarse** por iconos brandeados reales antes de publicar.

## Cómo regenerar los iconos a partir del `favicon.svg`

### Opción 1 — pwa-asset-generator (recomendado)

```bash
npx pwa-asset-generator public/favicon.svg public \
  --icon-only \
  --background "#1e40af" \
  --padding "10%" \
  --opaque true \
  --maskable true \
  --type png
```

### Opción 2 — sharp (programático)

```bash
npm i -D sharp
node -e "
const sharp = require('sharp');
const svg = require('fs').readFileSync('public/favicon.svg');
(async () => {
  await sharp(svg).resize(192, 192).png().toFile('public/icon-192.png');
  await sharp(svg).resize(512, 512).png().toFile('public/icon-512.png');
  // Maskable: añade padding del 10% para safe-zone
  await sharp(svg)
    .resize(410, 410)
    .extend({ top: 51, bottom: 51, left: 51, right: 51, background: '#1e40af' })
    .png()
    .toFile('public/icon-maskable-512.png');
})();
"
```

### Opción 3 — herramientas online

- https://maskable.app/editor (para el maskable)
- https://realfavicongenerator.net/ (suite completa)
- https://www.pwabuilder.com/imageGenerator

## Archivos esperados

| Archivo                      | Tamaño  | Propósito           |
| ---------------------------- | ------- | ------------------- |
| `favicon.svg`                | escala  | icono vectorial     |
| `icon-192.png`               | 192x192 | `purpose: any`      |
| `icon-512.png`               | 512x512 | `purpose: any`      |
| `icon-maskable-512.png`      | 512x512 | `purpose: maskable` |

Para el icono **maskable**, asegúrate de que el contenido principal quede dentro del 80% central (safe zone), ya que el sistema operativo puede recortarlo en círculo, squircle, etc.
