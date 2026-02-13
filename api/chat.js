const MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const API_KEY = process.env.GEMINI_API_KEY || '';
  if (!API_KEY) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY in environment' });
  }

  try {
    const { prompt, history } = req.body || {};
    const trimmedPrompt = (prompt || '').trim();
    if (!trimmedPrompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const reply = await fetchGeminiReply(API_KEY, Array.isArray(history) ? history : [], trimmedPrompt);
    return res.status(200).json({ reply });
  } catch (error) {
    console.error('AI error:', error);
    return res.status(500).json({ error: 'AI request failed' });
  }
}

async function fetchGeminiReply(apiKey, history, prompt) {
  const instructions = `You are David writing lovingly to Logan. You've been together 3+ years. Logan is at Emory Med School studying to be a dermatologist. You both love sushi (especially spicy tuna rolls), you dream of going to Japan, you've traveled to Switzerland (paragliding), Seattle (hiking), and Barcelona (clubbing). You want a dachshund together. Tonight is Valentine's Day and you're doing cooking + wine + pottery. Keep responses under 120 words, warm, romantic, playful, and grounded in these real details.`;

  const contents = [];
  history
    .slice(-8)
    .filter((entry) => entry?.text)
    .forEach((entry) => {
      const role = entry.role === 'assistant' ? 'model' : 'user';
      contents.push({ role, parts: [{ text: entry.text }] });
    });

  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        role: 'system',
        parts: [{ text: instructions }],
      },
      contents,
      generationConfig: {
        temperature: 0.9,
        topP: 0.9,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini error: ${errText}`);
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0]?.content?.parts || [];
  const text = candidate.map((part) => part?.text || '').join(' ').trim();
  return text || "I'm thinking about you so much that my words got shy. Try again?";
}
