import { Injectable } from '@nestjs/common';
import { CheckoutDto } from '../../dto/checkout.dto';
import { CheckoutUseCase } from '../../../application/usecases/checkout/checkout.usecase';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { Result } from '../../../../../core/domain/result';
import { CheckoutResponseDto } from '../../dto/checkout-response.dto';

@Injectable()
export class CheckoutController {
  constructor(private readonly checkoutUseCase: CheckoutUseCase) {}

  async handle(
    dto: CheckoutDto,
    userId: string,
  ): Promise<Result<CheckoutResponseDto, ControllerError>> {
    try {
      return this.checkoutUseCase.execute({ dto, userId });
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
