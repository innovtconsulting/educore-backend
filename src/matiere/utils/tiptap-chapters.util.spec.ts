import { extractChapters } from './tiptap-chapters.util';

describe('extractChapters', () => {
  it('garde tous les items quand plusieurs listItem partagent le meme id', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'orderedList',
          content: Array.from({ length: 5 }, (_, index) => ({
            type: 'listItem',
            attrs: { id: '11111111-1111-1111-1111-111111111111' },
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: `Element ${index + 1}` }],
              },
            ],
          })),
        },
      ],
    };

    const chapters = extractChapters(doc);

    expect(chapters).toHaveLength(5);
    expect(chapters.map((chapter) => chapter.label)).toEqual([
      'Element 1',
      'Element 2',
      'Element 3',
      'Element 4',
      'Element 5',
    ]);
    expect(new Set(chapters.map((chapter) => chapter.id)).size).toBe(5);
  });

  it('n extrait pas deux fois les listes numerotees imbriquees', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'orderedList',
          content: [
            {
              type: 'listItem',
              attrs: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Chapitre' }],
                },
                {
                  type: 'orderedList',
                  content: [
                    {
                      type: 'listItem',
                      attrs: { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
                      content: [
                        {
                          type: 'paragraph',
                          content: [{ type: 'text', text: 'Sous-chapitre' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const chapters = extractChapters(doc);

    expect(chapters).toHaveLength(2);
    expect(chapters[0]).toMatchObject({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      label: 'ChapitreSous-chapitre',
      level: 0,
      parentId: null,
      order: 0,
    });
    expect(chapters[1]).toMatchObject({
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      label: 'Sous-chapitre',
      level: 1,
      parentId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      order: 1,
    });
  });
});
