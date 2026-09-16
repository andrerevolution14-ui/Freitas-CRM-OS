import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#eaedf2] text-slate-900 text-center">
      <div className="w-16 h-16 rounded-[4px] bg-amber-50 border border-amber-200 flex items-center justify-center mb-6 text-2xl font-bold text-amber-700 shadow-sm">
        404
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 tracking-tight">
        Página não encontrada
      </h1>
      <p className="text-slate-500 max-w-md mb-8 text-sm sm:text-base">
        A página que procura não existe ou foi movida.
      </p>
      <Link
        href="/dashboard"
        className="px-6 py-3 rounded-[4px] bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-600/20 transition-all active:scale-95"
      >
        Voltar ao Dashboard
      </Link>
    </main>
  )
}
