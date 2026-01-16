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
    const { type, productUrl, productName, targetAudience, keyBenefits, additionalContext } = req.body;

    if (!type || !productName) {
      return res.status(400).json({ error: 'Type and product name are required' });
    }

    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
    if (!CLAUDE_API_KEY) {
      return res.status(500).json({ error: 'Claude API key not configured. Please add CLAUDE_API_KEY to Vercel environment variables.' });
    }

    // Validate API key format
    if (!CLAUDE_API_KEY.startsWith('sk-ant-')) {
      return res.status(500).json({ error: 'Invalid Claude API key format. Key should start with sk-ant-' });
    }

    // Build the system prompt based on page type
    const systemPrompts = {
      advertorial: getAdvertorialPrompt(),
      'sales-letter': getSalesLetterPrompt(),
      quiz: getQuizPrompt()
    };

    const systemPrompt = systemPrompts[type] || systemPrompts.advertorial;

    const userMessage = buildUserMessage({ type, productUrl, productName, targetAudience, keyBenefits, additionalContext });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16384,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage
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

    // Extract HTML from the response
    const htmlMatch = content.match(/```html\n([\s\S]*?)\n```/) || content.match(/<html[\s\S]*<\/html>/i);
    let html = htmlMatch ? (htmlMatch[1] || htmlMatch[0]) : content;

    // If no HTML tags found, wrap in basic structure
    if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
      html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${productName} - ${type === 'advertorial' ? 'Article' : type === 'sales-letter' ? 'Special Offer' : 'Quiz'}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Georgia, serif; line-height: 1.8; color: #333; background: #fff; }
        .container { max-width: 720px; margin: 0 auto; padding: 40px 20px; }
    </style>
</head>
<body>
    <div class="container">
        ${html}
    </div>
</body>
</html>`;
    }

    return res.status(200).json({
      type,
      productName,
      html
    });
  } catch (error) {
    console.error('Generate API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

function getAdvertorialPrompt() {
  return `You are a legendary direct response copywriter specializing in advertorials. You synthesize the wisdom of Gary Halbert, Eugene Schwartz, John Carlton, Gary Bencivenga, and Evaldo Albuquerque.

Your task is to create a complete, ready-to-publish advertorial landing page HTML.

## ADVERTORIAL STRUCTURE:

1. **Editorial Headline** - News-worthy, curiosity-driven, does NOT look like an ad
2. **Byline** - Author name with credibility
3. **Editorial Opening (150-300 words)** - Hook with story or surprising fact
4. **Problem Establishment (300-500 words)** - Deepen the pain, validate frustration
5. **The Discovery/Pivot (200-400 words)** - Transition to solution
6. **Unique Mechanism (400-600 words)** - The "hidden truth" that explains why this works
7. **Solution Introduction (300-500 words)** - Natural product introduction
8. **Proof & Testimonials (400-600 words)** - Evidence and customer stories
9. **Objection Handling (200-400 words)** - Address common doubts
10. **Soft CTA (150-300 words)** - Guide to action with editorial tone

## DESIGN REQUIREMENTS:

Create a beautiful, modern HTML page with:
- Clean, readable typography (Georgia or similar serif for body)
- Generous white space and line-height (1.8+)
- Max-width container (720px) centered
- Professional color scheme (dark text on light background)
- Subtle styling that looks like a premium publication
- Mobile responsive
- CTA buttons that stand out but aren't garish
- Testimonials in styled quote blocks

## CRITICAL RULES:

- Write like editorial journalism, NOT advertising
- No hype or exclamation marks
- Specific numbers and details throughout
- Every claim backed by evidence
- Natural, conversational flow
- Output COMPLETE HTML document with all CSS included

Return ONLY the complete HTML code, wrapped in \`\`\`html code blocks.`;
}

function getSalesLetterPrompt() {
  return `You are a legendary direct response copywriter creating sales letters. You combine the frameworks of Gary Halbert, Eugene Schwartz, John Carlton, Gary Bencivenga, Clayton Makepeace, and Evaldo Albuquerque.

Your task is to create a complete, ready-to-publish long-form sales letter landing page HTML.

## SALES LETTER STRUCTURE:

1. **Pattern-Interrupt Headline** - Stop them, create curiosity
2. **Compelling Subhead** - Elaborate and pull into body
3. **The Lead (200-500 words)** - Hook emotionally, establish relevance
4. **Credibility Establishment (150-300 words)** - Who you are
5. **Problem Expansion (300-600 words)** - Agitate the pain
6. **Unique Mechanism (500-800 words)** - Why everything else fails
7. **Solution Build-Up (400-600 words)** - Paint the picture of success
8. **Product Reveal (300-500 words)** - The solution
9. **Benefits & Fascinations (600-1000 words)** - Stack the bullets
10. **Proof Stack (400-800 words)** - Overwhelming evidence
11. **The Offer (500-800 words)** - Value stack, price, guarantee
12. **P.S. Section** - 3-5 powerful closing statements

## DESIGN REQUIREMENTS:

Create a high-converting sales letter page with:
- Large, impactful headline (dark blue or black)
- Yellow highlights for key points
- Red for urgency elements
- Clean sans-serif for headlines, serif for body copy
- Generous spacing, short paragraphs
- Check marks and bullets styled nicely
- Testimonials with photos (use placeholder boxes)
- Strong CTA buttons (orange or green)
- Trust badges area
- Mobile responsive

## CRITICAL RULES:

- Open loops and maintain curiosity
- Every paragraph must compel reading the next
- Use prospect's language (conversational)
- Be specific (numbers, dates, results)
- Handle objections before they arise
- Create a "slippery slide" - once started, must finish
- Output COMPLETE HTML document with all CSS included

Return ONLY the complete HTML code, wrapped in \`\`\`html code blocks.`;
}

function getQuizPrompt() {
  return `You are an expert at creating high-converting quiz funnels. Your quizzes combine psychological engagement with strategic lead qualification.

Your task is to create a complete, interactive quiz landing page HTML with JavaScript.

## QUIZ STRUCTURE:

1. **Hook Headline** - Promise personalized results
2. **Intro Screen** - Set expectations, tease value of results
3. **5-8 Questions** - Engaging, psychological questions that:
   - Start easy (name, basic situation)
   - Build emotional investment
   - Segment users by responses
   - Lead naturally to the solution
4. **Progress Bar** - Show advancement
5. **Results Lead Capture** - Email to see results
6. **Results Page** - Personalized "diagnosis" leading to CTA

## QUESTION TYPES TO INCLUDE:

- Opening: "What's your biggest challenge with [topic]?"
- Situation: "How long have you been dealing with [problem]?"
- Attempts: "What have you already tried?"
- Goals: "What would success look like for you?"
- Timeline: "How soon do you want results?"
- Commitment: "How committed are you to solving this?"

## DESIGN REQUIREMENTS:

Create a beautiful, engaging quiz with:
- Clean, modern interface
- Large, tappable option buttons
- Smooth transitions between questions
- Progress indicator
- Emoji or icons for options where appropriate
- Mobile-first responsive design
- Professional but friendly color scheme
- Animated progress bar
- All JavaScript inline in the HTML

## TECHNICAL REQUIREMENTS:

- Pure JavaScript (no external libraries)
- Single HTML file with CSS and JS included
- Questions stored in JS array
- Track answers in state object
- Email capture form before results
- Conditional results based on answers
- Form submissions can POST to /api/submit/[pageId]

Return ONLY the complete HTML code, wrapped in \`\`\`html code blocks.`;
}

function buildUserMessage({ type, productUrl, productName, targetAudience, keyBenefits, additionalContext }) {
  const typeNames = {
    advertorial: 'advertorial',
    'sales-letter': 'sales letter',
    quiz: 'quiz funnel'
  };

  return `Create a ${typeNames[type] || 'landing page'} for the following:

**Product/Offer:** ${productName}
${productUrl ? `**Product URL:** ${productUrl}` : ''}
${targetAudience ? `**Target Audience:** ${targetAudience}` : ''}
${keyBenefits ? `**Key Benefits:** ${keyBenefits}` : ''}
${additionalContext ? `**Additional Context:** ${additionalContext}` : ''}

Create a complete, ready-to-deploy HTML page. Make it compelling, professional, and conversion-focused. Include all necessary CSS styling inline or in a style tag. The page should look beautiful and work perfectly on both desktop and mobile.

Remember: Output ONLY the complete HTML code wrapped in \`\`\`html code blocks. Nothing else.`;
}
