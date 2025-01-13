import { Response } from 'express';
import {
  Body,
  Get,
  JsonController,
  Post,
  Res,
  UseBefore
} from "routing-controllers";
import { Service } from "typedi";
import { GetAuthUser } from "../shared/decorators/auth-user.decorator";
import { cookieOpts } from "../shared/utils";
import { UserService } from "./users.service";
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResendVerifyEmailDto,
  ResetPasswordDto,
  VerifyEmailDto
} from "./dto/users.dto";
import { AuthGuard } from '../shared/middlewares/auth-guard.middleware';

@Service()
@JsonController("/auth", { transformResponse: false })
export class AuthController {
  constructor(private readonly usersService: UserService) {}

  @Post("/register")
  register(@Body() dto: RegisterDto) {
    return this.usersService.register(dto);
  }

  @Post("/logout")
  @UseBefore(AuthGuard)
  logout(@Res() res: Response) {
    res.clearCookie("id", cookieOpts);
    res.clearCookie("rid", cookieOpts);

    return res.status(200).json({
      message: "Logged out successfully",
    });
  }

  @Post("/login")
  async login(@Res() res: Response, @Body() dto: LoginDto) {
    const result = await this.usersService.login(dto);
    const { tokens, ...response } = result;

    if (tokens) {
      res.cookie("id", tokens.accessToken, cookieOpts);
      res.cookie("rid", tokens.refreshToken, cookieOpts);
    }
 
    return response;
  }

  @Post("/verify-email")
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.usersService.verifyEmail(dto);
  }

  @Post("/resend-verify-email")
  resendVerifyEmail(@Body() dto: ResendVerifyEmailDto) {
    return this.usersService.resendVerifyEmail(dto);
  }

  @Post("/forgot-password")
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.usersService.forgotPassword(dto);
  }

  @Post("/reset-password")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(dto);
  }

  @Get("/session")
  @UseBefore(AuthGuard)
  getUser(@GetAuthUser() auth: AuthData) {
    return this.usersService.getUser(auth);
  }

  @Post("/change-password")
  @UseBefore(AuthGuard)
  changePassword(
    @GetAuthUser() auth: AuthData,
    @Body() dto: ChangePasswordDto
  ) {
    return this.usersService.changePassword(auth.userId, dto);
  }
}
