import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ROLES = [
  { name: 'superadmin', displayNameAr: 'مدير النظام', isSystem: true },
  { name: 'admin',      displayNameAr: 'شريك',        isSystem: true },
  { name: 'cfo',        displayNameAr: 'مدير حسابات', isSystem: true },
  { name: 'team_manager', displayNameAr: 'مدير فريق', isSystem: true },
  { name: 'employee',   displayNameAr: 'موظف',        isSystem: true },
];

const ALL_MODULE_KEYS = [
  'cars_view', 'cars_add', 'cars_edit', 'cars_delete', 'cars_change_status',
  'financial_view', 'financial_close_sale',
  'reports_view', 'reports_export',
  'settings_view', 'settings_edit',
  'users_view', 'users_create', 'users_edit', 'users_delete',
  'archive_view', 'employee_monitor', 'permissions_manage',
];

// superadmin is bypassed in middleware — no module_access rows needed
const ROLE_ACCESS = {
  admin: new Set([
    'cars_view', 'cars_add', 'cars_edit', 'cars_delete', 'cars_change_status',
    'financial_view', 'financial_close_sale',
    'reports_view', 'reports_export',
    'settings_view', 'settings_edit',
    'users_view', 'users_create', 'users_edit', 'users_delete',
    'archive_view', 'employee_monitor',
    // permissions_manage intentionally excluded
  ]),
  cfo: new Set([
    'financial_view', 'financial_close_sale',
    'reports_view', 'reports_export',
    'archive_view',
  ]),
  team_manager: new Set(['employee_monitor', 'cars_view']),
  employee: new Set(['cars_view', 'cars_add', 'cars_change_status']),
};

const SETTINGS = [
  { key: 'request_timeout_minutes',    value: '5',       descriptionAr: 'المدة قبل ما المشتري يقدر يطلب موظف تاني',     category: 'buyer' },
  { key: 'escalation_enabled',         value: 'false',   descriptionAr: 'تفعيل نظام التصعيد',                             category: 'notifications' },
  { key: 'escalation_timeout_seconds', value: '300',     descriptionAr: 'مدة التصعيد بالثواني',                           category: 'notifications' },
  { key: 'max_car_images',             value: '10',      descriptionAr: 'الحد الأقصى لعدد صور العربية',                   category: 'general' },
  { key: 'max_concurrent_requests',    value: '1',       descriptionAr: 'الحد الأقصى للطلبات المتزامنة لكل موظف',        category: 'employee' },
  { key: 'default_commission',         value: '0',       descriptionAr: 'عمولة الموظف الافتراضية',                        category: 'financial' },
  { key: 'tax_percentage',             value: '0',       descriptionAr: 'نسبة الضريبة',                                   category: 'financial' },
  { key: 'employee_can_edit_car',      value: 'false',   descriptionAr: 'الموظف يقدر يعدل بيانات العربية',               category: 'employee' },
  { key: 'employee_can_delete_car',    value: 'false',   descriptionAr: 'الموظف يقدر يمسح العربية',                      category: 'employee' },
  { key: 'employee_can_change_status', value: 'true',    descriptionAr: 'الموظف يقدر يغير حالة العربية',                 category: 'employee' },
  { key: 'buyer_can_attach_car',       value: 'false',   descriptionAr: 'المشتري يقدر يرفق العربية المهتم بيها في الطلب', category: 'buyer' },
  { key: 'employee_display_mode',      value: '"list"',  descriptionAr: 'طريقة عرض الموظفين',                             category: 'general' },
  { key: 'notification_repeat',        value: 'true',    descriptionAr: 'إعادة الإشعار مرة تانية بعد دقيقة',             category: 'notifications' },
  { key: 'notification_sound',         value: '"default"', descriptionAr: 'صوت الإشعار',                                  category: 'notifications' },
  { key: 'numeral_system',             value: '"western"', descriptionAr: 'نظام الأرقام (western/arabic)',                 category: 'general' },
];

async function main() {
  console.log('[seed] Seeding roles…');
  const roleMap = {};
  for (const role of ROLES) {
    const r = await prisma.role.upsert({
      where: { name: role.name },
      update: { displayNameAr: role.displayNameAr },
      create: role,
    });
    roleMap[role.name] = r.id;
  }

  console.log('[seed] Seeding module_access…');
  for (const [roleName, enabledSet] of Object.entries(ROLE_ACCESS)) {
    const roleId = roleMap[roleName];
    for (const moduleKey of ALL_MODULE_KEYS) {
      await prisma.moduleAccess.upsert({
        where: { roleId_moduleKey: { roleId, moduleKey } },
        update: { isEnabled: enabledSet.has(moduleKey) },
        create: { roleId, moduleKey, isEnabled: enabledSet.has(moduleKey) },
      });
    }
  }

  console.log('[seed] Seeding SuperAdmin user…');
  const passwordHash = await bcrypt.hash('246810@Ad', 12);
  await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin',
      passwordHash,
      fullName: 'مدير النظام',
      roleId: roleMap['superadmin'],
      status: 'offline',
      isActive: true,
    },
  });

  console.log('[seed] Seeding settings…');
  for (const setting of SETTINGS) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log('[seed] Done ✓');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
