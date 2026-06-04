import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();
        
        // Si la réponse est déjà structurée (comme ce qu'on a fait dans le controller)
        if (data && typeof data === 'object' && 'message' in data) {
          return {
            success: true,
            message: data.message || 'Opération réussie',
            data: data.data !== undefined ? data.data : data,
          };
        }

        // Format par défaut pour les futurs contrôleurs simples
        return {
          success: true,
          message: 'Opération réussie',
          data: data,
        };
      }),
    );
  }
}
