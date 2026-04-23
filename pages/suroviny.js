import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function Suroviny() {
  const [suroviny, setSuroviny] = useState([])
  const [nacitani, setNacitani] = useState(true)
  const [chyba, setChyba] = useState(null)

  useEffect(() => {
    nactiKompletniDatabazi()
  }, [])

  async function nactiKompletniDatabazi() {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('id', { ascending: true })
        
      if (error) {
        throw error
      } else if (data) {
        setSuroviny(data)
      }
    } catch (err) {
      setChyba(err.message)
    } finally {
      setNacitani(false)
    }
  }

  const formatujText = (text) => text ? text.replace(/\./g, ',') : ''
  const formatujCislo = (cislo) => cislo !== null && cislo !== undefined ? cislo.toLocaleString('cs-CZ') : '-'

  if (nacitani) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
        <h2 style={{ color: '#2ecc71' }}>Načítám kompletní databázi surovin...</h2>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '30px' }}>
        <h1 style={{ color: '#2ecc71', margin: 0 }}>Kompletní databáze surovin</h1>
      </div>

      {chyba && (
        <div style={{ backgroundColor: '#fee', color: '#e74c3c', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <strong>Chyba:</strong> {chyba}
        </div>
      )}

      <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #ddd' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', whiteSpace: 'nowrap' }}>
          <thead>
            <tr style={{ backgroundColor: '#2ecc71', color: 'white', textAlign: 'left' }}>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>ID</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>Kód</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>Název česky</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>Název anglicky</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>Vědecký název</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>Jedlý podíl</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>NCF</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>FACF</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>Energie (kJ)</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>Energie (kcal)</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>Tuky (g)</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>Nasycené (g)</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>Mononenasycené (g)</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>Polynenasycené (g)</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>Trans mastné (g)</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>Sacharidy celkem (g)</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>Využitelné sach. (g)</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>Cukry (g)</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>Vláknina (g)</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>Bílkoviny (g)</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>Popeloviny (g)</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>Sodík (mg)</th>
              <th style={{ padding: '12px', borderRight: '1px solid #27ae60' }}>Sůl (g)</th>
              <th style={{ padding: '12px' }}>Voda (g)</th>
            </tr>
          </thead>
          <tbody>
            {suroviny.map((polozka, index) => (
              <tr key={polozka.id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9', borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px', borderRight: '1px solid #eee' }}>{polozka.id}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee' }}>{polozka.origfdcd}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee', fontWeight: 'bold' }}>{formatujText(polozka.origfdnm)}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee' }}>{formatujText(polozka.engfdnam)}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee', fontStyle: 'italic' }}>{formatujText(polozka.scinam)}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee' }}>{formatujCislo(polozka.edible)}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee' }}>{formatujCislo(polozka.ncf)}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee' }}>{formatujCislo(polozka.facf)}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee', backgroundColor: '#f0fdf4' }}>{formatujCislo(polozka.enerc_kj)}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee', backgroundColor: '#f0fdf4', fontWeight: 'bold' }}>{formatujCislo(polozka.enerc_kcal)}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee' }}>{formatujCislo(polozka.fat_g)}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee' }}>{formatujCislo(polozka.fasat_g)}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee' }}>{formatujCislo(polozka.fams_g)}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee' }}>{formatujCislo(polozka.fapu_g)}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee' }}>{formatujCislo(polozka.fatrn_g)}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee' }}>{formatujCislo(polozka.chot_g)}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee' }}>{formatujCislo(polozka.cho_g)}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee' }}>{formatujCislo(polozka.sugar_g)}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee' }}>{formatujCislo(polozka.fibt_g)}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee', fontWeight: 'bold' }}>{formatujCislo(polozka.prot_g)}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee' }}>{formatujCislo(polozka.ash_g)}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee' }}>{formatujCislo(polozka.na_mg)}</td>
                <td style={{ padding: '10px', borderRight: '1px solid #eee' }}>{formatujCislo(polozka.nacl_g)}</td>
                <td style={{ padding: '10px' }}>{formatujCislo(polozka.water_g)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}
