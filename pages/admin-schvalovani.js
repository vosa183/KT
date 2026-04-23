import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/router'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function AdminSchvalovani() {
  const router = useRouter()
  const [recepty, setRecepty] = useState([])
  const [nacitani, setNacitani] = useState(true)

  useEffect(() => {
    overAurotizaci()
  }, [])

  async function overAurotizaci() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return; }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    if (!profile || !['admin', 'superadmin'].includes(profile.role)) { router.push('/dashboard'); return; }
    nactiCekajiciRecepty()
  }

  async function nactiCekajiciRecepty() {
    setNacitani(true)
    const { data } = await supabase
      .from('recipes')
      .select(`*, recipe_ingredients (amount, unit, ingredients (origfdnm))`)
      .eq('status', 'AI') // Hledáme ty, co už prošly AI kontrolou
      .order('created_at', { ascending: true })
    setRecepty(data || [])
    setNacitani(false)
  }

  const upravTextReceptu = (id, pole, hodnota) => {
    setRecepty(recepty.map(r => r.id === id ? { ...r, [pole]: hodnota } : r))
  }

  async function zpracujRecept(id, novyStatus) {
    const r = recepty.find(re => re.id === id)
    const { error } = await supabase.from('recipes').update({ 
      status: novyStatus, 
      title: r.title, 
      instructions: r.instructions, 
      description: r.description 
    }).eq('id', id)
    if (!error) setRecepty(recepty.filter(re => re.id !== id))
  }

  if (nacitani) return <div style={{ padding: '50px', textAlign: 'center' }}>Načítám kousky k posouzení...</div>

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>Administrátorský dohled (Stav AI → AD)</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        {recepty.map(recept => (
          <div key={recept.id} style={{ border: '2px solid #ddd', borderRadius: '15px', padding: '25px', backgroundColor: 'white' }}>
            <h2>{recept.title}</h2>
            
            <div style={{ backgroundColor: '#ebf5fb', padding: '15px', borderRadius: '10px', marginBottom: '20px', borderLeft: '5px solid #3498db' }}>
              <h4 style={{ color: '#2980b9', marginTop: 0 }}>Zpětná vazba od AI:</h4>
              <p style={{ fontSize: '14px', fontStyle: 'italic' }}>{recept.ai_feedback}</p>
              <button 
                onClick={() => upravTextReceptu(recept.id, 'instructions', recept.ai_suggested_instructions)}
                style={{ padding: '5px 10px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                Použít postup navržený AI
              </button>
            </div>

            <textarea 
              value={recept.instructions} 
              onChange={(e) => upravTextReceptu(recept.id, 'instructions', e.target.value)}
              style={{ width: '100%', height: '200px', padding: '10px', borderRadius: '8px' }}
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => zpracujRecept(recept.id, 'AD')} style={{ flex: 1, padding: '15px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>SCHVÁLIT (Stav AD)</button>
              <button onClick={() => zpracujRecept(recept.id, 'zamitnuto')} style={{ padding: '15px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px' }}>Zamítnout</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
