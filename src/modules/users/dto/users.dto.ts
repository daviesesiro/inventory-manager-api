import { IsEmail, IsMongoId, IsNotEmpty, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class VerifyEmailDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string

  @IsString()
  @MinLength(6)
  otp: string
}

export class ResendVerifyEmailDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;
};

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  hash: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}