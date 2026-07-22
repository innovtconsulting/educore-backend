import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Validation volontairement légère (pas de validation récursive profonde du
// schéma Tiptap) : cohérent avec les autres colonnes JSON du projet
// (GeneratedDocument.metadata, JournalHistory.snapshot), aucune n'a de
// validation de schéma profonde.
@ValidatorConstraint({ name: 'isTiptapDoc', async: false })
export class IsTiptapDocConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (value === undefined || value === null) return true;
    return (
      typeof value === 'object' &&
      value.type === 'doc' &&
      Array.isArray(value.content)
    );
  }

  defaultMessage(): string {
    return "Les éléments constitutifs doivent être un document Tiptap JSON valide (type 'doc' avec un tableau 'content')";
  }
}
