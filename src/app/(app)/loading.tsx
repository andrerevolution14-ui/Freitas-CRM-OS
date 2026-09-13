export default function AppLoading() {
  return (
    <div className="space-y-5 animate-pulse select-none">
      {/* Top subtle glowing loader bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 z-50 animate-pulse" />

      {/* Header skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-white/10 rounded-md" />
          <div className="h-8 w-48 bg-white/10 rounded-lg" />
        </div>
        <div className="h-9 w-28 bg-white/10 rounded-xl" />
      </div>

      {/* Hero card skeleton */}
      <div className="h-36 rounded-2xl bg-white/[0.04] border border-white/[0.06]" />

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 space-y-3">
            <div className="w-8 h-8 rounded-lg bg-white/10" />
            <div className="h-6 w-24 bg-white/10 rounded" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 h-72 rounded-2xl bg-white/[0.04] border border-white/[0.06]" />
        <div className="h-72 rounded-2xl bg-white/[0.04] border border-white/[0.06]" />
      </div>
    </div>
  )
}
