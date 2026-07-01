import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoPushTicket {
  status: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoPushResponse {
  data?: ExpoPushTicket[];
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  async sendBulkPushNotifications(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<string[]> {
    if (tokens.length === 0) return [];

    const invalidTokens: string[] = [];
    const chunks: string[][] = [];

    for (let i = 0; i < tokens.length; i += 100) {
      chunks.push(tokens.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      const messages: ExpoPushMessage[] = chunk.map((token) => ({
        to: token,
        title,
        body,
        data,
      }));

      try {
        const response = await axios.post<ExpoPushResponse>(
          this.EXPO_PUSH_URL,
          messages,
          {
            headers: {
              Accept: 'application/json',
              'Accept-Encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
          },
        );

        const pushTickets = response.data?.data;
        if (pushTickets) {
          for (let i = 0; i < pushTickets.length; i++) {
            const ticket = pushTickets[i];
            if (ticket?.status === 'error') {
              const errorDetails = ticket.details?.error ?? ticket.message;
              if (
                errorDetails === 'DeviceNotRegistered' ||
                errorDetails === 'InvalidCredentials'
              ) {
                invalidTokens.push(chunk[i]);
              }
              this.logger.warn(
                `Push error for token ${chunk[i]}: ${errorDetails}`,
              );
            }
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to send batch push notification`,
          error instanceof Error ? error.stack : '',
        );
      }
    }

    return invalidTokens;
  }
}
