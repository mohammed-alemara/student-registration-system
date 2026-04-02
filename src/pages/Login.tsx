import React, { useState } from 'react';
import logo from '../../logo.png';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { LogIn, UserPlus, AlertTriangle, Loader2, CheckCircle, X, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const navigate = useNavigate();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const validateForm = () => {
    const errors: Record<string, boolean> = {};
    if (!email) errors.email = true;
    if (!password) errors.password = true;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const inputClass = (field: string) => `appearance-none block w-full px-4 py-3.5 border rounded-2xl shadow-sm placeholder-slate-400 focus:ring-4 transition-all duration-300 sm:text-sm ${
    formErrors[field] 
      ? 'border-red-400 bg-red-50/50 ring-red-500/10 focus:border-red-500 focus:ring-red-500/20 animate-shake' 
      : 'border-slate-200 bg-white ring-blue-500/10 focus:border-blue-500'
  }`;

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
    if (!validateForm()) {
      showToast('يرجى تعبئة جميع الحقول المطلوبة', 'error');
      return;
    }

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
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex flex-col min-w-[340px] max-w-md overflow-hidden rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] border backdrop-blur-2xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-8 ${
          toast.type === 'success' 
            ? 'bg-white/95 border-emerald-500/20 text-emerald-900' 
            : 'bg-white/95 border-red-500/20 text-red-900'
        }`}>
          <div className="flex items-center px-6 py-4 space-x-4 space-x-reverse">
            <div className={`flex-shrink-0 p-2.5 rounded-2xl shadow-sm ${
              toast.type === 'success' ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-red-500 text-white shadow-red-200'
            }`}>
              {toast.type === 'success' ? <CheckCircle className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-[15px] leading-tight leading-6">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="flex-shrink-0 p-1.5 hover:bg-slate-100 rounded-xl transition-all active:scale-90">
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>
          <div className={`h-1 animate-progress opacity-60 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
        </div>
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <img src={logo} alt="شعار التربية" className="mx-auto w-32 h-32 object-contain mb-6 animate-in fade-in zoom-in duration-500" />
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">
          {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 sm:rounded-[2.5rem] sm:px-12 animate-in slide-in-from-bottom-4 duration-700">
          <form className="space-y-6" onSubmit={handleAuth} noValidate>
            {error && (
              <div className="mb-6 flex items-center p-4 text-red-800 border-r-4 border-red-500 rounded-2xl bg-red-50/50 backdrop-blur-sm shadow-sm animate-in fade-in duration-300">
                <AlertTriangle className="flex-shrink-0 w-5 h-5 ml-3" />
                <div className="text-sm font-bold">{error}</div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-bold text-slate-700 mr-1">
                البريد الإلكتروني <span className="text-red-500 mr-1">*</span>
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formErrors.email) setFormErrors(prev => ({ ...prev, email: false }));
                  }}
                  className={inputClass('email')}
                  placeholder="name@example.com"
                />
                {formErrors.email && <p className="mt-1.5 text-[10px] font-bold text-red-500 flex items-center animate-in slide-in-from-right-1"><AlertTriangle className="w-3 h-3 ml-1" /> البريد الإلكتروني مطلوب</p>}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-slate-700 mr-1">
                كلمة المرور <span className="text-red-500 mr-1">*</span>
              </label>
              <div className="mt-2 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formErrors.password) setFormErrors(prev => ({ ...prev, password: false }));
                  }}
                  className={`${inputClass('password')} pl-12`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                {formErrors.password && <p className="mt-1.5 text-[10px] font-bold text-red-500 flex items-center animate-in slide-in-from-right-1"><AlertTriangle className="w-3 h-3 ml-1" /> كلمة المرور مطلوبة</p>}
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
