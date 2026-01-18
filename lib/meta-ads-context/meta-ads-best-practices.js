/**
 * Meta Ads Best Practices & Platform Specs
 * Current as of 2025
 */

export const META_ADS_SPECS = {
  // Character limits
  character_limits: {
    primary_text: {
      recommended: 125,
      max_before_truncation: 125,
      absolute_max: 500,
      note: 'Only first 125 chars visible before "...See More"'
    },
    headline: {
      recommended: 40,
      max: 40,
      note: 'Gets truncated on mobile if longer'
    },
    description: {
      recommended: 30,
      max: 30,
      note: 'May not show on all placements'
    },
    link_description: {
      recommended: 20,
      max: 30
    }
  },

  // Image specifications
  image_specs: {
    feed: {
      aspect_ratios: {
        '1:1': { width: 1080, height: 1080, best_for: 'Feed square' },
        '4:5': { width: 1080, height: 1350, best_for: 'Feed vertical (recommended)' },
        '1.91:1': { width: 1200, height: 628, best_for: 'Link ads' }
      },
      min_resolution: '600x600',
      max_file_size: '30MB',
      formats: ['JPG', 'PNG'],
      text_overlay_limit: '20% of image area (soft limit)'
    },
    stories: {
      aspect_ratio: '9:16',
      dimensions: { width: 1080, height: 1920 },
      safe_zones: {
        top: '14% for profile and story bars',
        bottom: '20% for CTA button and swipe up'
      }
    },
    reels: {
      aspect_ratio: '9:16',
      dimensions: { width: 1080, height: 1920 },
      duration: { min: 3, max: 90, recommended: '15-30 seconds' }
    }
  },

  // Call-to-action buttons
  cta_options: [
    { value: 'LEARN_MORE', label: 'Learn More', best_for: 'Awareness, consideration' },
    { value: 'SHOP_NOW', label: 'Shop Now', best_for: 'Ecommerce, direct sales' },
    { value: 'SIGN_UP', label: 'Sign Up', best_for: 'Lead generation, newsletters' },
    { value: 'BOOK_NOW', label: 'Book Now', best_for: 'Services, appointments' },
    { value: 'GET_OFFER', label: 'Get Offer', best_for: 'Promotions, discounts' },
    { value: 'CONTACT_US', label: 'Contact Us', best_for: 'B2B, services' },
    { value: 'DOWNLOAD', label: 'Download', best_for: 'Apps, resources' },
    { value: 'GET_QUOTE', label: 'Get Quote', best_for: 'B2B, insurance, services' },
    { value: 'SUBSCRIBE', label: 'Subscribe', best_for: 'Subscriptions, content' },
    { value: 'APPLY_NOW', label: 'Apply Now', best_for: 'Jobs, finance, education' },
    { value: 'ORDER_NOW', label: 'Order Now', best_for: 'Food, quick purchases' },
    { value: 'SEE_MENU', label: 'See Menu', best_for: 'Restaurants' },
    { value: 'WATCH_MORE', label: 'Watch More', best_for: 'Video content' },
    { value: 'SEND_MESSAGE', label: 'Send Message', best_for: 'Messenger ads' }
  ]
};

export const AD_PERFORMANCE_FACTORS = {
  // What makes ads perform well
  high_performers: {
    visual: [
      'Human faces (especially making eye contact)',
      'Bright, contrasting colors',
      'Movement/motion (video or implied)',
      'Before/after comparisons',
      'Product in use (not just product shots)',
      'UGC-style content (less polished = more authentic)',
      'Text overlays that reinforce the hook',
      'Single focal point (not cluttered)'
    ],
    copy: [
      'Hook in first 3 words',
      'Specific numbers and results',
      'Direct address ("you" language)',
      'Emotional triggers (fear, desire, curiosity)',
      'Social proof woven in naturally',
      'Clear, singular CTA',
      'Benefit-focused (not feature-focused)',
      'Conversational tone (write like you talk)'
    ],
    structure: [
      'Hook → Problem → Solution → Proof → CTA',
      'Story arc: Before → Discovery → After',
      'List format (numbered tips/reasons)',
      'Question → Answer → Action',
      'Statement → Evidence → Invitation'
    ]
  },

  // What kills ad performance
  low_performers: {
    visual: [
      'Stock photo look',
      'Too much text on image',
      'Cluttered composition',
      'Low contrast/hard to see',
      'Product-only shots with no context',
      'Overly polished/corporate feel',
      'No human element',
      'Small text that\'s unreadable on mobile'
    ],
    copy: [
      'Generic opening ("Attention!")',
      'Feature dumps without benefits',
      'No clear CTA',
      'Corporate/stiff language',
      'Making multiple asks',
      'Burying the hook',
      'Vague claims without specifics',
      'Wall of text with no line breaks'
    ],
    targeting_creative_mismatch: [
      'Cold audience with hard sell',
      'Retargeting without new angle',
      'Wrong tone for audience',
      'Ignoring placement requirements'
    ]
  }
};

export const CREATIVE_TESTING_FRAMEWORK = {
  // Elements to test
  test_variables: {
    primary: [
      'Hook (first 3 words)',
      'Visual style (UGC vs produced)',
      'CTA button choice',
      'Social proof presence'
    ],
    secondary: [
      'Headline variations',
      'Image vs video',
      'Aspect ratio',
      'Color palette'
    ],
    advanced: [
      'Awareness level targeting',
      'Emotion type (fear vs desire)',
      'Specificity of claims',
      'Length of copy'
    ]
  },

  // Testing methodology
  methodology: {
    minimum_budget_per_variant: 50,
    minimum_impressions: 1000,
    minimum_clicks: 30,
    test_duration_days: { min: 3, recommended: 7 },
    winner_criteria: {
      primary: 'Cost per result',
      secondary: ['CTR', 'Relevance score', 'Frequency']
    }
  }
};

export const AUDIENCE_AD_MATCHING = {
  // Match creative approach to awareness level
  cold_traffic: {
    awareness: 'unaware',
    approach: 'Pattern interrupt, curiosity, entertainment',
    hooks: ['curiosity_gap', 'contrarian', 'question'],
    visuals: ['UGC', 'Native content', 'Pattern interrupt'],
    copy_length: 'short',
    cta_strength: 'soft'
  },
  warm_traffic: {
    awareness: 'problem_aware to solution_aware',
    approach: 'Education, differentiation, value proposition',
    hooks: ['problem_agitate', 'story', 'statistic'],
    visuals: ['Demo', 'Explainer', 'Before/after'],
    copy_length: 'medium',
    cta_strength: 'medium'
  },
  hot_traffic: {
    awareness: 'product_aware to most_aware',
    approach: 'Social proof, urgency, offer',
    hooks: ['social_proof', 'direct_benefit', 'fear_of_missing'],
    visuals: ['Testimonials', 'Results', 'Offer graphics'],
    copy_length: 'variable',
    cta_strength: 'strong'
  }
};

export default META_ADS_SPECS;
