import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { DataSource } from 'typeorm';
import { User, Role } from '../../user/entities/user.entity';

/**
 * Runs after JwtAuthGuard. If the token's etablissementId is missing/null
 * (happens when an admin's DB record has no linked establishment), we fetch it
 * from the database and patch request.user so that @CurrentEtablissement()
 * always returns the correct value — without any changes to individual services.
 */
@Injectable()
export class TenantResolutionInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (
      user &&
      !user.etablissementId &&
      user.role !== Role.SUPER_ADMIN &&
      user.sub
    ) {
      try {
        const dbUser = await this.dataSource
          .getRepository(User)
          .findOne({ where: { id: user.sub }, select: { id: true, etablissementId: true } });
        if (dbUser?.etablissementId) {
          user.etablissementId = dbUser.etablissementId;
        }
      } catch {
        // Never fail a request because of tenant resolution
      }
    }

    return next.handle();
  }
}
