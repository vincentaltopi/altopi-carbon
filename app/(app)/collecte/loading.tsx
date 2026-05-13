export default function CollecteLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3.5 flex items-center gap-4">
        <div className="flex-1">
          <div className="h-3.5 bg-gray-200 rounded-md w-40 mb-1.5 animate-pulse" />
          <div className="h-2.5 bg-gray-100 rounded-md w-56 animate-pulse" />
        </div>
        <div className="h-7 w-24 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-7 w-32 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-7">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse h-14" />
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
              <div className="h-5 bg-gray-100 rounded-full w-20 animate-pulse" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="bg-white rounded-xl border border-gray-100 p-4 h-36 animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
