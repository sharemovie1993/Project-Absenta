import { RoleItem } from '../../core/chatbot-context';
import { formatGuestMessage, formatMultiRoleMenu } from '../../../services/wa-chatbot-commands';

export class RoleSelectorHandler {
  static formatGuest(resolvedPhone: string): string {
    return formatGuestMessage(resolvedPhone);
  }

  static formatMultiRole(nama: string, roles: RoleItem[]): string {
    return formatMultiRoleMenu(nama, roles);
  }
}
