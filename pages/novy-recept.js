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
  
  // Ingredience v receptu
  const [vybraneSuroviny, setVybraneSuroviny] = useState([])
  
  // Hledání v databázi surovin
  const [hledanyText, setHledanyText] = useState('')
  const [naseptavac, setNaseptavac] = useState([])
  const [nacitaniSurovin, setNacitaniSurovin] = useState(false)

  // AI Kontrola
  const [aiZprava, setAiZprava] = useState(null)
  const [aiNacitani, setAiNacitani] = useState(false)

  useEffect(() => {
    const zkontrolujUzivatele = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
      } else {
        setUser(session.user)
      }
    }
    zkontrolujUzivatele()
  }, [])

  // Hledání surovin v naší existující databázi
  useEffect(() => {
    const hledejSuroviny = async () => {
      if (hledanyText.length < 2) {
        setNaseptavac([])
        return
      }
      setNacitaniSurovin(true)
      const { data } = await supabase
        .from('ingredients')
        .select('id, origfdnm')
        .ilike('origfdnm', `%${hledanyText}%`)
        .limit(5)
      
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

  const odeberSurovinu = (id) => {
    setVybraneSuroviny(vybraneSuroviny.filter(s => s.id !== id))
  }

  const upravSurovinu = (id, pole, hodnota) => {
    setVybraneSuroviny(vybraneSuroviny.map(s => s.id === id ? { ...s, [pole]: hodnota } : s))
  }

  async function zkontrolujPomociAI() {
    if (!title || !instructions) {
      alert('Nejprve vyplň název a postup, aby měla umělá inteligence co kontrolovat.')
      return
    }
    
    setAiNacitani(true)
    setAiZprava(null)

    const seznamSurovinText = vybraneSuroviny.map(s => `${s.mnozstvi} ${s.jednotka} ${s.origfdnm}`).join(', ')
    const prompt = `Jsi profesionální kuchař. Zkontroluj tento recept, jestli dává kuchařský smysl, zda nechybí důležitá surovina a jestli je postup logický. Odpověz stručně, přátelsky a česky.\n\nNázev: ${title}\nPopis: ${description}\nSuroviny: ${seznamSurovinText}\nPostup: ${instructions}`

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini', // Zde můžeš model z OpenRouteru libovolně změnit
          messages: [{ role: 'user', content: prompt }]
        })
      })

      const data = await response.json()
      if (data.choices && data.choices.length > 0) {
        setAiZprava(data.choices[0].message.content)
      } else {
        setAiZprava('Nepodařilo se získat odpověď. Zkontroluj si prosím nastavení API klíče.')
      }
    } catch (error) {
      setAiZprava('Chyba při komunikaci: ' + error.message)
    } finally {
      setAiNacitani(false)
    }
  }

  async function ulozRecept(e) {
    e.preventDefault()
    
    // 1. Uložení hlavního receptu
    const { data: recept, error: receptError } = await supabase
      .from('recipes')
      .insert([
        { 
          title, 
          description, 
          instructions, 
          cooking_time_minutes: cookingTime, 
          difficulty,
          created_by: user.id
        }
      ])
      .select()

    if (receptError) {
      alert('Chyba při ukládání receptu: ' + receptError.message)
      return
    }

    // 2. Uložení všech ingrediencí k receptu
    const idNovehoReceptu = recept[0].id
    const ingredienceKVlozeni = vybraneSuroviny.map(s => ({
      recipe_id: idNovehoReceptu,
      ingredient_id: s.id,
      amount: parseFloat(s.mnozstvi),
      unit: s.jednotka
    }))

    const { error: ingredienceError } = await supabase
      .from('recipe_ingredients')
      .insert(ingredienceKVlozeni)

    if (ingredienceError) {
      alert('Recept uložen, ale nastala chyba u ingrediencí.')
    } else {
      alert('Recept byl úspěšně odeslán ke kontrole!')
      router.push('/dashboard')
    }
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#2ecc71' }}>Navrhnout nový recept</h1>
      
      <form onSubmit={ulozRecept} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <input 
          type="text" 
          placeholder="Název receptu" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)}
          style={{ padding: '12px', fontSize: '18px', borderRadius: '8px', border: '1px solid #ddd' }}
          required 
        />

        <textarea 
          placeholder="Krátký popis jídla" 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ padding: '12px', height: '80px', borderRadius: '8px', border: '1px solid #ddd' }}
        />

        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px' }}>Čas přípravy (minuty)</label>
            <input type="number" value={cookingTime} onChange={(e) => setCookingTime(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px' }}>Náročnost</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <option value="easy">Jednoduché</option>
              <option value="medium">Střední</option>
              <option value="hard">Složité</option>
            </select>
          </div>
        </div>

        <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '12px', border: '1px solid #eee' }}>
          <h3 style={{ marginTop: 0 }}>Suroviny z naší databáze</h3>
          <input 
            type="text" 
            placeholder="Hledej surovinu..." 
            value={hledanyText}
            onChange={(e) => setHledanyText(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '10px' }}
          />
          
          {nacitaniSurovin && <p style={{ fontSize: '12px' }}>Hledám v databázi...</p>}
          
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {naseptavac.map(s => (
              <button 
                key={s.id} 
                type="button"
                onClick={() => pridejSurovinu(s)}
                style={{ padding: '5px 10px', backgroundColor: '#eafaf1', border: '1px solid #2ecc71', borderRadius: '20px', cursor: 'pointer', fontSize: '13px' }}
              >
                + {s.origfdnm.replace(/\./g, ',')}
              </button>
            ))}
          </div>

          <div style={{ marginTop: '20px' }}>
            {vybraneSuroviny.map(s => (
              <div key={s.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', padding: '5px', borderBottom: '1px solid #eee' }}>
                <span style={{ flex: 2, fontSize: '14px' }}>{s.origfdnm.replace(/\./g, ',')}</span>
                <input 
                  type="number" 
                  placeholder="Množství" 
                  value={s.mnozstvi} 
                  onChange={(e) => upravSurovinu(s.id, 'mnozstvi', e.target.value)}
                  style={{ flex: 1, padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
                  required
                />
                <input 
                  type="text" 
                  placeholder="Jednotka" 
                  value={s.jednotka} 
                  onChange={(e) => upravSurovinu(s.id, 'jednotka', e.target.value)}
                  style={{ flex: 1, padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <button type="button" onClick={() => odeberSurovinu(s.id)} style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>X</button>
              </div>
            ))}
          </div>
        </div>

        <textarea 
          placeholder="Pracovní postup (krok za krokem)" 
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          style={{ padding: '12px', height: '200px', borderRadius: '8px', border: '1px solid #ddd' }}
          required
        />

        {/* Sekce pro AI Kontrolu */}
        <div style={{ backgroundColor: '#ebf5fb', padding: '20px', borderRadius: '12px', border: '1px solid #3498db' }}>
          <h3 style={{ marginTop: 0, color: '#2980b9' }}>Inteligentní kontrola receptu</h3>
          <p style={{ fontSize: '14px', color: '#555', marginBottom: '15px' }}>Než recept odešleš, nech našeho AI šéfkuchaře zkontrolovat, jestli v postupu něco nechybí nebo jestli množství surovin dává smysl.</p>
          
          <button 
            type="button" 
            onClick={zkontrolujPomociAI} 
            disabled={aiNacitani}
            style={{ padding: '10px 20px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {aiNacitani ? 'AI analyzuje tvůj recept...' : 'Zkontrolovat pomocí AI'}
          </button>

          {aiZprava && (
            <div style={{ marginTop: '15px', padding: '15px', backgroundColor: 'white', borderRadius: '8px', border: '1px dashed #3498db', fontSize: '14px', lineHeight: '1.5' }}>
              <strong>Zpětná vazba:</strong><br />
              {aiZprava}
            </div>
          )}
        </div>

        <button type="submit" style={{ padding: '15px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>
          Odeslat recept ke schválení
        </button>
      </form>
    </div>
  )
}
