'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';

type AuthLoginMode = 'saas' | 'superadmin';

interface AuthLoginFormProps {
  mode: AuthLoginMode;
}

interface LoginResponse {
  success?: boolean;
  user?: {
    email?: string;
    name?: string;
    role?: string;
  };
  error?: string;
}

export function AuthLoginForm({ mode }: AuthLoginFormProps) {
  const isSuperAdmin = mode === 'superadmin';
  const accent = isSuperAdmin
    ? 'red'
    : 'amber';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json().catch(
        () => null
      ) as LoginResponse | null;

      if (
        !response.ok ||
        data?.success !== true ||
        !data.user?.role
      ) {
        setErrorMessage(
          data?.error ||
          'No se ha podido validar el acceso. Comprueba las credenciales e inténtalo de nuevo.'
        );
        return;
      }

      const role = data.user.role;
      const saasManagementRoles = new Set([
        'OWNER',
        'ADMIN',
        'MANAGER',
        'EDITOR',
        'STAFF',
        'TENANT_OWNER',
        'TENANT_ADMIN',
      ]);

      const roleIsAllowed = isSuperAdmin
        ? role === 'SUPER_ADMIN'
        : saasManagementRoles.has(role);

      if (!roleIsAllowed) {
        // Revocar la sesión recién creada y borrar la cookie
        // cuando el usuario utiliza el portal equivocado.
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
              Accept: 'application/json',
            },
          });
        } catch {
          // No conceder acceso a la zona incorrecta.
        }

        setErrorMessage(
          isSuperAdmin
            ? 'Acceso denegado. Esta cuenta no tiene el rol SUPER_ADMIN.'
            : 'Esta cuenta debe entrar por el acceso de superadministración.'
        );
        return;
      }

      // La autorización definitiva de las funciones administrativas
      // corresponde a las comprobaciones del servidor.
      window.location.assign(
        isSuperAdmin ? '/superadmin' : '/portal'
      );
    } catch {
      setErrorMessage(
        'No se ha podido contactar con el servidor. Comprueba tu conexión e inténtalo de nuevo.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  const panelBorder = isSuperAdmin
    ? 'border-red-800/70'
    : 'border-slate-700';

  const accentText = isSuperAdmin
    ? 'text-red-400'
    : 'text-amber-400';

  const accentBorder = isSuperAdmin
    ? 'focus:border-red-500 focus:ring-red-500/30'
    : 'focus:border-amber-500 focus:ring-amber-500/30';

  const buttonStyle = isSuperAdmin
    ? 'bg-red-600 hover:bg-red-500 text-white'
    : 'bg-amber-500 hover:bg-amber-400 text-slate-950';

  return (
    <main
      className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4"
      data-auth-mode={mode}
    >
      <section
        className={`w-full max-w-md rounded-2xl border ${panelBorder} bg-slate-900 p-6 shadow-2xl sm:p-8`}
      >
        <div
          className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border ${panelBorder} bg-slate-950 ${accentText}`}
          aria-hidden="true"
        >
          {isSuperAdmin ? (
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                d="M12 3 20 6v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3Z"
                strokeLinejoin="round"
              />
              <path
                d="m9 12 2 2 4-4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <path d="M3 9h18M8 15h3" strokeLinecap="round" />
            </svg>
          )}
        </div>

        <header className="mb-7 text-center">
          <p
            className={`mb-2 text-xs font-bold uppercase tracking-[0.2em] ${accentText}`}
          >
            FenixCMS
          </p>

          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            {isSuperAdmin
              ? 'Superadministración'
              : 'Portal de clientes'}
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            {isSuperAdmin
              ? 'Acceso exclusivo para cuentas con rol SUPER_ADMIN.'
              : 'Accede a tu cuenta de cliente de FenixCMS.'}
          </p>
        </header>

        {errorMessage && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-5 rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-200"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="fenix-login-email"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Correo electrónico
            </label>

            <input
              id="fenix-login-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={`w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:ring-2 ${accentBorder}`}
              placeholder="tu@ejemplo.com"
            />
          </div>

          <div>
            <label
              htmlFor="fenix-login-password"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Contraseña
            </label>

            <div className="flex overflow-hidden rounded-xl border border-slate-700 bg-slate-950 focus-within:ring-2">
              <input
                id="fenix-login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                minLength={6}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white outline-none"
                placeholder="Introduce tu contraseña"
              />

              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className={`px-3 text-xs font-semibold ${accentText}`}
                aria-label={
                  showPassword
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña'
                }
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonStyle}`}
          >
            {isLoading
              ? 'Verificando acceso…'
              : isSuperAdmin
                ? 'Entrar a Superadministración'
                : 'Entrar al portal de clientes'}
          </button>
        </form>

        <footer className="mt-6 border-t border-slate-800 pt-5 text-center">
          <a
            href="/"
            className="text-sm text-slate-400 underline-offset-4 hover:text-white hover:underline"
          >
            Volver a FenixCMS
          </a>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            La sesión se valida en el servidor. El acceso administrativo
            requiere autorización específica y no depende únicamente
            de la interfaz del navegador.
          </p>
        </footer>
      </section>
    </main>
  );
}
