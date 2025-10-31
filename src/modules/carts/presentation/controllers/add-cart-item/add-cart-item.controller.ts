import { Injectable } from '@nestjs/common';
import { AddCartItemDto } from '../../dto/add-cart-item.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

@Injectable()
export class AddCartItemController {
  constructor() {}
  async handle(
    id: string,
    dto: AddCartItemDto,
  ): Promise<Result<void, ControllerError>> {
    try {
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
