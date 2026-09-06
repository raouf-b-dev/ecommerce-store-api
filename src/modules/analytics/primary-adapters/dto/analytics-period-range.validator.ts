import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { ANALYTICS_MAX_RANGE_DAYS } from '../../core/application/analytics.policy';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@ValidatorConstraint({ name: 'analyticsPeriodRange', async: false })
export class AnalyticsPeriodRangeConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const obj = args.object as { from?: string; to?: string };
    if (!obj.from || !obj.to) {
      return true;
    }
    const from = new Date(obj.from);
    const to = new Date(obj.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return false;
    }
    if (from.getTime() > to.getTime()) {
      return false;
    }
    return (
      to.getTime() - from.getTime() <= ANALYTICS_MAX_RANGE_DAYS * MS_PER_DAY
    );
  }

  defaultMessage(args: ValidationArguments): string {
    const obj = args.object as { from?: string; to?: string };
    const from = obj.from ? new Date(obj.from) : null;
    const to = obj.to ? new Date(obj.to) : null;
    if (
      from &&
      to &&
      !Number.isNaN(from.getTime()) &&
      !Number.isNaN(to.getTime()) &&
      from.getTime() > to.getTime()
    ) {
      return 'from must be less than or equal to to';
    }
    return `Analytics range must be at most ${ANALYTICS_MAX_RANGE_DAYS} days`;
  }
}

export function IsAnalyticsPeriodRange(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: AnalyticsPeriodRangeConstraint,
    });
  };
}
