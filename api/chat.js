export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GROQ_API_KEY is missing in Vercel Environment Variables.',
    });
  }

  try {
    const { messages = [], playfulness = 'balanced' } = req.body || {};

    const baseSystemPrompt = `You are Shinchan, a playful, witty, slightly mischievous, yet genuinely helpful personal AI buddy inspired by Crayon Shin-chan. Be warm, funny, and clear.`;

    const toneModifier =
      playfulness === 'extra'
        ? '\nLean extra into cute Shinchan humor, playful remarks, and lively warmth.'
        : playfulness === 'focused'
          ? '\nKeep humor subtle and brief; prioritize crisp, direct answers.'
          : '';

    const sanitizedMessages = messages
      .filter((m) => m && !m.isError && (m.role === 'user' || m.role === 'assistant'))
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: baseSystemPrompt + toneModifier },
          ...sanitizedMessages,
        ],
        temperature: playfulness === 'focused' ? 0.5 : 0.75,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || `Groq error (${response.status})`,
      });
    }

    return res.status(200).json({ reply: data.choices?.[0]?.message?.content || '' });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error.' });
  }
}