import ora from 'ora';

/** Create a spinner for indeterminate progress. */
export function createSpinner(text: string) {
  return ora({ text, spinner: 'dots' });
}
