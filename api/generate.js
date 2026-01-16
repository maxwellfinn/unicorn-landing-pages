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
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON in request body' });
      }
    }

    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Request body is required' });
    }

    const { type, productUrl, productName, targetAudience, keyBenefits, additionalContext } = body;

    if (!type || !productName) {
      return res.status(400).json({ error: 'Type and product name are required' });
    }

    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!CLAUDE_API_KEY) {
      return res.status(500).json({ error: 'Claude API key not configured' });
    }
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    // STEP 1: Use Gemini to create the HTML template structure
    console.log('Step 1: Generating template with Gemini...');
    const templatePrompt = getTemplatePrompt(type, productName, targetAudience);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: templatePrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini error:', errorText);
      return res.status(500).json({ error: `Gemini API error: ${errorText.substring(0, 200)}` });
    }

    const geminiData = await geminiResponse.json();
    const templateHtml = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!templateHtml) {
      return res.status(500).json({ error: 'Gemini returned empty response' });
    }

    // STEP 2: Use Claude to write compelling copy
    console.log('Step 2: Writing copy with Claude...');
    const copyPrompt = getCopyPrompt(type, productName, targetAudience, keyBenefits, additionalContext);

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        system: getClaudeSystemPrompt(type),
        messages: [{ role: 'user', content: copyPrompt }]
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Claude error:', errorText);
      return res.status(500).json({ error: `Claude API error: ${errorText.substring(0, 200)}` });
    }

    const claudeData = await claudeResponse.json();
    const copyContent = claudeData.content?.[0]?.text || '';

    if (!copyContent) {
      return res.status(500).json({ error: 'Claude returned empty response' });
    }

    // STEP 3: Use Gemini to assemble final page (inject copy into template)
    console.log('Step 3: Assembling final page with Gemini...');
    const assemblePrompt = getAssemblePrompt(templateHtml, copyContent, type, productName);

    const assembleResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: assemblePrompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 16384
          }
        })
      }
    );

    if (!assembleResponse.ok) {
      const errorText = await assembleResponse.text();
      console.error('Gemini assemble error:', errorText);
      return res.status(500).json({ error: `Gemini assembly error: ${errorText.substring(0, 200)}` });
    }

    const assembleData = await assembleResponse.json();
    let finalHtml = assembleData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract HTML from code blocks if present
    const htmlMatch = finalHtml.match(/```html\n([\s\S]*?)\n```/) || finalHtml.match(/```\n([\s\S]*?)\n```/);
    if (htmlMatch) {
      finalHtml = htmlMatch[1];
    }

    // Ensure it's valid HTML
    if (!finalHtml.includes('<html') && !finalHtml.includes('<!DOCTYPE')) {
      finalHtml = wrapInHtmlDocument(finalHtml, productName, type);
    }

    return res.status(200).json({
      type,
      productName,
      html: finalHtml
    });

  } catch (error) {
    console.error('Generate API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

function getTemplatePrompt(type, productName, targetAudience) {
  const templates = {
    advertorial: `Create a clean, modern HTML template for an advertorial landing page. The design should look like a premium online publication/news article.

REQUIREMENTS:
- Professional, editorial design (like NY Times, Forbes, or a health publication)
- Clean typography with Georgia or similar serif font for body text
- Max-width container (720px) centered on page
- Generous white space and line-height (1.8)
- Subtle, professional color scheme (dark text on light background)
- Mobile responsive
- Include placeholder sections marked with {{PLACEHOLDER_NAME}} for:
  {{HEADLINE}} - The main editorial headline
  {{BYLINE}} - Author name and date
  {{HOOK}} - Opening paragraph that hooks the reader
  {{PROBLEM}} - Section establishing the problem
  {{DISCOVERY}} - The pivotal discovery/research section
  {{MECHANISM}} - The unique mechanism explanation
  {{SOLUTION}} - Product/solution introduction
  {{TESTIMONIALS}} - Customer testimonials area
  {{CTA}} - Call to action section

Include complete CSS styling. Make it beautiful and readable.
Product context: ${productName}${targetAudience ? ` for ${targetAudience}` : ''}

Return ONLY the HTML code wrapped in \`\`\`html code blocks.`,

    'sales-letter': `Create a high-converting sales letter HTML template.

REQUIREMENTS:
- Bold, attention-grabbing headline area
- Yellow highlights for emphasis (use sparingly)
- Red for urgency elements
- Clean layout with short paragraphs
- Large, prominent CTA buttons (orange or green)
- Trust badges area
- Mobile responsive
- Include placeholder sections marked with {{PLACEHOLDER_NAME}} for:
  {{HEADLINE}} - Pattern-interrupt headline
  {{SUBHEAD}} - Compelling subheadline
  {{LEAD}} - The opening hook
  {{PROBLEM}} - Problem agitation section
  {{MECHANISM}} - Why other solutions fail
  {{SOLUTION}} - The solution reveal
  {{BENEFITS}} - Bullet points of benefits
  {{PROOF}} - Testimonials and proof
  {{OFFER}} - The offer and pricing
  {{CTA}} - Main call to action
  {{PS}} - P.S. section

Include complete CSS styling.
Product context: ${productName}${targetAudience ? ` for ${targetAudience}` : ''}

Return ONLY the HTML code wrapped in \`\`\`html code blocks.`,

    quiz: `Create an interactive quiz funnel HTML template with JavaScript.

REQUIREMENTS:
- Clean, modern, friendly design
- Progress bar at top
- Large, tappable option buttons
- Smooth transitions between questions (CSS transitions)
- Mobile-first responsive design
- Include these screens:
  1. Welcome screen with {{QUIZ_HEADLINE}} and {{QUIZ_INTRO}}
  2. Question screens (use JavaScript array for questions)
  3. Email capture screen with {{RESULTS_TEASER}}
  4. Results screen with {{RESULTS_CONTENT}} and {{CTA}}

The quiz should:
- Track answers in a JavaScript object
- Show progress (question X of Y)
- Have 6-8 engaging questions
- Reveal results after email capture

Include all CSS and JavaScript inline.
Product context: ${productName}${targetAudience ? ` for ${targetAudience}` : ''}

Return ONLY the HTML code wrapped in \`\`\`html code blocks.`
  };

  return templates[type] || templates.advertorial;
}

function getCopyPrompt(type, productName, targetAudience, keyBenefits, additionalContext) {
  const baseContext = `
Product/Offer: ${productName}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}
${keyBenefits ? `Key Benefits: ${keyBenefits}` : ''}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}
`;

  const prompts = {
    advertorial: `Write compelling advertorial copy for each section below. Write in an editorial, journalistic tone - NOT salesy. Use specific details, storytelling, and emotional hooks.

${baseContext}

Write copy for each section (label each clearly):

HEADLINE: A curiosity-driven, news-worthy headline (NOT an ad headline)
BYLINE: A credible author name and "Medical/Health/Finance Correspondent" type title
HOOK: 2-3 paragraphs that immediately grab attention with a story or surprising fact (150-200 words)
PROBLEM: Establish and agitate the problem the reader faces (200-300 words)
DISCOVERY: The pivotal research/discovery that changes everything (150-200 words)
MECHANISM: Explain WHY this solution works when others fail - the unique mechanism (200-300 words)
SOLUTION: Naturally introduce the product as the solution (150-200 words)
TESTIMONIALS: Write 3 realistic customer testimonials with names, ages, locations (150 words total)
CTA: A soft, editorial-style call to action (100-150 words)

Make it compelling, specific, and believable. Use concrete numbers and details.`,

    'sales-letter': `Write high-converting sales letter copy for each section below. Be bold, direct, and persuasive. Create urgency and desire.

${baseContext}

Write copy for each section (label each clearly):

HEADLINE: A bold, pattern-interrupt headline that stops readers
SUBHEAD: Elaborate on the headline promise
LEAD: Hook them emotionally in the first 2-3 paragraphs (150-200 words)
PROBLEM: Agitate their pain and frustration (200-250 words)
MECHANISM: Explain why everything else has failed them (200-250 words)
SOLUTION: Reveal your solution with excitement (150-200 words)
BENEFITS: 10-12 compelling bullet points starting with action verbs
PROOF: Write 3 powerful testimonials with specific results, names, details
OFFER: Present the offer with value stacking (150-200 words)
CTA: Urgent call to action with scarcity/deadline
PS: 3 short P.S. statements reinforcing key points

Be specific. Use numbers. Create desire and urgency.`,

    quiz: `Write engaging quiz funnel copy.

${baseContext}

Write copy for each section (label each clearly):

QUIZ_HEADLINE: An intriguing headline promising personalized results
QUIZ_INTRO: 2-3 sentences setting up why this quiz matters (50 words)
QUESTIONS: Write 6 engaging quiz questions with 3-4 answer options each. Make them feel personal and insightful. Format as:
Q1: [Question]
- Option A
- Option B
- Option C

RESULTS_TEASER: Copy for the email capture screen - tease the value of results (50 words)
RESULTS_CONTENT: Personalized results copy that leads to the solution (150 words)
CTA: Call to action based on quiz results (75 words)

Make questions feel like a personalized assessment, not a sales pitch.`
  };

  return prompts[type] || prompts.advertorial;
}

function getClaudeSystemPrompt(type) {
  return `You are a world-class direct response copywriter combining the skills of Gary Halbert, Eugene Schwartz, John Carlton, and Gary Bencivenga.

Your copy is:
- Specific (uses numbers, details, concrete examples)
- Emotional (connects to deep desires and fears)
- Believable (backed by logic and proof)
- Compelling (impossible to stop reading)

Write ONLY the requested copy sections. Label each section clearly. Do not include HTML or formatting - just the raw copy text.`;
}

function getAssemblePrompt(templateHtml, copyContent, type, productName) {
  return `You have an HTML template and copywriting content. Your job is to assemble them into a final, polished landing page.

## HTML TEMPLATE:
${templateHtml}

## COPYWRITING CONTENT:
${copyContent}

## INSTRUCTIONS:
1. Take the HTML template above
2. Replace each {{PLACEHOLDER}} with the corresponding copy from the copywriting content
3. Format the copy appropriately (add paragraph tags, style testimonials nicely, etc.)
4. Ensure all styling is preserved
5. Make sure the final HTML is complete and valid
6. For testimonials, wrap each in appropriate HTML (blockquote or styled div)
7. For benefits/bullets, use proper list formatting

Return ONLY the complete, assembled HTML document wrapped in \`\`\`html code blocks.
The page should be ready to deploy - beautiful, functional, and conversion-focused.`;
}

function wrapInHtmlDocument(content, productName, type) {
  const titles = {
    advertorial: 'Article',
    'sales-letter': 'Special Offer',
    quiz: 'Quiz'
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${productName} - ${titles[type] || 'Landing Page'}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Georgia, serif; line-height: 1.8; color: #333; background: #fff; }
        .container { max-width: 720px; margin: 0 auto; padding: 40px 20px; }
    </style>
</head>
<body>
    <div class="container">
        ${content}
    </div>
</body>
</html>`;
}
