export type Attendance = 'yes' | 'no'

export type RsvpPayload = {
  fullName: string
  attendance: Attendance
  language: 'ru' | 'hy'
}

export async function submitRsvp(payload: RsvpPayload): Promise<'supabase' | 'demo'> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined

  if (url && key) {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(url, key)
    const { error } = await supabase.from('rsvps').insert({
      full_name: payload.fullName,
      attendance: payload.attendance,
      language: payload.language,
    })

    if (error) throw error
    return 'supabase'
  }

  const saved = JSON.parse(localStorage.getItem('wedding-demo-rsvps') ?? '[]') as RsvpPayload[]
  saved.push(payload)
  localStorage.setItem('wedding-demo-rsvps', JSON.stringify(saved))
  return 'demo'
}
