import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

const ACCENTED_CHARACTERS =
  'àáâãäåāăąçćĉċčďđèéêëēĕėęěìíîïĩīĭįıñńņňòóôõöøōŏőŕŗřśŝşšùúûüũūŭůűųýÿŷžźż';
const UNACCENTED_CHARACTERS =
  'aaaaaaaaacccccddeeeeeeeeeiiiiiiiiinnnnooooooooorrrssssuuuuuuuuuuyyyzzz';

export function normalizeSearchTerms(search?: string | null): string[] {
  if (!search) return [];

  return search
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

export function buildNormalizedSearchExpression(fragments: string[]): string {
  const searchableText = fragments
    .map((fragment) => `coalesce(${fragment}, '')`)
    .join(', ');

  return `translate(lower(concat_ws(' ', ${searchableText})), '${ACCENTED_CHARACTERS}', '${UNACCENTED_CHARACTERS}')`;
}

export function applyNormalizedSearch<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  search: string | undefined,
  fragments: string[],
  parameterPrefix = 'searchTerm',
): void {
  const terms = normalizeSearchTerms(search);
  if (terms.length === 0) return;

  const expression = buildNormalizedSearchExpression(fragments);

  terms.forEach((term, index) => {
    const parameterName = `${parameterPrefix}${index}`;
    query.andWhere(`${expression} LIKE :${parameterName}`, {
      [parameterName]: `%${term}%`,
    });
  });
}
