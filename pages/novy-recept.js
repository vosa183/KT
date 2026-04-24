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
  const [servings, setServings] = useState(2)
  
  const [vybraneSuroviny, setVybraneSuroviny] = useState([])
  const [hledanyText, setHledanyText] = useState('')
  const [naseptavac, setNaseptavac] = useState([])
  const [nacitaniSurovin, setNacitaniSurovin] = useState(false)
  const [odesilaSe, setOdesilaSe] = useState(false)
  const [imageFile, setImageFile] = useState(null)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) router.push('/')
      else setUser(session.user)
    }
    check()
  }, [])

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

    let userImageUrl = null
    if (imageFile) {
      const fileName = `${Date.now()}_${imageFile.name}`
      const { data, error } = await supabase.storage
        .from('recipe-images')
        .upload(fileName, imageFile)
      if (data) {
        const { data: urlData } = supabase.storage.from('recipe-images').getPublicUrl(fileName)
        userImageUrl = urlData.publicUrl
      }
    }

    let aiFeedback = ""
    let aiInstructions = ""
    try {
      const prompt = `Jsi šéfkuchař. Uživatel posílá recept pro ${servings} osoby. Doplň chybějící suroviny, které jsou v postupu, ale nejsou v seznamu. Oprav gramatiku a strukturu. 
      Vrať POUZE JSON: {"feedback": "co jsi doplnil a opravil", "improved_instructions": "kompletní vymazlený postup včetně přehledného seznamu surovin s gramážemi na začátku"}`
      
      const seznamSurovinText = vybraneSuroviny.map(s => `${s.mnozstvi} ${s.jednotka} ${s.origfdnm}`).join(', ')

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: `${prompt} \nNázev: ${title}, Suroviny: ${seznamSurovinText}, Postup: ${instructions}` }],
          response_format: { type: "json_object" }
        })
      })
      const res = await response.json()
      const ai = JSON.parse(res.choices[0].message.content)
      aiFeedback = ai.feedback
      aiInstructions = ai.improved_instructions
    } catch (err) { 
      console.error(err)
      aiFeedback = "AI kontrola dočasně nedostupná."
      aiInstructions = instructions
    }

    const { data: recept, error: receptError } = await supabase.from('recipes').insert([{
      title, 
      description, 
      instructions, 
      cooking_time_minutes: cookingTime,
      difficulty,
      servings: parseInt(servings),
      user_image_url: userImageUrl,
      status: 'AI',
      ai_feedback: aiFeedback,
      ai_suggested_instructions: aiInstructions,
      created_by: user.id
    }]).select()

    if (!receptError && recept) {
      const ingredience = vybraneSuroviny.map(s => ({ recipe_id: recept[0].id, ingredient_id: s.id, amount: parseFloat(s.mnozstvi), unit: s.jednotka }))
      await supabase.from('recipe_ingredients').insert(ingredience)
      alert('Odesláno k AI zpracování a kontrole adminem!')
      router.push('/dashboard')
    } else {
      alert('Nastala chyba: ' + (receptError?.message || 'Neznámá chyba'))
    }
    setOdesilaSe(false)
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#2ecc71' }}>Nový recept s fotkou</h1>
      <form onSubmit={ulozRecept} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <input type="text" placeholder="Název jídla" value={title} onChange={e => setTitle(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '18px' }} required />
        
        <textarea placeholder="Krátký popis jídla" value={description} onChange={(e) => setDescription(e.target.value)} style={{ padding: '12px', height: '80px', borderRadius: '8px', border: '1px solid #ddd' }} />

        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', color: '#555', marginBottom: '5px', display: 'block' }}>Čas (min)</label>
            <input type="number" value={cookingTime} onChange={(e) => setCookingTime(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', color: '#555', marginBottom: '5px', display: 'block' }}>Počet porcí</label>
            <input type="number" value={servings} onChange={(e) => setServings(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', color: '#555', marginBottom: '5px', display: 'block' }}>Náročnost</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}>
              <option value="easy">Snadné</option>
              <option value="medium">Střední</option>
              <option value="hard">Těžké</option>
            </select>
          </div>
        </div>

        <div style={{ border: '2px dashed #ccc', padding: '20px', textAlign: 'center', borderRadius: '8px' }}>
          <label style={{ fontWeight: 'bold', color: '#555' }}>Vyfoť své jídlo (nepovinné):</label><br />
          <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} style={{ marginTop: '10px' }} />
        </div>

        <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '12px', border: '1px solid #eee' }}>
          <h3 style={{ marginTop: 0 }}>Suroviny z databáze</h3>
          <input type="text" placeholder="Začni psát název suroviny (např. vejce, sůl)..." value={hledanyText} onChange={(e) => setHledanyText(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '10px' }}>
            {naseptavac.map(s => (
              <button key={s.id} type="button" onClick={() => pridejSurovinu(s)} style={{ padding: '5px 10px', backgroundColor: '#eafaf1', border: '1px solid #2ecc71', borderRadius: '20px', cursor: 'pointer', fontSize: '13px' }}>
                + {s.origfdnm.replace(/\./g, ',')}
              </button>
            ))}
          </div>
          <div style={{ marginTop: '20px' }}>
            {vybraneSuroviny.map(s => (
              <div key={s.id} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center', backgroundColor: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <span style={{ flex: 2, fontSize: '14px', fontWeight: 'bold', color: '#333' }}>{s.origfdnm.replace(/\./g, ',')}</span>
                <input 
                  type="number" 
                  step="0.1"
                  placeholder="Množství" 
                  value={s.mnozstvi} 
                  onChange={(e) => upravSurovinu(s.id, 'mnozstvi', e.target.value)} 
                  style={{ width: '80px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} 
                  required 
                />
                <select 
                  value={s.jednotka} 
                  onChange={(e) => upravSurovinu(s.id, 'jednotka', e.target.value)}
                  style={{ width: '100px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
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
                <button type="button" onClick={() => setVybraneSuroviny(vybraneSuroviny.filter(x => x.id !== s.id))} style={{ color: '#e74c3c', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>✕</button>
              </div>
            ))}
          </div>
        </div>
        
        <textarea placeholder="Tvůj postup..." value={instructions} onChange={e => setInstructions(e.target.value)} style={{ padding: '12px', height: '200px', borderRadius: '8px', border: '1px solid #ddd', lineHeight: '1.5' }} required />
        
        <button type="submit" disabled={odesilaSe} style={{ padding: '15px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px', marginTop: '10px' }}>
          {odesilaSe ? 'Nahrávám a provádí se kontrola...' : 'Odeslat recept'}
        </button>
      </form>
    </div>
  )
}
