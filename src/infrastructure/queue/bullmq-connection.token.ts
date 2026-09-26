// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import type { ConnectionOptions } from 'bullmq';

/**
 * Shared BullMQ / ioredis connection options for QueueModule, FlowProducer,
 * and QueueEvents. Separate TCP sockets remain; this token ensures one options
 * object is built once from {@link buildIoRedisConnection}.
 */
export const BULLMQ_CONNECTION_OPTIONS = Symbol('BULLMQ_CONNECTION_OPTIONS');

export type BullMqConnectionOptions = ConnectionOptions;
