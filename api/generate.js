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

    const { type, productUrl, productName, targetAudience, additionalContext } = body;

    if (!type) {
      return res.status(400).json({ error: 'Page type is required' });
    }

    if (!productUrl && !productName) {
      return res.status(400).json({ error: 'Product URL or product name is required' });
    }

    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!CLAUDE_API_KEY) {
      return res.status(500).json({ error: 'Claude API key not configured' });
    }

    // STEP 1: If URL provided, scrape product info with Gemini
    let productInfo = {
      name: productName || '',
      description: '',
      benefits: [],
      price: '',
      testimonials: [],
      images: [],
      brandColors: [],
      targetAudience: targetAudience || ''
    };

    if (productUrl && GEMINI_API_KEY) {
      console.log('Step 1: Scraping product URL with Gemini...');
      try {
        productInfo = await scrapeProductUrl(productUrl, GEMINI_API_KEY, productName);
        console.log('Product info extracted:', productInfo.name);
      } catch (error) {
        console.error('URL scraping failed, continuing with provided info:', error.message);
        // Continue with what we have
      }
    }

    // Merge any additional context
    if (targetAudience && !productInfo.targetAudience) {
      productInfo.targetAudience = targetAudience;
    }
    if (additionalContext) {
      productInfo.additionalContext = additionalContext;
    }

    // STEP 2: Generate complete page with Claude Sonnet
    console.log('Step 2: Generating complete page with Claude Sonnet...');
    const systemPrompt = getSystemPrompt(type);
    const userPrompt = getUserPrompt(type, productInfo);

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Claude error:', errorText);
      return res.status(500).json({ error: `Claude API error: ${errorText.substring(0, 200)}` });
    }

    const claudeData = await claudeResponse.json();
    let finalHtml = claudeData.content?.[0]?.text || '';

    if (!finalHtml) {
      return res.status(500).json({ error: 'Claude returned empty response' });
    }

    // Extract HTML from code blocks if present
    const htmlMatch = finalHtml.match(/```html\n([\s\S]*?)\n```/) || finalHtml.match(/```\n([\s\S]*?)\n```/);
    if (htmlMatch) {
      finalHtml = htmlMatch[1];
    }

    // Clean up any remaining markdown artifacts
    finalHtml = finalHtml.replace(/^```html\s*/i, '').replace(/\s*```$/i, '');

    return res.status(200).json({
      type,
      productName: productInfo.name || productName,
      html: finalHtml
    });

  } catch (error) {
    console.error('Generate API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ============================================================
// URL SCRAPING WITH GEMINI
// ============================================================

async function scrapeProductUrl(url, apiKey, fallbackName) {
  const scrapePrompt = `Visit this URL and extract product/service information: ${url}

Extract and return as JSON:
{
  "name": "Product/service name",
  "description": "Main description/tagline (2-3 sentences)",
  "benefits": ["benefit 1", "benefit 2", ...], // List 5-8 key benefits
  "price": "Price if visible (or price range)",
  "testimonials": [{"quote": "...", "name": "...", "title": "..."}], // Any visible testimonials
  "images": ["url1", "url2"], // Key product image URLs
  "brandColors": ["#hex1", "#hex2"], // Primary brand colors from the site
  "targetAudience": "Who this product is for",
  "uniqueMechanism": "What makes this product different/how it works",
  "painPoints": ["pain 1", "pain 2", ...], // Problems it solves
  "guarantee": "Any guarantee mentioned",
  "socialProof": "Any stats like '10,000+ customers' etc"
}

If you can't access the URL or find certain info, use empty strings/arrays for those fields.
Return ONLY valid JSON, no markdown or explanation.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: scrapePrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error('Gemini scraping failed');
  }

  const data = await response.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Clean up JSON
  text = text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();

  try {
    const parsed = JSON.parse(text);
    // Ensure name has a fallback
    if (!parsed.name && fallbackName) {
      parsed.name = fallbackName;
    }
    return parsed;
  } catch (e) {
    console.error('Failed to parse Gemini response as JSON:', text.substring(0, 200));
    return {
      name: fallbackName || '',
      description: text.substring(0, 500),
      benefits: [],
      price: '',
      testimonials: [],
      images: [],
      brandColors: [],
      targetAudience: ''
    };
  }
}

// ============================================================
// SYSTEM PROMPTS - THE MAGIC SAUCE
// ============================================================

function getSystemPrompt(type) {
  const baseDesignSystem = `
## DESIGN SYSTEM REQUIREMENTS

You are creating landing pages that match the quality of premium, high-converting pages. Every page must include:

### Typography
- Use Google Fonts: Poppins for headings, Inter or system fonts for body
- Headings: Bold (700-800 weight), large sizes with clamp() for responsiveness
- Body: 16-18px, line-height 1.6-1.8, color #333 or #2D3436
- Generous letter-spacing on small caps/labels

### Spacing & Layout
- Mobile-first responsive design
- Max-width containers (720px for articles, 1200px for wider layouts)
- Section padding: 60-80px vertical, 20-24px horizontal on mobile
- Use CSS clamp() for fluid typography: clamp(2rem, 5vw, 3.5rem)

### Color Patterns
- High contrast for readability
- Accent colors used sparingly for CTAs and highlights
- Use rgba() for subtle backgrounds and overlays
- Dark sections to break up content and add visual interest

### Interactive Elements
- Buttons: Large (padding 16-20px 32-40px), rounded (8-12px), with hover states
- Hover transforms: translateY(-2px) with box-shadow increase
- Smooth transitions: 0.3s ease or cubic-bezier(0.4, 0, 0.2, 1)

### Social Proof Patterns
- Specific numbers ("75,000+ customers" not "thousands")
- Star ratings with filled stars
- Testimonials with names, titles/roles, and photos (use placeholder URLs)
- Trust badges and guarantees

### Mobile Responsiveness
- @media (max-width: 768px) breakpoints
- Stack layouts vertically on mobile
- Reduce padding and font sizes appropriately
- Touch-friendly button sizes (min 44px)
`;

  const prompts = {
    advertorial: `You are an expert landing page designer and direct-response copywriter. Create a complete, production-ready advertorial landing page.

${baseDesignSystem}

## ADVERTORIAL-SPECIFIC DESIGN

Reference design: Premium editorial/news publication style (like NY Times health section or Forbes)

### Visual Style
- Clean, editorial aesthetic
- Serif font for body text (Georgia, Playfair Display) for credibility
- Sans-serif for headlines (Poppins, Inter)
- Black/dark backgrounds for key sections with light text
- Accent color (like neon lime #CAFF2F or brand color) for highlights and CTAs
- Professional, almost clinical feel

### Page Structure
1. **Hero Section** - Problem-focused headline with credibility hook
2. **Patient/Customer Story** - Open with a relatable story (name, age, specific struggle)
3. **The Problem** - Establish why existing solutions fail (with stats)
4. **The Discovery** - Expert credibility + scientific mechanism
5. **The Solution** - Natural product introduction
6. **How It Works** - 3-part system or unique mechanism breakdown
7. **Proof Section** - Multiple testimonials with specific results
8. **Risk Reversal** - Guarantee, FAQ answers
9. **Final CTA** - Urgency + discount/offer

### Copy Style
- Editorial, journalistic tone (NOT salesy)
- Specific numbers and statistics
- Named experts with credentials
- Story-driven with emotional hooks
- "Uncomfortable truth" framing
- Use phrases like "Here's what researchers discovered..." not "Buy now!"

### Must Include
- Byline with credible author name and title
- Reading time estimate
- Sticky CTA bar that appears on scroll
- Multiple CTAs throughout (but not pushy)
- Social proof stats in hero area
- Before/after or transformation elements
- Medical/expert disclaimer if health-related`,

    listicle: `You are an expert landing page designer and native advertising specialist. Create a complete, production-ready listicle/native advertorial page.

${baseDesignSystem}

## LISTICLE-SPECIFIC DESIGN

Reference design: Consumer advice article with embedded native ad (like a "10 Ways to Save Money" article)

### Visual Style
- News/magazine publication look
- Clean header with publication-style branding
- Red or brand color accent for header bar
- White background with generous whitespace
- Card-style sections for each tip
- Comparison tables and savings callouts

### Page Structure
1. **Header Bar** - Publication-style with logo and tagline
2. **Hero Section** - Listicle headline ("X Ways to..." or "X Things...")
3. **Introduction** - Set up the value, mention local relevance if applicable
4. **Tips 1-2** - Genuine, valuable advice (NOT the product)
5. **Tip 3** - THE NATIVE AD - Naturally introduce the product as a "discovery"
6. **Tips 4-6** - More genuine advice
7. **Mid-Content CTA** - Subtle reminder of the product
8. **Remaining Tips** - Complete the list with real value
9. **Conclusion** - Wrap up with final CTA

### Native Ad Integration (Tip 3)
- Position as a "discovery" or "hidden gem"
- Use comparison (show competitor markup vs. product pricing)
- Include specific savings calculations
- Customer quote/testimonial
- Soft CTA button ("Learn More" or "Try It Free")
- Trust metrics (ratings, customer count)

### Copy Style
- Helpful, advice-column tone
- Local references if applicable (city names, local businesses)
- Specific dollar amounts for savings
- Attributed quotes with names and context
- "We surveyed..." or "Local experts recommend..." framing

### Must Include
- Numbered list format (clearly numbered tips)
- Savings/benefit callouts with green accent
- At least 5-6 genuine tips (not all about the product)
- Comparison visual for the native ad section
- Social proof (star rating, customer count)
- Newsletter or contest CTA as engagement hook`,

    quiz: `You are an expert landing page designer and quiz funnel specialist. Create a complete, production-ready interactive quiz page with JavaScript.

${baseDesignSystem}

## QUIZ-SPECIFIC DESIGN

Reference design: Personalized product recommendation quiz (like Kiki+Lulu pajama finder)

### Visual Style
- Friendly, approachable aesthetic
- Soft, inviting colors (pastels or brand colors)
- Large, tappable option buttons with icons/emojis
- Progress bar at top
- Card-style question containers
- Celebration/confetti on results

### Page Structure
1. **Welcome Screen**
   - Engaging headline promising personalized results
   - "Takes X seconds" + "X people have taken this"
   - Social proof (ratings, customer count)
   - Big "Start Quiz" button

2. **Pre-Quiz Content** (optional scroll section)
   - Testimonials
   - Product previews
   - Pain points the quiz addresses

3. **Quiz Container** (JavaScript-driven)
   - Question 1: Name input (for personalization)
   - Questions 2-7: Multiple choice with styled options
   - Email capture before results
   - Results screen with personalized recommendations

4. **Post-Results CTA**
   - Product recommendations based on answers
   - Discount code or special offer
   - Direct purchase button

### Question Types
- Single select (click option, auto-advance)
- Multi-select (select multiple, click Continue)
- Emoji/icon options
- Grid options for sizes/preferences

### JavaScript Requirements
- Track answers in array/object
- Show/hide question screens (no page reloads)
- Progress bar updates with each question
- Name personalization in results ("Emma's Perfect Picks!")
- Email validation before showing results
- Smooth CSS transitions between screens

### Must Include
- 6-8 questions (not too long)
- Progress indicator (Question X of Y)
- Back button option
- Skip option for non-required questions
- Results personalization using quiz answers
- Email capture with privacy assurance
- Product recommendations based on answers`,

    vip: `You are an expert landing page designer and email capture specialist. Create a complete, production-ready VIP/waitlist signup page.

${baseDesignSystem}

## VIP PAGE-SPECIFIC DESIGN

Reference design: Exclusive insider access signup (like Kiki+Lulu VIP page)

### Visual Style
- Premium, exclusive feel
- Elegant typography with good hierarchy
- Brand colors with white/cream backgrounds
- Soft gradients and subtle shadows
- Aspirational imagery
- Badge/tag styling for "VIP" and "Exclusive"

### Page Structure
1. **Header** - Clean brand logo
2. **Hero Section**
   - "Exclusive Invitation" or "VIP Access" tag
   - Compelling headline about joining insiders
   - Subhead with specific member count ("Join 12,847 moms")
   - Email capture form (name + email)
   - Privacy assurance

3. **Benefits Grid**
   - 6 VIP perks with icons
   - Early access, exclusive discounts, sneak peeks, etc.

4. **Preview Section**
   - Upcoming drops or products
   - "VIP Access Only" tags on some items

5. **Testimonial**
   - One strong testimonial from existing VIP member

6. **Final CTA**
   - Repeat email capture
   - Urgency ("Don't miss the next drop")

### Copy Style
- Exclusivity language ("insider," "first access," "members only")
- FOMO creation ("Our best prints sell out in hours")
- Community feel ("Join X members who...")
- Benefit-focused (what they GET, not what you want)

### Must Include
- Member count display
- Multiple email capture forms (hero + bottom)
- 6 clear VIP benefits with icons
- Preview of exclusive/upcoming content
- Testimonial from VIP member
- Privacy/unsubscribe assurance`,

    calculator: `You are an expert landing page designer and conversion specialist. Create a complete, production-ready savings calculator landing page with JavaScript.

${baseDesignSystem}

## CALCULATOR-SPECIFIC DESIGN

Reference design: Interactive savings comparison tool (like Grabbl savings calculator)

### Visual Style
- Bold, high-contrast design
- Accusatory/challenger brand positioning
- Red/brand color for hero
- Green for savings/positive numbers
- Interactive sliders and inputs
- Real-time updating numbers

### Page Structure
1. **Hero Section**
   - Bold, accusatory headline ("Stop Getting Ripped Off by X")
   - Direct statement of the problem
   - Quick value prop

2. **Calculator Section**
   - Interactive inputs (sliders, dropdowns)
   - Real-time calculation display
   - Side-by-side comparison (them vs. us)
   - Big savings number display

3. **Proof Grid**
   - Key metrics (customer count, rating, avg savings)
   - Trust badges

4. **How It Works**
   - Simple 3-step process
   - Clear differentiation from competitors

5. **Final CTA**
   - App download or signup
   - Discount/bonus incentive

### JavaScript Requirements
- Slider inputs with real-time updates
- Calculate savings based on:
  - Order amount (adjustable)
  - Frequency (2x, 4x, 8x per month)
  - Competitor markup percentage
- Display monthly and annual savings
- Animate number changes

### Copy Style
- Accusatory/challenger tone
- Direct comparison to competitors
- Specific dollar amounts
- Simple, punchy sentences
- "You're paying X more because..."

### Must Include
- Interactive calculator with sliders
- Real-time savings display
- Competitor comparison
- Trust metrics (ratings, customer count)
- Clear CTA for app/signup
- Mobile-friendly touch inputs`
  };

  return prompts[type] || prompts.advertorial;
}

// ============================================================
// USER PROMPTS - PRODUCT CONTEXT
// ============================================================

function getUserPrompt(type, productInfo) {
  const productContext = `
## PRODUCT/OFFER INFORMATION

**Product Name:** ${productInfo.name || 'Unknown Product'}
**Description:** ${productInfo.description || 'No description provided'}
**Price:** ${productInfo.price || 'Contact for pricing'}
**Target Audience:** ${productInfo.targetAudience || 'General consumers'}

**Key Benefits:**
${productInfo.benefits?.length ? productInfo.benefits.map(b => `- ${b}`).join('\n') : '- Quality product\n- Great value\n- Customer satisfaction'}

**Pain Points Solved:**
${productInfo.painPoints?.length ? productInfo.painPoints.map(p => `- ${p}`).join('\n') : '- Common frustrations in this space'}

**Unique Mechanism/Differentiator:**
${productInfo.uniqueMechanism || 'Superior quality and customer focus'}

**Social Proof:**
${productInfo.socialProof || 'Trusted by thousands of customers'}

**Guarantee:**
${productInfo.guarantee || '30-day satisfaction guarantee'}

**Existing Testimonials:**
${productInfo.testimonials?.length ? productInfo.testimonials.map(t => `"${t.quote}" - ${t.name}${t.title ? `, ${t.title}` : ''}`).join('\n') : 'Create realistic testimonials based on the product benefits'}

**Brand Colors:**
${productInfo.brandColors?.length ? productInfo.brandColors.join(', ') : 'Use professional defaults'}

${productInfo.additionalContext ? `**Additional Context:** ${productInfo.additionalContext}` : ''}
`;

  const typeInstructions = {
    advertorial: `Create a complete advertorial landing page for this product.

${productContext}

Generate the COMPLETE HTML page including:
- All CSS in a <style> tag (no external stylesheets except Google Fonts)
- Responsive design with mobile breakpoints
- Sticky CTA bar that appears on scroll (with JavaScript)
- A compelling editorial narrative
- At least 3 testimonials with names and specific results
- Multiple CTAs throughout

The page should be 100% production-ready. Return ONLY the HTML code starting with <!DOCTYPE html>.`,

    listicle: `Create a complete listicle/native advertorial page featuring this product.

${productContext}

Generate a "X Ways to [Solve Problem]" style article where this product is naturally featured as one of the tips (around tip #3).

The page should include:
- At least 6 genuine, helpful tips
- This product featured naturally as one tip (not #1)
- Comparison showing this product's advantage
- All CSS inline
- Responsive design

Return ONLY the HTML code starting with <!DOCTYPE html>.`,

    quiz: `Create a complete interactive quiz funnel for this product.

${productContext}

Generate a personalized recommendation quiz that:
- Asks 6-8 relevant questions
- Collects name and email
- Shows personalized results
- Recommends this product based on answers

Include all JavaScript for:
- Question navigation
- Answer tracking
- Progress bar
- Results generation

Return ONLY the HTML code starting with <!DOCTYPE html>.`,

    vip: `Create a complete VIP signup page for this brand.

${productContext}

Generate an exclusive insider signup page that:
- Creates FOMO and exclusivity
- Lists 6 VIP member benefits
- Shows upcoming exclusive drops/products
- Captures email for the VIP list

Return ONLY the HTML code starting with <!DOCTYPE html>.`,

    calculator: `Create a complete savings calculator page for this product.

${productContext}

Generate an interactive page that:
- Shows how much users save with this product vs competitors
- Has adjustable inputs (frequency, amount)
- Calculates real-time savings
- Creates urgency to switch

Include all JavaScript for the calculator functionality.

Return ONLY the HTML code starting with <!DOCTYPE html>.`
  };

  return typeInstructions[type] || typeInstructions.advertorial;
}
