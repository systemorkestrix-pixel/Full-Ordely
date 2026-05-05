import { createAdminContext } from "./admin.state.js";
import { installAdminValidation } from "./admin.validation.js";
import { installAdminRender } from "./admin.render.js";
import { installAdminActions } from "./admin.actions.js";
import { bindAdminEvents } from "./admin.events.js";

export function bootstrapAdmin(dependencies) {
  const context = createAdminContext(dependencies);

  context.runtimeGuard.assertUiConsistency("admin", [".admin-container", "#dashboardSection"]);
  installAdminValidation(context);
  installAdminRender(context);
  installAdminActions(context);
  bindAdminEvents(context);

  context.render.syncAuthEntryLink();
  context.actions.checkSession().catch((error) => {
    console.error("Admin bootstrap error:", error);
    context.render.showLogin({
      message: context.TEXT.adminPageBootError,
      feedback: context.TEXT.dashboardLoadError,
      tone: "error",
      showRetryAction: true,
      showLogoutAction: true,
    });
  });
}
