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

function walkList(
  listNode: any,
  level: number,
  parentId: string | null,
  result: ChapitreNode[],
  orderCounter: { value: number },
) {
  if (!listNode || listNode.type !== 'orderedList' || !Array.isArray(listNode.content)) {
    return;
  }

  listNode.content.forEach((listItem: any, index: number) => {
    if (listItem?.type !== 'listItem' || !Array.isArray(listItem.content)) return;

    const id: string | undefined = listItem.attrs?.id;
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
        walkList(child, level + 1, id ?? parentId, result, orderCounter);
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

  const walkDoc = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'orderedList') {
      walkList(node, 0, null, result, orderCounter);
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(walkDoc);
    }
  };

  doc.content.forEach(walkDoc);
  return result;
}
