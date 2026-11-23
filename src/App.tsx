import { CalendarDays, Home, Settings } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPeriodDataStore, DuplicatePeriodStartError } from './data/period-data-store'
import type { PeriodDataStore } from './data/period-data-store'
import { estimateNextPeriod } from './domain/forecast/estimate-next-period'
import type { AppSettings, CivilDate, Period } from './domain/periods'
import { PeriodCalendarView } from './features/calendar/PeriodCalendarView'
import { PeriodEntryView, type PeriodSaveError } from './features/periods/PeriodEntryView'

type View = 'home' | 'calendar' | 'settings'

const views: Record<View, { label: string; title: string }> = {
  home: { label: 'Accueil', title: 'Suivi des règles et du cycle' },
  calendar: { label: 'Calendrier', title: 'Calendrier' },
  settings: { label: 'Réglages', title: 'Réglages' },
}

const defaultStore = createPeriodDataStore()

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
  const [activeView, setActiveView] = useState<View>('home')
  const [periods, setPeriods] = useState<Period[] | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<PeriodSaveError | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousViewRef = useRef(activeView)

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

  async function savePeriod(startDate: CivilDate) {
    setSaveMessage(null)
    setSaveError(null)

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

  const isDataReady = periods !== null && settings !== null
  const estimate = isDataReady ? estimateNextPeriod(periods, today) : null

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Aller au contenu
      </a>

      <header className="app-header flex items-center gap-period-2">
        <div className="brand-mark" aria-hidden="true">
          P
        </div>
        <div>
          <p className="brand-name">PeriodPeriods</p>
          <p className="brand-kicker">Suivi des règles, sans compte.</p>
        </div>
      </header>

      <main id="main-content" className="main-content" tabIndex={-1} aria-busy={isLoading}>
        <div className="view-heading">
          <p className="eyebrow">{views[activeView].label}</p>
          <h1 ref={headingRef} tabIndex={-1}>
            {views[activeView].title}
          </h1>
        </div>

        {isLoading && (
          <p className="data-state" role="status">
            Chargement de tes dates…
          </p>
        )}

        {!isLoading && loadError && (
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

        {!isLoading && !loadError && isDataReady && activeView === 'home' && (
          <PeriodEntryView
            periods={periods}
            estimate={estimate!}
            today={today}
            saveMessage={saveMessage}
            saveError={saveError}
            onClearSaveError={() => setSaveError(null)}
            onSave={savePeriod}
            onOpenCalendar={() => setActiveView('calendar')}
          />
        )}
        {!isLoading && !loadError && isDataReady && activeView === 'calendar' && (
          <PeriodCalendarView
            periods={periods}
            estimate={estimate!}
            firstDayOfWeek={settings.firstDayOfWeek}
            today={today}
            onAddDate={() => setActiveView('home')}
          />
        )}
        {!isLoading && !loadError && isDataReady && activeView === 'settings' && <SettingsView />}
      </main>

      <nav className="bottom-nav" aria-label="Navigation principale">
        <NavButton
          active={activeView === 'home'}
          icon={<Home size={21} aria-hidden="true" />}
          label="Accueil"
          onClick={() => setActiveView('home')}
        />
        <NavButton
          active={activeView === 'calendar'}
          icon={<CalendarDays size={21} aria-hidden="true" />}
          label="Calendrier"
          onClick={() => setActiveView('calendar')}
        />
        <NavButton
          active={activeView === 'settings'}
          icon={<Settings size={21} aria-hidden="true" />}
          label="Réglages"
          onClick={() => setActiveView('settings')}
        />
      </nav>
    </div>
  )
}

function SettingsView() {
  return (
    <section className="empty-view" aria-labelledby="settings-empty-title">
      <div className="empty-symbol" aria-hidden="true">
        <Settings size={28} strokeWidth={1.5} />
      </div>
      <h2 id="settings-empty-title">Les options ne sont pas encore disponibles.</h2>
      <p>L’export, la suppression des données et les préférences seront accessibles ici.</p>
    </section>
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
