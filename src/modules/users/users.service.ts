import { createId } from "@paralleldrive/cuid2";
import { BadRequestError, NotFoundError } from "routing-controllers";
import { Service } from "typedi";
import { ConfigService } from "../../configuration";
import User from "../../database/models/user.model";
import PasswordHasher from "../shared/password-hasher";
import { createJwtTokens, randomNumber } from "../shared/utils";
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResendVerifyEmailDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from "./dto/users.dto";
import redisClient from "../shared/redis-client";

@Service()
export class UserService {
  constructor(
    private hasher: PasswordHasher,
    private configService: ConfigService
  ) {}

  async register(payload: RegisterDto) {
    const exist = await User.findOne({
      email: payload.email.toLowerCase(),
    }).select("email username");
    if (exist) {
      throw new BadRequestError("User already exists with same email");
    }

    const user = await User.create({
      password: this.hasher.hash(payload.password),
      name: payload.name,
      email: payload.email.toLowerCase(),
    });

    // generate 6 digit otp, expires in 1hr
    const otp = randomNumber(100000, 999999).toString();
    await redisClient.setex("verify-email:" + user._id, 3600, otp);

    // TODO: send an email to verify user's email
    // await this.emailService.verifyUserEmail(user.email, {
    //   name: user.name,
    //   otp,
    // });

    return {
      message: "Account created successfully",
      user: user.id,
      verificationRequired: true,
    };
  }

  async verifyEmail(payload: VerifyEmailDto) {
    const { userId, otp } = payload;
    const key = "verify-email:" + userId;
    const storedOtp = await redisClient.get(key);
    if (!storedOtp || storedOtp !== otp) {
      throw new BadRequestError("Invalid or expired verification otp");
    }

    await redisClient.del(key);

    const user = await User.findOneAndUpdate(
      { _id: userId },
      { emailVerified: true }
    );
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // TODO: send welcome message

    return { message: "Email verified" };
  }

  async resendVerifyEmail({ userId }: ResendVerifyEmailDto) {
    let user = await User.findById(userId)
      .select("name email emailVerified")
      .lean();
    if (!user) {
      throw new BadRequestError("User not found");
    }

    if (user.emailVerified) {
      throw new BadRequestError("Email already verified.");
    }

    let windowId = `resend-vmail-${user._id}`;
    let resendWindow = await redisClient.get(windowId);

    if (!resendWindow) {
      resendWindow = "0";
    }

    if (Number(resendWindow) >= 3) {
      throw new BadRequestError("Exceeded resend limit");
    }

    await redisClient.setex(windowId, 3600, Number(resendWindow) + 1);

    const otp = randomNumber(100000, 999999).toString();
    await redisClient.setex(
      "verify-email:" + user._id,
      3600,
      otp
    );

    // TODO: send verify email

    return {
      email: user.email,
      name: user.name
    };
  }

  async login(payload: LoginDto) {
    const user = await User.findOne({
      email: payload.email.toLowerCase(),
    }).select("+password +refreshTokenVersion");
    if (!user) {
      throw new BadRequestError("Invalid credentials");
    }

    if (!this.hasher.compare(payload.password, user.password)) {
      throw new BadRequestError("Invalid credentials");
    }

    const secretKey = this.configService.getRequired("jwtSecret");
    const auth: AuthData = { userId: user.id, email: user.email };

    const tokens = createJwtTokens(auth, secretKey, user.refreshTokenVersion, this.configService);

    return {
      message: "Login successful",
      user: { name: user.name, email: user.email },
      tokens,
    };
  }

  async forgotPassword(payload: ForgotPasswordDto) {
    const user = await User.findOne({ email: payload.email.toLowerCase() })
      .select("email name")
      .lean();

    if (user) {
      const hash = createId();
      await redisClient.setex(
        `reset-password:${hash}`,
        3600,
        user._id.toString()
      ); // expires in 1hr

      // TODO: send confirm password email, which will contain a link
      // await this.emailService.confirmPasswordReset(user.email, {
      //   code: hash,
      //   name: user.name,
      // });
    }

    return {
      message:
        "You will receive a password reset email if we find an account with this email",
    };
  }

  async resetPassword(payload: ResetPasswordDto) {
    const key = `reset-password:${payload.hash}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      throw new BadRequestError("Invalid or expired link");
    }

    await redisClient.del(key);
    const user = await User.findOne({ _id: userId })
      .select("name email")
      .lean();
    if (!user) {
      throw new NotFoundError("Invalid or expired link");
    }

    const password = this.hasher.hash(payload.password);
    await User.updateOne({ _id: user._id }, { password });

    // TODO: send email
    // await this.emailService.passwordResetSuccessful(user.email, {name: user.name});

    return { message: "Password reset successful" };
  }

  async getUser(auth: AuthData) {
    const user = await User.findById(auth.userId).lean();
    if (!user) {
      throw new BadRequestError("User not found");
    }

    return user;
  }

  async changePassword(userId: string, body: ChangePasswordDto) {
    let user = await User.findById(userId).select("password").lean();

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const passwordMatch = this.hasher.compare(body.oldPassword, user.password);
    if (!passwordMatch) {
      throw new BadRequestError("Password is invalid.");
    }

    const hashedPassword = this.hasher.hash(body.newPassword);
    await User.updateOne({ _id: user._id }, { password: hashedPassword });

    return { message: "Password updated" };
  }
}
