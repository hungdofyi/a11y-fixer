/**
 * Minimal lookup table for WCAG 2.1 criterion titles and levels.
 * Used to enrich VPAT narrative prompts without importing the full core wcag map.
 */

interface CriterionMeta {
  title: string;
  level: 'A' | 'AA' | 'AAA';
}

const CRITERION_MAP: Record<string, CriterionMeta> = {
  '1.1.1': { title: 'Non-text Content', level: 'A' },
  '1.2.1': { title: 'Audio-only and Video-only (Prerecorded)', level: 'A' },
  '1.2.2': { title: 'Captions (Prerecorded)', level: 'A' },
  '1.2.3': { title: 'Audio Description or Media Alternative (Prerecorded)', level: 'A' },
  '1.2.4': { title: 'Captions (Live)', level: 'AA' },
  '1.2.5': { title: 'Audio Description (Prerecorded)', level: 'AA' },
  '1.3.1': { title: 'Info and Relationships', level: 'A' },
  '1.3.2': { title: 'Meaningful Sequence', level: 'A' },
  '1.3.3': { title: 'Sensory Characteristics', level: 'A' },
  '1.3.4': { title: 'Orientation', level: 'AA' },
  '1.3.5': { title: 'Identify Input Purpose', level: 'AA' },
  '1.4.1': { title: 'Use of Color', level: 'A' },
  '1.4.2': { title: 'Audio Control', level: 'A' },
  '1.4.3': { title: 'Contrast (Minimum)', level: 'AA' },
  '1.4.4': { title: 'Resize Text', level: 'AA' },
  '1.4.5': { title: 'Images of Text', level: 'AA' },
  '1.4.10': { title: 'Reflow', level: 'AA' },
  '1.4.11': { title: 'Non-text Contrast', level: 'AA' },
  '1.4.12': { title: 'Text Spacing', level: 'AA' },
  '1.4.13': { title: 'Content on Hover or Focus', level: 'AA' },
  '2.1.1': { title: 'Keyboard', level: 'A' },
  '2.1.2': { title: 'No Keyboard Trap', level: 'A' },
  '2.1.4': { title: 'Character Key Shortcuts', level: 'A' },
  '2.2.1': { title: 'Timing Adjustable', level: 'A' },
  '2.2.2': { title: 'Pause, Stop, Hide', level: 'A' },
  '2.3.1': { title: 'Three Flashes or Below Threshold', level: 'A' },
  '2.4.1': { title: 'Bypass Blocks', level: 'A' },
  '2.4.2': { title: 'Page Titled', level: 'A' },
  '2.4.3': { title: 'Focus Order', level: 'A' },
  '2.4.4': { title: 'Link Purpose (In Context)', level: 'A' },
  '2.4.5': { title: 'Multiple Ways', level: 'AA' },
  '2.4.6': { title: 'Headings and Labels', level: 'AA' },
  '2.4.7': { title: 'Focus Visible', level: 'AA' },
  '2.4.11': { title: 'Focus Appearance', level: 'AA' },
  '2.5.1': { title: 'Pointer Gestures', level: 'A' },
  '2.5.2': { title: 'Pointer Cancellation', level: 'A' },
  '2.5.3': { title: 'Label in Name', level: 'A' },
  '2.5.4': { title: 'Motion Actuation', level: 'A' },
  '3.1.1': { title: 'Language of Page', level: 'A' },
  '3.1.2': { title: 'Language of Parts', level: 'AA' },
  '3.2.1': { title: 'On Focus', level: 'A' },
  '3.2.2': { title: 'On Input', level: 'A' },
  '3.2.3': { title: 'Consistent Navigation', level: 'AA' },
  '3.2.4': { title: 'Consistent Identification', level: 'AA' },
  '3.3.1': { title: 'Error Identification', level: 'A' },
  '3.3.2': { title: 'Labels or Instructions', level: 'A' },
  '3.3.3': { title: 'Error Suggestion', level: 'AA' },
  '3.3.4': { title: 'Error Prevention (Legal, Financial, Data)', level: 'AA' },
  '4.1.1': { title: 'Parsing', level: 'A' },
  '4.1.2': { title: 'Name, Role, Value', level: 'A' },
  '4.1.3': { title: 'Status Messages', level: 'AA' },
};

/** Get the human-readable title for a WCAG criterion ID */
export function getCriterionTitle(criterionId: string): string {
  return CRITERION_MAP[criterionId]?.title ?? `Criterion ${criterionId}`;
}

/** Get the conformance level (A/AA/AAA) for a WCAG criterion ID */
export function getCriterionLevel(criterionId: string): 'A' | 'AA' | 'AAA' | null {
  return CRITERION_MAP[criterionId]?.level ?? null;
}
