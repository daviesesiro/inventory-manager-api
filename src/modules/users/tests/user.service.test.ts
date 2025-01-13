import { ObjectId } from 'mongodb'
import {
  beforeAll,
  describe,
  expect,
  it,
  jest
} from "@jest/globals";
import { BadRequestError } from "routing-controllers";
import { ConfigService } from "../../../configuration";
import User from "../../../database/models/user.model";
import { createPinoLogger } from "../../shared/logger";
import PasswordHasher from "../../shared/password-hasher";
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, RegisterDto, ResendVerifyEmailDto, ResetPasswordDto, VerifyEmailDto } from "../dto/users.dto";
import { UserService } from "../users.service";
import redisClient from "../../shared/redis-client";
import { createId } from "@paralleldrive/cuid2";
import Container from "typedi";

class MockConfigService {
  getRequired(key: string) {
    const mockConfig: Record<string, string> = {
      jwtSecret: "jwt-secret",
      jwtRefreshSecret: "refresh-secret",
    };
    return mockConfig[key];
  }
}

const genericPassword = 'password'
async function setup(override: Record<string, unknown> = {}) {
  const user = await User.create({
    email: "user@example.com",
    emailVerified: true,
    name: "John doe",
    password: new PasswordHasher(createPinoLogger()).hash(genericPassword),
    ...override,
  });

  const auth = { userId: user._id.toString(), email: user.email };
  return { user, auth, plainPassword: genericPassword };
}

describe("UserService", () => {
  let userService: UserService;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeAll(async () => {
    mockConfigService = new MockConfigService() as jest.Mocked<ConfigService>;
    userService = new UserService(
      new PasswordHasher(createPinoLogger()),
      mockConfigService
    );
  });

  describe("register", () => {
    it("should throw an error if the user already exists", async () => {
      const payload: RegisterDto = {
        email: "test@example.com",
        name: "John Doe",
        password: "password123",
      };

      await User.create({
        email: "test@example.com",
        password: "hashedpassword",
        name: "John Doe",
      });

      await expect(userService.register(payload)).rejects.toThrowError(
        new BadRequestError("User already exists with same email")
      );
    });

    it("should successfully register a new user", async () => {
      const payload: RegisterDto = {
        email: "newuser@example.com",
        name: "Jane Doe",
        password: "password123",
      };

      const result = await userService.register(payload);

      const user = await User.findOne({ email: "newuser@example.com" });

      expect(user).not.toBeNull();
      expect(result).toEqual({
        message: "Account created successfully",
        user: user!.id,
        verificationRequired: true,
      });
    });
  });

  describe("verifyEmail", () => {
    it("should throw an error if the OTP is invalid or expired", async () => {
      const payload: VerifyEmailDto = { userId: "1", otp: "123456" };

      (redisClient.get as jest.Mock) = jest.fn().mockImplementation(() => null);

      await expect(userService.verifyEmail(payload)).rejects.toThrowError(
        new BadRequestError("Invalid or expired verification otp")
      );
    });

    it("should successfully verify email", async () => {
      const user = await User.create({
        email: "user@example.com",
        name: "User Example",
        password: "hashedpassword",
      });

      const otp = "123456";
      (redisClient.get as jest.Mock) = jest.fn().mockImplementation(() => otp);

      const payload: VerifyEmailDto = { userId: user._id.toString(), otp };

      const result = await userService.verifyEmail(payload);

      const updatedUser = await User.findById(user._id);

      expect(updatedUser?.emailVerified).toBe(true);
      expect(result).toEqual({ message: "Email verified" });
    });
  });

  describe("login", () => {
    it("should throw an error if the user is not found", async () => {
      const payload: LoginDto = {
        email: "wrong@example.com",
        password: "password123",
      };

      await expect(userService.login(payload)).rejects.toThrowError(
        new BadRequestError("Invalid credentials")
      );
    });

    it("should throw an error if the password is incorrect", async () => {
      const { user } = await setup();
      const payload: LoginDto = {
        email: user.email,
        password: "wrongpassword",
      };

      await expect(userService.login(payload)).rejects.toThrowError(
        new BadRequestError("Invalid credentials")
      );
    });

    it("should successfully log in a user", async () => {
      const { user, plainPassword } = await setup();
      const payload: LoginDto = {
        email: "user@example.com",
        password: plainPassword,
      };

      const result = await userService.login(payload);

      expect(result).toEqual({
        message: "Login successful",
        user: { name: user.name, email: user.email },
        tokens: expect.any(Object),
      });
    });
  });

  describe("forgotPassword", () => {
    it("should return a message indicating password reset if email exists", async () => {
      const { user } = await setup();
      const payload: ForgotPasswordDto = { email: user.email };

      const result = await userService.forgotPassword(payload);
      expect(redisClient.setex).toHaveBeenCalled();

      expect(result).toEqual({
        message:
          "You will receive a password reset email if we find an account with this email",
      });
    });

    it("should return a message indicating password reset if email does not exist", async () => {
      const payload: ForgotPasswordDto = { email: "user@example.com" };

      const result = await userService.forgotPassword(payload);
      expect(redisClient.setex).not.toHaveBeenCalled();

      expect(result).toEqual({
        message:
          "You will receive a password reset email if we find an account with this email",
      });
    });
  });

  describe("resetPassword", () => {
    it("should throw an error if the reset link is invalid or expired", async () => {
      const payload: ResetPasswordDto = {
        hash: "invalidhash",
        password: "newpassword123",
      };

      (redisClient.get as jest.Mock) = jest.fn().mockImplementation(() => null);

      await expect(userService.resetPassword(payload)).rejects.toThrowError(
        new BadRequestError("Invalid or expired link")
      );
    });

    it("should successfully reset the password", async () => {
      const { user } = await setup();

      const hash = createId();
      (redisClient.get as jest.Mock) = jest
        .fn()
        .mockImplementation(() => user._id.toString());

      const payload: ResetPasswordDto = { hash, password: "newpassword123" };

      const result = await userService.resetPassword(payload);

      const updatedUser = await User.findById(user._id).select("password");

      expect(
        Container.get(PasswordHasher).compare(
          payload.password,
          updatedUser!.password
        )
      ).toBe(true);
      expect(result).toEqual({ message: "Password reset successful" });
    });
  });

  describe("changePassword", () => {
    it("should throw an error if the old password is incorrect", async () => {
      const { user } = await setup();

      const payload: ChangePasswordDto = {
        oldPassword: "wrongpassword",
        newPassword: "newpassword123",
      };

      await expect(
        userService.changePassword(user._id.toString(), payload)
      ).rejects.toThrowError(new BadRequestError("Password is invalid."));
    });

    it("should successfully change the password", async () => {
      const { user, plainPassword } = await setup();

      const payload: ChangePasswordDto = {
        oldPassword: plainPassword,
        newPassword: "newpassword123",
      };

      const result = await userService.changePassword(
        user._id.toString(),
        payload
      );

      const updatedUser = await User.findById(user._id).select("password");

      expect(
        Container.get(PasswordHasher).compare(
          payload.newPassword,
          updatedUser!.password
        )
      ).toBe(true);

      expect(result).toEqual({ message: "Password updated" });
    });
  });

  describe("resendVerifyEmail", () => {
    it("should throw an error if the user is not found", async () => {
      const payload: ResendVerifyEmailDto = { userId: new ObjectId().toString() };

      await expect(userService.resendVerifyEmail(payload)).rejects.toThrowError(
        new BadRequestError("User not found")
      );
    });

    it("should throw an error if the email is already verified", async () => {
      const {user} = await setup()
      const payload: ResendVerifyEmailDto = { userId: user._id.toString() };

      await expect(userService.resendVerifyEmail(payload)).rejects.toThrowError(
        new BadRequestError("Email already verified.")
      );
    });

    it("should throw an error if the resend limit has been exceeded", async () => {
      const { user } = await setup({ emailVerified: false });

      (redisClient.get as jest.Mock) = jest.fn().mockImplementation(() => "3");

      const payload: ResendVerifyEmailDto = { userId: user._id.toString() };

      await expect(userService.resendVerifyEmail(payload)).rejects.toThrowError(
        new BadRequestError("Exceeded resend limit")
      );
    });

    it("should successfully resend verification email if within limit", async () => {
      const { user } = await setup({ emailVerified: false });

      (redisClient.get as jest.Mock) = jest.fn().mockImplementation(() => "1");

      const payload: ResendVerifyEmailDto = { userId: user._id.toString() };

      const result = await userService.resendVerifyEmail(payload);

      expect(result).toEqual({
        email: user.email,
        name: user.name,
      });
    });
  });

  describe("getUser", () => {
    it("should throw an error if user is not found", async () => {
      const authData: AuthData = {
        userId: new ObjectId().toString(),
        email: "nonexistentuser@example.com",
      };

      await expect(userService.getUser(authData)).rejects.toThrowError(
        new BadRequestError("User not found")
      );
    });

    it("should successfully return the user details if found", async () => {
      const { auth, user } = await setup();

      const result = await userService.getUser(auth);

      expect(result).toHaveProperty("_id", user._id);
      expect(result).toHaveProperty("name", user.name);
      expect(result).toHaveProperty("email", user.email);
    });
  });
});
