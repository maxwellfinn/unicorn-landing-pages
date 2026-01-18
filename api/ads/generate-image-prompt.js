import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { verifyAuth } from '../../lib/auth.js';

/**
 * Image Prompt Generator for AI Image Tools (Nano Banana 2, etc.)
 * Generates detailed prompts optimized for Meta ad creatives
 *
 * TODO: Add Nano Banana 2 specific skill/prompt engineering once provided
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Verify auth
  const user = await verifyAuth(req, res);
  if (!user) return;

  try {
    const {
      client_id,
      campaign_id,
      ad_copy_id,
      image_type = 'product_lifestyle', // product_lifestyle, ugc_style, before_after, testimonial, benefit_focused, problem_agitate
      aspect_ratio = '1:1', // 1:1, 4:5, 9:16, 16:9, 1.91:1
      style_reference,
      product_description,
      target_audience,
      mood = 'aspirational', // aspirational, urgent, calm, energetic, professional, playful
      color_palette,
      include_text_overlay = false,
      text_overlay_content,
      num_variations = 3,
      custom_instructions
    } = req.body;

    if (!client_id) {
      return res.status(400).json({
        success: false,
        error: 'client_id is required'
      });
    }

    // Get client data
    const clientResult = await sql`
      SELECT c.*, b.primary_color, b.secondary_color, b.accent_color
      FROM clients c
      LEFT JOIN brand_style_guides b ON c.id = b.client_id
      WHERE c.id = ${client_id}
    `;

    if (clientResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    const client = clientResult.rows[0];
    const businessResearch = client.business_research || {};

    // Get the associated ad copy if provided
    let adCopy = null;
    if (ad_copy_id) {
      const adCopyResult = await sql`
        SELECT * FROM ad_copy WHERE id = ${ad_copy_id}
      `;
      if (adCopyResult.rows.length > 0) {
        adCopy = adCopyResult.rows[0];
      }
    }

    const claudeApiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!claudeApiKey) {
      return res.status(500).json({
        success: false,
        error: 'ANTHROPIC_API_KEY not configured'
      });
    }

    const prompt = buildImagePromptPrompt({
      client,
      businessResearch,
      adCopy,
      imageType: image_type,
      aspectRatio: aspect_ratio,
      styleReference: style_reference,
      productDescription: product_description,
      targetAudience: target_audience,
      mood,
      colorPalette: color_palette || {
        primary: client.primary_color,
        secondary: client.secondary_color,
        accent: client.accent_color
      },
      includeTextOverlay: include_text_overlay,
      textOverlayContent: text_overlay_content,
      numVariations: num_variations,
      customInstructions: custom_instructions
    });

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    const claudeData = await claudeResponse.json();
    const responseText = claudeData.content?.[0]?.text || '';

    // Parse the JSON response
    let imagePrompts;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      imagePrompts = jsonMatch ? JSON.parse(jsonMatch[0]) : { prompts: [] };
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
      imagePrompts = { raw_response: responseText };
    }

    // Store generated prompts in database
    const savedPrompts = [];
    const now = new Date().toISOString();

    if (imagePrompts.prompts) {
      for (const promptData of imagePrompts.prompts) {
        const promptId = uuidv4();
        await sql`
          INSERT INTO image_prompts (
            id, campaign_id, client_id, user_id, ad_copy_id,
            prompt_text, negative_prompt, style_reference, aspect_ratio,
            image_type, model_target, generation_context, created_at
          )
          VALUES (
            ${promptId},
            ${campaign_id || null},
            ${client_id},
            ${user.userId},
            ${ad_copy_id || null},
            ${promptData.prompt || ''},
            ${promptData.negative_prompt || ''},
            ${style_reference || ''},
            ${aspect_ratio},
            ${image_type},
            'nano_banana_2',
            ${JSON.stringify({
              mood,
              target_audience: targetAudience,
              include_text: include_text_overlay
            })}::jsonb,
            ${now}
          )
        `;
        savedPrompts.push({
          id: promptId,
          ...promptData
        });
      }
    }

    return res.status(200).json({
      success: true,
      prompts: savedPrompts.length > 0 ? savedPrompts : imagePrompts.prompts || [],
      creative_direction: imagePrompts.creative_direction || null,
      tokens_used: (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0)
    });

  } catch (error) {
    console.error('Image prompt generation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function buildImagePromptPrompt({
  client,
  businessResearch,
  adCopy,
  imageType,
  aspectRatio,
  styleReference,
  productDescription,
  targetAudience,
  mood,
  colorPalette,
  includeTextOverlay,
  textOverlayContent,
  numVariations,
  customInstructions
}) {
  const imageTypeGuides = {
    product_lifestyle: `
PRODUCT LIFESTYLE SHOT:
- Show product in use by target demographic
- Aspirational but relatable setting
- Natural lighting preferred
- Product should be clearly visible but not overly staged
- Environment tells a story about the customer's life`,

    ugc_style: `
UGC (User-Generated Content) STYLE:
- Looks like it was shot on a phone
- Authentic, not overly polished
- Person holding/using product naturally
- Good but not perfect lighting
- Casual setting (home, office, outdoors)
- Feels like a real customer testimonial`,

    before_after: `
BEFORE/AFTER COMPARISON:
- Clear visual transformation
- Same lighting and angle for both
- Dramatic but believable difference
- Focus on the key benefit/change
- Clean split or side-by-side composition`,

    testimonial: `
TESTIMONIAL STYLE:
- Happy customer with product
- Genuine smile, eye contact with camera
- Simple, uncluttered background
- Room for text overlay if needed
- Trustworthy, relatable person`,

    benefit_focused: `
BENEFIT-FOCUSED VISUAL:
- Metaphorical or literal representation of main benefit
- Emotionally evocative
- Simple, bold composition
- Single clear focal point
- Colors that evoke desired emotion`,

    problem_agitate: `
PROBLEM/AGITATION VISUAL:
- Shows the pain point clearly
- Creates emotional response (frustration, discomfort)
- Not too negative - hint at solution
- Relatable scenario
- Sets up the need for the product`
  };

  const aspectRatioGuides = {
    '1:1': 'Square format (1080x1080) - Best for feed posts',
    '4:5': 'Portrait format (1080x1350) - Takes up more feed space',
    '9:16': 'Stories/Reels format (1080x1920) - Full screen vertical',
    '16:9': 'Landscape format (1920x1080) - Video thumbnails',
    '1.91:1': 'Link preview format (1200x628) - Best for link ads'
  };

  const moodGuides = {
    aspirational: 'Elevated, desirable, something to strive for. Bright, clean, premium feel.',
    urgent: 'Dynamic, high-energy, action-oriented. Bold colors, movement implied.',
    calm: 'Peaceful, serene, trustworthy. Soft colors, open space, natural elements.',
    energetic: 'Vibrant, exciting, youthful. Bright colors, dynamic angles, movement.',
    professional: 'Clean, credible, sophisticated. Neutral tones, minimal distractions.',
    playful: 'Fun, lighthearted, approachable. Bright colors, interesting perspectives.'
  };

  return `You are an expert creative director specializing in Meta ad creatives. Generate detailed image prompts optimized for AI image generation (targeting Nano Banana 2 / similar models).

BRAND CONTEXT:
Company: ${businessResearch.company_name || client.name}
Industry: ${client.industry || businessResearch.industry || 'Unknown'}
Products: ${JSON.stringify(businessResearch.products?.slice(0, 2) || [])}
Target Audience: ${targetAudience || JSON.stringify(businessResearch.target_audiences?.[0] || {})}
Brand Colors: ${JSON.stringify(colorPalette)}

${productDescription ? `PRODUCT DETAILS: ${productDescription}` : ''}

${adCopy ? `
ASSOCIATED AD COPY (image should complement this):
Primary Text: ${adCopy.primary_text}
Headline: ${adCopy.headline}
Hook Angle: ${adCopy.hook_angle}
` : ''}

IMAGE REQUIREMENTS:
- Type: ${imageType}
${imageTypeGuides[imageType] || imageTypeGuides.product_lifestyle}

- Aspect Ratio: ${aspectRatio} - ${aspectRatioGuides[aspectRatio]}
- Mood: ${mood} - ${moodGuides[mood]}
${styleReference ? `- Style Reference: ${styleReference}` : ''}
${includeTextOverlay ? `- Include space for text overlay: "${textOverlayContent || 'See ad copy'}"` : '- No text overlay needed'}

${customInstructions ? `ADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}

Generate ${numVariations} unique image prompts. Each prompt should be:
1. Highly detailed (lighting, composition, colors, subjects, setting)
2. Optimized for AI image generation
3. Meta ad compliant (no shocking content, appropriate for all audiences)
4. Designed to stop the scroll

Return ONLY valid JSON in this format:
{
  "prompts": [
    {
      "prompt": "Detailed positive prompt describing the image...",
      "negative_prompt": "Things to avoid in the generation...",
      "composition_notes": "Brief note on framing and focal point",
      "why_it_works": "Why this will perform well as an ad"
    }
  ],
  "creative_direction": "Overall strategic direction for this campaign's visuals"
}`;
}
