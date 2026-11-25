import { ChartNoAxesCombined, Home, Plus, Settings } from 'lucide-react'
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
type ThemePreference = Theme | 'system'
type Locale = 'fr' | 'en'
type BackupReminderFrequency = 'off' | 'monthly'

const THEME_STORAGE_KEY = 'periodperiods-theme'
const LOCALE_STORAGE_KEY = 'periodperiods-locale'
const BACKUP_REMINDER_STORAGE_KEY = 'periodperiods-backup-reminder'
const NEXT_BACKUP_REMINDER_STORAGE_KEY = 'periodperiods-next-backup-reminder'

const views: Record<View, { label: string; title: string }> = {
  home: { label: 'Accueil', title: 'Suivi des règles et du cycle' },
  stats: { label: 'Statistiques', title: 'Statistiques' },
  settings: { label: 'Réglages', title: 'Réglages' },
}

const defaultStore = createPeriodDataStore()

function getViewFromLocation(): View {
  if (typeof window === 'undefined') return 'home'
  const view = new URLSearchParams(window.location.search).get('view')
  if (view === 'calendar') return 'stats'
  return view === 'stats' || view === 'settings' ? view : 'home'
}

function getStoredThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'system'
  } catch {
    return 'system'
  }
}

function getSystemTheme(): Theme {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredLocale(): Locale {
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY) === 'en' ? 'en' : 'fr'
  } catch {
    return 'fr'
  }
}

function getStoredBackupReminder(): BackupReminderFrequency {
  try {
    return window.localStorage.getItem(BACKUP_REMINDER_STORAGE_KEY) === 'monthly' ? 'monthly' : 'off'
  } catch {
    return 'off'
  }
}

function getStoredNextBackupReminder(): CivilDate | null {
  try {
    const value = window.localStorage.getItem(NEXT_BACKUP_REMINDER_STORAGE_KEY)
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
    const date = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? (value as CivilDate) : null
  } catch {
    return null
  }
}

function addOneMonth(date: CivilDate): CivilDate {
  const [year, month, day] = date.split('-').map(Number)
  const nextMonthYear = month === 12 ? year + 1 : year
  const nextMonth = (month % 12) + 1
  const lastDayOfNextMonth = new Date(Date.UTC(nextMonthYear, nextMonth, 0)).getUTCDate()
  return `${nextMonthYear.toString().padStart(4, '0')}-${nextMonth.toString().padStart(2, '0')}-${Math.min(day, lastDayOfNextMonth).toString().padStart(2, '0')}` as CivilDate
}

function persistNextBackupReminder(date: CivilDate | null) {
  try {
    if (date) window.localStorage.setItem(NEXT_BACKUP_REMINDER_STORAGE_KEY, date)
    else window.localStorage.removeItem(NEXT_BACKUP_REMINDER_STORAGE_KEY)
  } catch {
    // The reminder still works for this session when local storage is unavailable.
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

function App({ store = defaultStore, today: fixedToday }: AppProps) {
  const [localToday, setLocalToday] = useState(getLocalCivilDate)
  const today = fixedToday ?? localToday
  const [activeView, setActiveView] = useState<View>(getViewFromLocation)
  const [themePreference, setThemePreference] = useState<ThemePreference>(getStoredThemePreference)
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme)
  const [locale, setLocale] = useState<Locale>(getStoredLocale)
  const [backupReminder, setBackupReminder] = useState<BackupReminderFrequency>(getStoredBackupReminder)
  const [nextBackupReminder, setNextBackupReminder] = useState<CivilDate | null>(getStoredNextBackupReminder)
  const [periods, setPeriods] = useState<Period[] | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const saveMessageTimeout = useRef<number | null>(null)
  const [event, setEvent] = useState<{ startDate: CivilDate; periodId?: string } | null>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  const [hasNavigated, setHasNavigated] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousViewRef = useRef(activeView)

  useEffect(() => {
    if (fixedToday !== undefined) return

    let timer: number
    function refreshDate() {
      window.clearTimeout(timer)
      const now = new Date()
      setLocalToday(getLocalCivilDate(now))
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      timer = window.setTimeout(refreshDate, midnight.getTime() - now.getTime())
    }
    function handleVisibility() {
      if (document.visibilityState === 'visible') refreshDate()
    }
    refreshDate()
    window.addEventListener('focus', refreshDate)
    window.addEventListener('pageshow', refreshDate)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', refreshDate)
      window.removeEventListener('pageshow', refreshDate)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fixedToday])

  useEffect(
    () => () => {
      if (saveMessageTimeout.current !== null) window.clearTimeout(saveMessageTimeout.current)
    },
    [],
  )

  function updateSaveMessage(message: string | null, dismissAfterMs?: number) {
    if (saveMessageTimeout.current !== null) {
      window.clearTimeout(saveMessageTimeout.current)
      saveMessageTimeout.current = null
    }
    setSaveMessage(message)
    if (message && dismissAfterMs !== undefined) {
      saveMessageTimeout.current = window.setTimeout(() => {
        setSaveMessage((current) => (current === message ? null : current))
        saveMessageTimeout.current = null
      }, dismissAfterMs)
    }
  }

  useLayoutEffect(() => {
    const theme = themePreference === 'system' ? systemTheme : themePreference
    document.documentElement.dataset.theme = theme
    document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#211f20' : '#f4f1e9')

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themePreference)
    } catch {
      // The appearance still changes when local storage is unavailable.
    }
  }, [systemTheme, themePreference])

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return

    const updateSystemTheme = () => setSystemTheme(media.matches ? 'dark' : 'light')
    updateSystemTheme()
    if (media.addEventListener) {
      media.addEventListener('change', updateSystemTheme)
      return () => media.removeEventListener('change', updateSystemTheme)
    }
    media.addListener(updateSystemTheme)
    return () => media.removeListener(updateSystemTheme)
  }, [])

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
    const handlePopState = () => {
      setHasNavigated(true)
      setActiveView(getViewFromLocation())
      setEvent(null)
    }
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
      setHasNavigated(true)
      setActiveView(view)
      setEvent(null)
    },
    [activeView],
  )

  async function saveEvent(input: NewPeriod): Promise<string | null> {
    if (input.startDate > today) {
      return 'Une date future ne peut pas être enregistrée.'
    }
    try {
      const saved = event?.periodId ? await store.updatePeriod(event.periodId, input) : await store.addPeriod(input)
      setPeriods((current) =>
        [...(current ?? []).filter(({ id }) => id !== saved.id), saved].sort((left, right) =>
          left.startDate.localeCompare(right.startDate),
        ),
      )
      updateSaveMessage(
        locale === 'en' ? 'Period saved on this device.' : 'Période enregistrée sur cet appareil.',
        1000,
      )
      return null
    } catch (error) {
      if (error instanceof DuplicatePeriodStartError) return 'Un début est déjà enregistré pour cette date.'
      return 'L’enregistrement a échoué. Vérifie les données et réessaie.'
    }
  }

  async function removeEvent(id: string): Promise<string | null> {
    try {
      await store.deletePeriod(id)
      setPeriods((current) => current?.filter((period) => period.id !== id) ?? [])
      updateSaveMessage(
        locale === 'en' ? 'Period deleted from this device.' : 'Période supprimée de cet appareil.',
        3000,
      )
      return null
    } catch {
      return locale === 'en'
        ? 'Could not delete this period. Try again.'
        : 'Impossible de supprimer cette période. Réessaie.'
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
    updateSaveMessage(null)
  }

  async function changeFirstDayOfWeek(firstDayOfWeek: 0 | 1) {
    if (!settings) return
    try {
      const saved = await store.saveSettings({ ...settings, firstDayOfWeek })
      setSettings(saved)
    } catch {
      updateSaveMessage(locale === 'en' ? 'The setting could not be saved.' : 'Le réglage n’a pas pu être enregistré.')
    }
  }

  function changeBackupReminder(frequency: BackupReminderFrequency) {
    setBackupReminder(frequency)
    try {
      window.localStorage.setItem(BACKUP_REMINDER_STORAGE_KEY, frequency)
    } catch {
      // The preference remains active for this session when local storage is unavailable.
    }
    const nextDate = frequency === 'monthly' ? addOneMonth(today) : null
    setNextBackupReminder(nextDate)
    persistNextBackupReminder(nextDate)
  }

  function recordBackupExported() {
    if (backupReminder !== 'monthly') return
    const nextDate = addOneMonth(today)
    setNextBackupReminder(nextDate)
    persistNextBackupReminder(nextDate)
  }

  const isDataReady = periods !== null && settings !== null
  const estimate = isDataReady ? estimateNextPeriod(periods, today) : null
  const backupReminderDue =
    backupReminder === 'monthly' &&
    nextBackupReminder !== null &&
    today >= nextBackupReminder &&
    (periods?.length ?? 0) > 0

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
          <>
            {backupReminderDue && (
              <aside className="backup-reminder" aria-labelledby="backup-reminder-title" role="region">
                <div>
                  <h2 id="backup-reminder-title">
                    {locale === 'en' ? 'It’s time to save a backup.' : 'C’est le moment de sauvegarder tes données.'}
                  </h2>
                  <p>
                    {locale === 'en'
                      ? 'Your records stay on this device. Create a backup to keep a copy somewhere safe.'
                      : 'Tes données restent sur cet appareil. Crée une sauvegarde pour en garder une copie en lieu sûr.'}
                  </p>
                </div>
                <button className="secondary-button" type="button" onClick={() => navigateToView('settings')}>
                  {locale === 'en' ? 'Open backup settings' : 'Ouvrir les réglages de sauvegarde'}
                </button>
              </aside>
            )}
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
                  onEditPeriod={({ id, startDate }) => setEvent({ startDate, periodId: id })}
                  locale={locale}
                />
              }
              locale={locale}
            />
          </>
        )}
        {!isLoading && !loadError && periods !== null && view === 'stats' && (
          <StatsView periods={periods} today={today} locale={locale} />
        )}
        {!isLoading && !loadError && periods !== null && settings !== null && view === 'settings' && (
          <>
            <section className="settings-preferences" aria-labelledby="preferences-title">
              <h2 id="preferences-title">{locale === 'en' ? 'Preferences' : 'Préférences'}</h2>
              <div className="setting-row">
                <div className="setting-copy">
                  <label htmlFor="locale-setting">{locale === 'en' ? 'Language' : 'Langue'}</label>
                  <p>
                    {locale === 'en'
                      ? 'Choose the language used across the app.'
                      : 'Choisis la langue utilisée dans toute l’application.'}
                  </p>
                </div>
                <select
                  id="locale-setting"
                  value={locale}
                  onChange={(event) => setLocale(event.target.value === 'en' ? 'en' : 'fr')}
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="setting-row">
                <div className="setting-copy">
                  <label htmlFor="week-setting">
                    {locale === 'en' ? 'First day of the week' : 'Premier jour de la semaine'}
                  </label>
                  <p>
                    {locale === 'en'
                      ? 'Used by the calendar and date pickers.'
                      : 'Utilisé dans le calendrier et les sélecteurs de date.'}
                  </p>
                </div>
                <select
                  id="week-setting"
                  value={settings.firstDayOfWeek}
                  onChange={(event) => void changeFirstDayOfWeek(event.target.value === '0' ? 0 : 1)}
                >
                  <option value="1">{locale === 'en' ? 'Monday' : 'Lundi'}</option>
                  <option value="0">{locale === 'en' ? 'Sunday' : 'Dimanche'}</option>
                </select>
              </div>
              <div className="setting-row">
                <div className="setting-copy">
                  <label htmlFor="appearance-setting">{locale === 'en' ? 'Appearance' : 'Apparence'}</label>
                  <p>
                    {locale === 'en'
                      ? 'Follow your device or choose a theme.'
                      : 'Suis ton appareil ou choisis un thème.'}
                  </p>
                </div>
                <select
                  id="appearance-setting"
                  value={themePreference}
                  onChange={(event) =>
                    setThemePreference(
                      event.target.value === 'dark' || event.target.value === 'light' ? event.target.value : 'system',
                    )
                  }
                >
                  <option value="system">{locale === 'en' ? 'System' : 'Système'}</option>
                  <option value="light">{locale === 'en' ? 'Light' : 'Clair'}</option>
                  <option value="dark">{locale === 'en' ? 'Dark' : 'Sombre'}</option>
                </select>
              </div>
              <div className="setting-row">
                <div className="setting-copy">
                  <label htmlFor="backup-reminder-setting">
                    {locale === 'en' ? 'Backup reminder' : 'Rappel de sauvegarde'}
                  </label>
                  <p>
                    {locale === 'en'
                      ? 'An in-app reminder only. Your data stays on this device.'
                      : 'Un rappel dans l’application uniquement. Tes données restent sur cet appareil.'}
                  </p>
                </div>
                <select
                  id="backup-reminder-setting"
                  value={backupReminder}
                  onChange={(event) => changeBackupReminder(event.target.value === 'monthly' ? 'monthly' : 'off')}
                >
                  <option value="off">{locale === 'en' ? 'Off' : 'Désactivé'}</option>
                  <option value="monthly">{locale === 'en' ? 'Monthly' : 'Chaque mois'}</option>
                </select>
              </div>
              <p role="status">{saveMessage}</p>
            </section>
            <BackupSettingsView
              store={store}
              onImported={refreshImportedData}
              onBackupExported={recordBackupExported}
              locale={locale}
            />
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
          <div className={`view-content${hasNavigated ? ' view-content-enter' : ''}`} key={activeView}>
            {renderPageContent(activeView, true)}
          </div>
        </main>
      </div>

      {!isLoading && !loadError && periods !== null && activeView === 'home' && (
        <>
          <button
            className="floating-add"
            type="button"
            ref={addButton}
            aria-label={locale === 'en' ? 'Add an event' : 'Ajouter un événement'}
            onClick={(click) => {
              click.currentTarget.focus({ preventScroll: true })
              setEvent({ startDate: today })
            }}
          >
            <Plus size={24} aria-hidden="true" />
            <span>{locale === 'en' ? 'Add' : 'Ajouter'}</span>
          </button>
          <PeriodEventDialog
            open={event !== null}
            period={periods.find(({ id }) => id === event?.periodId)}
            today={today}
            initialStartDate={event?.startDate ?? today}
            onClose={() => {
              setEvent(null)
              requestAnimationFrame(() => {
                if (document.activeElement === document.body) addButton.current?.focus({ preventScroll: true })
              })
            }}
            onSave={saveEvent}
            onDelete={removeEvent}
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
