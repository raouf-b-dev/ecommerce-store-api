import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MetricsService } from '../metrics.service';

@Injectable()
export class BusinessMetricsListener {
  constructor(private readonly metrics: MetricsService) {}

  @OnEvent('order.created')
  handleOrderCreated() {
    this.metrics.ordersCreatedTotal.inc();
  }

  @OnEvent('checkout.saga.completed')
  handleCheckoutSagaCompleted() {
    this.metrics.checkoutSagaCompletedTotal.inc();
  }

  @OnEvent('checkout.saga.failed')
  handleCheckoutSagaFailed() {
    this.metrics.checkoutSagaFailedTotal.inc();
  }

  @OnEvent('checkout.saga.compensation')
  handleCheckoutSagaCompensation(payload: { step: string }) {
    const step = payload?.step ?? 'unknown';
    this.metrics.checkoutSagaCompensationTotal.inc({ step });
  }

  @OnEvent('payment.captured')
  handlePaymentCaptured() {
    this.metrics.paymentsCapturedTotal.inc();
  }

  @OnEvent('payment.refunded')
  handlePaymentRefunded() {
    this.metrics.paymentsRefundedTotal.inc();
  }

  @OnEvent('auth.login.success')
  handleLoginSuccess() {
    this.metrics.authLoginTotal.inc();
  }

  @OnEvent('auth.login.failure')
  handleLoginFailure(payload?: { reason?: string }) {
    const reason = payload?.reason || 'unknown';
    this.metrics.authLoginFailuresTotal.inc({ reason });
  }

  @OnEvent('cart.checkout.initiated')
  handleCartCheckoutInitiated() {
    this.metrics.cartsCheckoutInitiatedTotal.inc();
  }
}
