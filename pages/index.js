import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/router'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function Home() {
  const router = useRouter()
  const [jeRegistrace, setJeRegistrace] = useState(false)
  const [email, setEmail] = useState('')
  const [heslo, setHeslo] = useState('')
  const [chyba, setChyba] = useState(null)
  const [zprava, setZprava] = useState(null)
  const [nacitani, setNacitani] = useState(false)

  useEffect(() => {
    zkontrolujPrihlaseni()
  }, [])

  // Pokud je uživatel už přihlášený, hned ho pošleme do aplikace (na novou stránku)
  async function zkontrolujPrihlaseni() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      router.push('/dashboard') // Tuto stránku vytvoříme v dalším kroku
    }
  }

  async function handleAuth(e) {
    e.preventDefault()
    setNacitani(true)
    setChyba(null)
    setZprava(null)

    try {
      if (jeRegistrace) {
        const { error } = await supabase.auth.signUp({ email, password: heslo })
        if (error) {
          throw error
        } else {
          setZprava('Registrace úspěšná! Nyní tě přesměruji...')
          setTimeout(() => router.push('/dashboard'), 1500)
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: heslo })
        if (error) {
          throw error
        } else {
          router.push('/dashboard')
        }
      }
    } catch (chybaPripojeni) {
      setChyba(chybaPripojeni.message)
    } finally {
      setNacitani(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'sans-serif', backgroundColor: '#f9f9f9' }}>
      
      {/* LEVÁ STRANA - PROSTOR PRO GRAFIKU A TEXTY */}
      <div style={{ flex: 1, backgroundColor: '#2ecc71', color: 'white', padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1 style={{ fontSize: '48px', margin: '0 0 20px 0' }}>Foodplaner</h1>
        <p style={{ fontSize: '20px', lineHeight: '1.6', marginBottom: '40px', maxWidth: '500px' }}>
          Vítej ve svém novém osobním asistentovi pro plánování jídelníčku. 
          Spojujeme rozsáhlou databázi surovin s chytrou tvorbou receptů. 
          Začni plánovat zdravěji a efektivněji už dnes.
        </p>
        
        {/* Zde je připravený zástupný blok pro tvůj obrázek/grafiku */}
        <div style={{ 
          width: '100%', 
          maxWidth: '500px', 
          height: '300px', 
          backgroundColor: 'rgba(255,255,255,0.2)', 
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px dashed rgba(255,255,255,0.5)'
        }}>
          <span style={{ fontSize: '18px' }}>[ Zde bude tvoje grafika / ilustrace ]</span>
        </div>
      </div>

      {/* PRAVÁ STRANA - PŘIHLÁŠENÍ */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '10px' }}>
            {jeRegistrace ? 'Vytvořit nový účet' : 'Vítejte zpět'}
          </h2>
          <p style={{ textAlign: 'center', color: '#777', marginBottom: '30px', fontSize: '14px' }}>
            {jeRegistrace ? 'Vyplň údaje pro registraci' : 'Přihlášení do systému Foodplaner'}
          </p>
          
          {chyba && <div style={{ backgroundColor: '#fee', color: '#e74c3c', padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px' }}>{chyba}</div>}
          {zprava && <div style={{ backgroundColor: '#eef', color: '#2ecc71', padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px' }}>{zprava}</div>}
          
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#555' }}>E-mail</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }} 
                required 
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#555' }}>Heslo</label>
              <input 
                type="password" 
                value={heslo} 
                onChange={(e) => setHeslo(e.target.value)} 
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }} 
                required 
              />
            </div>

            <button disabled={nacitani} style={{ padding: '14px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '10px' }}>
              {nacitani ? 'Pracuji...' : (jeRegistrace ? 'Zaregistrovat se' : 'Přihlásit se')}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '30px', fontSize: '14px', color: '#777' }}>
            {jeRegistrace ? 'Už máš účet?' : 'Nemáš ještě účet?'} 
            <button onClick={() => setJeRegistrace(!jeRegistrace)} style={{ background: 'none', border: 'none', color: '#2ecc71', cursor: 'pointer', fontWeight: 'bold', marginLeft: '5px' }}>
              {jeRegistrace ? 'Přihlásit se' : 'Zaregistrovat se'}
            </button>
          </p>
        </div>
      </div>

    </div>
  )
}
