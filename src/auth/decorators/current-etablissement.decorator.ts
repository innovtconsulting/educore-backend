import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../user/entities/user.entity';

export const CurrentEtablissement = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // Les SUPER_ADMIN et ADMIN peuvent voir toutes les données (pas de filtrage)
    if (
      user?.role === UserRole.SUPER_ADMIN ||
      user?.role === UserRole.ADMIN ||
      user?.role === UserRole.PARENT
    ) {
      return undefined;
    }

    return user?.etablissementId;
  },
);
