import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../user/entities/user.entity';

export const CurrentEtablissement = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    if (user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.PARENT) {
      return undefined;
    }
    
    return user?.etablissementId;
  },
);
