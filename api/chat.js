export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, currentHtml, pageContext } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
    if (!CLAUDE_API_KEY) {
      return res.status(500).json({ error: 'Claude API key not configured. Please add CLAUDE_API_KEY to Vercel environment variables.' });
    }

    // Validate API key format
    if (!CLAUDE_API_KEY.startsWith('sk-ant-')) {
      return res.status(500).json({ error: 'Invalid Claude API key format. Key should start with sk-ant-' });
    }

    // Truncate HTML if it's too long (roughly 150k chars to stay under token limit)
    const MAX_HTML_LENGTH = 150000;
    let htmlToSend = currentHtml || '';
    let htmlTruncated = false;

    if (htmlToSend.length > MAX_HTML_LENGTH) {
      // Try to intelligently truncate - keep head and beginning of body
      const headMatch = htmlToSend.match(/<head[\s\S]*?<\/head>/i);
      const bodyStart = htmlToSend.indexOf('<body');

      if (headMatch && bodyStart > -1) {
        const head = headMatch[0];
        const bodyContent = htmlToSend.substring(bodyStart);
        const availableForBody = MAX_HTML_LENGTH - head.length - 500; // Leave room for wrapper

        htmlToSend = `<!DOCTYPE html>
<html>
${head}
${bodyContent.substring(0, availableForBody)}
<!-- [CONTENT TRUNCATED - page too large] -->
</body>
</html>`;
      } else {
        htmlToSend = htmlToSend.substring(0, MAX_HTML_LENGTH) + '\n<!-- [CONTENT TRUNCATED] -->';
      }
      htmlTruncated = true;
    }

    const systemPrompt = `You are an expert landing page editor and copywriter. The user will ask you to make changes to their landing page HTML.

Your job is to:
1. Understand what changes they want
2. Make those changes to the HTML
3. Return the COMPLETE updated HTML

IMPORTANT RULES:
- Always return the full, complete HTML document - never partial snippets
- Preserve all existing tracking scripts, meta tags, and structure unless specifically asked to change them
- Make the requested changes while maintaining the page's overall design and functionality
- If the user's request is unclear, make your best judgment about what they want
- Focus on making changes that improve conversions, readability, and user experience
${htmlTruncated ? '- NOTE: The HTML was truncated due to size. Focus on the visible content and make targeted changes.' : ''}

Current page context:
- Page Name: ${pageContext?.name || 'Landing Page'}
- Client: ${pageContext?.client_name || 'Not specified'}

Respond with a JSON object in this exact format:
{
  "message": "Brief explanation of what you changed",
  "html": "THE COMPLETE UPDATED HTML DOCUMENT"
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 8192,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Here is the current HTML of the landing page:\n\n${htmlToSend}\n\n---\n\nUser request: ${message}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', errorData);

      // Try to parse the error for more details
      try {
        const errorJson = JSON.parse(errorData);
        return res.status(500).json({ error: `Claude API error: ${errorJson.error?.message || errorJson.message || 'Unknown error'}` });
      } catch {
        return res.status(500).json({ error: `Claude API error (${response.status}): ${errorData.substring(0, 100)}` });
      }
    }

    const data = await response.json();

    if (!data.content || !data.content[0] || !data.content[0].text) {
      console.error('Unexpected Claude response format:', JSON.stringify(data));
      return res.status(500).json({ error: 'Unexpected response format from Claude API' });
    }

    const content = data.content[0].text;

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(content);
      return res.status(200).json(parsed);
    } catch {
      // If not valid JSON, try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.status(200).json(parsed);
        } catch {
          return res.status(200).json({
            message: content,
            html: currentHtml
          });
        }
      }
      return res.status(200).json({
        message: content,
        html: currentHtml
      });
    }
  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
