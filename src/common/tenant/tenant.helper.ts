import { FindOptionsWhere } from 'typeorm';
import { UserRole } from '../../user/entities/user.entity';

export class TenantHelper {
  static shouldApplyTenant(user?: { role?: string }): boolean {
    return user?.role !== UserRole.PARENT;
  }

  static resolveTenantId(
    user?: { role?: string },
    tenantId?: number,
  ): number | undefined {
    if (!this.shouldApplyTenant(user)) {
      return undefined;
    }
    return (
      tenantId ??
      (user as { etablissementId?: number } | undefined)?.etablissementId
    );
  }

  static addTenantFilter<T>(
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    tenantId: number | undefined,
    tenantField: string = 'etablissement',
  ): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
    if (!tenantId) return where;

    // Support pour les relations imbriquées (ex: 'etudiant.etablissement')
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

    const deepMerge = (target: any, source: any): any => {
      const result = { ...target };
      for (const key of Object.keys(source)) {
        if (
          result[key] !== null &&
          result[key] !== undefined &&
          typeof result[key] === 'object' &&
          !Array.isArray(result[key]) &&
          typeof source[key] === 'object' &&
          !Array.isArray(source[key])
        ) {
          result[key] = deepMerge(result[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
      return result;
    };

    if (Array.isArray(where)) {
      if (where.length === 0) return [filter];
      return where.map((w) => deepMerge(w, filter) as FindOptionsWhere<T>);
    }

    return deepMerge(where as any, filter) as FindOptionsWhere<T>;
  }
}
