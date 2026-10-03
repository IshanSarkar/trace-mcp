import type { Node } from 'web-tree-sitter';

export interface ExtractedCte {
  name: string;
  lineStart: number;
  lineEnd: number;
  byteStart: number;
  byteEnd: number;
}

export interface ExtractedRelationRef {
  /** Best-effort text (may include __tpl_* placeholders). */
  text: string;
  lineStart: number;
}

function lineStartOf(node: Node): number {
  return node.startPosition.row + 1;
}

function lineEndOf(node: Node): number {
  return node.endPosition.row + 1;
}

export function extractCtesFromTree(root: Node): ExtractedCte[] {
  const out: ExtractedCte[] = [];
  const walk = (node: Node) => {
    if (node.type === 'cte') {
      const id = node.children.find((c) => c.type === 'identifier');
      if (id) {
        out.push({
          name: id.text,
          lineStart: lineStartOf(id),
          lineEnd: lineEndOf(node),
          byteStart: id.startIndex,
          byteEnd: node.endIndex,
        });
      }
    }
    for (const child of node.children) walk(child);
  };
  walk(root);
  return out;
}

export function extractRelationRefsFromTree(root: Node): ExtractedRelationRef[] {
  const out: ExtractedRelationRef[] = [];
  const walk = (node: Node) => {
    if (node.type === 'object_reference') {
      const text = node.text.trim();
      if (text) out.push({ text, lineStart: lineStartOf(node) });
    }
    for (const child of node.children) walk(child);
  };
  walk(root);
  return out;
}
