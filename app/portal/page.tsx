import type { Metadata } from 'next';
import Link from 'next/link';
import { requirePageSession } from '@/lib/auth/require-page-session';

export const metadata: Metadata = {
  title: 'Portal de cliente | FenixCMS',
  description: 'Área privada del cliente de FenixCMS.',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

export default async function CustomerPortalPage() {
  const session = await requirePageSession('saas');

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-400">
              FenixCMS
            </p>
            <h1 className="mt-2 text-3xl font-extrabold">
              Portal de cliente
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Acceso privado al área de productos y servicios SaaS.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-900"
          >
            Catálogo FenixCMS
          </Link>
        </header>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-bold">Sesión verificada</h2>
          <p className="mt-2 text-sm text-slate-400">
            Has accedido mediante una sesión validada por el servidor.
          </p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <dt className="text-xs uppercase tracking-wider text-slate-500">
                Usuario
              </dt>
              <dd className="mt-2 break-all font-semibold">
                {session.name}
              </dd>
              <dd className="mt-1 break-all text-sm text-slate-400">
                {session.email}
              </dd>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <dt className="text-xs uppercase tracking-wider text-slate-500">
                Rol de sesión
              </dt>
              <dd className="mt-2 font-semibold">{session.role}</dd>
              <dt className="mt-4 text-xs uppercase tracking-wider text-slate-500">
                Estado
              </dt>
              <dd className="mt-1 text-sm text-emerald-400">
                Autenticación confirmada
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-bold">Módulos y licencias</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Área destinada a consultar y gestionar las licencias,
              los módulos contratados y las suscripciones de la cuenta.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-bold">Plugins y temas</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Área destinada a los complementos y temas disponibles
              para los productos de FenixCMS.
            </p>
          </article>
        </section>

        <p className="mt-6 text-xs leading-5 text-slate-500">
          Esta página establece el acceso privado. Las operaciones de
          compra, licencias y gestión deben realizarse mediante sus
          correspondientes servicios y comprobaciones del servidor.
        </p>
      </div>
    </main>
  );
}
