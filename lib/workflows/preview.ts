/** How many assigned workflow cards show before the list expands. */
export const WORKFLOW_PREVIEW_LIMIT = 5;

export function workflowPreview<T>(cards: readonly T[], expanded: boolean): readonly T[] {
  if (expanded || cards.length <= WORKFLOW_PREVIEW_LIMIT) return cards;
  return cards.slice(0, WORKFLOW_PREVIEW_LIMIT);
}

export function workflowPreviewCanToggle(count: number): boolean {
  return count > WORKFLOW_PREVIEW_LIMIT;
}
