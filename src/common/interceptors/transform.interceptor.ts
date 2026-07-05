import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  message: string;
  data: T;
}

type PaginatedPayload<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
  pageCount?: number;
  pages?: number;
  totalItems?: number;
};

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  any
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (data instanceof StreamableFile) {
          return data;
        }

        const response = context.switchToHttp().getResponse();

        const hasPaginationShape =
          data &&
          typeof data === 'object' &&
          Array.isArray((data as PaginatedPayload<T>).items) &&
          typeof (data as PaginatedPayload<T>).total === 'number' &&
          typeof (data as PaginatedPayload<T>).page === 'number' &&
          typeof (data as PaginatedPayload<T>).limit === 'number';

        if (hasPaginationShape) {
          const paginatedData = data as PaginatedPayload<T>;
          const totalPages = Math.max(
            1,
            Math.ceil(paginatedData.total / paginatedData.limit),
          );

          return {
            success: true,
            message: 'Opération réussie',
            data: {
              ...paginatedData,
              totalPages,
              pageCount: totalPages,
              pages: totalPages,
              totalItems: paginatedData.total,
            },
          };
        }

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
