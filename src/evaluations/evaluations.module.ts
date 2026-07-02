import { Module } from '@nestjs/common';
import { EvaluationModule } from '../evaluation/evaluation.module';

@Module({
  imports: [EvaluationModule],
  exports: [EvaluationModule],
})
export class EvaluationsModule {}
