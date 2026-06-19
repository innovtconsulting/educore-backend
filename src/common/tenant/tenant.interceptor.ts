import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from './tenant.context';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log('DEBUG - TenantInterceptor - User:', user ? { role: user.role, etablissementId: user.etablissementId } : 'No user');

    // Le SuperAdmin ne doit pas être restreint par un tenantId automatique
    if (user && user.etablissementId && user.role !== 'SuperAdmin') {
      console.log('Setting tenant ID:', user.etablissementId);
      return new Observable((subscriber) => {
        TenantContext.run(user.etablissementId, () => {
          next.handle().subscribe(subscriber);
        });
      });
    }
    console.log('No etablissementId in user or no user or user is SuperAdmin');

    return next.handle();
  }
}
