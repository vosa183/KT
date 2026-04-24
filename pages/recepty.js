import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/router'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function Recepty() {
  const router = useRouter()
  const [recepty, setRecepty] = useState([])
  const [nacitani, setNacitani] = useState(true)

  useEffect(() => {
    nactiSchvaleneRecepty()
  }, [])

  async function nactiSchvaleneRecepty() {
    setNacitani(true)
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients (
          amount,
          unit,
          ingredients (origfdnm)
        )
      `)
      .eq('status', 'AD') // Pouze recepty schválené administrátorem
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Chyba při načítání receptů:", error)
    } else {
      setRecepty(data || [])
    }
    setNacitani(false)
  }

  if (nacitani) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif', color: '#2ecc71' }}>
        <h2>Načítám kuchařku...</h2>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ color: '#2ecc71', margin: '0 0 10px 0', fontSize: '36px' }}>Katalog receptů</h1>
          <p style={{ color: '#666', margin: 0, fontSize: '18px' }}>Prozkoumej jídla schválená naší komunitou a AI šéfkuchařem.</p>
        </div>
        <button 
          onClick={() => router.push('/dashboard')}
          style={{ padding: '10px 20px', backgroundColor: '#fff', color: '#2ecc71', border: '2px solid #2ecc71', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Zpět na přehled
        </button>
      </div>

      {recepty.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #ddd' }}>
          <h3>Zatím tu nic není.</h3>
          <p>Žádný recept ještě nebyl schválen. Buď první, kdo nějaký do Foodplaneru přidá!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '30px' }}>
          {recepty.map(recept => (
            <div key={recept.id} style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #eee', display: 'flex', flexDirection: 'column' }}>
              
              {/* Zástupný blok pro budoucí AI obrázek */}
              <div style={{ height: '200px', backgroundColor: '#eafaf1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #eee' }}>
                <span style={{ color: '#2ecc71', opacity: 0.5, fontWeight: 'bold' }}>[ Zde se objeví AI fotka ]</span>
              </div>

              <div style={{ padding: '25px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '22px' }}>{recept.title}</h2>
                <p style={{ color: '#777', fontSize: '14px', lineHeight: '1.5', flex: 1, margin: '0 0 20px 0' }}>
                  {recept.description || "Tento recept zatím nemá žádný krátký popis."}
                </p>
                
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', fontSize: '13px', color: '#555', flexWrap: 'wrap' }}>
                  <span style={{ backgroundColor: '#f0fdf4', padding: '6px 12px', borderRadius: '20px', border: '1px solid #d1fae5', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    ⏱ {recept.cooking_time_minutes} min
                  </span>
                  <span style={{ backgroundColor: '#f0fdf4', padding: '6px 12px', borderRadius: '20px', border: '1px solid #d1fae5', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    👨‍🍳 Porce: {recept.servings}
                  </span>
                  <span style={{ backgroundColor: '#f0fdf4', padding: '6px 12px', borderRadius: '20px', border: '1px solid #d1fae5', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    📊 {recept.difficulty === 'easy' ? 'Snadné' : recept.difficulty === 'medium' ? 'Střední' : 'Těžké'}
                  </span>
                </div>

                <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>Ingredience:</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#555' }}>
                    {recept.recipe_ingredients.map((ing, idx) => (
                      <li key={idx} style={{ marginBottom: '5px' }}>
                        <strong>{ing.amount} {ing.unit}</strong> {ing.ingredients?.origfdnm.replace(/\./g, ',')}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>Postup:</h4>
                  <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {recept.instructions}
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  )
}
