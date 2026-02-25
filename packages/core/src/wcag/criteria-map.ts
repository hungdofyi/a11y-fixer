/** WCAG principle categories */
export type WcagPrinciple = 'perceivable' | 'operable' | 'understandable' | 'robust';

/** A single WCAG success criterion definition */
export interface WcagCriterion {
  id: string;
  title: string;
  level: 'A' | 'AA' | 'AAA';
  principle: WcagPrinciple;
  guidelineId: string;
  guidelineTitle: string;
}

/**
 * Complete WCAG 2.1/2.2 criteria map covering all A and AA level criteria plus select AAA.
 * Used for conformance table lookups.
 */
export const WCAG_CRITERIA_MAP: WcagCriterion[] = [
  // 1. Perceivable
  // 1.1 Text Alternatives
  { id: '1.1.1', title: 'Non-text Content', level: 'A', principle: 'perceivable', guidelineId: '1.1', guidelineTitle: 'Text Alternatives' },
  // 1.2 Time-based Media
  { id: '1.2.1', title: 'Audio-only and Video-only (Prerecorded)', level: 'A', principle: 'perceivable', guidelineId: '1.2', guidelineTitle: 'Time-based Media' },
  { id: '1.2.2', title: 'Captions (Prerecorded)', level: 'A', principle: 'perceivable', guidelineId: '1.2', guidelineTitle: 'Time-based Media' },
  { id: '1.2.3', title: 'Audio Description or Media Alternative (Prerecorded)', level: 'A', principle: 'perceivable', guidelineId: '1.2', guidelineTitle: 'Time-based Media' },
  { id: '1.2.4', title: 'Captions (Live)', level: 'AA', principle: 'perceivable', guidelineId: '1.2', guidelineTitle: 'Time-based Media' },
  { id: '1.2.5', title: 'Audio Description (Prerecorded)', level: 'AA', principle: 'perceivable', guidelineId: '1.2', guidelineTitle: 'Time-based Media' },
  // 1.3 Adaptable
  { id: '1.3.1', title: 'Info and Relationships', level: 'A', principle: 'perceivable', guidelineId: '1.3', guidelineTitle: 'Adaptable' },
  { id: '1.3.2', title: 'Meaningful Sequence', level: 'A', principle: 'perceivable', guidelineId: '1.3', guidelineTitle: 'Adaptable' },
  { id: '1.3.3', title: 'Sensory Characteristics', level: 'A', principle: 'perceivable', guidelineId: '1.3', guidelineTitle: 'Adaptable' },
  { id: '1.3.4', title: 'Orientation', level: 'AA', principle: 'perceivable', guidelineId: '1.3', guidelineTitle: 'Adaptable' },
  { id: '1.3.5', title: 'Identify Input Purpose', level: 'AA', principle: 'perceivable', guidelineId: '1.3', guidelineTitle: 'Adaptable' },
  // 1.4 Distinguishable
  { id: '1.4.1', title: 'Use of Color', level: 'A', principle: 'perceivable', guidelineId: '1.4', guidelineTitle: 'Distinguishable' },
  { id: '1.4.2', title: 'Audio Control', level: 'A', principle: 'perceivable', guidelineId: '1.4', guidelineTitle: 'Distinguishable' },
  { id: '1.4.3', title: 'Contrast (Minimum)', level: 'AA', principle: 'perceivable', guidelineId: '1.4', guidelineTitle: 'Distinguishable' },
  { id: '1.4.4', title: 'Resize Text', level: 'AA', principle: 'perceivable', guidelineId: '1.4', guidelineTitle: 'Distinguishable' },
  { id: '1.4.5', title: 'Images of Text', level: 'AA', principle: 'perceivable', guidelineId: '1.4', guidelineTitle: 'Distinguishable' },
  { id: '1.4.10', title: 'Reflow', level: 'AA', principle: 'perceivable', guidelineId: '1.4', guidelineTitle: 'Distinguishable' },
  { id: '1.4.11', title: 'Non-text Contrast', level: 'AA', principle: 'perceivable', guidelineId: '1.4', guidelineTitle: 'Distinguishable' },
  { id: '1.4.12', title: 'Text Spacing', level: 'AA', principle: 'perceivable', guidelineId: '1.4', guidelineTitle: 'Distinguishable' },
  { id: '1.4.13', title: 'Content on Hover or Focus', level: 'AA', principle: 'perceivable', guidelineId: '1.4', guidelineTitle: 'Distinguishable' },
  // 2. Operable
  // 2.1 Keyboard Accessible
  { id: '2.1.1', title: 'Keyboard', level: 'A', principle: 'operable', guidelineId: '2.1', guidelineTitle: 'Keyboard Accessible' },
  { id: '2.1.2', title: 'No Keyboard Trap', level: 'A', principle: 'operable', guidelineId: '2.1', guidelineTitle: 'Keyboard Accessible' },
  { id: '2.1.3', title: 'Keyboard (No Exception)', level: 'AAA', principle: 'operable', guidelineId: '2.1', guidelineTitle: 'Keyboard Accessible' },
  { id: '2.1.4', title: 'Character Key Shortcuts', level: 'A', principle: 'operable', guidelineId: '2.1', guidelineTitle: 'Keyboard Accessible' },
  // 2.2 Enough Time
  { id: '2.2.1', title: 'Timing Adjustable', level: 'A', principle: 'operable', guidelineId: '2.2', guidelineTitle: 'Enough Time' },
  { id: '2.2.2', title: 'Pause, Stop, Hide', level: 'A', principle: 'operable', guidelineId: '2.2', guidelineTitle: 'Enough Time' },
  // 2.3 Seizures and Physical Reactions
  { id: '2.3.1', title: 'Three Flashes or Below Threshold', level: 'A', principle: 'operable', guidelineId: '2.3', guidelineTitle: 'Seizures and Physical Reactions' },
  { id: '2.3.3', title: 'Animation from Interactions', level: 'AAA', principle: 'operable', guidelineId: '2.3', guidelineTitle: 'Seizures and Physical Reactions' },
  // 2.4 Navigable
  { id: '2.4.1', title: 'Bypass Blocks', level: 'A', principle: 'operable', guidelineId: '2.4', guidelineTitle: 'Navigable' },
  { id: '2.4.2', title: 'Page Titled', level: 'A', principle: 'operable', guidelineId: '2.4', guidelineTitle: 'Navigable' },
  { id: '2.4.3', title: 'Focus Order', level: 'A', principle: 'operable', guidelineId: '2.4', guidelineTitle: 'Navigable' },
  { id: '2.4.4', title: 'Link Purpose (In Context)', level: 'A', principle: 'operable', guidelineId: '2.4', guidelineTitle: 'Navigable' },
  { id: '2.4.5', title: 'Multiple Ways', level: 'AA', principle: 'operable', guidelineId: '2.4', guidelineTitle: 'Navigable' },
  { id: '2.4.6', title: 'Headings and Labels', level: 'AA', principle: 'operable', guidelineId: '2.4', guidelineTitle: 'Navigable' },
  { id: '2.4.7', title: 'Focus Visible', level: 'AA', principle: 'operable', guidelineId: '2.4', guidelineTitle: 'Navigable' },
  { id: '2.4.11', title: 'Focus Not Obscured (Minimum)', level: 'AA', principle: 'operable', guidelineId: '2.4', guidelineTitle: 'Navigable' },
  // 2.5 Input Modalities
  { id: '2.5.1', title: 'Pointer Gestures', level: 'A', principle: 'operable', guidelineId: '2.5', guidelineTitle: 'Input Modalities' },
  { id: '2.5.2', title: 'Pointer Cancellation', level: 'A', principle: 'operable', guidelineId: '2.5', guidelineTitle: 'Input Modalities' },
  { id: '2.5.3', title: 'Label in Name', level: 'A', principle: 'operable', guidelineId: '2.5', guidelineTitle: 'Input Modalities' },
  { id: '2.5.4', title: 'Motion Actuation', level: 'A', principle: 'operable', guidelineId: '2.5', guidelineTitle: 'Input Modalities' },
  { id: '2.5.7', title: 'Dragging Movements', level: 'AA', principle: 'operable', guidelineId: '2.5', guidelineTitle: 'Input Modalities' },
  { id: '2.5.8', title: 'Target Size (Minimum)', level: 'AA', principle: 'operable', guidelineId: '2.5', guidelineTitle: 'Input Modalities' },
  // 3. Understandable
  // 3.1 Readable
  { id: '3.1.1', title: 'Language of Page', level: 'A', principle: 'understandable', guidelineId: '3.1', guidelineTitle: 'Readable' },
  { id: '3.1.2', title: 'Language of Parts', level: 'AA', principle: 'understandable', guidelineId: '3.1', guidelineTitle: 'Readable' },
  // 3.2 Predictable
  { id: '3.2.1', title: 'On Focus', level: 'A', principle: 'understandable', guidelineId: '3.2', guidelineTitle: 'Predictable' },
  { id: '3.2.2', title: 'On Input', level: 'A', principle: 'understandable', guidelineId: '3.2', guidelineTitle: 'Predictable' },
  { id: '3.2.3', title: 'Consistent Navigation', level: 'AA', principle: 'understandable', guidelineId: '3.2', guidelineTitle: 'Predictable' },
  { id: '3.2.4', title: 'Consistent Identification', level: 'AA', principle: 'understandable', guidelineId: '3.2', guidelineTitle: 'Predictable' },
  { id: '3.2.6', title: 'Consistent Help', level: 'A', principle: 'understandable', guidelineId: '3.2', guidelineTitle: 'Predictable' },
  // 3.3 Input Assistance
  { id: '3.3.1', title: 'Error Identification', level: 'A', principle: 'understandable', guidelineId: '3.3', guidelineTitle: 'Input Assistance' },
  { id: '3.3.2', title: 'Labels or Instructions', level: 'A', principle: 'understandable', guidelineId: '3.3', guidelineTitle: 'Input Assistance' },
  { id: '3.3.3', title: 'Error Suggestion', level: 'AA', principle: 'understandable', guidelineId: '3.3', guidelineTitle: 'Input Assistance' },
  { id: '3.3.4', title: 'Error Prevention (Legal, Financial, Data)', level: 'AA', principle: 'understandable', guidelineId: '3.3', guidelineTitle: 'Input Assistance' },
  { id: '3.3.7', title: 'Redundant Entry', level: 'A', principle: 'understandable', guidelineId: '3.3', guidelineTitle: 'Input Assistance' },
  { id: '3.3.8', title: 'Accessible Authentication (Minimum)', level: 'AA', principle: 'understandable', guidelineId: '3.3', guidelineTitle: 'Input Assistance' },
  // 4. Robust
  // 4.1 Compatible
  { id: '4.1.2', title: 'Name, Role, Value', level: 'A', principle: 'robust', guidelineId: '4.1', guidelineTitle: 'Compatible' },
  { id: '4.1.3', title: 'Status Messages', level: 'AA', principle: 'robust', guidelineId: '4.1', guidelineTitle: 'Compatible' },
];

/** Lookup criterion by id */
export function getCriterion(id: string): WcagCriterion | undefined {
  return WCAG_CRITERIA_MAP.find((c) => c.id === id);
}

/** Get all criteria at or below a given level */
export function getCriteriaByLevel(level: 'A' | 'AA' | 'AAA'): WcagCriterion[] {
  const levels = level === 'A' ? ['A'] : level === 'AA' ? ['A', 'AA'] : ['A', 'AA', 'AAA'];
  return WCAG_CRITERIA_MAP.filter((c) => levels.includes(c.level));
}
