import type { Content } from 'pdfmake/interfaces'

/**
 * Builds the page footer rendered on every page of a monthly project report.
 *
 * Designed to be used as the `footer` callback of a `TDocumentDefinitions`:
 *
 * ```ts
 * const docDefinition: TDocumentDefinitions = {
 *   footer: (currentPage, pageCount) =>
 *     buildPageFooter(currentPage, pageCount, input.project.name),
 * }
 * ```
 *
 * The footer renders the project name on the left and a `Página X de Y`
 * counter on the right.
 */
export function buildPageFooter(currentPage: number, pageCount: number, projectName: string): Content {
  return {
    margin: [40, 10, 40, 20],
    columns: [
      {
        text: projectName,
        alignment: 'left',
        fontSize: 9,
        color: '#5f6368',
      },
      {
        text: `Página ${currentPage} de ${pageCount}`,
        alignment: 'right',
        fontSize: 9,
        color: '#5f6368',
      },
    ],
  }
}
