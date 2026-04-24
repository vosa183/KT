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

  const [hledanyText, setHledanyText] = useState('')
  const [naseptavac, setNaseptavac] = useState([])
  const [aktivniReceptId, setAktivniReceptId] = useState(null)

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
      .select(`*, recipe_ingredients (id, amount, unit, ingredient_id, ingredients (id, origfdnm))`)
      .eq('status', 'AI') 
      .order('created_at', { ascending: true })
    setRecepty(data || [])
    setNacitani(false)
  }

  useEffect(() => {
    const hledejSuroviny = async () => {
      if (hledanyText.length < 2) { setNaseptavac([]); return; }
      const { data } = await supabase
        .from('ingredients')
        .select('id, origfdnm')
        .ilike('origfdnm', `%${hledanyText}%`)
        .limit(10)
      setNaseptavac(data || [])
    }
    const timeout = setTimeout(hledejSuroviny, 300)
    return () => clearTimeout(timeout)
  }, [hledanyText])

  const pridejSurovinu = (receptId, surovina) => {
    setRecepty(recepty.map(r => {
      if (r.id === receptId) {
        if (!r.recipe_ingredients.find(ing => ing.ingredient_id === surovina.id)) {
          return {
            ...r,
            recipe_ingredients: [
              ...r.recipe_ingredients,
              { ingredient_id: surovina.id, amount: '', unit: 'g', ingredients: surovina }
            ]
          }
        }
      }
      return r
    }))
    setHledanyText('')
    setNaseptavac([])
    setAktivniReceptId(null)
  }

  const upravHodnotuSuroviny = (receptId, indexSuroviny, pole, hodnota) => {
    setRecepty(recepty.map(r => {
      if (r.id === receptId) {
        const upraveneSuroviny = [...r.recipe_ingredients]
        upraveneSuroviny[indexSuroviny] = { ...upraveneSuroviny[indexSuroviny], [pole]: hodnota }
        return { ...r, recipe_ingredients: upraveneSuroviny }
      }
      return r
    }))
  }

  const odeberSurovinu = (receptId, indexSuroviny) => {
    setRecepty(recepty.map(r => {
      if (r.id === receptId) {
        const upraveneSuroviny = r.recipe_ingredients.filter((_, i) => i !== indexSuroviny)
        return { ...r, recipe_ingredients: upraveneSuroviny }
      }
      return r
    }))
  }

  const upravTextReceptu = (id, pole, hodnota) => {
    setRecepty(recepty.map(r => r.id === id ? { ...r, [pole]: hodnota } : r))
  }

  async function zpracujRecept(id, novyStatus) {
    const r = recepty.find(re => re.id === id)
    
    const { error: chybaReceptu } = await supabase.from('recipes').update({ 
      status: novyStatus, 
      title: r.title, 
      instructions: r.instructions, 
      description: r.description 
    }).eq('id', id)
    
    if (chybaReceptu) {
      alert('Chyba při ukládání: ' + chybaReceptu.message)
      return
    }

    if (novyStatus === 'AD') {
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id)
      if (r.recipe_ingredients.length > 0) {
        const noveSurovinyKVlozeni = r.recipe_ingredients.map(ing => ({
          recipe_id: id,
          ingredient_id: ing.ingredient_id,
          amount: parseFloat(ing.amount) || 0,
          unit: ing.unit
        }))
        await supabase.from('recipe_ingredients').insert(noveSurovinyKVlozeni)
      }
    }
    setRecepty(recepty.filter(re => re.id !== id))
  }

  if (nacitani) return <div style={{ padding: '50px', textAlign: 'center' }}>Načítám záznamy k posouzení...</div>

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ color: '#2ecc71' }}>Administrátorský dohled</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>Zde zkontroluj návrhy od automatiky, uprav suroviny a schval je do katalogu.</p>

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
                  <h4 style={{ color: '#3498db', marginTop: 0 }}>Návrh k vylepšení od AI:</h4>
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

              <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '5px' }}>Krátký popis (vygenerováno AI, pokud uživatel nezadal)</label>
              <textarea 
                value={recept.description || ''} 
                onChange={(e) => upravTextReceptu(recept.id, 'description', e.target.value)}
                style={{ width: '100%', padding: '10px', height: '60px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #eee' }}
              />

              <div style={{ backgroundColor: '#fdf2e9', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #f8c471' }}>
                <h4 style={{ marginTop: 0, color: '#d35400' }}>Suroviny k uložení do databáze:</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                  {recept.recipe_ingredients.map((ing, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: 'white', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}>
                      <span style={{ flex: 2, fontSize: '14px', fontWeight: 'bold' }}>{ing.ingredients?.origfdnm.replace(/\./g, ',')}</span>
                      <input 
                        type="number" step="0.1"
                        value={ing.amount} 
                        onChange={(e) => upravHodnotuSuroviny(recept.id, idx, 'amount', e.target.value)}
                        style={{ width: '70px', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                      <select 
                        value={ing.unit} 
                        onChange={(e) => upravHodnotuSuroviny(recept.id, idx, 'unit', e.target.value)}
                        style={{ width: '90px', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                      >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="l">l</option>
                        <option value="ks">ks</option>
                        <option value="lžíce">lžíce</option>
                        <option value="lžička">lžička</option>
                        <option value="špetka">špetka</option>
                        <option value="hrnek">hrnek</option>
                        <option value="balení">balení</option>
                      </select>
                      <button onClick={() => odeberSurovinu(recept.id, idx)} style={{ backgroundColor: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                    </div>
                  ))}
                </div>

                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    placeholder="Přidat další surovinu..." 
                    value={aktivniReceptId === recept.id ? hledanyText : ''}
                    onFocus={() => setAktivniReceptId(recept.id)}
                    onChange={(e) => setHledanyText(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                  />
                  {aktivniReceptId === recept.id && naseptavac.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '6px', marginTop: '5px', zIndex: 10, padding: '10px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {naseptavac.map(s => (
                        <button key={s.id} onClick={() => pridejSurovinu(recept.id, s)} style={{ padding: '5px 10px', backgroundColor: '#eafaf1', border: '1px solid #2ecc71', borderRadius: '20px', cursor: 'pointer', fontSize: '13px' }}>
                          + {s.origfdnm.replace(/\./g, ',')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '5px' }}>Pracovní postup (čistý text bez ingrediencí)</label>
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
