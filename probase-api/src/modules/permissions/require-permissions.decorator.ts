import { SetMetadata } from '@nestjs/common';
import { SystemPermission } from './permissions.constants';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (
  ...permissions: (SystemPermission | string)[]
) => SetMetadata(PERMISSIONS_KEY, permissions);

