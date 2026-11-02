import { DECORATORS } from '@nestjs/swagger';
import {
  OrderDetailResponseDto,
  OrderMutationResponseDto,
} from './order-detail-response.dto';
import { OrderListItemResponseDto } from './order-list-response.dto';
import { OrderResponseDto } from './order-response.dto';

describe('order total response DTOs', () => {
  it('documents only totalAmount on detail responses', () => {
    const totalAmountMeta: unknown = Reflect.getMetadata(
      DECORATORS.API_MODEL_PROPERTIES,
      OrderDetailResponseDto.prototype,
      'totalAmount',
    );
    const props: unknown = Reflect.getMetadata(
      DECORATORS.API_MODEL_PROPERTIES_ARRAY,
      OrderDetailResponseDto.prototype,
    );

    expect(totalAmountMeta).toEqual(expect.objectContaining({ type: Number }));
    expect(totalAmountMeta).not.toEqual(
      expect.objectContaining({ deprecated: true }),
    );
    expect(props).toEqual(expect.arrayContaining([':totalAmount']));
    expect(props).not.toEqual(expect.arrayContaining([':totalPrice']));
  });

  it('documents only totalAmount on list responses', () => {
    const totalAmountMeta: unknown = Reflect.getMetadata(
      DECORATORS.API_MODEL_PROPERTIES,
      OrderListItemResponseDto.prototype,
      'totalAmount',
    );
    const props: unknown = Reflect.getMetadata(
      DECORATORS.API_MODEL_PROPERTIES_ARRAY,
      OrderListItemResponseDto.prototype,
    );

    expect(totalAmountMeta).toEqual(expect.objectContaining({ type: Number }));
    expect(props).toEqual(expect.arrayContaining([':totalAmount']));
    expect(props).not.toEqual(expect.arrayContaining([':totalPrice']));
  });

  it('documents only totalAmount on OrderResponseDto', () => {
    const totalAmountMeta: unknown = Reflect.getMetadata(
      DECORATORS.API_MODEL_PROPERTIES,
      OrderResponseDto.prototype,
      'totalAmount',
    );
    const props: unknown = Reflect.getMetadata(
      DECORATORS.API_MODEL_PROPERTIES_ARRAY,
      OrderResponseDto.prototype,
    );

    expect(totalAmountMeta).toEqual(expect.objectContaining({}));
    expect(props).toEqual(expect.arrayContaining([':totalAmount']));
    expect(props).not.toEqual(expect.arrayContaining([':totalPrice']));
  });

  it('documents only totalAmount on mutation responses without paymentId', () => {
    const props: unknown = Reflect.getMetadata(
      DECORATORS.API_MODEL_PROPERTIES_ARRAY,
      OrderMutationResponseDto.prototype,
    );

    expect(props).toEqual(expect.arrayContaining([':totalAmount']));
    expect(props).not.toEqual(expect.arrayContaining([':totalPrice']));
    expect(props).not.toEqual(expect.arrayContaining([':paymentId']));
  });
});
