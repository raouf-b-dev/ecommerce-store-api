// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export class ClockTestHelper {
  static useFixedDate(date: Date | string | number): Date {
    const fixedDate = date instanceof Date ? date : new Date(date);

    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);

    return fixedDate;
  }

  static advanceByMs(milliseconds: number): void {
    jest.advanceTimersByTime(milliseconds);
  }

  static async runWithFixedDate<T>(
    date: Date | string | number,
    run: () => Promise<T> | T,
  ): Promise<T> {
    this.useFixedDate(date);

    try {
      return await run();
    } finally {
      this.restore();
    }
  }

  static restore(): void {
    jest.useRealTimers();
  }
}
