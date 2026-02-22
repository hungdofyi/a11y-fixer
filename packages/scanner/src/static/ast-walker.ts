import type { TemplateChildNode, RootNode, ElementNode } from '@vue/compiler-core';

/** Node types as defined by @vue/compiler-core NodeTypes enum */
const NODE_TYPE_ROOT = 0;
const NODE_TYPE_ELEMENT = 1;
const NODE_TYPE_TEXT = 2;
const NODE_TYPE_INTERPOLATION = 5;

export type WalkCallback = (
  node: TemplateChildNode,
  parent: TemplateChildNode | RootNode | null,
  depth: number,
) => void;

/**
 * Recursively walks all nodes in a Vue template AST.
 * Invokes callback for each node with its parent and depth.
 * Handles element (1), text (2), and interpolation (5) node types.
 */
export function walkAST(
  node: TemplateChildNode | RootNode,
  callback: WalkCallback,
  parent: TemplateChildNode | RootNode | null = null,
  depth = 0,
): void {
  const nodeType = (node as { type: number }).type;

  // Root node (type 0) is not passed to the callback, only its children are
  if (nodeType !== NODE_TYPE_ROOT) {
    callback(node as TemplateChildNode, parent, depth);
  }

  // Text (2) and interpolation (5) nodes have no children to recurse into
  if (nodeType === NODE_TYPE_TEXT || nodeType === NODE_TYPE_INTERPOLATION) {
    return;
  }

  const children = (node as { children?: TemplateChildNode[] }).children;
  if (!children) return;

  for (const child of children) {
    walkAST(child, callback, node as TemplateChildNode | RootNode, depth + 1);
  }
}

/**
 * Collects all element nodes from a template AST matching an optional tag filter.
 */
export function collectElements(
  root: RootNode,
  tagFilter?: (tag: string) => boolean,
): ElementNode[] {
  const results: ElementNode[] = [];

  walkAST(root, (node) => {
    if ((node as { type: number }).type === NODE_TYPE_ELEMENT) {
      const el = node as ElementNode;
      if (!tagFilter || tagFilter(el.tag)) {
        results.push(el);
      }
    }
  });

  return results;
}
