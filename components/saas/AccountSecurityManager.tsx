'use client';

import React, { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck
} from 'lucide-react';

type Feedback = {
  type: 'success' | 'error';
  message: string;
};

export function AccountSecurityManager() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (newPassword.length < 12 || newPassword.length > 128) {
      setFeedback({
        type: 'error',
        message: 'La nueva contraseña debe tener entre 12 y 128 caracteres.'
      });
      return;
    }

    if (newPassword !== confirmation) {
      setFeedback({
        type: 'error',
        message: 'La confirmación no coincide con la nueva contraseña.'
      });
      return;
    }

    if (newPassword === currentPassword) {
      setFeedback({
        type: 'error',
        message: 'La nueva contraseña debe ser distinta de la actual.'
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          revokeOtherSessions: true
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success !== true) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'No se pudo cambiar la contraseña.'
        );
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      setFeedback({
        type: 'success',
        message:
          'Contraseña cambiada correctamente. Esta sesión se mantiene abierta; las demás sesiones de la cuenta se han revocado.'
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error
          ? error.message
          : 'No se pudo cambiar la contraseña.'
      });
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 pr-20 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500';

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-400">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Mi cuenta</h2>
            <p className="mt-1 text-sm text-slate-400">
              Cambiar contraseña del Super Administrador
            </p>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-700/40 bg-emerald-950/20 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <div className="text-sm text-slate-300">
            <p className="font-semibold text-emerald-300">Cambio protegido</p>
            <p className="mt-1">
              Se solicita la contraseña actual. La nueva contraseña debe tener
              al menos 12 caracteres. Las demás sesiones se cerrarán y esta
              sesión permanecerá abierta.
            </p>
          </div>
        </div>

        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className={
              'mb-5 flex gap-3 rounded-xl border p-4 text-sm ' +
              (feedback.type === 'success'
                ? 'border-emerald-700/50 bg-emerald-950/30 text-emerald-200'
                : 'border-rose-700/50 bg-rose-950/30 text-rose-200')
            }
          >
            {feedback.type === 'success'
              ? <CheckCircle2 className="h-5 w-5 shrink-0" />
              : <AlertCircle className="h-5 w-5 shrink-0" />}
            <p>{feedback.message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="account-current-password"
              className="mb-2 block text-sm font-medium text-slate-200">
              Contraseña actual
            </label>
            <div className="relative">
              <input
                id="account-current-password"
                name="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                maxLength={128}
                required
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(v => !v)}
                className="absolute inset-y-0 right-3 text-xs font-medium text-amber-400"
              >
                {showCurrent ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="account-new-password"
              className="mb-2 block text-sm font-medium text-slate-200">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                id="account-new-password"
                name="newPassword"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute inset-y-0 right-3 text-xs font-medium text-amber-400"
              >
                {showNew ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Utiliza 12 caracteres o más. Una frase larga y única es una
              buena opción.
            </p>
          </div>

          <div>
            <label htmlFor="account-confirm-password"
              className="mb-2 block text-sm font-medium text-slate-200">
              Confirmar nueva contraseña
            </label>
            <div className="relative">
              <input
                id="account-confirm-password"
                name="confirmation"
                type={showConfirmation ? 'text' : 'password'}
                value={confirmation}
                onChange={e => setConfirmation(e.target.value)}
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowConfirmation(v => !v)}
                className="absolute inset-y-0 right-3 text-xs font-medium text-amber-400"
              >
                {showConfirmation ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-amber-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Actualizando contraseña...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </section>
  );
}
