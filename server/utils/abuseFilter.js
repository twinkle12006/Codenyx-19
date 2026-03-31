/**
 * Sahara Abuse Filter — Rule-based toxicity scoring
 *
 * Scoring 0.0–1.0:
 *   ≥ 0.75 → flagged as abusive (comment removed, user suspended)
 *   0.5–0.74 → warning zone (logged but allowed)
 *   < 0.5 → clean
 *
 * IMPORTANT: Mental health vents often contain words like "die", "hurt", "kill myself"
 * as expressions of distress — NOT abuse. The filter distinguishes:
 *   - Self-directed distress language → NOT flagged (these are cries for help)
 *   - Targeted abuse/hate directed AT others → flagged
 */

// ── Tier 1: Severe (weight 0.9) ───────────────────────────────────────────────
// Direct threats, slurs, hate speech — always abusive regardless of context
const SEVERE = [
  // English slurs & hate speech
  'nigger','nigga','faggot','fag','dyke','tranny','kike','spic','chink','gook','wetback',
  'retard','retarded','cripple','spastic',
  // Threats
  'i will kill you','i will hurt you','i will find you','you will die','gonna kill you',
  'i know where you live','come find you','beat you up','bash your head',
  // Targeted harassment
  'kill yourself','kys','go die','you should die','nobody wants you','do everyone a favor and die',
  'end your life','you deserve to die','hope you die','wish you were dead',
  // Hindi/Hinglish slurs
  'madarchod','maderchod','bhenchod','bhen ke lode','chutiya','chutiye','gaandu','gandu',
  'randi','raand','harami','haramzada','haramzadi','bhosdike','bhosdika','lodu','lode',
  'saala','saali','kamina','kamini','kutte','kuttiya','suar','suwar',
  // Casteist slurs
  'chamar','bhangi','neech jaat','neech','dhed',
  // Communal hate
  'jihadi','terrorist go back','pakis out','hindu kafir','muslim dog','christian dog',
];

// ── Tier 2: High (weight 0.7) ─────────────────────────────────────────────────
// Strong profanity, targeted insults — high probability of abuse
const HIGH = [
  'fuck you','fuck off','go fuck yourself','motherfucker','son of a bitch','bastard',
  'piece of shit','you piece of shit','shut the fuck up','stfu','dumb bitch','stupid bitch',
  'ugly bitch','fat bitch','dumb ass','dumbass','jackass','asshole','dickhead','dipshit',
  'scumbag','lowlife','loser','pathetic loser','worthless piece',
  // Hinglish
  'teri maa ki','teri behen ki','tere baap ki','mc bc','bc mc','bhosdi','lund','lauda',
  'gaand maar','gaand mara','teri gaand','chod','chodo','chudai',
];

// ── Tier 3: Moderate (weight 0.45) ────────────────────────────────────────────
// Profanity that may be casual — needs context (combined scoring)
const MODERATE = [
  'fuck','shit','bitch','ass','damn','crap','piss','cock','dick','pussy','whore','slut',
  'idiot','moron','stupid','dumb','ugly','fat','loser','freak','weirdo',
  'sala','saali','bakwaas','bakwas','ullu','gadha','gadhe','pagal',
];

// ── Spam patterns ─────────────────────────────────────────────────────────────
const MAX_LENGTH       = 1000;   // chars
const MAX_CAPS_RATIO   = 0.7;    // >70% caps = spam/shouting
const MAX_REPEAT_CHARS = 6;      // "aaaaaaa" = spam
const MAX_SPECIAL_RATIO = 0.4;   // >40% special chars = spam

// ── Safe context phrases (self-harm as distress, NOT abuse) ──────────────────
// If comment contains these, reduce score — user is expressing personal pain
const SAFE_CONTEXT = [
  'i feel like','i want to','i am feeling','i have been','i\'ve been','i\'m feeling',
  'i feel so','i just feel','sometimes i','lately i','i keep thinking','i struggle',
  'i\'m going through','i went through','i understand','i hear you','you\'re not alone',
  'sending love','here for you','stay strong','it gets better','you matter',
  'i\'ve felt this','same here','me too','i relate','big hug',
];

// ── Core scoring function ─────────────────────────────────────────────────────
function scoreText(text) {
  if (!text || typeof text !== 'string') return 0;

  const lower    = text.toLowerCase().trim();
  const words    = lower.split(/\s+/);
  let score      = 0;
  let hits       = [];

  // 1. Severe tier — single match is enough to flag
  for (const phrase of SEVERE) {
    if (lower.includes(phrase)) {
      score = Math.max(score, 0.9);
      hits.push({ phrase, tier: 'severe' });
    }
  }

  // 2. High tier
  for (const phrase of HIGH) {
    if (lower.includes(phrase)) {
      score = Math.max(score, 0.72);
      hits.push({ phrase, tier: 'high' });
    }
  }

  // 3. Moderate tier — accumulates
  let moderateCount = 0;
  for (const phrase of MODERATE) {
    if (lower.includes(phrase)) {
      moderateCount++;
      hits.push({ phrase, tier: 'moderate' });
    }
  }
  if (moderateCount >= 3) score = Math.max(score, 0.78);
  else if (moderateCount === 2) score = Math.max(score, 0.55);
  else if (moderateCount === 1) score = Math.max(score, 0.35);

  // 4. Spam checks
  if (text.length > MAX_LENGTH) {
    score = Math.max(score, 0.6);
    hits.push({ phrase: 'excessive_length', tier: 'spam' });
  }

  const capsRatio = (text.match(/[A-Z]/g) || []).length / Math.max(text.length, 1);
  if (capsRatio > MAX_CAPS_RATIO && text.length > 20) {
    score += 0.15;
    hits.push({ phrase: 'excessive_caps', tier: 'spam' });
  }

  if (/(.)\1{6,}/.test(lower)) {
    score += 0.2;
    hits.push({ phrase: 'repeated_chars', tier: 'spam' });
  }

  const specialRatio = (text.match(/[^a-zA-Z0-9\s.,!?'"-]/g) || []).length / Math.max(text.length, 1);
  if (specialRatio > MAX_SPECIAL_RATIO) {
    score += 0.15;
    hits.push({ phrase: 'excessive_special_chars', tier: 'spam' });
  }

  // 5. Safe context reduction — if user is expressing personal distress, not targeting others
  if (score > 0 && score < 0.9) {
    const hasSafeContext = SAFE_CONTEXT.some(phrase => lower.includes(phrase));
    if (hasSafeContext) {
      score *= 0.5; // halve the score — likely genuine distress expression
    }
  }

  return Math.min(parseFloat(score.toFixed(3)), 1.0);
}

/**
 * Main export — returns { flagged, score, reason }
 * flagged = true if score >= 0.75
 */
function analyzeComment(text) {
  const score  = scoreText(text);
  const flagged = score >= 0.75;

  let reason = 'clean';
  if (flagged) {
    if (score >= 0.9) reason = 'severe_abuse';
    else if (score >= 0.75) reason = 'high_toxicity';
  } else if (score >= 0.5) {
    reason = 'moderate_concern';
  }

  return { flagged, score, reason };
}

module.exports = { analyzeComment, scoreText };
