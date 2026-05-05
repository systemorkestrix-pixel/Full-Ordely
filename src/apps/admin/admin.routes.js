export function redirectAdminAuthIntent() {
  const authIntent = new URLSearchParams(window.location.search).get("auth");

  if (authIntent !== "login" && authIntent !== "signup") {
    return false;
  }

  const nextPath = encodeURIComponent("/admin");
  window.location.replace("/auth?mode=" + authIntent + "&next=" + nextPath);
  return true;
}
