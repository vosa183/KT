import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/router'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function NovyRecept() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [cookingTime, setCookingTime] = useState(30)
  const [difficulty, setDifficulty] = useState('medium')
  const [servings, setServings] = useState(2) // Nové: počet porcí
  
  const [vybraneSuroviny, setVybraneSuroviny] = useState([])
  const [hledanyText, setHledanyText] = useState('')
  const [naseptavac, setNaseptavac] = useState([])
  const [nacitaniSurovin, setNacitaniSurovin] = useState(false)
  const [odesilaSe, setOdesilaSe] = useState(false)

  useEffect(() => {
    const zkontrolujUzivatele = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/') } else { setUser(session.user) }
    }
    zkontrolujUzivatele()
  }, [])

  // Oprava vyhledávání: přidáno logování a lepší filtrace
  useEffect(() => {
    const hledejSuroviny = async () => {
      if (hledanyText.length < 2) { setNaseptavac([]); return; }
      setNacitaniSurovin(true)
      const { data, error } = await supabase
        .from('ingredients')
        .select('id, origfdnm')
        .ilike('origfdnm', `%${hledanyText}%`)
        .limit(10)
      
      if (error) console.error("Chyba hledání:", error)
      setNaseptavac(data || [])
      setNacitaniSurovin(false)
    }
    const timeout = setTimeout(hledejSuroviny, 300)
    return () => clearTimeout(timeout)
  }, [hledanyText])

  const pridejSurovinu = (surovina) => {
    if (!vybraneSuroviny.find(s => s.id === surovina.id)) {
      setVybraneSuroviny([...vybraneSuroviny, { ...surovina, mnozstvi: '', jednotka: 'g' }])
    }
    setHledanyText('')
    setNaseptavac([])
  }

  const upravSurovinu = (id, pole, hodnota) => {
    setVybraneSuroviny(vybraneSuroviny.map(s => s.id === id ? { ...s, [pole]: hodnota } : s))
  }

  async function ulozRecept(e) {
    e.preventDefault()
    if (vybraneSuroviny.length === 0) { alert("Přidej alespoň jednu surovinu!"); return; }
    setOdesilaSe(true)

    let aiFeedback = ""
    let aiSuggestedInstructions = ""

    try {
      const seznamSurovinText = vybraneSuroviny.map(s => `${s.mnozstvi} ${s.jednotka} ${s.origfdnm}`).join(', ')
      const prompt = `Jsi profesionální šéfkuchař. Zkontroluj recept pro ${servings} osoby. 
      Oprav gramatiky a strukturu. 
      VÝSTUP MUSÍ BÝT JSON: {"feedback": "stručné zhodnocení", "improved_instructions": "kompletní postup včetně přehledného seznamu surovin s gramážemi na začátku"}.
      Recept: ${title}, Suroviny: ${seznamSurovinText}, Postup: ${instructions}`

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: "json_object" }
        })
      })

      const aiData = await response.json()
      const parseResult = JSON.parse(aiData.choices[0].message.content)
      aiFeedback = parseResult.feedback
      aiSuggestedInstructions = parseResult.improved_instructions
    } catch (err) {
      aiFeedback = "AI kontrola dočasně nedostupná."
      aiSuggestedInstructions = instructions
    }

    const { data: recept, error: receptError } = await supabase
      .from('recipes')
      .insert([{ 
        title, 
        description, 
        instructions, 
        cooking_time_minutes: cookingTime, 
        difficulty,
        servings: parseInt(servings),
        created_by: user.id,
        status: 'AI',
        ai_feedback: aiFeedback,
        ai_suggested_instructions: aiSuggestedInstructions
      }])
      .select()

    if (!receptError) {
      const ingredienceKVlozeni = vybraneSuroviny.map(s => ({
        recipe_id: recept[0].id,
        ingredient_id: s.id,
        amount: parseFloat(s.mnozstvi),
        unit: s.jednotka
      }))
      await supabase.from('recipe_ingredients').insert(ingredienceKVlozeni)
      alert('Recept odeslán ke schválení!')
      router.push('/dashboard')
    }
    setOdesilaSe(false)
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#2ecc71' }}>Nový recept</h1>
      <form onSubmit={ulozRecept} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <input type="text" placeholder="Název" value={title} onChange={(e) => setTitle(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '18px' }} required />
        
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px' }}>Čas (min)</label>
            <input type="number" value={cookingTime} onChange={(e) => setCookingTime(e.target.value)} style={{ width: '100%', padding: '10px' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px' }}>Počet porcí</label>
            <input type="number" value={servings} onChange={(e) => setServings(e.target.value)} style={{ width: '100%', padding: '10px' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px' }}>Náročnost</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={{ width: '100%', padding: '10px' }}>
              <option value="easy">Snadné</option>
              <option value="medium">Střední</option>
              <option value="hard">Těžké</option>
            </select>
          </div>
        </div>

        <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '12px', border: '1px solid #eee' }}>
          <h3>Suroviny z databáze</h3>
          <input type="text" placeholder="Začni psát název suroviny..." value={hledanyText} onChange={(e) => setHledanyText(e.target.value)} style={{ width: '100%', padding: '10px' }} />
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '10px' }}>
            {naseptavac.map(s => (
              <button key={s.id} type="button" onClick={() => pridejSurovinu(s)} style={{ padding: '5px 10px', backgroundColor: '#eafaf1', border: '1px solid #2ecc71', borderRadius: '20px', cursor: 'pointer' }}>
                + {s.origfdnm.replace(/\./g, ',')}
              </button>
            ))}
          </div>
          <div style={{ marginTop: '20px' }}>
            {vybraneSuroviny.map(s => (
              <div key={s.id} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                <span style={{ flex: 2, fontSize: '14px' }}>{s.origfdnm.replace(/\./g, ',')}</span>
                <input type="number" placeholder="Množství" value={s.mnozstvi} onChange={(e) => upravSurovinu(s.id, 'mnozstvi', e.target.value)} style={{ flex: 1, padding: '8px' }} required />
                <input type="text" value={s.jednotka} onChange={(e) => upravSurovinu(s.id, 'jednotka', e.target.value)} style={{ flex: 1, padding: '8px' }} />
                <button type="button" onClick={() => setVybraneSuroviny(vybraneSuroviny.filter(x => x.id !== s.id))} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
              </div>
            ))}
          </div>
        </div>

        <textarea placeholder="Pracovní postup..." value={instructions} onChange={(e) => setInstructions(e.target.value)} style={{ padding: '12px', height: '200px', borderRadius: '8px' }} required />
        
        <button type="submit" disabled={odesilaSe} style={{ padding: '15px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' }}>
          {odesilaSe ? 'AI kontroluje a ukládá...' : 'Odeslat recept'}
        </button>
      </form>
    </div>
  )
}
