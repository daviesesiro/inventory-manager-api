import { NextFunction, Request, Response } from "express";
import { getConfigService } from "../../../configuration";
import User from "../../../database/models/user.model";
import { createJwtTokens, verifyJwt, cookieOpts } from "../utils";
import { UnauthorizedError } from "routing-controllers";

const config = getConfigService();

function createAuthGuard() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const logger = req.logger;
    try {
      if (!req.cookies?.id || !req.cookies?.rid) {
        logger.info("no authorization header");
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { id: token, rid: refreshToken } = req.cookies;
      const secret = config.getRequired("jwtSecret");
      if (!secret) {
        throw new UnauthorizedError("Invalid authType");
      }

      const decoded = verifyJwt(token, secret);
      if (decoded) {
        req.auth = decoded;
        req.auth = { userId: decoded.userId, email: decoded.email };
        return next();
      }

      // access token is expired, so let's get a new one!

      const data = verifyJwt(
        refreshToken,
        config.getRequired("jwtRefreshSecret")
      ) as AuthData & { version: number };

      let user = await User.findOne({ _id: data.userId }).select(
        "refreshTokenVersion"
      );

      if (!user || user.refreshTokenVersion !== data.version) {
        logger.info("refresh token version mismatch", {
          currentVersion: user?.refreshTokenVersion,
          tokenVersion: data.version,
        });
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      req.auth = { userId: user.id, email: data.email };

      const tokens = createJwtTokens(
        req.auth,
        secret,
        user.refreshTokenVersion,
        config
      );
      res.cookie("id", tokens.accessToken, cookieOpts);
      res.cookie("rid", tokens.refreshToken, cookieOpts);

      return next();
    } catch (err) {
      logger.error({ msg: "error validating token", err });
      next(err);
    }
  };
}

export const AuthGuard = createAuthGuard();
