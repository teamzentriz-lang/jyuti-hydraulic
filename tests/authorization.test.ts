import assert from "node:assert/strict";
import test from "node:test";
import { canAccessResource, hasPermission, permissionForResource } from "../src/lib/authorization";

const staff = (permissions: string[]) => ({ systemRole: "staff" as const, permissionOverrides: permissions, crmVisibility: "assigned" as const });

test("Super Admin receives every permission without overrides", () => {
  assert.equal(hasPermission({ systemRole: "super_admin", permissionOverrides: [] }, "crm.assign"), true);
  assert.equal(canAccessResource({ systemRole: "super_admin", permissionOverrides: [] }, "leads"), true);
});

test("manage permissions imply read access", () => {
  assert.equal(hasPermission(staff(["crm.leads.manage"]), "crm.leads.view"), true);
  assert.equal(hasPermission(staff(["crm.customers.manage"]), "crm.customers.view"), true);
  assert.equal(hasPermission(staff(["inquiries.manage"]), "inquiries.view"), true);
});

test("view-only CRM access does not grant mutation permission", () => {
  const user = staff(["crm.leads.view"]);
  assert.equal(canAccessResource(user, "leads"), true);
  assert.equal(hasPermission(user, permissionForResource("leads")), false);
});

test("CRM resource mutations map to their dedicated permissions", () => {
  assert.equal(permissionForResource("companies"), "crm.customers.manage");
  assert.equal(permissionForResource("contacts"), "crm.customers.manage");
  assert.equal(permissionForResource("leads"), "crm.leads.manage");
  assert.equal(permissionForResource("lead-activities"), "crm.activities.manage");
  assert.equal(permissionForResource("follow-ups"), "crm.tasks.manage");
});
