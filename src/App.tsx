import { ChartNoAxesCombined, Home, Moon, Plus, Settings, Sun } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPeriodDataStore, DuplicatePeriodStartError } from './data/period-data-store'
import type { PeriodDataStore } from './data/period-data-store'
import { estimateNextPeriod } from './domain/forecast/estimate-next-period'
import type { AppSettings, CivilDate, NewPeriod, Period } from './domain/periods'
import { PeriodCalendarView } from './features/calendar/PeriodCalendarView'
import { PeriodEntryView } from './features/periods/PeriodEntryView'
import { PeriodEventDialog } from './features/periods/PeriodEventDialog'
import { BackupSettingsView } from './features/settings/BackupSettingsView'
import { AnalysisExportView } from './features/settings/AnalysisExportView'
import { StatsView } from './features/stats/StatsView'

type View = 'home' | 'stats' | 'settings'
type Theme = 'light' | 'dark'
type Locale = 'fr' | 'en'

const THEME_STORAGE_KEY = 'periodperiods-theme'
const LOCALE_STORAGE_KEY = 'periodperiods-locale'

const views: Record<View, { label: string; title: string }> = {
  home: { label: 'Accueil', title: 'Suivi des règles et du cycle' },
  stats: { label: 'Statistiques', title: 'Statistiques' },
  settings: { label: 'Réglages', title: 'Réglages' },
}

const defaultStore = createPeriodDataStore()

function getViewFromLocation(): View {
  if (typeof window === 'undefined') return 'home'
  const view = new URLSearchParams(window.location.search).get('view')
  return view === 'stats' || view === 'settings' ? view : 'home'
}

function getStoredTheme(): Theme {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function getStoredLocale(): Locale {
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY) === 'en' ? 'en' : 'fr'
  } catch {
    return 'fr'
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
  const [locale, setLocale] = useState<Locale>(getStoredLocale)
  const [periods, setPeriods] = useState<Period[] | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
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
    document.documentElement.lang = locale
    document.title = locale === 'en' ? 'PeriodPeriods — cycle tracker' : 'PeriodPeriods — suivi des règles et du cycle'
    document
      .querySelector<HTMLMetaElement>('meta[name="description"]')
      ?.setAttribute(
        'content',
        locale === 'en'
          ? 'Track your cycle locally, without an account or synchronization.'
          : 'Suivi des règles et du cycle, conçu pour garder les données sur cet appareil.',
      )
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    } catch {
      // The language remains active for this session.
    }
  }, [locale])

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

  async function saveEvent(input: NewPeriod): Promise<string | null> {
    if (input.startDate > today) {
      return 'Une date future ne peut pas être enregistrée.'
    }
    try {
      const existing = periods?.find((item) => item.startDate === input.startDate)
      if (existing) {
        const updated = await store.updatePeriod(existing.id, {
          durationDays: input.durationDays,
          dailyLogs: input.dailyLogs,
          symptoms: input.symptoms,
        })
        setPeriods((current) => current?.map((item) => (item.id === updated.id ? updated : item)) ?? [])
      } else {
        const saved = await store.addPeriod(input)
        setPeriods((current) =>
          [...(current ?? []), saved].sort((left, right) => left.startDate.localeCompare(right.startDate)),
        )
      }
      setSaveMessage(locale === 'en' ? 'Period saved on this device.' : 'Période enregistrée sur cet appareil.')
      return null
    } catch {
      return 'L’enregistrement a échoué. Vérifie les données et réessaie.'
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
  }

  async function changeFirstDayOfWeek(firstDayOfWeek: 0 | 1) {
    if (!settings) return
    try {
      const saved = await store.saveSettings({ ...settings, firstDayOfWeek })
      setSettings(saved)
    } catch {
      setSaveMessage(locale === 'en' ? 'The setting could not be saved.' : 'Le réglage n’a pas pu être enregistré.')
    }
  }

  const isDataReady = periods !== null && settings !== null
  const estimate = isDataReady ? estimateNextPeriod(periods, today) : null
  const nextTheme = theme === 'light' ? 'dark' : 'light'
  const themeActionLabel =
    nextTheme === 'dark'
      ? locale === 'en'
        ? 'Switch to dark theme'
        : 'Passer au thème sombre'
      : locale === 'en'
        ? 'Switch to light theme'
        : 'Passer au thème clair'

  function renderPageContent(view: View, isActive: boolean) {
    return (
      <>
        <div className={view === 'home' ? 'view-heading view-heading-home' : 'view-heading'}>
          <p className="eyebrow">
            {locale === 'en' ? { home: 'Home', stats: 'Statistics', settings: 'Settings' }[view] : views[view].label}
          </p>
          <h1 ref={isActive ? headingRef : undefined} tabIndex={-1}>
            {locale === 'en'
              ? { home: 'Cycle and period tracking', stats: 'Statistics', settings: 'Settings' }[view]
              : views[view].title}
          </h1>
        </div>

        {isActive && isLoading && (
          <p className="data-state" role="status">
            {locale === 'en' ? 'Loading your dates…' : 'Chargement de tes dates…'}
          </p>
        )}

        {isActive && !isLoading && loadError && (
          <section className="data-state data-state-error" aria-labelledby="load-error-title" role="alert">
            <h2 id="load-error-title">
              {locale === 'en' ? 'Could not load your dates.' : 'Impossible de charger tes dates.'}
            </h2>
            <p>
              {locale === 'en'
                ? 'The data on this device could not be read. Try again.'
                : 'L’application ne peut pas lire les données de cet appareil. Tu peux réessayer.'}
            </p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setLoadError(false)
                setIsLoading(true)
                setLoadAttempt((attempt) => attempt + 1)
              }}
            >
              {locale === 'en' ? 'Try again' : 'Réessayer'}
            </button>
          </section>
        )}

        {!isLoading && !loadError && periods !== null && settings !== null && view === 'home' && (
          <PeriodEntryView
            periods={periods}
            estimate={estimate!}
            today={today}
            saveMessage={saveMessage}
            calendar={
              <PeriodCalendarView
                periods={periods}
                estimate={estimate!}
                firstDayOfWeek={settings.firstDayOfWeek}
                today={today}
                onSaveDates={savePeriodStarts}
                locale={locale}
              />
            }
            locale={locale}
          />
        )}
        {!isLoading && !loadError && periods !== null && view === 'stats' && (
          <StatsView periods={periods} today={today} locale={locale} />
        )}
        {!isLoading && !loadError && periods !== null && settings !== null && view === 'settings' && (
          <>
            <section className="settings-preferences" aria-labelledby="preferences-title">
              <h2 id="preferences-title">{locale === 'en' ? 'Preferences' : 'Préférences'}</h2>
              <label htmlFor="locale-setting">{locale === 'en' ? 'Language' : 'Langue'}</label>
              <select
                id="locale-setting"
                value={locale}
                onChange={(event) => setLocale(event.target.value === 'en' ? 'en' : 'fr')}
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
              <label htmlFor="week-setting">
                {locale === 'en' ? 'First day of the week' : 'Premier jour de la semaine'}
              </label>
              <select
                id="week-setting"
                value={settings.firstDayOfWeek}
                onChange={(event) => void changeFirstDayOfWeek(event.target.value === '0' ? 0 : 1)}
              >
                <option value="1">{locale === 'en' ? 'Monday' : 'Lundi'}</option>
                <option value="0">{locale === 'en' ? 'Sunday' : 'Dimanche'}</option>
              </select>
              <button
                className="theme-toggle"
                type="button"
                onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
              >
                {theme === 'light' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
                {themeActionLabel}
              </button>
              <p role="status">{saveMessage}</p>
            </section>
            <BackupSettingsView store={store} onImported={refreshImportedData} locale={locale} />
            <AnalysisExportView periods={periods} today={today} locale={locale} />
          </>
        )}
      </>
    )
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {locale === 'en' ? 'Skip to content' : 'Aller au contenu'}
      </a>

      <header className="app-header">
        <p className="brand-name">PeriodPeriods</p>
      </header>

      <div className="main-stage">
        <main id="main-content" className="main-content" tabIndex={-1} aria-busy={isLoading}>
          {renderPageContent(activeView, true)}
        </main>
      </div>

      {!isLoading && !loadError && periods !== null && (
        <>
          <button
            className="floating-add"
            type="button"
            aria-label={locale === 'en' ? 'Add an event' : 'Ajouter un événement'}
            onClick={() => setEventDialogOpen(true)}
          >
            <Plus size={24} aria-hidden="true" />
            <span>{locale === 'en' ? 'Add' : 'Ajouter'}</span>
          </button>
          <PeriodEventDialog
            open={eventDialogOpen}
            periods={periods}
            today={today}
            onClose={() => setEventDialogOpen(false)}
            onSave={saveEvent}
            locale={locale}
          />
        </>
      )}
      <nav className="bottom-nav" aria-label={locale === 'en' ? 'Main navigation' : 'Navigation principale'}>
        <NavButton
          active={activeView === 'home'}
          icon={<Home size={21} aria-hidden="true" />}
          label={locale === 'en' ? 'Home' : 'Accueil'}
          onClick={() => navigateToView('home')}
        />
        <NavButton
          active={activeView === 'stats'}
          icon={<ChartNoAxesCombined size={21} aria-hidden="true" />}
          label={locale === 'en' ? 'Statistics' : 'Statistiques'}
          onClick={() => navigateToView('stats')}
        />
        <NavButton
          active={activeView === 'settings'}
          icon={<Settings size={21} aria-hidden="true" />}
          label={locale === 'en' ? 'Settings' : 'Réglages'}
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
