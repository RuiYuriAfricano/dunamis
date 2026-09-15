import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

// A separate permission axis from role — only the one account explicitly
// flagged canManageUsers (Rui Malemba) may reach the users-management
// endpoints, regardless of whether other requesters are ADMIN.
@Injectable()
export class CanManageUsersGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    return !!user?.canManageUsers;
  }
}
