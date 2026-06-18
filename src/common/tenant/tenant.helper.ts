import { FindOptionsWhere } from 'typeorm';

export class TenantHelper {
  static addTenantFilter<T>(
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    tenantId: number | undefined,
    tenantField: string = 'etablissement',
  ): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
    if (!tenantId) return where;

    // Support pour les relations imbriquées (ex: 'classe.etablissements')
    const filter: any = {};
    const parts = tenantField.split('.');
    let current = filter;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = { id: tenantId };
      } else {
        current[part] = {};
        current = current[part];
      }
    }

    if (Array.isArray(where)) {
      if (where.length === 0) return [filter];
      return where.map((w) => ({ ...w, ...filter }) as FindOptionsWhere<T>);
    }

    return { ...where, ...filter } as FindOptionsWhere<T>;
  }
}
