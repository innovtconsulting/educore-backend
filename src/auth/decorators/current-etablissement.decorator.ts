import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../user/entities/user.entity';

export const CurrentEtablissement = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    // Seul le SUPER_ADMIN voit les données de tous les établissements
    if (user?.role === UserRole.SUPER_ADMIN) {
      return undefined;
    }

    return user?.etablissementId;
  },
);
