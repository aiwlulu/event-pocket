import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  ImagePlus,
  LockKeyhole,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Ticket,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { clearEvents, deleteEvent, getEvents, replaceEvents, saveEvent, type EventPass } from './db'

type Backup = {
  app: 'event-pocket'
  version: 1
  exportedAt: string
  events: EventPass[]
}

const today = () => {
  const date = new Date()
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

const prettyDate = (date: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  new Date(date + 'T12:00:00').toLocaleDateString('en-US', options)

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read this image.'))
    reader.onerror = () => reject(new Error('Could not read this image.'))
    reader.readAsDataURL(file)
  })
}

function App() {
  const [events, setEvents] = useState<EventPass[]>([])
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState<EventPass | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<EventPass | null>(null)
  const [showImage, setShowImage] = useState(false)
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch(() => setNotice('Your browser could not open local storage. Try using the latest version of Safari or Chrome.'))
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3800)
    return () => window.clearTimeout(timer)
  }, [notice])

  const sortedEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return [...events]
      .filter((event) => !normalized || (event.title + ' ' + event.note).toLowerCase().includes(normalized))
      .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
  }, [events, query])

  const upcoming = sortedEvents.filter((event) => event.date >= today())
  const past = sortedEvents.filter((event) => event.date < today())

  function startAdd() {
    setEditing(null)
    setSelected(null)
    setShowForm(true)
  }

  function startEdit(event: EventPass) {
    setSelected(null)
    setEditing(event)
    setShowForm(true)
  }

  async function handleSave(event: EventPass) {
    try {
      await saveEvent(event)
      const updated = await getEvents()
      setEvents(updated)
      setShowForm(false)
      setEditing(null)
      setNotice(editing ? 'Event updated.' : 'Event saved on this device.')
    } catch {
      setNotice('Could not save this event. Your browser may be low on storage.')
    }
  }

  async function handleDelete(event: EventPass) {
    if (!window.confirm(`Delete “${event.title}” from this device?`)) return
    try {
      await deleteEvent(event.id)
      setEvents(await getEvents())
      setSelected(null)
      setNotice('Event deleted.')
    } catch {
      setNotice('Could not delete this event.')
    }
  }

  function exportBackup() {
    const backup: Backup = {
      app: 'event-pocket',
      version: 1,
      exportedAt: new Date().toISOString(),
      events,
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `event-pocket-backup-${today()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('Backup downloaded. Keep the file private because it contains your ticket images.')
  }

  async function importBackup(change: ChangeEvent<HTMLInputElement>) {
    const file = change.target.files?.[0]
    change.target.value = ''
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as Partial<Backup>
      if (parsed.app !== 'event-pocket' || parsed.version !== 1 || !Array.isArray(parsed.events)) {
        throw new Error('This file is not a supported Event Pocket backup.')
      }
      const valid = parsed.events.every((event) =>
        event && typeof event.id === 'string' && typeof event.title === 'string' &&
        typeof event.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(event.date) &&
        typeof event.note === 'string' &&
        (event.image === null || typeof event.image === 'string') &&
        typeof event.createdAt === 'string' && typeof event.updatedAt === 'string',
      )
      if (!valid) throw new Error('Some event data in this backup is invalid.')
      if (!window.confirm(`Import ${parsed.events.length} event(s)? This replaces the events currently saved in this browser.`)) return
      await replaceEvents(parsed.events as EventPass[])
      setEvents(await getEvents())
      setSelected(null)
      setNotice('Backup imported.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not import this backup.')
    }
  }

  async function handleClear() {
    if (!events.length) return
    if (!window.confirm('Clear every event and ticket image saved in this browser? This cannot be undone.')) return
    try {
      await clearEvents()
      setEvents([])
      setSelected(null)
      setNotice('All local events cleared.')
    } catch {
      setNotice('Could not clear local data.')
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <main className="mx-auto min-h-screen w-full max-w-[680px] px-5 pb-10 pt-8 sm:px-8 sm:pt-12">
        <header className="mb-10 flex items-center justify-between">
          <a href="./" className="flex items-center gap-3" aria-label="Event Pocket home">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand text-white shadow-card">
              <Ticket size={21} strokeWidth={2.2} />
            </span>
            <span>
              <span className="block text-[17px] font-bold tracking-[-0.03em]">Event Pocket</span>
              <span className="block text-xs text-muted">Your passes, close at hand</span>
            </span>
          </a>
          <span className="hidden items-center gap-1.5 rounded-full border border-line bg-white px-3 py-2 text-[11px] font-medium text-muted sm:flex">
            <LockKeyhole size={13} /> Stored on this device
          </span>
        </header>

        <section className="mb-8">
          <p className="mb-2 text-sm font-semibold text-brand">YOUR NEXT PLANS</p>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-[32px] font-bold leading-tight tracking-[-0.045em] sm:text-[38px]">Event passes</h1>
              <p className="mt-2 text-sm text-muted">Everything you need at the entrance.</p>
            </div>
            <button onClick={startAdd} className="hidden shrink-0 items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-blue-700 sm:flex">
              <Plus size={17} /> Add event
            </button>
          </div>
        </section>

        <div className="mb-6 flex h-12 items-center gap-3 rounded-2xl border border-line bg-white px-4 shadow-sm">
          <Search size={17} className="shrink-0 text-muted" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find an event" aria-label="Search events" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
          {query && <button onClick={() => setQuery('')} aria-label="Clear search" className="text-muted"><X size={17} /></button>}
        </div>

        {!loaded ? (
          <div className="rounded-3xl border border-line bg-white p-8 text-center text-sm text-muted">Loading your events…</div>
        ) : events.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
            <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-brand"><Ticket size={25} /></span>
            <h2 className="text-lg font-semibold">Your pocket is ready</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted">Add your first event and keep its ticket or QR code here for easy access.</p>
            <button onClick={startAdd} className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"><Plus size={17} /> Add your first event</button>
          </div>
        ) : sortedEvents.length === 0 ? (
          <div className="rounded-3xl border border-line bg-white p-8 text-center text-sm text-muted">No events match “{query}”.</div>
        ) : (
          <div className="space-y-8">
            <EventSection title="Upcoming" subtitle={upcoming.length ? `${upcoming.length} saved ${upcoming.length === 1 ? 'event' : 'events'}` : 'Nothing on your calendar yet'} events={upcoming} onSelect={setSelected} />
            {past.length > 0 && <EventSection title="Past events" subtitle="Your recent history" events={past} onSelect={setSelected} />}
          </div>
        )}

        <section className="mt-10 rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck size={19} /></span>
            <div>
              <h2 className="text-sm font-semibold">Private by design</h2>
              <p className="mt-1 text-xs leading-5 text-muted">Your events and ticket images stay in this browser. They are never uploaded.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <button onClick={exportBackup} disabled={!events.length} className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45"><Upload size={14} className="rotate-180" /> Export backup</button>
            <button onClick={() => importRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"><Upload size={14} /> Import backup</button>
            <button onClick={handleClear} disabled={!events.length} className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-45"><Trash2 size={14} /> Clear data</button>
            <input ref={importRef} type="file" accept="application/json,.json" onChange={importBackup} className="hidden" />
          </div>
        </section>
        <p className="mt-5 px-2 text-center text-[11px] leading-5 text-muted">Backups include your ticket images. Keep backup files private. Data stays separate on each browser and device.</p>
      </main>

      <button onClick={startAdd} aria-label="Add event" className="fixed bottom-5 right-5 z-20 grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-[0_8px_24px_rgba(52,120,246,.32)] transition hover:scale-105 hover:bg-blue-700 sm:hidden" style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
        <Plus size={25} />
      </button>

      {notice && <div role="status" className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-slate-900 px-5 py-3.5 text-center text-sm text-white shadow-xl">{notice}</div>}

      {showForm && <EventForm initial={editing} onClose={() => setShowForm(false)} onSave={handleSave} />}
      {selected && <EventDetails event={selected} onClose={() => setSelected(null)} onEdit={() => startEdit(selected)} onDelete={() => handleDelete(selected)} onShowImage={() => setShowImage(true)} />}
      {showImage && selected?.image && <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-slate-950 p-5" onClick={() => setShowImage(false)}>
        <button onClick={() => setShowImage(false)} aria-label="Close full-screen ticket" className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white"><X size={22} /></button>
        <img src={selected.image} alt={`${selected.title} ticket QR code`} className="max-h-[78vh] max-w-full rounded-2xl bg-white object-contain p-3" onClick={(event) => event.stopPropagation()} />
        <p className="mt-5 text-sm font-medium text-white">{selected.title} · {prettyDate(selected.date)}</p>
        <p className="mt-1 text-xs text-white/60">Show this image at the entrance</p>
      </div>}
    </div>
  )
}

function EventSection({ title, subtitle, events, onSelect }: { title: string; subtitle: string; events: EventPass[]; onSelect: (event: EventPass) => void }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between px-1">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
        </div>
      </div>
      {events.length ? <div className="space-y-3">
        {events.map((event) => <button key={event.id} onClick={() => onSelect(event)} className="group flex w-full items-center gap-4 rounded-[22px] border border-line bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg sm:p-5">
          <span className="flex h-[62px] w-[62px] shrink-0 flex-col items-center justify-center rounded-[18px] bg-blue-50 text-brand">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em]">{prettyDate(event.date, { month: 'short' })}</span>
            <span className="text-[23px] font-bold leading-6 tracking-tight">{prettyDate(event.date, { day: 'numeric' })}</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-semibold">{event.title}</span>
            <span className="mt-1 block truncate text-sm text-muted">{event.note || prettyDate(event.date)}</span>
          </span>
          <span className="flex items-center gap-1 text-sm font-semibold text-brand">View <ChevronRight size={17} className="transition group-hover:translate-x-0.5" /></span>
        </button>)}
      </div> : <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-6 text-center text-sm text-muted">No events here.</div>}
    </section>
  )
}

function EventForm({ initial, onClose, onSave }: { initial: EventPass | null; onClose: () => void; onSave: (event: EventPass) => Promise<void> }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [date, setDate] = useState(initial?.date ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [image, setImage] = useState<string | null>(initial?.image ?? null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file such as PNG, JPEG, or WEBP.')
      return
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('Please choose an image smaller than 12 MB.')
      return
    }
    try {
      setImage(await readImage(file))
      setError('')
    } catch {
      setError('Could not read this image.')
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || !date) return
    setSaving(true)
    const now = new Date().toISOString()
    await onSave({
      id: initial?.id ?? crypto.randomUUID(),
      title: title.trim(),
      date,
      note: note.trim(),
      image,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    })
    setSaving(false)
  }

  return <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="form-title" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-2xl safe-bottom sm:rounded-[28px] sm:p-7">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">{initial ? 'UPDATE YOUR PASS' : 'SAVE A NEW PASS'}</p>
          <h2 id="form-title" className="mt-1 text-2xl font-bold tracking-tight">{initial ? 'Edit event' : 'Add event'}</h2>
        </div>
        <button onClick={onClose} aria-label="Close form" className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
      </div>
      <form onSubmit={submit} className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Event name</span>
          <input required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Alishan Trip" className="h-12 w-full rounded-xl border border-line px-4 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-blue-100" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Event date</span>
          <span className="relative block w-full min-w-0 max-w-full overflow-hidden rounded-xl focus-within:ring-4 focus-within:ring-blue-100">
            <CalendarDays size={17} className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted" />
            <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="event-date-input h-12 w-full min-w-0 max-w-full rounded-xl border border-line bg-white pl-11 pr-3 text-sm outline-none transition focus:border-brand" />
          </span>
        </label>
        <div>
          <span className="mb-2 block text-sm font-semibold">Ticket or QR image <span className="font-normal text-muted">· optional</span></span>
          {image ? <div className="flex items-center gap-4 rounded-2xl border border-line bg-slate-50 p-3">
            <img src={image} alt="Ticket preview" className="h-16 w-16 rounded-xl bg-white object-contain p-1" />
            <div className="min-w-0 flex-1"><p className="text-sm font-medium">Image added</p><p className="mt-1 text-xs text-muted">Saved only on this device</p></div>
            <button type="button" onClick={() => setImage(null)} aria-label="Remove ticket image" className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-white hover:text-rose-600"><X size={17} /></button>
          </div> : <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-left transition hover:border-brand hover:bg-blue-50/50">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand shadow-sm"><ImagePlus size={19} /></span>
            <span><span className="block text-sm font-semibold">Choose an image</span><span className="mt-0.5 block text-xs text-muted">PNG, JPEG, or WEBP · up to 12 MB</span></span>
          </button>}
          <input ref={fileRef} type="file" accept="image/*" onChange={chooseImage} className="hidden" />
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Notes <span className="font-normal text-muted">· optional</span></span>
          <textarea maxLength={500} rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Booking details, seat number, or a reminder" className="w-full resize-none rounded-xl border border-line px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-blue-100" />
        </label>
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <button disabled={saving} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"><Check size={17} />{saving ? 'Saving…' : initial ? 'Save changes' : 'Save event'}</button>
      </form>
    </section>
  </div>
}

function EventDetails({ event, onClose, onEdit, onDelete, onShowImage }: { event: EventPass; onClose: () => void; onEdit: () => void; onDelete: () => void; onShowImage: () => void }) {
  return <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="details-title" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-2xl safe-bottom sm:rounded-[28px] sm:p-7">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <button onClick={onClose} aria-label="Back to events" className="mt-0.5 grid h-9 w-9 place-items-center rounded-full bg-slate-50 text-slate-600 sm:hidden"><ArrowLeft size={18} /></button>
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">{prettyDate(event.date)}</p><h2 id="details-title" className="mt-1 text-2xl font-bold tracking-tight">{event.title}</h2></div>
        </div>
        <button onClick={onClose} aria-label="Close details" className="hidden h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 sm:grid"><X size={20} /></button>
      </div>
      {event.image ? <button onClick={onShowImage} className="group relative flex min-h-56 w-full items-center justify-center overflow-hidden rounded-2xl border border-line bg-white p-5">
        <img src={event.image} alt={`${event.title} ticket or QR code`} className="max-h-72 max-w-full object-contain" />
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/70 to-transparent px-4 pb-3 pt-8 text-center text-xs font-medium text-white opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">Tap to enlarge for scanning</span>
      </button> : <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white text-muted shadow-sm"><ImagePlus size={21} /></span>
        <p className="text-sm font-medium">No ticket image yet</p><p className="mt-1 text-xs text-muted">Add a QR code or ticket image when you are ready.</p>
      </div>}
      {event.note && <div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted">Notes</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{event.note}</p></div>}
      <div className="mt-5 flex gap-3">
        <button onClick={onEdit} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-50 py-3 text-sm font-semibold text-brand transition hover:bg-blue-100"><Pencil size={16} /> Edit</button>
        <button onClick={onDelete} className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"><Trash2 size={16} /><span className="hidden sm:inline">Delete</span></button>
      </div>
    </section>
  </div>
}

export default App
