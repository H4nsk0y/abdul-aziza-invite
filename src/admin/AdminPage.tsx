import { createClient } from '@supabase/supabase-js'
import { AnimatePresence, motion } from 'motion/react'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import './admin.css'

type Rsvp = {
  id: string
  full_name: string
  attendance: 'yes' | 'no'
  language: 'ru' | 'hy'
  created_at: string
}

type AdminState = 'loading' | 'login' | 'ready'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string
const supabase = createClient(supabaseUrl, supabaseKey)

const allowedEmails = new Set(['ovsepyanannette@gmail.com', 'mirzoevhan77@mail.ru'])
const adminEmailKey = 'wedding-admin-email'

function AdminIcon({ name }: { name: 'guests' | 'yes' | 'no' | 'search' | 'refresh' | 'download' | 'trash' | 'logout' | 'mail' | 'shield' }) {
  const paths = {
    guests: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    yes: <path d="m4 12 5 5L20 6"/>,
    no: <><path d="M18 6 6 18M6 6l12 12"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    refresh: <><path d="M20 6v5h-5M4 18v-5h5"/><path d="M18.5 9A7 7 0 0 0 6 6.5L4 11M5.5 15A7 7 0 0 0 18 17.5l2-4.5"/></>,
    download: <><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-5"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    shield: <><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value)).replace(',', ' ·')
}

export default function AdminPage() {
  const [state, setState] = useState<AdminState>('loading')
  const [adminEmail, setAdminEmail] = useState('')
  const [email, setEmail] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [rows, setRows] = useState<Rsvp[]>([])
  const [query, setQuery] = useState('')
  const [loadingRows, setLoadingRows] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Rsvp | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  useEffect(() => {
    document.body.classList.remove('is-locked')
    document.body.classList.add('admin-mode')
    document.documentElement.lang = 'ru'
    return () => document.body.classList.remove('admin-mode')
  }, [])

  const loadRows = useCallback(async () => {
    setLoadingRows(true)
    setLoadError('')
    const { data, error } = await supabase
      .from('rsvps')
      .select('id, full_name, attendance, language, created_at')
      .order('created_at', { ascending: false })

    if (error) setLoadError('Не удалось загрузить ответы. Попробуйте обновить страницу.')
    else setRows((data ?? []) as Rsvp[])
    setLoadingRows(false)
  }, [])

  useEffect(() => {
    const savedEmail = localStorage.getItem(adminEmailKey)?.trim().toLowerCase() ?? ''
    if (allowedEmails.has(savedEmail)) {
      setAdminEmail(savedEmail)
      setEmail(savedEmail)
      setState('ready')
      void loadRows()
      return
    }

    localStorage.removeItem(adminEmailKey)
    setState('login')
  }, [loadRows])

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ru')
    if (!normalized) return rows
    return rows.filter((row) => row.full_name.toLocaleLowerCase('ru').includes(normalized))
  }, [query, rows])

  const stats = useMemo(() => ({
    total: rows.length,
    yes: rows.filter((row) => row.attendance === 'yes').length,
    no: rows.filter((row) => row.attendance === 'no').length,
  }), [rows])

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    setAuthMessage('')
    if (!allowedEmails.has(normalizedEmail)) {
      setAuthMessage('Этот email не добавлен в список администраторов.')
      return
    }

    localStorage.setItem(adminEmailKey, normalizedEmail)
    setAdminEmail(normalizedEmail)
    setState('ready')
    await loadRows()
  }

  function signOut() {
    localStorage.removeItem(adminEmailKey)
    setAdminEmail('')
    setRows([])
    setState('login')
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleteBusy(true)
    const { error } = await supabase.from('rsvps').delete().eq('id', deleteTarget.id)
    if (!error) setRows((current) => current.filter((row) => row.id !== deleteTarget.id))
    else setLoadError('Не удалось удалить запись. Обновите страницу и попробуйте ещё раз.')
    setDeleteBusy(false)
    setDeleteTarget(null)
  }

  function exportCsv() {
    const header = ['Имя и фамилия', 'Присутствие', 'Язык', 'Дата ответа']
    const lines = rows.map((row) => [
      row.full_name,
      row.attendance === 'yes' ? 'Придёт' : 'Не придёт',
      row.language.toUpperCase(),
      formatDate(row.created_at),
    ])
    const csv = [header, ...lines].map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'wedding-rsvp.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (state === 'loading') {
    return <div className="admin-loading"><span /><p>Загружаем…</p></div>
  }

  if (state === 'login') {
    return (
      <main className="admin-auth">
        <div className="admin-auth__grain" />
        <motion.section className="admin-auth__card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <div className="admin-auth__visual">
            <span className="admin-monogram">A <i>&</i> A</span>
            <p>Артур & Анна</p>
            <small>09.08.2026</small>
          </div>
          <div className="admin-auth__form">
            <span className="admin-kicker"><AdminIcon name="shield" /> Закрытый раздел</span>
            <h1>Ответы гостей</h1>
            <p>Введите email администратора. Если он есть в списке доступа, панель откроется сразу.</p>
            <form onSubmit={handleLogin}>
              <label>
                <span>Email</span>
                <div><AdminIcon name="mail" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="owner@example.com" required /></div>
              </label>
              <button type="submit">Войти</button>
            </form>
            {authMessage && <motion.div className="admin-auth__message" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{authMessage}</motion.div>}
            <a href={`${window.location.pathname}#/`}>← Вернуться к приглашению</a>
          </div>
        </motion.section>
      </main>
    )
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <a className="admin-brand" href={`${window.location.pathname}#/`}><span>A <i>&</i> A</span><div><b>Wedding</b><small>guest list</small></div></a>
        <div className="admin-account"><span>{adminEmail}</span><button onClick={signOut} aria-label="Выйти"><AdminIcon name="logout" /></button></div>
      </header>

      <div className="admin-content">
        <motion.div className="admin-title" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <div><span>Панель организатора</span><h1>Ответы гостей</h1></div>
          <p>Обновлено {new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date())}</p>
        </motion.div>

        <section className="admin-stats">
          {[
            { label: 'Всего ответов', value: stats.total, icon: 'guests' as const, tone: 'neutral' },
            { label: 'Будут с нами', value: stats.yes, icon: 'yes' as const, tone: 'positive' },
            { label: 'Не смогут прийти', value: stats.no, icon: 'no' as const, tone: 'negative' },
          ].map((item, index) => (
            <motion.article key={item.label} className={`admin-stat admin-stat--${item.tone}`} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 * index }}>
              <div><AdminIcon name={item.icon} /></div><span>{item.label}</span><strong>{item.value}</strong>
            </motion.article>
          ))}
        </section>

        <section className="admin-list-panel">
          <div className="admin-toolbar">
            <label className="admin-search"><AdminIcon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти гостя…" /></label>
            <div>
              <button onClick={loadRows} disabled={loadingRows} title="Обновить"><AdminIcon name="refresh" /><span>Обновить</span></button>
              <button onClick={exportCsv} disabled={!rows.length} title="Скачать CSV"><AdminIcon name="download" /><span>Скачать CSV</span></button>
            </div>
          </div>

          {loadError && <p className="admin-error">{loadError}</p>}

          <div className="admin-table" aria-busy={loadingRows}>
            <div className="admin-table__head"><span>Гость</span><span>Ответ</span><span>Язык</span><span>Получен</span><span /></div>
            <AnimatePresence initial={false}>
              {filteredRows.map((row) => (
                <motion.article className="admin-row" key={row.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30 }}>
                  <div className="admin-row__guest"><span>{row.full_name.trim().charAt(0).toUpperCase()}</span><div><b>{row.full_name}</b><small>ID · {row.id.slice(0, 8)}</small></div></div>
                  <div><span className={`admin-status admin-status--${row.attendance}`}>{row.attendance === 'yes' ? <AdminIcon name="yes" /> : <AdminIcon name="no" />}{row.attendance === 'yes' ? 'Придёт' : 'Не придёт'}</span></div>
                  <div><span className="admin-language">{row.language.toUpperCase()}</span></div>
                  <time>{formatDate(row.created_at)}</time>
                  <button className="admin-delete" onClick={() => setDeleteTarget(row)} aria-label={`Удалить ответ ${row.full_name}`}><AdminIcon name="trash" /></button>
                </motion.article>
              ))}
            </AnimatePresence>
            {!loadingRows && !filteredRows.length && <div className="admin-empty"><AdminIcon name="guests" /><h3>{query ? 'Ничего не найдено' : 'Ответов пока нет'}</h3><p>{query ? 'Попробуйте изменить поисковый запрос.' : 'Новые ответы гостей появятся здесь автоматически.'}</p></div>}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div className="admin-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteTarget(null) }}>
            <motion.div className="admin-modal" initial={{ opacity: 0, y: 22, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .97 }}>
              <div className="admin-modal__icon"><AdminIcon name="trash" /></div>
              <span>Удаление записи</span>
              <h2>Удалить ответ гостя?</h2>
              <p><b>{deleteTarget.full_name}</b> исчезнет из списка. Это действие нельзя отменить.</p>
              <div><button onClick={() => setDeleteTarget(null)} disabled={deleteBusy}>Отмена</button><button className="danger" onClick={confirmDelete} disabled={deleteBusy}>{deleteBusy ? 'Удаляем…' : 'Удалить'}</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
