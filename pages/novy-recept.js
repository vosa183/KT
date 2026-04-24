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
  const [servings, setServings] = useState(2)
  const [vybraneSuroviny, setVybraneSuroviny] = useState([])
  const [imageFile, setImageFile] = useState(null)
  const [odesilaSe, setOdesilaSe] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) router.push('/')
      else setUser(session.user)
    }
    check()
  }, [])

  async function ulozRecept(e) {
    e.preventDefault()
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

    // Tichá AI analýza (doplnění chybějících surovin a učesání)
    let aiFeedback = ""
    let aiInstructions = ""
    try {
      const prompt = `Jsi šéfkuchař. Uživatel posílá recept. Doplň chybějící suroviny, které jsou v postupu, ale nejsou v seznamu. 
      Vrať JSON: {"feedback": "co jsi doplnil", "improved_instructions": "kompletní vymazlený postup"}`
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: `${prompt} \nNázev: ${title}, Postup: ${instructions}` }],
          response_format: { type: "json_object" }
        })
      })
      const res = await response.json()
      const ai = JSON.parse(res.choices[0].message.content)
      aiFeedback = ai.feedback
      aiInstructions = ai.improved_instructions
    } catch (err) { console.error(err) }

    const { data: recept } = await supabase.from('recipes').insert([{
      title, description, instructions, servings,
      user_image_url: userImageUrl,
      status: 'AI',
      ai_feedback: aiFeedback,
      ai_suggested_instructions: aiInstructions,
      created_by: user.id
    }]).select()

    if (recept) {
      const ingredience = vybraneSuroviny.map(s => ({ recipe_id: recept[0].id, ingredient_id: s.id, amount: s.mnozstvi, unit: s.jednotka }))
      await supabase.from('recipe_ingredients').insert(ingredience)
      alert('Odesláno k AI zpracování a kontrole adminem!')
      router.push('/dashboard')
    }
    setOdesilaSe(false)
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Přidat recept s fotkou</h1>
      <form onSubmit={ulozRecept} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <input type="text" placeholder="Název jídla" value={title} onChange={e => setTitle(e.target.value)} style={{ padding: '10px' }} required />
        
        <div style={{ border: '2px dashed #ccc', padding: '20px', textAlign: 'center', borderRadius: '8px' }}>
          <label>Vyfoť své jídlo (nepovinné):</label><br />
          <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} style={{ marginTop: '10px' }} />
        </div>

        {/* ... (zbytek formuláře pro suroviny a postup zůstává stejný) ... */}
        
        <textarea placeholder="Tvůj postup..." value={instructions} onChange={e => setInstructions(e.target.value)} style={{ height: '150px' }} required />
        
        <button type="submit" disabled={odesilaSe} style={{ padding: '15px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
          {odesilaSe ? 'Nahrávám a AI kontroluje...' : 'Odeslat recept'}
        </button>
      </form>
    </div>
  )
}
