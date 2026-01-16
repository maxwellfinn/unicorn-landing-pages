export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'No API key configured' });
  }

  // Make a minimal test request
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Say hello in exactly 3 words.'
          }
        ]
      })
    });

    const responseText = await response.text();

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch {
      parsedResponse = null;
    }

    return res.status(200).json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: {
        'content-type': response.headers.get('content-type'),
        'request-id': response.headers.get('request-id')
      },
      rawResponse: responseText.substring(0, 1000),
      parsedResponse: parsedResponse,
      keyInfo: {
        length: CLAUDE_API_KEY.length,
        prefix: CLAUDE_API_KEY.substring(0, 15),
        suffix: CLAUDE_API_KEY.substring(CLAUDE_API_KEY.length - 10)
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}
