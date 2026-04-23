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
  const [zprava, setZprava] = useState(null)

  useEffect(() => {
    overAurotizaci()
  }, [])

  async function overAurotizaci() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/')
      return
    }

    // Ověření, zda je uživatel skutečně admin/superadmin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
      alert('Sem mají přístup pouze správci!')
      router.push('/dashboard')
      return
    }

    nactiCekajiciRecepty()
  }

  async function nactiCekajiciRecepty() {
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
      .eq('status', 'ceka_na_schvaleni')
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error)
    } else {
      setRecepty(data || [])
    }
    setNacitani(false)
  }

  const upravTextReceptu = (id, pole, hodnota) => {
    setRecepty(recepty.map(r => r.id === id ? { ...r, [pole]: hodnota } : r))
  }

  async function zpracujRecept(id, novyStatus) {
    const recept = recepty.find(r => r.id === id)
    
    const { error } = await supabase
      .from('recipes')
      .update({ 
        status: novyStatus,
        title: recept.title,
        instructions: recept.instructions,
        description: recept.description
      })
      .eq('id', id)

    if (error) {
      alert('Chyba při aktualizaci: ' + error.message)
    } else {
      setZprava(`Recept byl úspěšně ${novyStatus === 'schvaleno' ? 'schválen' : 'zamítnut'}.`)
      setRecepty(recepty.filter(r => r.id !== id))
      setTimeout(() => setZprava(null), 3000)
    }
  }

  if (nacitani) return <div style={{ padding: '50px', textAlign: 'center' }}>Načítám návrhy ke kontrole...</div>

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ color: '#2ecc71' }}>Schvalovací centrum</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>Zde můžete upravit a schválit recepty od uživatelů.</p>

      {zprava && (
        <div style={{ backgroundColor: '#eafaf1', color: '#2ecc71', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #2ecc71' }}>
          {zprava}
        </div>
      )}

      {recepty.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#f9f9f9', borderRadius: '12px' }}>
          <h3>Vše je zkontrolováno!</h3>
          <p>Žádné další recepty nečekají na schválení.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {recepty.map(recept => (
            <div key={recept.id} style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '25px', backgroundColor: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              
              <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '5px' }}>Název receptu</label>
              <input 
                type="text" 
                value={recept.title} 
                onChange={(e) => upravTextReceptu(recept.id, 'title', e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '20px', fontWeight: 'bold', marginBottom: '15px', borderRadius: '6px', border: '1px solid #eee' }}
              />

              <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '5px' }}>Krátký popis</label>
              <textarea 
                value={recept.description} 
                onChange={(e) => upravTextReceptu(recept.id, 'description', e.target.value)}
                style={{ width: '100%', padding: '10px', height: '60px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #eee' }}
              />

              <div style={{ backgroundColor: '#f0fdf4', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                <h4 style={{ marginTop: 0, color: '#27ae60' }}>Ingredience:</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                  {recept.recipe_ingredients.map((ing, idx) => (
                    <li key={idx}>
                      {ing.amount} {ing.unit} - {ing.ingredients.origfdnm.replace(/\./g, ',')}
                    </li>
                  ))}
                </ul>
              </div>

              <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '5px' }}>Pracovní postup</label>
              <textarea 
                value={recept.instructions} 
                onChange={(e) => upravTextReceptu(recept.id, 'instructions', e.target.value)}
                style={{ width: '100%', padding: '10px', height: '200px', marginBottom: '20px', borderRadius: '6px', border: '1px solid #eee', lineHeight: '1.5' }}
              />

              <div style={{ display: 'flex', gap: '15px' }}>
                <button 
                  onClick={() => zpracujRecept(recept.id, 'schvaleno')}
                  style={{ flex: 2, padding: '12px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Schválit a uložit změny
                </button>
                <button 
                  onClick={() => zpracujRecept(recept.id, 'zamitnuto')}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Zamítnout
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
