import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#07090e] text-slate-100 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 text-2xl font-bold text-amber-400">
        404
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
        Página não encontrada
      </h1>
      <p className="text-slate-400 max-w-md mb-8 text-sm sm:text-base">
        A página que procura não existe ou foi movida.
      </p>
      <Link
        href="/dashboard"
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-95"
      >
        Voltar ao Dashboard
      </Link>
    </main>
  )
}
