const BASE_URL = (process.env.HEALTHCHECK_URL || 'https://nominapp-rd.vercel.app').replace(/\/$/, '')
const REQUIRED_ROUTES = ['/', '/projects', '/proyectos']
const MAX_ASSETS_TO_VALIDATE = 10

function ensure(condition, message) {
  if (!condition) throw new Error(message)
}

async function fetchPage(pathname) {
  const url = `${BASE_URL}${pathname}`
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'nominaapp-healthcheck/1.0' },
  })
  const body = await response.text()
  return { url, finalUrl: response.url, response, body }
}

function extractJsAssets(html) {
  const assets = new Set()
  const pattern = /(?:src|href)="(\/assets\/[^"]+\.js)"/g

  for (const match of html.matchAll(pattern)) {
    assets.add(match[1])
    if (assets.size >= MAX_ASSETS_TO_VALIDATE) break
  }

  return [...assets]
}

function hasHtmlShellMarkers(html) {
  return html.includes('<div id="root"></div>') || html.includes('<div id="root">')
}

async function validateRootAndAssets() {
  const root = await fetchPage('/')
  ensure(root.response.ok, `La ruta / no respondió OK (${root.response.status})`)
  ensure(hasHtmlShellMarkers(root.body), 'La ruta / no incluye el contenedor #root')

  const assets = extractJsAssets(root.body)
  ensure(assets.length > 0, 'No se encontraron assets JS en el HTML principal')

  console.log(`Assets JS detectados: ${assets.length}`)

  for (const assetPath of assets) {
    const assetUrl = `${BASE_URL}${assetPath}`
    const assetResponse = await fetch(assetUrl, {
      redirect: 'follow',
      headers: { 'user-agent': 'nominaapp-healthcheck/1.0' },
    })
    const contentType = assetResponse.headers.get('content-type') || ''
    const preview = (await assetResponse.text()).slice(0, 80).toLowerCase()

    ensure(assetResponse.ok, `Asset no disponible: ${assetPath} (${assetResponse.status})`)
    ensure(
      contentType.includes('javascript'),
      `MIME inválido en ${assetPath}: "${contentType || 'sin content-type'}"`,
    )
    ensure(!preview.includes('<!doctype html') && !preview.includes('<html'), `Asset devuelve HTML: ${assetPath}`)

    console.log(`Asset OK: ${assetPath} (${contentType})`)
  }
}

async function validateCriticalRoutes() {
  for (const route of REQUIRED_ROUTES) {
    const page = await fetchPage(route)
    ensure(page.response.ok, `La ruta ${route} falló con status ${page.response.status}`)
    ensure(hasHtmlShellMarkers(page.body), `La ruta ${route} no devolvió shell de app válida`)

    if (route === '/projects') {
      const endedInProjects = page.finalUrl.endsWith('/projects')
      const endedInSpanishProjects = page.finalUrl.endsWith('/proyectos')
      ensure(
        endedInProjects || endedInSpanishProjects,
        `/projects resolvió a URL inesperada: ${page.finalUrl}`,
      )
    }

    console.log(`Ruta OK: ${route} -> ${page.finalUrl}`)
  }
}

async function run() {
  console.log(`Iniciando health-check: ${BASE_URL}`)
  await validateRootAndAssets()
  await validateCriticalRoutes()
  console.log('Health-check de producción completado correctamente')
}

run().catch((error) => {
  console.error(`Health-check falló: ${error.message}`)
  process.exit(1)
})
