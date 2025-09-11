import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No role requirements, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRole = user.role || user.login_type;
    
    // Role hierarchy: superadmin > admin > user > subsuer
    const roleHierarchy = {
      'superadmin': 4,
      'admin': 3,
      'user': 2,
      'subsuer': 1,
    };

    const userRoleLevel = roleHierarchy[userRole] || 0;
    
    // Check if user role is sufficient for any of the required roles
    const hasAccess = requiredRoles.some(role => {
      const requiredLevel = roleHierarchy[role] || 0;
      return userRoleLevel >= requiredLevel;
    });

    if (!hasAccess) {
      throw new ForbiddenException(`Access denied. Required role: ${requiredRoles.join(' or ')}, your role: ${userRole}`);
    }

    return true;
  }
}