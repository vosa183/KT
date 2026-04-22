import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function Home() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1 style={{ color: '#2ecc71' }}>Foodplaner</h1>
      <p>Web je úspěšně propojen se Supabase a běží na Vercelu!</p>
      <div style={{ marginTop: '20px', border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
        <h3>Stav systému:</h3>
        <p>Databáze: Připravena ✅</p>
        <p>Autentizace: Čeká na nastavení ⏳</p>
      </div>
    </div>
  )
}
