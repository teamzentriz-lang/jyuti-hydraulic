import { CmsError } from "@/db/errors";

export const PERMISSIONS = [
  "cms.pages.manage",
  "cms.catalogue.manage",
  "cms.content.manage",
  "cms.navigation.manage",
  "cms.settings.manage",
  "media.manage",
  "inquiries.view",
  "inquiries.manage",
  "crm.customers.view",
  "crm.customers.manage",
  "crm.leads.view",
  "crm.leads.manage",
  "crm.activities.manage",
  "crm.tasks.manage",
  "crm.assign",
  "crm.reports.view",
  "quotations.view",
  "quotations.create",
  "quotations.edit",
  "quotations.submit",
  "quotations.approve",
  "quotations.send",
  "users.manage",
  "teams.manage",
  "audit.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type SystemRole = "super_admin" | "admin" | "staff";

export type PermissionUser = {
  systemRole: SystemRole;
  permissionOverrides: string[];
  crmVisibility?: "own" | "assigned" | "team" | "all";
};

export function hasPermission(user: PermissionUser, permission: Permission) {
  if (
    user.systemRole === "super_admin" ||
    user.permissionOverrides.includes(permission)
  )
    return true;
  const impliedBy: Partial<Record<Permission, Permission>> = {
    "inquiries.view": "inquiries.manage",
    "crm.customers.view": "crm.customers.manage",
    "crm.leads.view": "crm.leads.manage",
    "quotations.view": "quotations.edit",
  };
  const parent = impliedBy[permission];
  return Boolean(parent && user.permissionOverrides.includes(parent));
}

export function requirePermission(
  user: PermissionUser,
  permission: Permission,
) {
  if (!hasPermission(user, permission)) {
    throw new CmsError("You do not have permission to perform this action.");
  }
}

export function permissionForResource(resource: string): Permission {
  if (resource === "users") return "users.manage";
  if (resource === "teams") return "teams.manage";
  if (resource === "media") return "media.manage";
  if (resource === "inquiries") return "inquiries.manage";
  if (["companies", "contacts"].includes(resource))
    return "crm.customers.manage";
  if (resource === "leads") return "crm.leads.manage";
  if (resource === "lead-activities") return "crm.activities.manage";
  if (resource === "follow-ups") return "crm.tasks.manage";
  if (resource === "quotations") return "quotations.edit";
  if (["pages", "locations", "exports"].includes(resource))
    return "cms.pages.manage";
  if (["products", "product-categories"].includes(resource))
    return "cms.catalogue.manage";
  if (["nav-links", "redirects"].includes(resource))
    return "cms.navigation.manage";
  if (resource === "page-html") return "cms.settings.manage";
  return "cms.content.manage";
}

export function canAccessResource(user: PermissionUser, resource: string) {
  if (resource === "inquiries")
    return (
      hasPermission(user, "inquiries.view") ||
      hasPermission(user, "inquiries.manage")
    );
  if (["companies", "contacts"].includes(resource))
    return (
      hasPermission(user, "crm.customers.view") ||
      hasPermission(user, "crm.customers.manage")
    );
  if (resource === "leads")
    return (
      hasPermission(user, "crm.leads.view") ||
      hasPermission(user, "crm.leads.manage")
    );
  if (resource === "quotations")
    return (
      hasPermission(user, "quotations.view") ||
      hasPermission(user, "quotations.edit")
    );
  return hasPermission(user, permissionForResource(resource));
}
