export abstract class NotificationGateway {
  abstract send(userId: string, payload: any): Promise<void>;
}
