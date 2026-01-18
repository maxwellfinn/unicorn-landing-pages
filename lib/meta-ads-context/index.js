/**
 * Meta Ads Context - Main Export
 * Centralized export for all Meta ads knowledge and templates
 */

export { HIGH_PERFORMING_HOOKS, HOOK_MODIFIERS } from './high-performing-hooks.js';
export { META_ADS_SPECS, AD_PERFORMANCE_FACTORS, CREATIVE_TESTING_FRAMEWORK, AUDIENCE_AD_MATCHING } from './meta-ads-best-practices.js';
export { INDUSTRY_TEMPLATES, getIndustryTemplates, detectIndustry } from './industry-templates.js';

/**
 * Build a comprehensive context string for AI generation
 */
export function buildAdCopyContext({
  industry,
  tone,
  hookFramework,
  awarenessLevel,
  productInfo,
  targetAudience
}) {
  const context = {
    META_SPECS: {
      primary_text_limit: 125,
      headline_limit: 40,
      description_limit: 30,
      best_practices: [
        'Hook in first 3 words',
        'Use "you" language',
        'Include specific numbers',
        'One clear CTA',
        'Benefit-focused copy'
      ]
    },
    HOOK_FRAMEWORK: hookFramework,
    TONE: tone,
    AWARENESS_LEVEL: awarenessLevel,
    INDUSTRY: industry,
    PRODUCT: productInfo,
    AUDIENCE: targetAudience
  };

  return context;
}

/**
 * Build context for image prompt generation
 */
export function buildImagePromptContext({
  biases,
  styles,
  awarenessLevel,
  brandColors,
  targetDemographic
}) {
  return {
    COGNITIVE_BIASES: biases,
    AD_STYLES: styles,
    AWARENESS_LEVEL: awarenessLevel,
    BRAND_COLORS: brandColors,
    TARGET_DEMOGRAPHIC: targetDemographic,
    META_IMAGE_SPECS: {
      recommended_aspect: '4:5',
      dimensions: '1080x1350',
      style_note: 'UGC-style performs best on Meta',
      avoid: [
        'Too much text',
        'Stock photo look',
        'Cluttered composition',
        'Low contrast'
      ]
    }
  };
}

export default {
  buildAdCopyContext,
  buildImagePromptContext
};
