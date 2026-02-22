import { parse } from '@vue/compiler-sfc';
import type { SFCDescriptor } from '@vue/compiler-sfc';
import type { TemplateChildNode, RootNode } from '@vue/compiler-core';

export interface ParsedVueTemplate {
  ast: RootNode;
  descriptor: SFCDescriptor;
}

/**
 * Parses a Vue SFC source string and returns the template AST.
 * Returns null if the file has no <template> block or parsing fails.
 */
export function parseVueTemplate(
  source: string,
  filename: string,
): ParsedVueTemplate | null {
  const { descriptor, errors } = parse(source, { filename });

  if (errors.length > 0) {
    // CompilerError has a numeric `code`; SyntaxError does not — use type guard
    const fatal = errors.filter((e) => typeof (e as { code?: unknown }).code === 'number');
    if (fatal.length > 0) return null;
  }

  if (!descriptor.template) return null;

  const templateAst = descriptor.template.ast;
  if (!templateAst) return null;

  return { ast: templateAst as RootNode, descriptor };
}

export type { TemplateChildNode, SFCDescriptor };
