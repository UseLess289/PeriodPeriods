import { useRef, useState } from 'react'
import { serializeAnalysisExport } from '../../data/analysis-export'
import type { CivilDate, Period } from '../../domain/periods'
import type { Locale } from '../shared/format-civil-date'

const prompts = {
  fr: 'Analyse le fichier JSON joint. startDay est le nombre de jours depuis le premier début enregistré ; durationDays est la durée saisie (5 jours par défaut). Dans dailyLogs, day commence à 1. flowIntensity, headacheIntensity, crampsIntensity et fatigueIntensity mesurent le flux, les maux de tête, les crampes et la fatigue de 1 (léger) à 3 (intense). Les anciens champs flow (light, medium, heavy) et headache (vrai ou faux) utilisent une autre échelle : présente-les séparément. Résume les intervalles entre débuts et les tendances par jour, en indiquant les effectifs. Ne traite pas les données manquantes comme des absences. Signale les limites et ne pose pas de diagnostic.',
  en: 'Analyze the attached JSON file. startDay is the number of days since the first recorded start; durationDays is the entered duration (5 days by default). In dailyLogs, day starts at 1. flowIntensity, headacheIntensity, crampsIntensity, and fatigueIntensity rate flow, headaches, cramps, and fatigue from 1 (mild) to 3 (intense). The older flow (light, medium, heavy) and headache (true or false) fields use different scales: report them separately. Summarize the intervals between starts and daily patterns, showing sample sizes. Do not treat missing data as absence. Explain limitations and do not diagnose.',
}

export function AnalysisExportView({
  periods,
  today,
  locale,
}: {
  periods: Period[]
  today: CivilDate
  locale: Locale
}) {
  const text = (fr: string, en: string) => (locale === 'en' ? en : fr)
  const promptField = useRef<HTMLTextAreaElement>(null)
  const [copyStatus, setCopyStatus] = useState('')

  function download() {
    const data = serializeAnalysisExport(periods, today)
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'periodperiods-analysis.json'
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompts[locale])
      setCopyStatus(text('Prompt copié.', 'Prompt copied.'))
    } catch {
      promptField.current?.focus()
      promptField.current?.select()
      setCopyStatus(
        text(
          'Le texte est sélectionné. Tu peux le copier manuellement.',
          'The text is selected. You can copy it manually.',
        ),
      )
    }
  }

  return (
    <section className="settings-preferences analysis-export" aria-labelledby="analysis-export-title">
      <h2 id="analysis-export-title">{text('Exporter pour analyse', 'Export for analysis')}</h2>
      <p>
        {text(
          'L’export remplace les dates par des jours relatifs et exclut les identifiants, les horodatages et les textes libres. Il contient encore des données de santé. Rien n’est envoyé automatiquement : vérifie le fichier avant de le joindre au prompt dans l’outil de ton choix.',
          'The export uses relative days and omits identifiers, timestamps, and free text. It still contains health data. Nothing is sent automatically: review the file before attaching it to the prompt in a tool of your choice.',
        )}
      </p>
      <button
        className="secondary-button"
        type="button"
        onClick={download}
        disabled={!periods.some(({ startDate }) => startDate <= today)}
      >
        {text('Télécharger les données sans dates', 'Download data without dates')}
      </button>
      {!periods.some(({ startDate }) => startDate <= today) && (
        <p>{text('Aucune période à exporter.', 'No periods to export.')}</p>
      )}
      <label htmlFor="analysis-prompt">{text('Prompt d’analyse', 'Analysis prompt')}</label>
      <textarea id="analysis-prompt" ref={promptField} readOnly rows={6} value={prompts[locale]} />
      <button className="secondary-button" type="button" onClick={copyPrompt}>
        {text('Copier le prompt', 'Copy prompt')}
      </button>
      <p role="status">{copyStatus}</p>
    </section>
  )
}
