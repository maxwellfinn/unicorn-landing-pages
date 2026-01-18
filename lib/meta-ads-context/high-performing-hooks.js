/**
 * High-Performing Meta Ad Hooks
 * Curated collection of proven hook patterns and examples
 */

export const HIGH_PERFORMING_HOOKS = {
  // Problem-Agitate-Solution Hooks
  problem_agitate: {
    description: 'Start with a pain point, intensify it, then offer the solution',
    patterns: [
      "Are you tired of {pain_point}? You're not alone. {statistic} people struggle with this every day. But there's a solution that actually works...",
      "Struggling with {pain_point}? I was too. Until I discovered {product}...",
      "{Pain_point} is costing you more than you think. Here's what finally worked for me...",
      "I spent years dealing with {pain_point}. Then I found the one thing that changed everything...",
      "If you're still {negative_action}, you're making a costly mistake. Here's why..."
    ],
    best_for: ['Health', 'Finance', 'Productivity', 'Self-improvement'],
    awareness_level: 'problem_aware'
  },

  // Curiosity Gap Hooks
  curiosity_gap: {
    description: 'Create intrigue by hinting at valuable information',
    patterns: [
      "The #1 thing {experts} don't want you to know about {topic}...",
      "I can't believe {industry} has been hiding this for so long...",
      "This weird trick is helping {target_audience} {benefit}...",
      "What happens when you {action}? I tested it so you don't have to...",
      "Nobody talks about this {topic} secret (but they should)...",
      "The truth about {topic} that {number}% of people don't know..."
    ],
    best_for: ['Info products', 'Supplements', 'Finance', 'Lifestyle'],
    awareness_level: 'unaware'
  },

  // Contrarian Hooks
  contrarian: {
    description: 'Challenge conventional wisdom to stop the scroll',
    patterns: [
      "Stop {common_advice}. Here's what actually works...",
      "Everything you've been told about {topic} is wrong...",
      "{Common_belief}? Actually, {contrarian_truth}...",
      "I broke every rule about {topic}. The results shocked me...",
      "Forget {traditional_approach}. This is the future of {topic}...",
      "Why {popular_thing} is actually keeping you from {desired_outcome}..."
    ],
    best_for: ['Fitness', 'Business', 'Marketing', 'Education'],
    awareness_level: 'solution_aware'
  },

  // Social Proof Hooks
  social_proof: {
    description: 'Lead with credibility and social validation',
    patterns: [
      "{Number}+ {people/companies} have already discovered the secret to {benefit}...",
      "Join {number} {target_audience} who are already {positive_action}...",
      "See why {authority_figure} calls this 'the {superlative} {product_type}'...",
      "Featured in {publication}. Trusted by {companies}. Here's why...",
      "What {number} {demographic} know that you don't...",
      "The same {product/method} used by {famous_person/company}..."
    ],
    best_for: ['B2B', 'Premium products', 'Services', 'Software'],
    awareness_level: 'product_aware'
  },

  // Direct Benefit Hooks
  direct_benefit: {
    description: 'Lead with the primary benefit immediately',
    patterns: [
      "Get {benefit} in just {timeframe}...",
      "Finally, {benefit} without {sacrifice}...",
      "The fastest way to {benefit} (even if you've tried everything)...",
      "{Benefit} guaranteed. Or your money back...",
      "Want {benefit}? Here's exactly how to get it...",
      "{Number}x {benefit} in {timeframe}. Here's how..."
    ],
    best_for: ['Direct response', 'Ecommerce', 'Services'],
    awareness_level: 'most_aware'
  },

  // Story Hooks
  story: {
    description: 'Open with a personal narrative that draws readers in',
    patterns: [
      "I was {desperate_situation} when I discovered {solution}...",
      "Two years ago, I {past_situation}. Today, I {transformation}...",
      "My {person} thought I was crazy for trying this. Now they want to know my secret...",
      "I never thought I'd say this, but {unexpected_result}...",
      "The day I {pivotal_moment} changed everything...",
      "Everyone laughed when I {action}. They're not laughing now..."
    ],
    best_for: ['Personal brands', 'Courses', 'Coaching', 'Health'],
    awareness_level: 'problem_aware'
  },

  // Question Hooks
  question: {
    description: 'Engage with a thought-provoking question',
    patterns: [
      "What if you could {dream_scenario}?",
      "Are you making these {number} {topic} mistakes?",
      "Do you know why {situation}?",
      "What would you do with {benefit}?",
      "Have you ever wondered why {mystery}?",
      "Why do {successful_people} always {action}?"
    ],
    best_for: ['Education', 'Coaching', 'Self-improvement'],
    awareness_level: 'unaware'
  },

  // Statistic Hooks
  statistic: {
    description: 'Lead with a surprising or compelling statistic',
    patterns: [
      "{Number}% of {demographic} are {negative_situation}. Don't be one of them...",
      "Studies show {statistic}. Here's what you can do about it...",
      "{Number} out of {number} {people} {action}. Are you one of them?",
      "The {number} that changed how I think about {topic}...",
      "{Research/study} reveals {surprising_finding}...",
      "Every {timeframe}, {statistic}. Here's how to {solution}..."
    ],
    best_for: ['Health', 'Finance', 'B2B', 'Research-backed products'],
    awareness_level: 'problem_aware'
  },

  // Before/After Hooks
  before_after: {
    description: 'Show the transformation clearly',
    patterns: [
      "Before: {pain_state}. After: {desired_state}. Here's what changed...",
      "{Timeframe} ago I was {before}. Now I'm {after}...",
      "From {negative} to {positive} in just {timeframe}...",
      "Watch {subject} go from {before} to {after}...",
      "The {timeframe} transformation that {authority} called 'incredible'...",
      "I went from {before_metric} to {after_metric}. Here's my exact method..."
    ],
    best_for: ['Fitness', 'Beauty', 'Finance', 'Skills'],
    awareness_level: 'solution_aware'
  },

  // FOMO/Urgency Hooks
  fear_of_missing: {
    description: 'Create urgency through scarcity or time limits',
    patterns: [
      "Only {number} spots left. Here's why you should care...",
      "This offer ends {timeframe}. Don't miss out...",
      "{Number}% already claimed. What are you waiting for?",
      "They're selling out fast. Here's why {product} is going viral...",
      "Warning: This {offer} won't last...",
      "Last chance to get {benefit} before {deadline}..."
    ],
    best_for: ['Limited offers', 'Events', 'Product launches'],
    awareness_level: 'most_aware'
  }
};

/**
 * Hook modifiers for different tones
 */
export const HOOK_MODIFIERS = {
  professional: {
    intensifiers: ['significant', 'substantial', 'notable', 'remarkable'],
    transitions: ['Moreover', 'Furthermore', 'Additionally', 'Consequently'],
    closers: ['Learn more', 'Discover how', 'See how it works', 'Get started']
  },
  urgent: {
    intensifiers: ['immediately', 'right now', 'today', 'before it\'s too late'],
    transitions: ['But wait', 'Here\'s the catch', 'The thing is', 'But'],
    closers: ['Act now', 'Claim yours', 'Don\'t wait', 'Get it today']
  },
  conversational: {
    intensifiers: ['honestly', 'seriously', 'look', 'here\'s the thing'],
    transitions: ['So', 'And', 'Plus', 'Also'],
    closers: ['Check it out', 'See for yourself', 'Give it a try', 'Why not']
  },
  playful: {
    intensifiers: ['literally', 'crazy', 'wild', 'mind-blowing'],
    transitions: ['But get this', 'Plot twist', 'Wait for it', 'And the best part'],
    closers: ['You\'re welcome', 'Game changer', 'Trust me on this', 'Thank me later']
  },
  authoritative: {
    intensifiers: ['definitively', 'conclusively', 'unequivocally', 'categorically'],
    transitions: ['The data shows', 'Research confirms', 'Studies indicate', 'Evidence suggests'],
    closers: ['The verdict is clear', 'The science is settled', 'Take action now', 'Apply this today']
  }
};

export default HIGH_PERFORMING_HOOKS;
