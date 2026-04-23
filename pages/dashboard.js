import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/router'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function Dashboard() {
  const router = useRouter()
  const [prihlasen, setPrihlasen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('user')
  const [nacitani, setNacitani] = useState(true)
  const [suroviny, setSuroviny] = useState([])
  const [chyba, setChyba] = useState(null)

  useEffect(() => {
    zkontrolujPrihlaseni()
  }, [])

  async function zkontrolujPrihlaseni() {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        // Pokud člověk není přihlášený, vyhodíme ho zpět na hlavní stránku
        router.push('/') 
        return
      }

      setPrihlasen(true)
      setEmail(session.user.email)

      // Načtení role z naší tabulky profilů
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      
      if (profile && !profileError) {
        setRole(profile.role)
      }
      
      // Rovnou zkusíme načíst malou ukázku surovin pro ověření databáze
      nactiSuroviny()
      
    } catch (err) {
      setChyba(err.message)
      setNacitani(false)
    }
  }
  
  async function nactiSuroviny() {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .limit(15) // Načteme prvních 15 položek pro ukázku
        
      if (error) {
        setChyba(error.message)
      } else if (data) {
        setSuroviny(data)
      }
    } catch (err) {
      setChyba(err.message)
    } finally {
      setNacitani(false)
    }
  }

  async function odhlasitSe() {
    await supabase.auth.signOut()
    router.push('/')
  }
  
  // Naše oblíbená funkce pro formátování teček na čárky v textech
  const formatujText = (text) => text ? text.replace(/\./g, ',') : ''

  if (nacitani) {
     return (
       <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
         <h2 style={{ color: '#2ecc71' }}>Načítám tvůj Foodplaner profil...</h2>
       </div>
     )
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      
      {chyba && (
        <div style={{ backgroundColor: '#fee', color: '#e74c3c', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <strong>Chyba:</strong> {chyba}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '30px' }}>
        <h1 style={{ color: '#2ecc71', margin: 0 }}>Foodplaner - Interní zóna</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '14px', color: '#555' }}>
            Přihlášen: <strong>{email}</strong> (Role: <strong>{role}</strong>)
          </span>
          <button onClick={odhlasitSe} style={{ padding: '8px 16px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Odhlásit se
          </button>
        </div>
      </div>

      {role === 'superadmin' && (
        <div style={{ backgroundColor: '#fdf2e9', padding: '25px', borderRadius: '12px', border: '1px solid #f39c12', marginBottom: '30px' }}>
          <h2 style={{ color: '#d35400', marginTop: 0 }}>Centrála Superadmina</h2>
          <p>Tady máš absolutní moc nad celým systémem. Zatím tu svítí jen tento panel, ale brzy sem přidáme nástroje pro kompletní správu všech uživatelů a jejich práv.</p>
        </div>
      )}

      {(role === 'admin' || role === 'superadmin') && (
        <div style={{ backgroundColor: '#ebf5fb', padding: '25px', borderRadius: '12px', border: '1px solid #3498db', marginBottom: '30px' }}>
          <h2 style={{ color: '#2980b9', marginTop: 0 }}>Nástroje Administrátora: Databáze Surovin</h2>
          <p>Spojení s databází funguje! Zde je ukázka prvních 15 surovin přímo z tvé obrovské tabulky:</p>
          
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '15px', border: '1px solid #ddd', marginTop: '15px' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
               {suroviny.length === 0 ? (
                 <li>Nebyly nalezeny žádné suroviny...</li>
               ) : (
                 suroviny.map(s => (
                  <li key={s.id} style={{ padding: '10px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                     <span style={{ fontWeight: 'bold', color: '#333' }}>{formatujText(s.origfdnm)}</span>
                     <span style={{ color: '#777' }}>{s.enerc_kcal} kcal / {s.prot_g}g bílkovin</span>
                  </li>
                 ))
               )}
            </ul>
          </div>
        </div>
      )}

      <div style={{ backgroundColor: '#eafaf1', padding: '25px', borderRadius: '12px', border: '1px solid #2ecc71' }}>
        <h2 style={{ color: '#27ae60', marginTop: 0 }}>Uživatelská zóna: Plánovač</h2>
        <p>Toto uvidí každý běžný uživatel po přihlášení. Tady si později bude moci procházet veřejnou databázi surovin, skládat z nich své vlastní oblíbené recepty a připravovat si zdravý jídelníček na celý týden.</p>
      </div>

    </div>
  )
}
