/**
 * Campusly Feature Flags Configuration
 * 
 * Centralized feature toggles for AI and productivity capabilities.
 * Set to `true` to re-enable when quality enhancements are deployed.
 */

export const FEATURES = {
  /**
   * AI Creative / Presentation Maker
   * Temporarily disabled for AI quality upgrades.
   * Set to `true` to re-enable full AI slide deck creation and slide rewriting.
   */
  FEATURE_PRESENTATION_AI_ENABLED: false,

  /**
   * Revision AI / Study Schedule Planner & Quick Academic Assist
   * Temporarily disabled for quality improvements.
   * Set to `true` to re-enable exam revision timetable and quick question responses.
   */
  FEATURE_REVISION_AI_ENABLED: false,

  /**
   * Primary AI Study Assistant (Tutor chat, active-recall quizzes, flashcards, step-by-step math/code help)
   */
  FEATURE_STUDY_ASSISTANT_ENABLED: true,

  /**
   * Financial Copilot Insights
   */
  FEATURE_FINANCIAL_AI_ENABLED: true,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export const isFeatureEnabled = (key: FeatureKey): boolean => {
  return FEATURES[key] ?? true;
};
