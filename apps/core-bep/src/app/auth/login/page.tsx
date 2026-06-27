import { LoginForm } from "@/components/bep/login-form";

export const metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 text-white font-bold text-xl mb-4">
            B
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">BEP</h1>
          <p className="text-sm text-gray-500 mt-1">Bid Engineering Platform</p>
        </div>
        <div className="bep-card p-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
