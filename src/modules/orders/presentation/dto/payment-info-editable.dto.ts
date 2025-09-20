import { OmitType } from '@nestjs/mapped-types';
import { PaymentInfoDto } from './payment-info.dto';

export class PaymentInfoEditableDto extends OmitType(PaymentInfoDto, [
  'method',
  'amount',
] as const) {}
