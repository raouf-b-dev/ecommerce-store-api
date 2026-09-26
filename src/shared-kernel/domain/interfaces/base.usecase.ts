// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Result } from '../result';
import { AppError } from '../exceptions/app.error';

export abstract class UseCase<I, O, E extends AppError> {
  abstract execute(input: I): Promise<Result<O, E>>;
}
