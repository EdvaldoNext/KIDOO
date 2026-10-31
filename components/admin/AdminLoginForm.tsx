"use client";

import { useState } from "react";
export function AdminLoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const response = await fetch("/api/auth/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      }),
    });
    if (!response.ok) {
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      setError(result.error ?? "Credenciais inválidas.");
      setPending(false);
      return;
    }
    window.location.href = "/admin";
  }

  return (
    <form action={onSubmit} className="w-full max-w-md space-y-4 rounded-3xl bg-navy p-8 text-white">
      <h1 className="text-2xl font-extrabold">KIDOO Admin</h1>
      <p className="text-sm text-white/70">Acesso exclusivo da plataforma. Não é o login de pais ou filhos.</p>
      <label className="block text-sm font-semibold">
        E-mail
        <input name="email" type="email" required className="mt-1 w-full rounded-xl bg-white px-3 py-3 text-navy" />
      </label>
      <label className="block text-sm font-semibold">
        Senha
        <input name="password" type="password" required className="mt-1 w-full rounded-xl bg-white px-3 py-3 text-navy" />
      </label>
      {error ? <p className="text-sm font-bold text-gold">{error}</p> : null}
      <button disabled={pending} className="w-full rounded-xl bg-royal py-3 font-bold">
        {pending ? "Entrando..." : "Entrar no admin"}
      </button>
    </form>
  );
}
