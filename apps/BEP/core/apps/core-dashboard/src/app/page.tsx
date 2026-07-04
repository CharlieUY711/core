import Link from "next/link";

export default function DashboardHome() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-3xl w-full">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Core Dashboard</h1>
        <p className="text-gray-500 mb-8">Plataforma central de gestión.</p>
        <div className="grid grid-cols-2 gap-4">
          <a
            href={process.env.NEXT_PUBLIC_BEP_URL ?? "http://localhost:3002"}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center mb-4">
              <span className="text-indigo-700 font-bold">B</span>
            </div>
            <h2 className="font-semibold text-gray-900 mb-1">BEP</h2>
            <p className="text-sm text-gray-500">Bid Engineering Platform — gestión de licitaciones</p>
          </a>
        </div>
      </div>
    </main>
  );
}
