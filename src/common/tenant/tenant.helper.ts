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
    return tenantId;
  }

  // Fusionne `leafValue` dans `where` au chemin `path` (ex: 'etudiant.etablissement'),
  // en conservant les filtres imbriqués déjà présents (deep merge).
  private static mergeAtPath<T>(
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    path: string,
    leafValue: any,
  ): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
    const filter: any = {};
    const parts = path.split('.');
    let current = filter;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = leafValue;
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

  static addTenantFilter<T>(
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    tenantId: number | undefined,
    tenantField: string = 'etablissement',
  ): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
    if (!tenantId) return where;
    // Support pour les relations imbriquées (ex: 'etudiant.etablissement')
    return this.mergeAtPath(where, tenantField, { id: tenantId });
  }

  // N'exclut les établissements marqués `visible: false` que pour un appel
  // sans tenantId précis (SUPER_ADMIN listant/agrégeant tous les
  // établissements) : un tenant précis (déjà isolé par addTenantFilter)
  // reste libre de voir ses propres données même si son établissement est
  // masqué côté super-admin.
  static addVisibleOnlyFilter<T>(
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    tenantId: number | undefined,
    tenantField: string = 'etablissement',
  ): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
    if (tenantId) return where;
    return this.mergeAtPath(where, tenantField, { visible: true });
  }
}
