export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const dns = "node:dns";
  const { setDefaultResultOrder } = (await import(dns)) as typeof import("node:dns");
  setDefaultResultOrder("ipv4first");
}
