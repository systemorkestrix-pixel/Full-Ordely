import { adminDependencies } from "./admin.dependencies.js";
import { hydrateAdminPageCopy } from "./admin.copy.js";
import { redirectAdminAuthIntent } from "./admin.routes.js";
import { bootstrapAdmin } from "./admin.runtime.js";
import { mountVisualIcons } from "../../shared/ui/visual/icons.js";

if (!redirectAdminAuthIntent()) {
  hydrateAdminPageCopy();
  mountVisualIcons();
  bootstrapAdmin(adminDependencies);
}
