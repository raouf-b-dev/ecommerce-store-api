// src/core/core.module.ts
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from '../modules/orders/infrastructure/orm/order.schema';
import { ProductEntity } from '../modules/products/infrastructure/orm/product.schema';
import { IdGeneratorService } from './infrastructure/orm/id-generator.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity, ProductEntity])],
  providers: [IdGeneratorService],
  exports: [IdGeneratorService],
})
export class CoreModule {}
