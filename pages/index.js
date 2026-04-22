import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function Home() {
  const [prihlasen, setPrihlasen] = useState(false)
  const [jeRegistrace, setJeRegistrace] = useState(false)
  const [email, setEmail] = useState('')
  const [heslo, setHeslo] = useState('')
  const [role, setRole] = useState('user')
  const [chyba, setChyba] = useState(null)
  const [zprava, setZprava] = useState(null)
  const [nacitani, setNacitani] = useState(false)

  useEffect(() => {
    zkontrolujPrihlaseni()
  }, [])

  async function zkontrolujPrihlaseni() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setPrihlasen(true)
      // Načtení role z tabulky profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      
      if (profile) setRole(profile.role)
    }
  }

  async function handleAuth(e) {
    e.preventDefault()
    setNacitani(true)
    setChyba(null)
    setZprava(null)

    if (jeRegistrace) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setChyba(error.message)
      else setZprava('Registrace úspěšná! Zkontroluj si e-mail pro potvrzení (pokud máš zapnuté potvrzování).')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setChyba(error.message)
      else zkontrolujPrihlaseni()
    }
    setNacitani(false)
  }

  async function odhlasitSe() {
    await supabase.auth.signOut()
    setPrihlasen(false)
    setRole('user')
  }

  if (!prihlasen) {
    return (
      <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '400px', margin: '100px auto', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center', color: '#2ecc71' }}>Foodplaner</h2>
        <p style={{ textAlign: 'center', fontSize: '14px' }}>{jeRegistrace ? 'Vytvořit nový účet' : 'Přihlášení do systému'}</p>
        
        {chyba && <p style={{ color: 'red', textAlign: 'center', fontSize: '14px' }}>{chyba}</p>}
        {zprava && <p style={{ color: 'green', textAlign: 'center', fontSize: '14px' }}>{zprava}</p>}
        
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input type="email" placeholder="Tvůj e-mail" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }} required />
          <input type="password" placeholder="Heslo (min. 6 znaků)" value={heslo} onChange={(e) => setHeslo(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }} required />
          <button disabled={nacitani} style={{ padding: '12px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {nacitani ? 'Pracuji...' : (jeRegistrace ? 'Zaregistrovat se' : 'Vstoupit do aplikace')}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
          {jeRegistrace ? 'Už máš účet?' : 'Ještě nemáš účet?'} 
          <button onClick={() => setJeRegistrace(!jeRegistrace)} style={{ background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', textDecoration: 'underline', marginLeft: '5px' }}>
            {jeRegistrace ? 'Přihlásit se' : 'Zaregistrovat se'}
          </button>
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '30px' }}>
        <h1 style={{ color: '#2ecc71', margin: 0 }}>Foodplaner</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontWeight: 'bold' }}>Uživatel: {email} ({role})</span>
          <button onClick={odhlasitSe} style={{ padding: '8px 16px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Odhlásit se</button>
        </div>
      </div>

      {role === 'superadmin' && <div style={{ backgroundColor: '#fdf2e9', padding: '20px', borderRadius: '8px', border: '1px solid #f39c12', marginBottom: '20px' }}><h2>Centrála Superadmina</h2><p>Plný přístup ke správě systému.</p></div>}
      {(role === 'admin' || role === 'superadmin') && <div style={{ backgroundColor: '#ebf5fb', padding: '20px', borderRadius: '8px', border: '1px solid #3498db', marginBottom: '20px' }}><h2>Nástroje Administrátora</h2><p>Správa surovin a receptů.</p></div>}
      <div style={{ backgroundColor: '#eafaf1', padding: '20px', borderRadius: '8px', border: '1px solid #2ecc71' }}><h2>Uživatelská zóna</h2><p>Tady brzy uvidíš své recepty a jídelníčky.</p></div>
    </div>
  )
}
