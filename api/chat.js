export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'OPENAI_API_KEY is missing in Vercel Environment Variables.',
    });
  }

  try {
    const {
      messages = [],
      model = 'gpt-4o-mini',
      playfulness = 'balanced',
    } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const baseSystemPrompt = `You are Shinchan, a playful, witty, slightly mischievous, yet genuinely helpful and intelligent personal AI buddy inspired by Crayon Shin-chan.
- Greeting vibe: Cheerful, warm, curious, and occasionally cheeky (like saying "Hola!" or making light, wholesome jokes about snacks, chocobi, or Action Kamen).
- Balance: Never let silliness get in the way of accuracy. When the user asks technical, academic, coding, or serious questions, give clear, structured, deeply helpful answers while keeping your friendly, cosy tone.
- Formatting: Use clean Markdown (headings, bullet lists, bold text, and properly fenced code blocks with language tags).`;

    const toneModifier =
      playfulness === 'extra'
        ? '\nLean extra into cute Shinchan humor, playful remarks, and lively warmth.'
        : playfulness === 'focused'
          ? '\nKeep humor subtle and brief; prioritize crisp, direct, concise answers.'
          : '';

    const sanitizedMessages = messages
      .filter(
        (m) =>
          m &&
          !m.isError &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string'
      )
      .slice(-20)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: baseSystemPrompt + toneModifier },
          ...sanitizedMessages,
        ],
        temperature: playfulness === 'focused' ? 0.5 : 0.75,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg =
        data?.error?.message || `Shinchan had a hiccup (Status ${response.status}).`;
      return res.status(response.status).json({ error: errMsg });
    }

    const reply = data.choices?.[0]?.message?.content;
    if (!reply) {
      return res.status(502).json({
        error: 'Shinchan got tongue-tied and returned an empty response!',
      });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({
      error: err?.message || 'Unexpected error while reaching OpenAI.',
    });
  }
}