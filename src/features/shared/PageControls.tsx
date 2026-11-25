import type { Locale } from './format-civil-date'

export function PageControls({
  label,
  page,
  count,
  onPage,
  locale,
}: {
  label: string
  page: number
  count: number
  onPage: (page: number) => void
  locale: Locale
}) {
  if (count <= 1) return null
  return (
    <div className="data-page-controls" role="group" aria-label={label}>
      <button className="secondary-button" type="button" disabled={page === 0} onClick={() => onPage(page - 1)}>
        {locale === 'en' ? 'Previous page' : 'Page précédente'}
      </button>
      <span role="status">{locale === 'en' ? `Page ${page + 1} of ${count}` : `Page ${page + 1} sur ${count}`}</span>
      <button className="secondary-button" type="button" disabled={page + 1 === count} onClick={() => onPage(page + 1)}>
        {locale === 'en' ? 'Next page' : 'Page suivante'}
      </button>
    </div>
  )
}
