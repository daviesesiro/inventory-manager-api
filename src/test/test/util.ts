import { jest } from "@jest/globals";

export function generateMockObject<T>(...methods: string[]): T {
  const initial: Record<string, jest.Mock> = {};
  return methods.reduce((acc, method) => {
    acc[method] = jest.fn();
    return acc;
  }, initial) as T;
}
