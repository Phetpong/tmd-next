"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-8 text-center">
          <div className="mx-auto bg-white/20 w-20 h-20 rounded-full flex items-center justify-center backdrop-blur-sm mb-4 ring-4 ring-white/30">
            <Image
              src="/tmd_logo.png"
              alt="TMD Logo"
              width={64}
              height={64}
              className="object-contain drop-shadow-md"
            />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">กรมอุตุนิยมวิทยา</h2>
          <p className="text-emerald-100 text-sm">เข้าสู่ระบบจัดการรายงานปริมาณฝน</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium mb-6 border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อผู้ใช้งาน</label>
              <input
                type="text"
                required
                autoComplete="username"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring focus:ring-emerald-200 transition-all font-medium"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">รหัสผ่าน</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring focus:ring-emerald-200 transition-all font-medium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center">
              <input
                id="remember_me"
                name="remember_me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded cursor-pointer"
              />
              <label htmlFor="remember_me" className="ml-2 block text-sm text-slate-700 cursor-pointer">
                จำรหัสผ่านไว้ในระบบ
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors"
              >
                ← กลับไปดูแผนที่ (ไม่ล็อกอิน)
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
