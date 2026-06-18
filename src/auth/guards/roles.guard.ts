import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../user/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // 1. Vérification par Permissions (Nouveau système dynamique)
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    // Le SuperAdmin a toujours tous les accès
    if (user.role === UserRole.SUPER_ADMIN) return true;

    if (requiredPermissions && requiredPermissions.length > 0) {
      // Si l'utilisateur a un rôle dynamique avec des permissions
      if (user.aclUserRole && user.aclUserRole.permissions) {
        const userPermissions = user.aclUserRole.permissions.map((p: any) => p.name);
        const hasPermission = requiredPermissions.every((permission) =>
          userPermissions.includes(permission),
        );
        if (hasPermission) return true;
      }
    }

    // 2. Vérification par Rôles (Ancien système statique pour compatibilité)
    const requiredUserRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredUserRoles) {
      return true;
    }

    return requiredUserRoles.some((role) => user.role === role);
  }
}
