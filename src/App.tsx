import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ChangeEvent, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { copy, event } from './content'
import { useSmoothWheelScroll } from './hooks/useSmoothWheelScroll'

const photoUrl = `${import.meta.env.BASE_URL}couple.jpg`
const introPhotoUrl = `${import.meta.env.BASE_URL}intro-photo.jpg`
const countdownPhotoUrl = `${import.meta.env.BASE_URL}countdown-photo.jpg`
const musicUrls = ['trek_1.mp3', 'trek_2.mp3', 'trek_3.mp3', 'trek_4.mp3'].map(
  (track) => `${import.meta.env.BASE_URL}${track}`,
)
const musicQueueStorageKey = 'wedding-music-queue'
const lastMusicStorageKey = 'wedding-last-music'

function fallbackMusicUrl() {
  return musicUrls[Math.floor(Math.random() * musicUrls.length)] ?? ''
}

function shuffleMusicUrls(lastPlayed?: string) {
  const shuffled = [...musicUrls]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  if (lastPlayed && shuffled.length > 1 && shuffled[0] === lastPlayed) {
    const swapIndex = shuffled.findIndex((url) => url !== lastPlayed)
    if (swapIndex > 0) {
      ;[shuffled[0], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[0]]
    }
  }

  return shuffled
}

function takeNextMusicUrl() {
  try {
    const storedQueue = window.localStorage.getItem(musicQueueStorageKey)
    const parsedQueue = storedQueue ? JSON.parse(storedQueue) : []
    let queue = Array.isArray(parsedQueue)
      ? parsedQueue.filter((url): url is string => typeof url === 'string' && musicUrls.includes(url))
      : []

    if (queue.length === 0) {
      queue = shuffleMusicUrls(window.localStorage.getItem(lastMusicStorageKey) ?? undefined)
    }

    const nextUrl = queue.shift() ?? fallbackMusicUrl()
    window.localStorage.setItem(musicQueueStorageKey, JSON.stringify(queue))
    window.localStorage.setItem(lastMusicStorageKey, nextUrl)

    return nextUrl
  } catch {
    return fallbackMusicUrl()
  }
}

function getGuestNameFromUrl() {
  const rawName = new URLSearchParams(window.location.search).get('name')
  if (!rawName) return ''

  return rawName
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90)
}

function getIntroTitleClass(title: string, personalized: boolean) {
  const classes = ['intro__title']

  if (personalized) classes.push('intro__title--personal')
  if (title.length > 26) classes.push('intro__title--long')
  if (title.length > 44) classes.push('intro__title--very-long')

  return classes.join(' ')
}

type GeneratedLink = {
  id: string
  name: string
  url: string
}

function getInviteBaseUrl() {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  return url.toString()
}

function createGuestLink(name: string) {
  const url = new URL(getInviteBaseUrl())
  const normalizedName = normalizeGuestName(name)

  if (normalizedName) {
    url.searchParams.set('name', normalizedName)
  }

  return url.toString()
}

function normalizeGuestName(value: unknown) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90)
}

function isHeaderLike(value: string) {
  return /^(имя|фио|ф\.?и\.?о\.?|гость|гости|приглашение|name|guest)$/i.test(value.trim())
}

function isLinksRoute() {
  return window.location.hash.startsWith('#/links') || new URLSearchParams(window.location.search).has('links')
}

function parseSeparatedText(text: string): unknown[][] {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const separator = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ','
      return line.split(separator)
    })
}

async function readGuestRowsFromFile(file: File): Promise<unknown[][]> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'csv' || extension === 'txt') {
    return parseSeparatedText(await file.text())
  }

  if (extension === 'xlsx') {
    const { readSheet } = await import('read-excel-file/browser')
    return (await readSheet(file)) as unknown[][]
  }

  throw new Error('Поддерживаются файлы .xlsx, .csv и .txt. Если файл старого формата .xls — сохраните его как .xlsx.')
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

function Icon({ name }: { name: 'sound' | 'muted' | 'map' | 'heart' | 'calendar' }) {
  const paths = {
    sound: <><path d="M11 5 6.8 8.5H3.5v7h3.3L11 19V5Z"/><path d="M15 8.5a5 5 0 0 1 0 7M17.8 5.8a9 9 0 0 1 0 12.4"/></>,
    muted: <><path d="M11 5 6.8 8.5H3.5v7h3.3L11 19V5Z"/><path d="m16 10 5 5m0-5-5 5"/></>,
    map: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function Botanical({ side }: { side: 'left' | 'right' }) {
  return (
    <svg className={`botanical botanical--${side}`} viewBox="0 0 180 360" aria-hidden="true">
      <path d="M22 355C39 274 54 205 112 113c22-35 39-70 44-108" />
      <path d="M52 258c-21-12-35-31-38-55 25 4 43 20 45 45M78 204c-5-25 2-48 21-65 13 24 9 48-9 66M104 154c-18-14-26-34-23-56 23 8 37 26 32 49M132 101c-2-21 6-39 22-52 9 21 3 40-13 53M38 304c23-2 42 7 55 25-25 9-46 1-58-18" />
      <circle cx="117" cy="119" r="3" /><circle cx="64" cy="239" r="3" /><circle cx="146" cy="62" r="2.5" />
    </svg>
  )
}

function EnvelopeGate({ opening, onOpen }: { opening: boolean; onOpen: () => void }) {
  return (
    <motion.div
      className={`gate ${opening ? 'gate--opening' : ''}`}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.45 } }}
    >
      <div className="gate__grain" />
      <Botanical side="left" />
      <Botanical side="right" />

      <div className="envelope-scene" aria-label={copy.tapToOpen}>
        <div className="envelope">
          <div className="envelope__back" />
          <div className="envelope__letter">
            <span>{event.monogram}</span>
            <small>{copy.heroDate}</small>
          </div>
          <div className="envelope__flap envelope__flap--top" />
          <div className="envelope__front">
            <div className="envelope__fold envelope__fold--left" />
            <div className="envelope__fold envelope__fold--right" />
            <div className="envelope__fold envelope__fold--bottom" />
          </div>
          <button className="wax-seal" onClick={onOpen} disabled={opening} aria-label={copy.tapToOpen}>
            <span>{event.monogram}</span>
          </button>
        </div>
      </div>

      <div className="gate__hint">
        <span />
        <p>{copy.tapToOpen}</p>
        <span />
      </div>
    </motion.div>
  )
}

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 34 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function AnimatedSection({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion()
  return (
    <motion.section
      className={`flow-section ${className}`}
      initial={reduced ? false : { opacity: 0.2, y: 34, scale: 0.992 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.06 }}
      transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  )
}

function SectionTitle({ number, children }: { number: string; children: ReactNode }) {
  return (
    <div className="section-title">
      <span>{number}</span>
      <h2>{children}</h2>
      <i />
    </div>
  )
}

function Countdown() {
  const target = useMemo(() => new Date(event.isoDate).getTime(), [])
  const [left, setLeft] = useState(() => Math.max(0, target - Date.now()))

  useEffect(() => {
    const timer = window.setInterval(() => setLeft(Math.max(0, target - Date.now())), 1000)
    return () => window.clearInterval(timer)
  }, [target])

  const totalSeconds = Math.floor(left / 1000)
  const values = [
    [Math.floor(totalSeconds / 86400), copy.days],
    [Math.floor((totalSeconds % 86400) / 3600), copy.hours],
    [Math.floor((totalSeconds % 3600) / 60), copy.minutes],
    [totalSeconds % 60, copy.seconds],
  ]

  return (
    <div className="countdown">
      {values.map(([value, label]) => (
        <div className="countdown__item" key={String(label)}>
          <strong>{String(value).padStart(2, '0')}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

function MainInvitation({ revealed, guestName }: { revealed: boolean; guestName: string }) {
  const names = event.partners
  const introTitle = guestName || copy.dearTitle
  const reduced = useReducedMotion()

  return (
    <main className="invitation">
      <section className={`hero ${revealed ? 'hero--active' : ''}`}>
        <img src={photoUrl} alt="Пара танцует" />
        <div className="hero__shade" />
        <div className="hero__content">
          <h1><span>{names.one}</span><i>&</i><span>{names.two}</span></h1>
          <div><span /><b>{copy.heroDate}</b><span /></div>
          <span className="hero__down" aria-hidden="true" />
        </div>
        <svg className="hero__tear" viewBox="0 0 640 46" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 22 C42 13 73 29 116 20 C153 12 180 29 220 22 C261 14 294 30 337 20 C380 10 413 28 455 20 C496 12 527 27 566 19 C596 13 619 18 640 14 L640 46 L0 46 Z" />
        </svg>
      </section>

      <AnimatedSection className="intro paper-section">
        <Reveal>
          <h2 className={getIntroTitleClass(introTitle, Boolean(guestName))}>{introTitle}</h2>
          <p>{copy.dearText}</p>
          <figure className="intro-photo">
            <motion.img
              src={introPhotoUrl}
              alt=""
              initial={reduced ? false : { scale: 1.08 }}
              whileInView={reduced ? undefined : { scale: 1.01 }}
              viewport={{ once: true, amount: 0.45 }}
              transition={{ duration: 9.5, ease: [0.16, 1, 0.3, 1] }}
            />
          </figure>
        </Reveal>
      </AnimatedSection>

      <AnimatedSection className="date-section dark-section">
        <Reveal className="date-card">
          <p>{copy.inviteText}</p>
          <div className="date-display">
            <span>{event.dateDay}</span>
            <div><b>{copy.month}</b><i>{copy.weekday}</i><small>{event.dateYear}</small></div>
          </div>
          <div className="date-time"><Icon name="calendar" /><span>{copy.timeLabel} {event.time}</span></div>
        </Reveal>
      </AnimatedSection>

      <AnimatedSection className="location paper-section">
        <Reveal>
          <SectionTitle number="01">{copy.locationLabel}</SectionTitle>
          <div className="location-card">
            <Icon name="map" />
            <h3>{event.venue}</h3>
            <p>{event.address}</p>
            <a className="outline-button" href={event.mapUrl} target="_blank" rel="noreferrer">{copy.mapButton}</a>
          </div>
        </Reveal>
      </AnimatedSection>

      <AnimatedSection className="countdown-section">
        <motion.img
          src={countdownPhotoUrl}
          alt=""
          initial={reduced ? false : { scale: 1.09 }}
          whileInView={reduced ? undefined : { scale: 1.01 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 9.5, ease: [0.16, 1, 0.3, 1] }}
        />
        <div className="countdown-section__shade" />
        <Reveal className="countdown-section__content">
          <span>{copy.countdownLabel}</span>
          <Countdown />
          <Icon name="heart" />
          <p>{copy.footer}</p>
          <h2>{names.one} <i>&</i> {names.two}</h2>
        </Reveal>
      </AnimatedSection>
    </main>
  )
}

function LinkGeneratorPage() {
  const [manualName, setManualName] = useState('')
  const [manualCopied, setManualCopied] = useState(false)
  const [batchCopied, setBatchCopied] = useState(false)
  const [rowCopiedId, setRowCopiedId] = useState('')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<GeneratedLink[]>([])
  const [error, setError] = useState('')
  const [parsing, setParsing] = useState(false)

  const manualLink = createGuestLink(manualName)
  const normalizedManualName = normalizeGuestName(manualName)
  const allLinksText = rows.map((row) => `${row.name} — ${row.url}`).join('\n')

  useEffect(() => {
    document.documentElement.lang = 'ru'
    document.body.classList.remove('is-locked')
  }, [])

  async function handleManualCopy() {
    await copyText(manualLink)
    setManualCopied(true)
    window.setTimeout(() => setManualCopied(false), 1800)
  }

  async function handleRowCopy(row: GeneratedLink) {
    await copyText(row.url)
    setRowCopiedId(row.id)
    window.setTimeout(() => setRowCopiedId(''), 1600)
  }

  async function handleBatchCopy() {
    if (!allLinksText) return
    await copyText(allLinksText)
    setBatchCopied(true)
    window.setTimeout(() => setBatchCopied(false), 1800)
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setParsing(true)
    setError('')
    setFileName(file.name)
    setRows([])

    try {
      const table = await readGuestRowsFromFile(file)

      const parsedRows = table
        .map((row, index) => {
          const firstValue = Array.isArray(row) ? row.find((cell) => normalizeGuestName(cell)) : ''
          const name = normalizeGuestName(firstValue)

          if (!name || (index === 0 && isHeaderLike(name))) return null

          return {
            id: `${index}-${name}`,
            name,
            url: createGuestLink(name),
          }
        })
        .filter((row): row is GeneratedLink => Boolean(row))

      if (!parsedRows.length) {
        throw new Error('Не нашёл имён в первом листе. Проверь, что имена стоят построчно в первом столбце или в первом непустом столбце строки.')
      }

      setRows(parsedRows)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Не удалось прочитать файл.')
    } finally {
      setParsing(false)
      event.target.value = ''
    }
  }

  return (
    <main className="link-generator">
      <section className="link-generator__hero">
        <a href={`${getInviteBaseUrl()}#/`} className="link-generator__back">← к приглашению</a>
        <span>A · A</span>
        <h1>Генератор персональных ссылок</h1>
        <p>Введите имя вручную или загрузите Excel-файл со списком гостей. Файлы читаются прямо в браузере и никуда не отправляются.</p>
      </section>

      <section className="generator-card generator-card--manual">
        <div className="generator-card__title">
          <span>01</span>
          <h2>Одна ссылка</h2>
        </div>

        <label className="generator-field">
          <span>Имя или обращение</span>
          <input
            value={manualName}
            onChange={(event) => setManualName(event.target.value)}
            placeholder="Николас с супругой"
            autoComplete="off"
          />
        </label>

        <div className="generated-preview">
          <span>{normalizedManualName ? 'Персональная ссылка' : 'Общая ссылка без имени'}</span>
          <code>{manualLink}</code>
        </div>

        <div className="generator-actions">
          <button type="button" onClick={handleManualCopy}>{manualCopied ? 'Скопировано' : 'Скопировать ссылку'}</button>
          <a href={manualLink} target="_blank" rel="noreferrer">Открыть</a>
        </div>
      </section>

      <section className="generator-card">
        <div className="generator-card__title">
          <span>02</span>
          <h2>Список из Excel</h2>
        </div>

        <label className="file-drop">
          <input type="file" accept=".xlsx,.csv,.txt" onChange={handleFileUpload} />
          <b>{parsing ? 'Читаю файл…' : 'Загрузить Excel / CSV'}</b>
          <small>Имена должны идти построчно. Берём первый непустой текст в каждой строке. Поддерживаются .xlsx, .csv и .txt.</small>
        </label>

        {fileName && <p className="file-note">Файл: {fileName}</p>}
        {error && <p className="generator-error">{error}</p>}

        {!!rows.length && (
          <>
            <div className="generator-summary">
              <span>Найдено гостей: {rows.length}</span>
              <button type="button" onClick={handleBatchCopy}>{batchCopied ? 'Скопировано' : 'Скопировать все ссылки'}</button>
            </div>

            <div className="generated-list">
              {rows.map((row) => (
                <article key={row.id}>
                  <div>
                    <b>{row.name}</b>
                    <code>{row.url}</code>
                  </div>
                  <button type="button" onClick={() => handleRowCopy(row)}>
                    {rowCopiedId === row.id ? 'OK' : 'Копировать'}
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  )
}

function InvitationApp() {
  const [guestName, setGuestName] = useState(getGuestNameFromUrl)
  const [opening, setOpening] = useState(false)
  const [gateVisible, setGateVisible] = useState(true)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [musicStarting, setMusicStarting] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const selectedMusicUrlRef = useRef<string | null>(null)
  const openTimer = useRef<number | null>(null)
  const musicStartTimer = useRef<number | null>(null)

  useSmoothWheelScroll(!gateVisible)

  useEffect(() => {
    document.documentElement.lang = 'ru'
  }, [])

  useEffect(() => {
    const updateGuestName = () => setGuestName(getGuestNameFromUrl())
    window.addEventListener('popstate', updateGuestName)
    return () => window.removeEventListener('popstate', updateGuestName)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('is-locked', gateVisible)
    return () => document.body.classList.remove('is-locked')
  }, [gateVisible])

  useEffect(() => () => {
    if (openTimer.current) window.clearTimeout(openTimer.current)
    if (musicStartTimer.current) window.clearTimeout(musicStartTimer.current)
  }, [])

  function prepareMusicTrack() {
    const audio = audioRef.current
    if (!audio) return null

    if (!selectedMusicUrlRef.current) {
      selectedMusicUrlRef.current = takeNextMusicUrl()
    }

    if (audio.getAttribute('src') !== selectedMusicUrlRef.current) {
      audio.setAttribute('src', selectedMusicUrlRef.current)
      audio.load()
    }

    return audio
  }

  function startMusic() {
    const audio = prepareMusicTrack()
    if (!audio) return
    audio.volume = 0.42
    setMusicStarting(true)
    void audio.play()
      .then(() => {
        setMusicPlaying(true)
        setMusicStarting(false)
      })
      .catch(() => {
        setMusicPlaying(false)
        setMusicStarting(false)
      })
  }

  function openInvitation() {
    if (opening) return
    prepareMusicTrack()
    setOpening(true)
    openTimer.current = window.setTimeout(() => {
      setMusicStarting(true)
      setGateVisible(false)
      musicStartTimer.current = window.setTimeout(startMusic, 320)
    }, 1750)
  }

  function toggleMusic() {
    const audio = audioRef.current
    if (!audio || musicStarting) return
    if (audio.paused) startMusic()
    else {
      audio.pause()
      setMusicPlaying(false)
      setMusicStarting(false)
    }
  }

  function playNextMusicTrack() {
    selectedMusicUrlRef.current = null
    startMusic()
  }

  const musicActive = musicPlaying || musicStarting

  return (
    <>
      <audio ref={audioRef} preload="none" onEnded={playNextMusicTrack} />
      <MainInvitation revealed={!gateVisible} guestName={guestName} />

      <div className="floating-controls">
        {!gateVisible && (
          <motion.button
            className={`music-toggle ${musicStarting ? 'music-toggle--starting' : ''}`}
            onClick={toggleMusic}
            aria-label={musicStarting ? copy.musicStarting : musicPlaying ? copy.musicOn : copy.musicOff}
            disabled={musicStarting}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Icon name={musicActive ? 'sound' : 'muted'} />
            {musicActive && <i />}
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {gateVisible && <EnvelopeGate opening={opening} onOpen={openInvitation} />}
      </AnimatePresence>
    </>
  )
}

export default function App() {
  const [linksRoute, setLinksRoute] = useState(isLinksRoute)

  useEffect(() => {
    const handleRoute = () => setLinksRoute(isLinksRoute())
    window.addEventListener('hashchange', handleRoute)
    window.addEventListener('popstate', handleRoute)
    return () => {
      window.removeEventListener('hashchange', handleRoute)
      window.removeEventListener('popstate', handleRoute)
    }
  }, [])

  return linksRoute ? <LinkGeneratorPage /> : <InvitationApp />
}
