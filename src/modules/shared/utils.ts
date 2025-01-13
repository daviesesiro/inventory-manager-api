import { createId } from "@paralleldrive/cuid2";
import { CookieOptions } from "express";
import jwt from "jsonwebtoken";
import Container, { ContainerInstance } from "typedi";
import { ConfigService } from "../../configuration";
import { createPinoLogger } from "./logger";

export function createDiScopedContainer(id?: string) {
  const container = Container.of(id ?? createId());
  const logger = createPinoLogger();
  container.set("logger", logger);
  container.set("container", container);
  return container;
}

export const cookieOpts: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
} as const

export function createJwtTokens(
  auth: AuthData,
  secret: string,
  refreshTokenVersion: number,
  configService: ConfigService
) {
  const accessToken = jwt.sign(auth, secret, {
    algorithm: "HS256",
    expiresIn: "5m",
  });

  const refreshToken = jwt.sign(
    { ...auth, version: refreshTokenVersion },
    configService.getRequired('jwtRefreshSecret'),
    { expiresIn: "30d" }
  );

  return {
    accessToken,
    refreshToken,
  };
}

type PromiseOrVoid = void | Promise<void>;

type RunInScopeOptions = {
  scopeId?: string;
};

export function runInScope<T extends PromiseOrVoid = void>(
  func: (container: ContainerInstance) => T,
  options?: RunInScopeOptions
) {
  const scopeId = options?.scopeId ?? createId();
  const container = createDiScopedContainer(scopeId);
  const resetContainer = () => {
    if (!options?.scopeId) {
      container.reset();
    }
  };

  let isPromise = false;
  try {
    const result = func(container);
    if (result instanceof Promise) {
      isPromise = true;
      return result.finally(resetContainer);
    }
  } finally {
    if (!isPromise) {
      resetContainer();
    }
  }

  return undefined;
}

export function escapeRegExp(str: string) {
  return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

export function verifyJwt(token: string, secret: string) {
  try {
    return jwt.verify(token, secret, {
      algorithms: ["HS256"],
    }) as AuthData;
  } catch {
    return null;
  }
}

export function randomNumber(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}