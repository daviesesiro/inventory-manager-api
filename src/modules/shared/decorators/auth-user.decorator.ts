import { Request } from 'express';
import { createParamDecorator } from 'routing-controllers';

export function GetAuthUser(key?: keyof AuthData) {
  return createParamDecorator({
    required: true,
    value: (action) => {
      const request = action.request as Request
      const auth = request.auth as AuthData;
      if (key) {
        return auth[key]
      }

      return auth
    }
  });
}