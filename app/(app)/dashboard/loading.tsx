export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3.5 flex items-center gap-4">
        <div className="flex-1">
          <div className="h-3.5 bg-gray-200 rounded-md w-32 mb-1.5 animate-pulse" />
          <div className="h-2.5 bg-gray-100 rounded-md w-48 animate-pulse" />
        </div>
        <div className="h-7 w-24 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-7 w-32 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="h-10 bg-amber-50 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
              <div className="h-2.5 bg-gray-100 rounded w-24 mb-3" />
              <div className="h-7 bg-gray-200 rounded w-20 mb-2" />
              <div className="h-2 bg-gray-100 rounded w-16" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-40 animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 h-48 animate-pulse" />
      </div>
    </div>
  )
}
