import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Bariatrická Appka - Vítejte!</h1>
      <p>Web je propojen se Supabase a běží na Vercelu.</p>
      <button onClick={() => alert('Tady bude registrace!')}>Začít</button>
    </div>
  )
}
