/**
 * Compresión de imágenes del lado del navegador usando APIs nativas
 * (canvas + createImageBitmap). Sin dependencias externas.
 *
 * - Solo actúa sobre imágenes (JPEG, PNG, WebP, HEIC, etc.).
 * - PDFs y cualquier otro tipo de archivo se devuelven sin modificar.
 * - Si la compresión falla por cualquier razón, se devuelve el archivo original
 *   para no bloquear la subida.
 *
 * Parámetros por defecto:
 *   maxSide  – lado máximo (ancho o alto) en píxeles: 1600
 *   quality  – calidad JPEG de salida: 0.75
 */

const DEFAULT_MAX_SIDE = 1600
const DEFAULT_QUALITY = 0.75

/**
 * Comprime una imagen usando canvas nativo.
 * Si el archivo no es imagen, o la compresión no reduce el tamaño, devuelve el original.
 */
export async function compressImageFile(
  file: File,
  maxSide: number = DEFAULT_MAX_SIDE,
  quality: number = DEFAULT_QUALITY,
): Promise<File> {
  // Solo procesamos imágenes. PDFs y otros tipos pasan sin cambios.
  if (!file.type.startsWith('image/')) return file

  try {
    // createImageBitmap soporta JPEG, PNG, WebP, GIF, BMP, AVIF, HEIC (en navegadores modernos)
    const bitmap = await createImageBitmap(file)

    const { width: origW, height: origH } = bitmap

    // Calcular nuevas dimensiones respetando el aspect ratio
    let newW = origW
    let newH = origH
    if (origW > maxSide || origH > maxSide) {
      if (origW >= origH) {
        newW = maxSide
        newH = Math.round((origH / origW) * maxSide)
      } else {
        newH = maxSide
        newW = Math.round((origW / origH) * maxSide)
      }
    }

    const canvas = document.createElement('canvas')
    canvas.width = newW
    canvas.height = newH

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }

    ctx.drawImage(bitmap, 0, 0, newW, newH)
    bitmap.close()

    // Convertir a Blob JPEG comprimido
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality)
    })

    if (!blob) return file

    // Si la compresión no reduce el tamaño, devolver el original
    if (blob.size >= file.size) return file

    // Preservar el nombre original pero con extensión .jpg
    const baseName = file.name.replace(/\.[^.]+$/, '')
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    // Si algo falla (formato no soportado, canvas bloqueado, etc.), subir el original
    return file
  }
}
