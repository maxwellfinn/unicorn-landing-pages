/**
 * Industry-Specific Ad Templates
 * Proven templates for different verticals
 */

export const INDUSTRY_TEMPLATES = {
  ecommerce: {
    display_name: 'E-commerce / DTC',
    tone: 'conversational',
    primary_hooks: ['direct_benefit', 'social_proof', 'before_after'],

    templates: {
      product_launch: {
        primary_text: [
          "FINALLY. {product_name} is here.\n\n{key_benefit_1}\n{key_benefit_2}\n{key_benefit_3}\n\nJoin {number}+ customers who've already made the switch.\n\n{urgency_element}",
          "We spent {timeframe} perfecting {product_name}.\n\nThe result? {primary_benefit}.\n\n{testimonial_snippet}\n\n{cta}",
          "Say goodbye to {problem}.\n\nIntroducing {product_name} - designed specifically for {target_audience}.\n\n{social_proof}"
        ],
        headlines: [
          "Finally, {benefit} Made Easy",
          "{Number}+ {demographic} Can't Be Wrong",
          "The {product_type} You've Been Waiting For"
        ],
        ctas: ['SHOP_NOW', 'GET_OFFER', 'LEARN_MORE']
      },

      testimonial: {
        primary_text: [
          "\"{testimonial_quote}\"\n\n- {customer_name}, {customer_location}\n\nSee why {number}+ customers give {product_name} {star_rating} stars.\n\n{cta}",
          "Real customers. Real results.\n\n\"{testimonial_quote}\" - {customer_name}\n\n{benefit_bullet_1}\n{benefit_bullet_2}\n{benefit_bullet_3}\n\nYour turn."
        ],
        headlines: [
          "See What {number}+ Customers Are Saying",
          "{Star_rating}-Star Rated by Real People",
          "Why Customers Love {product_name}"
        ],
        ctas: ['SHOP_NOW', 'LEARN_MORE']
      },

      sale: {
        primary_text: [
          "{discount}% OFF - {sale_name}\n\nFor {timeframe} only, get {product_name} at our lowest price ever.\n\n{key_benefit}\n\nUse code: {promo_code}\n\nEnds {end_date}.",
          "You asked, we listened.\n\n{discount}% off everything in {category}.\n\nThis {sale_duration} only.\n\n{cta}"
        ],
        headlines: [
          "{Discount}% OFF Everything",
          "Last Chance: Sale Ends {date}",
          "Don't Miss This Deal"
        ],
        ctas: ['SHOP_NOW', 'GET_OFFER']
      }
    }
  },

  health_wellness: {
    display_name: 'Health & Wellness',
    tone: 'authoritative',
    primary_hooks: ['problem_agitate', 'story', 'statistic'],
    compliance_note: 'Avoid medical claims. Focus on wellness benefits.',

    templates: {
      supplement: {
        primary_text: [
          "Tired of feeling {negative_state}?\n\nI was too. Until I discovered {key_ingredient}.\n\n{scientific_backing}\n\n{benefit_1}\n{benefit_2}\n{benefit_3}\n\n{number}+ people have already made the switch.",
          "{Statistic} shows {problem}.\n\nBut there's good news.\n\n{product_name} is formulated with {key_ingredients} to help support {benefit}.\n\n{social_proof}"
        ],
        headlines: [
          "Support Your {health_goal} Naturally",
          "The {ingredient} Secret",
          "Feel the Difference in {timeframe}"
        ],
        ctas: ['SHOP_NOW', 'LEARN_MORE']
      },

      fitness: {
        primary_text: [
          "Stop {common_mistake}.\n\n{expert_name}, {credentials}, reveals the {number} things that actually work for {goal}.\n\n{teaser_of_content}\n\n{cta}",
          "{Timeframe} ago, I couldn't {baseline}.\n\nToday, I {achievement}.\n\nHere's exactly what I did (no {common_approach} needed):\n\n{method_teaser}"
        ],
        headlines: [
          "The {goal} Method That Works",
          "Transform Your {body_part} in {timeframe}",
          "What {percentage}% of People Get Wrong"
        ],
        ctas: ['LEARN_MORE', 'SIGN_UP', 'DOWNLOAD']
      }
    }
  },

  saas_b2b: {
    display_name: 'SaaS / B2B',
    tone: 'professional',
    primary_hooks: ['statistic', 'social_proof', 'problem_agitate'],

    templates: {
      lead_gen: {
        primary_text: [
          "{Statistic} of {job_title}s say {pain_point} is their biggest challenge.\n\nWe built {product_name} to solve exactly that.\n\n{benefit_1}\n{benefit_2}\n{benefit_3}\n\nJoin {number}+ companies using {product_name}.",
          "Your {process} is costing you {cost}.\n\n{product_name} helps {company_type}s:\n\n{benefit_1}\n{benefit_2}\n{benefit_3}\n\nSee it in action."
        ],
        headlines: [
          "{Benefit} in {Timeframe}",
          "Trusted by {number}+ Companies",
          "The {category} Platform for {target}"
        ],
        ctas: ['LEARN_MORE', 'GET_QUOTE', 'SIGN_UP']
      },

      demo_request: {
        primary_text: [
          "What if you could {dream_outcome}?\n\n{product_name} makes it possible.\n\nCompanies like {client_1}, {client_2}, and {client_3} are already seeing {result}.\n\nSee it for yourself in a 15-minute demo.",
          "Still using {outdated_method}?\n\nThere's a better way.\n\n{product_name} helps teams:\n{benefit_1}\n{benefit_2}\n{benefit_3}\n\nBook a demo and see the difference."
        ],
        headlines: [
          "See {product_name} in Action",
          "15-Minute Demo, Big Results",
          "The Future of {category}"
        ],
        ctas: ['BOOK_NOW', 'LEARN_MORE', 'GET_QUOTE']
      }
    }
  },

  education_courses: {
    display_name: 'Education / Courses',
    tone: 'conversational',
    primary_hooks: ['story', 'before_after', 'curiosity_gap'],

    templates: {
      course_launch: {
        primary_text: [
          "I went from {before_state} to {after_state}.\n\nAnd I'm going to show you exactly how.\n\n{course_name} reveals:\n{module_1}\n{module_2}\n{module_3}\n\nEnrollment closes {deadline}.",
          "The {skill} that took me {years} to master?\n\nI'm teaching it in {course_duration}.\n\n{number}+ students have already enrolled.\n\nWill you be next?"
        ],
        headlines: [
          "Learn {skill} in {timeframe}",
          "From {before} to {after}",
          "Join {number}+ Students"
        ],
        ctas: ['LEARN_MORE', 'SIGN_UP', 'GET_OFFER']
      },

      free_resource: {
        primary_text: [
          "FREE: The {resource_name} that {number}+ {target_audience} are using to {benefit}.\n\nInside you'll discover:\n{item_1}\n{item_2}\n{item_3}\n\nDownload it now (no email required).",
          "I put together everything I know about {topic} into one {resource_type}.\n\nAnd I'm giving it away for free.\n\n{teaser}\n\nGrab yours before I take this down."
        ],
        headlines: [
          "Free {resource_type}: {topic}",
          "Download Your Copy Now",
          "The Ultimate {topic} Guide"
        ],
        ctas: ['DOWNLOAD', 'LEARN_MORE', 'SIGN_UP']
      }
    }
  },

  local_service: {
    display_name: 'Local Services',
    tone: 'friendly',
    primary_hooks: ['social_proof', 'direct_benefit', 'question'],

    templates: {
      service_promo: {
        primary_text: [
          "Looking for a {service} in {location}?\n\n{business_name} has helped {number}+ local {customers} with:\n\n{service_1}\n{service_2}\n{service_3}\n\n{star_rating} on Google. Family-owned since {year}.",
          "{Location}'s most trusted {service_type}.\n\n{testimonial_snippet}\n\nCall today for a free {offer}."
        ],
        headlines: [
          "{Location}'s Top-Rated {service}",
          "Family-Owned Since {year}",
          "Free {offer} for New Customers"
        ],
        ctas: ['BOOK_NOW', 'CONTACT_US', 'GET_QUOTE', 'LEARN_MORE']
      }
    }
  },

  coaching_consulting: {
    display_name: 'Coaching / Consulting',
    tone: 'authoritative',
    primary_hooks: ['story', 'contrarian', 'statistic'],

    templates: {
      discovery_call: {
        primary_text: [
          "Most {target_audience} fail at {goal} because they {common_mistake}.\n\nI help my clients {alternative_approach} instead.\n\nResult? {specific_result}.\n\nBook a free {call_type} and let's see if I can help you too.",
          "In {timeframe}, I've helped {number}+ {clients} achieve {result}.\n\nMy secret? {unique_approach}.\n\nIf you're ready to {goal}, let's talk."
        ],
        headlines: [
          "Free {call_type} - Limited Spots",
          "Achieve {goal} in {timeframe}",
          "The {approach} That Works"
        ],
        ctas: ['BOOK_NOW', 'LEARN_MORE', 'CONTACT_US']
      }
    }
  }
};

/**
 * Get templates for a specific industry
 */
export function getIndustryTemplates(industry) {
  return INDUSTRY_TEMPLATES[industry] || null;
}

/**
 * Match industry based on keywords
 */
export function detectIndustry(keywords) {
  const industryKeywords = {
    ecommerce: ['shop', 'product', 'shipping', 'order', 'cart', 'store', 'buy'],
    health_wellness: ['health', 'wellness', 'supplement', 'vitamin', 'fitness', 'weight', 'energy'],
    saas_b2b: ['software', 'platform', 'saas', 'enterprise', 'business', 'team', 'productivity'],
    education_courses: ['course', 'learn', 'training', 'academy', 'masterclass', 'workshop'],
    local_service: ['local', 'service', 'near me', 'licensed', 'insured', 'family-owned'],
    coaching_consulting: ['coach', 'consultant', 'mentor', 'strategy', 'guidance', '1-on-1']
  };

  const keywordsLower = keywords.toLowerCase();

  for (const [industry, words] of Object.entries(industryKeywords)) {
    if (words.some(word => keywordsLower.includes(word))) {
      return industry;
    }
  }

  return 'ecommerce'; // Default
}

export default INDUSTRY_TEMPLATES;
