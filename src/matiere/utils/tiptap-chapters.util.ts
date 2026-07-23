import { createHash } from 'crypto';

export interface ChapitreNode {
  id: string;
  label: string;
  level: number;
  parentId: string | null;
  order: number;
}

function extractText(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  if (Array.isArray(node.content)) {
    return node.content.map(extractText).join('');
  }
  return '';
}

function toStableUuid(seed: string): string {
  const hex = createHash('sha1').update(seed).digest('hex');
  const chars = hex.slice(0, 32).split('');
  chars[12] = '5';
  chars[16] = ((parseInt(chars[16], 16) & 0x3) | 0x8).toString(16);
  return `${chars.slice(0, 8).join('')}-${chars.slice(8, 12).join('')}-${chars.slice(12, 16).join('')}-${chars.slice(16, 20).join('')}-${chars.slice(20, 32).join('')}`;
}

function getEffectiveId(
  rawId: string | undefined,
  seenCounts: Map<string, number>,
): string | null {
  if (!rawId) return null;

  const duplicateIndex = seenCounts.get(rawId) ?? 0;
  seenCounts.set(rawId, duplicateIndex + 1);

  if (duplicateIndex === 0) return rawId;
  return toStableUuid(`${rawId}:${duplicateIndex}`);
}

function walkList(
  listNode: any,
  level: number,
  parentId: string | null,
  result: ChapitreNode[],
  orderCounter: { value: number },
  seenCounts: Map<string, number>,
) {
  if (!listNode || listNode.type !== 'orderedList' || !Array.isArray(listNode.content)) {
    return;
  }

  listNode.content.forEach((listItem: any) => {
    if (listItem?.type !== 'listItem' || !Array.isArray(listItem.content)) return;

    const id = getEffectiveId(listItem.attrs?.id, seenCounts);
    // Extract text from ALL content nodes in the listItem, not just first paragraph!
    const label = listItem.content.map(extractText).join('').trim();

    if (id) {
      result.push({ 
        id, 
        label, 
        level, 
        parentId, 
        order: orderCounter.value++ 
      });
    }

    for (const child of listItem.content) {
      if (child?.type === 'orderedList') {
        walkList(child, level + 1, id ?? parentId, result, orderCounter, seenCounts);
      }
      // Les bulletList imbriquées restent du formatage libre, non trackées :
      // seule la hiérarchie de plan numérotée (I./1./a./i.) est suivie.
    }
  });
}

/**
 * Extrait la liste plate des chapitres/sous-chapitres (listItem dans un
 * orderedList, avec id stable) d'un document Tiptap JSON, sans dépendance à un
 * parseur HTML. Les listItem sans id (contenu jamais rouvert côté éditeur
 * depuis l'introduction des ids stables) sont ignorés.
 */
export function extractChapters(doc: any): ChapitreNode[] {
  const result: ChapitreNode[] = [];
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.content)) {
    return result;
  }
  
  const orderCounter = { value: 0 };
  const seenCounts = new Map<string, number>();

  const walkDoc = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'orderedList') {
      walkList(node, 0, null, result, orderCounter, seenCounts);
      return;
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(walkDoc);
    }
  };

  doc.content.forEach(walkDoc);
  return result;
}
