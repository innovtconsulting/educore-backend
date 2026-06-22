import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from './tenant.context';
import { UserRole } from '../../user/entities/user.entity';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.PARENT) {
      return next.handle();
    }

    if (user?.etablissementId) {
      return new Observable((subscriber) => {
        TenantContext.run(user.etablissementId, () => {
          next.handle().subscribe(subscriber);
        });
      });
    }

    return next.handle();
  }
}
