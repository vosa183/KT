import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function Home() {
  const [suroviny, setSuroviny] = useState([])
  const [nacteno, setNacteno] = useState(false)
  const [chyba, setChyba] = useState(null)

  useEffect(() => {
    async function nactiData() {
      try {
        const { data, error } = await supabase
          .from('ingredients')
          .select('*')
          .order('id', { ascending: true })
        
        if (error) {
          setChyba(error.message)
        } else if (data) {
          setSuroviny(data)
        }
      } catch (err) {
        setChyba(err.message)
      } finally {
        setNacteno(true)
      }
    }
    nactiData()
  }, [])

  // Funkce pro krásné zobrazení čísel a textu
  const formatujText = (text) => text ? text.replace(/\./g, ',') : ''
  const formatujCislo = (cislo) => cislo !== null && cislo !== undefined ? cislo.toLocaleString('cs-CZ') : '-'

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ color: '#2ecc71', textAlign: 'center' }}>Foodplaner - Kompletní Databáze</h1>
      
      <div style={{ marginTop: '20px', marginBottom: '30px', border: '1px solid #ddd', padding: '20px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h3 style={{ marginTop: '0' }}>Stav systému:</h3>
        <p>Databáze: Připojeno a načteno ✅</p>
        {chyba && <p style={{ color: 'red' }}>Chyba načítání: {chyba}</p>}
      </div>

      {!nacteno ? (
        <p style={{ textAlign: 'center', fontSize: '18px' }}>Načítám kompletní data ze Supabase, prosím o strpení...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#2ecc71', color: 'white', textAlign: 'left' }}>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>ID</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Kód</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Název česky</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Název anglicky</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Vědecký název</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Energie (kJ)</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Energie (kcal)</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Bílkoviny (g)</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Sacharidy celkem (g)</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Z toho cukry (g)</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Tuky celkem (g)</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Nasycené mastné kys. (g)</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Vláknina (g)</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Sůl (g)</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Voda (g)</th>
              </tr>
            </thead>
            <tbody>
              {suroviny.map((polozka) => (
                <tr key={polozka.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{polozka.id}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{polozka.origfdcd}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>{formatujText(polozka.origfdnm)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{formatujText(polozka.engfdnam)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', fontStyle: 'italic' }}>{formatujText(polozka.scinam)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{formatujCislo(polozka.enerc_kj)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{formatujCislo(polozka.enerc_kcal)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{formatujCislo(polozka.prot_g)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{formatujCislo(polozka.cho_g)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{formatujCislo(polozka.sugar_g)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{formatujCislo(polozka.fat_g)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{formatujCislo(polozka.fasat_g)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{formatujCislo(polozka.fibt_g)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{formatujCislo(polozka.nacl_g)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{formatujCislo(polozka.water_g)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
