import { DECORATORS } from '@nestjs/swagger';
import {
  OrderDetailResponseDto,
  OrderMutationResponseDto,
} from './order-detail-response.dto';
import { OrderListItemResponseDto } from './order-list-response.dto';
import { OrderResponseDto } from './order-response.dto';

describe('order total response DTOs', () => {
  it('documents totalAmount as canonical on detail and marks totalPrice deprecated', () => {
    const totalAmountMeta: unknown = Reflect.getMetadata(
      DECORATORS.API_MODEL_PROPERTIES,
      OrderDetailResponseDto.prototype,
      'totalAmount',
    );
    const totalPriceMeta: unknown = Reflect.getMetadata(
      DECORATORS.API_MODEL_PROPERTIES,
      OrderDetailResponseDto.prototype,
      'totalPrice',
    );

    expect(totalAmountMeta).toEqual(expect.objectContaining({ type: Number }));
    expect(totalAmountMeta).not.toEqual(
      expect.objectContaining({ deprecated: true }),
    );
    expect(totalPriceMeta).toEqual(
      expect.objectContaining({ type: Number, deprecated: true }),
    );

    const description =
      totalPriceMeta !== null &&
      typeof totalPriceMeta === 'object' &&
      'description' in totalPriceMeta &&
      typeof totalPriceMeta.description === 'string'
        ? totalPriceMeta.description
        : '';
    expect(description).toContain('totalAmount');
  });

  it('documents totalAmount as the list total field', () => {
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

  it('documents totalAmount as canonical on OrderResponseDto and marks totalPrice deprecated', () => {
    const totalAmountMeta: unknown = Reflect.getMetadata(
      DECORATORS.API_MODEL_PROPERTIES,
      OrderResponseDto.prototype,
      'totalAmount',
    );
    const totalPriceMeta: unknown = Reflect.getMetadata(
      DECORATORS.API_MODEL_PROPERTIES,
      OrderResponseDto.prototype,
      'totalPrice',
    );

    expect(totalAmountMeta).toEqual(expect.objectContaining({}));
    expect(totalAmountMeta).not.toEqual(
      expect.objectContaining({ deprecated: true }),
    );
    expect(totalPriceMeta).toEqual(
      expect.objectContaining({ deprecated: true }),
    );

    const description =
      totalPriceMeta !== null &&
      typeof totalPriceMeta === 'object' &&
      'description' in totalPriceMeta &&
      typeof totalPriceMeta.description === 'string'
        ? totalPriceMeta.description
        : '';
    expect(description).toContain('totalAmount');
  });

  it('keeps totalPrice on mutation responses without adding paymentId', () => {
    const props: unknown = Reflect.getMetadata(
      DECORATORS.API_MODEL_PROPERTIES_ARRAY,
      OrderMutationResponseDto.prototype,
    );

    expect(props).toEqual(expect.arrayContaining([':totalPrice']));
    expect(props).not.toEqual(expect.arrayContaining([':paymentId']));
  });
});
