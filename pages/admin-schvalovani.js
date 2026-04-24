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
      .eq('status', 'AI') 
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
    
    if (!error) {
      setRecepty(recepty.filter(re => re.id !== id))
    } else {
      alert('Chyba při ukládání: ' + error.message)
    }
  }

  if (nacitani) return <div style={{ padding: '50px', textAlign: 'center' }}>Načítám záznamy k posouzení...</div>

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ color: '#2ecc71' }}>Administrátorský dohled</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>Zde zkontroluj návrhy od automatiky a schval je do katalogu.</p>

      {recepty.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#f9f9f9', borderRadius: '12px' }}>
          <h3>Vše je zkontrolováno!</h3>
          <p>Žádné další recepty nečekají na posouzení.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {recepty.map(recept => (
            <div key={recept.id} style={{ border: '2px solid #ddd', borderRadius: '15px', padding: '25px', backgroundColor: 'white' }}>
              
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                {recept.user_image_url && (
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#555' }}>Foto od uživatele:</p>
                    <img src={recept.user_image_url} style={{ width: '100%', borderRadius: '8px', border: '1px solid #eee' }} alt="Uživatelské foto" />
                  </div>
                )}
                <div style={{ flex: recept.user_image_url ? 2 : 1 }}>
                  <h4 style={{ color: '#3498db', marginTop: 0 }}>Návrh k vylepšení:</h4>
                  <p style={{ fontSize: '13px', backgroundColor: '#f0f7ff', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #3498db', whiteSpace: 'pre-wrap' }}>
                    {recept.ai_feedback || "Žádná zpětná vazba není k dispozici."}
                  </p>
                  <button 
                    onClick={() => upravTextReceptu(recept.id, 'instructions', recept.ai_suggested_instructions)}
                    style={{ padding: '8px 16px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                  >
                    Použít navržený postup
                  </button>
                </div>
              </div>

              <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '5px' }}>Název jídla</label>
              <input 
                type="text" 
                value={recept.title} 
                onChange={(e) => upravTextReceptu(recept.id, 'title', e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '20px', fontWeight: 'bold', marginBottom: '15px', borderRadius: '6px', border: '1px solid #eee' }}
              />

              <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '5px' }}>Krátký popis</label>
              <textarea 
                value={recept.description || ''} 
                onChange={(e) => upravTextReceptu(recept.id, 'description', e.target.value)}
                style={{ width: '100%', padding: '10px', height: '60px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #eee' }}
              />

              <div style={{ backgroundColor: '#f0fdf4', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                <h4 style={{ marginTop: 0, color: '#27ae60' }}>Zadané ingredience:</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                  {recept.recipe_ingredients.map((ing, idx) => (
                    <li key={idx}>
                      <strong>{ing.amount} {ing.unit}</strong> - {ing.ingredients?.origfdnm.replace(/\./g, ',')}
                    </li>
                  ))}
                </ul>
              </div>

              <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '5px' }}>Pracovní postup</label>
              <textarea 
                value={recept.instructions} 
                onChange={(e) => upravTextReceptu(recept.id, 'instructions', e.target.value)}
                style={{ width: '100%', height: '200px', padding: '10px', borderRadius: '8px', border: '1px solid #eee', lineHeight: '1.5' }}
              />

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => zpracujRecept(recept.id, 'AD')} style={{ flex: 1, padding: '15px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>SCHVÁLIT (Přidat do katalogu)</button>
                <button onClick={() => zpracujRecept(recept.id, 'zamitnuto')} style={{ padding: '15px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Zamítnout</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
