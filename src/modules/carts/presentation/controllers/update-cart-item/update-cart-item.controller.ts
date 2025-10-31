import { Injectable } from '@nestjs/common';
import { UpdateCartItemDto } from '../../dto/update-cart-item.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

@Injectable()
export class UpdateCartItemController {
  constructor() {}
  async handle(
    id: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<Result<void, ControllerError>> {
    try {
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
