import { CalendarDays, Home, Moon, Settings, Sun } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPeriodDataStore, DuplicatePeriodStartError } from './data/period-data-store'
import type { PeriodDataStore } from './data/period-data-store'
import { estimateNextPeriod } from './domain/forecast/estimate-next-period'
import type { AppSettings, CivilDate, Period } from './domain/periods'
import { PeriodCalendarView } from './features/calendar/PeriodCalendarView'
import { PeriodEntryView, type PeriodSaveError } from './features/periods/PeriodEntryView'
import { BackupSettingsView } from './features/settings/BackupSettingsView'

type View = 'home' | 'calendar' | 'settings'
type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'periodperiods-theme'

const views: Record<View, { label: string; title: string }> = {
  home: { label: 'Accueil', title: 'Suivi des règles et du cycle' },
  calendar: { label: 'Calendrier', title: 'Calendrier' },
  settings: { label: 'Réglages', title: 'Réglages' },
}

const defaultStore = createPeriodDataStore()

function getViewFromLocation(): View {
  if (typeof window === 'undefined') return 'home'
  const view = new URLSearchParams(window.location.search).get('view')
  return view === 'calendar' || view === 'settings' ? view : 'home'
}

function getStoredTheme(): Theme {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

type AppProps = {
  store?: PeriodDataStore
  today?: CivilDate
}

function getLocalCivilDate(date = new Date()): CivilDate {
  const year = date.getFullYear().toString().padStart(4, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

function App({ store = defaultStore, today = getLocalCivilDate() }: AppProps) {
  const [activeView, setActiveView] = useState<View>(getViewFromLocation)
  const [theme, setTheme] = useState<Theme>(getStoredTheme)
  const [periods, setPeriods] = useState<Period[] | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<PeriodSaveError | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousViewRef = useRef(activeView)

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#211f20' : '#f4f1e9')

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // The appearance still changes when local storage is unavailable.
    }
  }, [theme])

  useEffect(() => {
    let isCurrent = true

    Promise.all([store.getPeriods(), store.getSettings()])
      .then(([loadedPeriods, loadedSettings]) => {
        if (!isCurrent) return
        setPeriods(loadedPeriods)
        setSettings(loadedSettings)
      })
      .catch(() => {
        if (isCurrent) setLoadError(true)
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [loadAttempt, store])

  useEffect(() => {
    if (previousViewRef.current === activeView) return

    previousViewRef.current = activeView
    headingRef.current?.focus()
  }, [activeView])

  useEffect(() => {
    const handlePopState = () => setActiveView(getViewFromLocation())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigateToView = useCallback(
    (view: View) => {
      if (view === activeView) return

      const url = new URL(window.location.href)
      if (view === 'home') url.searchParams.delete('view')
      else url.searchParams.set('view', view)
      window.history.pushState({ view }, '', `${url.pathname}${url.search}${url.hash}`)
      setActiveView(view)
    },
    [activeView],
  )

  async function savePeriod(startDate: CivilDate) {
    setSaveMessage(null)
    setSaveError(null)

    if (startDate > today) {
      setSaveError({ message: 'La date ne peut pas être dans le futur.', invalidDate: true })
      return false
    }

    try {
      const saved = await store.addPeriod({ startDate })
      setPeriods((current) =>
        [...(current ?? []), saved].sort((left, right) => left.startDate.localeCompare(right.startDate)),
      )
      setSaveMessage('Date enregistrée sur cet appareil.')
      return true
    } catch (error) {
      setSaveError(
        error instanceof DuplicatePeriodStartError
          ? { message: 'Un début est déjà enregistré pour cette date.', invalidDate: true }
          : { message: 'L’enregistrement a échoué. Ta date est conservée; réessaie.', invalidDate: false },
      )
      return false
    }
  }

  async function savePeriodStarts(startDates: CivilDate[]): Promise<string | null> {
    if (startDates.some((date) => date > today)) {
      return 'Les dates futures ne peuvent pas être enregistrées. Aucune date n’a été ajoutée.'
    }

    try {
      const saved = await store.addPeriods(startDates.map((startDate) => ({ startDate })))
      setPeriods((current) =>
        [...(current ?? []), ...saved].sort((left, right) => left.startDate.localeCompare(right.startDate)),
      )
      return null
    } catch (error) {
      if (error instanceof DuplicatePeriodStartError) {
        return 'Au moins un de ces débuts est déjà enregistré. Aucune date n’a été ajoutée; vérifie la sélection.'
      }
      return 'L’enregistrement a échoué. Aucune date n’a été ajoutée; tes sélections sont conservées. Réessaie.'
    }
  }

  async function refreshImportedData() {
    const [loadedPeriods, loadedSettings] = await Promise.all([store.getPeriods(), store.getSettings()])
    setPeriods(loadedPeriods)
    setSettings(loadedSettings)
    setLoadError(false)
    setSaveMessage(null)
    setSaveError(null)
  }

  const isDataReady = periods !== null && settings !== null
  const estimate = isDataReady ? estimateNextPeriod(periods, today) : null
  const nextTheme = theme === 'light' ? 'dark' : 'light'
  const themeActionLabel = nextTheme === 'dark' ? 'Passer au thème sombre' : 'Passer au thème clair'

  function renderPageContent(view: View, isActive: boolean) {
    return (
      <>
        <div className="view-heading">
          <p className="eyebrow">{views[view].label}</p>
          <h1 ref={isActive ? headingRef : undefined} tabIndex={-1}>
            {views[view].title}
          </h1>
        </div>

        {isActive && isLoading && (
          <p className="data-state" role="status">
            Chargement de tes dates…
          </p>
        )}

        {isActive && !isLoading && loadError && (
          <section className="data-state data-state-error" aria-labelledby="load-error-title" role="alert">
            <h2 id="load-error-title">Impossible de charger tes dates.</h2>
            <p>L’application ne peut pas lire les données de cet appareil. Tu peux réessayer.</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setLoadError(false)
                setIsLoading(true)
                setLoadAttempt((attempt) => attempt + 1)
              }}
            >
              Réessayer
            </button>
          </section>
        )}

        {!isLoading && !loadError && periods !== null && settings !== null && view === 'home' && (
          <PeriodEntryView
            periods={periods}
            estimate={estimate!}
            today={today}
            firstDayOfWeek={settings.firstDayOfWeek}
            saveMessage={saveMessage}
            saveError={saveError}
            onClearSaveError={() => setSaveError(null)}
            onSave={savePeriod}
            onOpenCalendar={() => navigateToView('calendar')}
          />
        )}
        {!isLoading && !loadError && periods !== null && settings !== null && view === 'calendar' && (
          <PeriodCalendarView
            periods={periods}
            estimate={estimate!}
            firstDayOfWeek={settings.firstDayOfWeek}
            today={today}
            onSaveDates={savePeriodStarts}
          />
        )}
        {!isLoading && !loadError && periods !== null && settings !== null && view === 'settings' && (
          <BackupSettingsView store={store} onImported={refreshImportedData} />
        )}
      </>
    )
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Aller au contenu
      </a>

      <header className="app-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            P
          </div>
          <div className="brand-copy">
            <p className="brand-name">PeriodPeriods</p>
            <p className="brand-kicker">Suivi des règles, sans compte.</p>
          </div>
        </div>
        <button
          className="theme-toggle"
          type="button"
          aria-label={themeActionLabel}
          title={themeActionLabel}
          onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
        >
          {theme === 'light' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
          <span className="theme-toggle-label">{themeActionLabel}</span>
        </button>
      </header>

      <div className="main-stage">
        <main id="main-content" className="main-content" tabIndex={-1} aria-busy={isLoading}>
          {renderPageContent(activeView, true)}
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Navigation principale">
        <NavButton
          active={activeView === 'home'}
          icon={<Home size={21} aria-hidden="true" />}
          label="Accueil"
          onClick={() => navigateToView('home')}
        />
        <NavButton
          active={activeView === 'calendar'}
          icon={<CalendarDays size={21} aria-hidden="true" />}
          label="Calendrier"
          onClick={() => navigateToView('calendar')}
        />
        <NavButton
          active={activeView === 'settings'}
          icon={<Settings size={21} aria-hidden="true" />}
          label="Réglages"
          onClick={() => navigateToView('settings')}
        />
      </nav>
    </div>
  )
}

function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      className={`nav-button${active ? ' is-active' : ''}`}
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export default App
