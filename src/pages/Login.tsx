import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { LogIn, UserPlus, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const navigate = useNavigate();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-cairo" dir="rtl">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-yellow-50 border-r-4 border-yellow-400 p-4 rounded-md shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="mr-3">
                <h3 className="text-sm font-medium text-yellow-800">إعدادات قاعدة البيانات مفقودة</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    يرجى إضافة المتغيرات التالية في إعدادات المشروع (Secrets) لكي يعمل التطبيق:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1" dir="ltr">
                    <li>VITE_SUPABASE_URL</li>
                    <li>VITE_SUPABASE_ANON_KEY</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Fetch user profile to determine role
        if (data.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
            
          if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found
             console.error('Error fetching profile:', profileError);
             throw new Error('حدث خطأ أثناء جلب معلومات المستخدم.');
          }
          
          // If profile is null or role is not 'admin' or 'student', log out
          // This handles cases where a user exists in auth.users but not in profiles, or has an unrecognized role
          if (profile?.role === 'admin') {
            navigate('/admin');
          } else if (profile?.role === 'student') {
            navigate('/student');
          } else {
            await supabase.auth.signOut(); // Log out the user
            throw new Error('لا يوجد دور محدد لهذا الحساب. يرجى مراجعة الإدارة.');
          }
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        // Profile creation is now handled securely by Supabase Database Triggers
        // We no longer insert it from the frontend to prevent privilege escalation.
        
        alert('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
        setIsLogin(true);
      }
    } catch (err: any) {
      let errorMessage = err.message || 'حدث خطأ أثناء المصادقة';
      
      // Translate common Supabase error messages to Arabic
      if (errorMessage === 'Invalid login credentials') {
        errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      } else if (errorMessage === 'User already registered') {
        errorMessage = 'هذا البريد الإلكتروني مسجل مسبقاً';
      } else if (errorMessage.includes('Password should be at least 6 characters')) {
        errorMessage = 'كلمة المرور يجب أن تتكون من 6 أحرف على الأقل';
      } else if (errorMessage === 'Email not confirmed') {
        errorMessage = 'يرجى تأكيد بريدك الإلكتروني أولاً';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-cairo" dir="rtl">
      {/* Toast Notification Component */}
      {toast && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] flex items-center px-6 py-4 space-x-4 space-x-reverse rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border bg-white/90 backdrop-blur-xl transition-all duration-500 animate-in fade-in slide-in-from-top-5 ${
          toast.type === 'success' 
            ? 'border-green-100 text-green-600' 
            : 'border-red-100 text-red-600'
        }`}>
          <div className={`p-2.5 rounded-2xl ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </div>
          <p className="font-black text-lg ml-2">{toast.message}</p>
        </div>
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-[2rem] shadow-xl shadow-blue-500/20 mb-6">
          <LogIn className="text-white h-10 w-10" />
        </div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">
          {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 sm:rounded-[2.5rem] sm:px-12">
          <form className="space-y-6" onSubmit={handleAuth}>
            {error && (
              <div className="bg-red-50 border-r-4 border-red-400 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-bold text-slate-700 mr-1">
                البريد الإلكتروني
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3.5 border border-slate-200 rounded-2xl shadow-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all sm:text-sm"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-slate-700 mr-1">
                كلمة المرور
              </label>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3.5 border border-slate-200 rounded-2xl shadow-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg shadow-blue-500/25 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-300"
              >
                {loading ? (
                  <div className="flex items-center">
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    جاري المعالجة...
                  </div>
                ) : isLogin ? (
                  <>
                    <LogIn className="ml-2 h-5 w-5" />
                    دخول
                  </>
                ) : (
                  <>
                    <UserPlus className="ml-2 h-5 w-5" />
                    تسجيل
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-400 font-medium">
                  {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="w-full flex justify-center py-3.5 px-4 border border-slate-200 rounded-2xl shadow-sm text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
              >
                {isLogin ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
