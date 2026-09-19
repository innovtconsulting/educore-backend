const PRIMAIRE_KEYWORDS = ['cherubin', 'futura'];

function isPrimaireEcole(etablissement?: { name?: string; email?: string } | null): boolean {
  if (!etablissement) return false;
  const name = (etablissement.name || '').toLowerCase();
  const email = (etablissement.email || '').toLowerCase();
  return PRIMAIRE_KEYWORDS.some((kw) => name.includes(kw) || email.includes(kw));
}

export function isCherubin(etablissement?: { name?: string; email?: string } | null): boolean {
  return isPrimaireEcole(etablissement);
}

export const isFutura = isCherubin;
export const isPrimaire = isCherubin;
export const isHalfDaySchool = isCherubin;

export function getAnneeLabel(etablissement?: { name?: string; email?: string } | null): string {
  return isCherubin(etablissement) ? 'Année scolaire' : 'Année universitaire';
}

export function getAnneeLabelLower(etablissement?: { name?: string; email?: string } | null): string {
  return isCherubin(etablissement) ? 'année scolaire' : 'année universitaire';
}

export function getParcoursLabel(etablissement?: { name?: string; email?: string } | null): string {
  return isCherubin(etablissement) ? 'Classe' : 'Parcours';
}

export function getParcoursLabelPlural(etablissement?: { name?: string; email?: string } | null): string {
  return isCherubin(etablissement) ? 'Classes' : 'Parcours';
}
