import React, { useState, useEffect, useCallback, useRef } from 'react';
import logo from '../../logo.png';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogOut, Save, CheckCircle, AlertTriangle, Upload, X, Scissors, Loader2, Info } from 'lucide-react';
import { NATIONAL_ID_ISSUERS, RESIDENCE_CARD_ISSUERS, EDUCATION_DIRECTORATES, APPLICATION_TYPES } from '../lib/constants';
<<<<<<< HEAD
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
=======
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop/types';

// دالة مساعدة لإنشاء صورة من رابط
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

// دالة معالجة قص الصورة وتحويلها إلى Blob
const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('No 2d context');

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, 'image/jpeg');
  });
};
>>>>>>> parent of d96390a (Cleanup commits)

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // حالات أداة القص
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const cropperRef = useRef<any>(null);
  
  const [formData, setFormData] = useState({
    first_name: '',
    father_name: '',
    grandfather_name: '',
    great_grandfather_name: '',
    gender: '',
    date_of_birth: '',
    mother_name: '',
    mother_father_name: '',
    mother_grandfather_name: '',
    district: '',
    sub_district: '',
    neighborhood: '',
    mahalla: '',
    alley: '',
    house_number: '',
    place_of_birth: '',
    marital_status: '',
    mobile_number: '',
    religion: '',
    ethnicity: '',
    father_life_status: '',
    is_gov_employee: '',
    gov_department: '',
    national_id_number: '',
    national_id_date: '',
    national_id_issuer: '',
    residence_card_number: '',
    residence_card_date: '',
    residence_card_issuer: '',
    previous_school_name: '',
    education_directorate: '',
    photo_url: '',
    application_type: '',
  });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setFetching(false);
      return;
    }

    // تنظيف روابط الصور المؤقتة لمنع تسرب الذاكرة
    return () => {
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      checkUser();
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const validateForm = () => {
    const errors: Record<string, boolean> = {};
    const requiredFields = [
      'application_type', 'first_name', 'father_name', 'grandfather_name', 
      'great_grandfather_name', 'gender', 'date_of_birth', 'place_of_birth', 
      'marital_status', 'mobile_number', 'religion', 'ethnicity', 
      'father_life_status', 'is_gov_employee', 'national_id_number', 
      'national_id_date', 'national_id_issuer', 'residence_card_number', 
      'residence_card_date', 'residence_card_issuer', 'mother_name', 
      'mother_father_name', 'mother_grandfather_name', 'district', 
      'sub_district', 'neighborhood', 'previous_school_name', 'education_directorate'
    ];

    requiredFields.forEach(field => {
      if (!formData[field as keyof typeof formData]) errors[field] = true;
    });

    if (formData.is_gov_employee === 'نعم' && !formData.gov_department) errors.gov_department = true;
    if (!photoPreview) errors.photo = true;

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const inputClass = (field: string) => `mt-2 block w-full py-3 px-4 border rounded-xl shadow-sm transition-all duration-300 text-sm ${
    formErrors[field] ? 'border-red-400 bg-red-50/50 ring-4 ring-red-500/10 focus:border-red-500 focus:ring-red-500/20 animate-shake' : 'border-slate-200 bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'
  }`;

  const renderNoConfig = () => (
    <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
              </div> 
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-yellow-800">إعدادات قاعدة البيانات مفقودة</h3>
              </div>
            </div>
          </div>
        </div>
  );

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate('/');
  }, [navigate]);

  const checkUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }
      setUserId(user.id);

      if (user.id) {
        setUserId(user.id);
      }

      // Fetch user profile to determine role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found (expected if no profile yet)
        console.error('Error fetching profile:', profileError);
        await handleLogout(); // Log out if there's a serious error fetching profile
        return;
      }

      if (!profile) {
        // User exists in auth.users but not in profiles table.
        // This means they are not a registered student or admin. Log out.
        await handleLogout();
        return;
      }

      // 2. التحقق مما إذا كان المستخدم طالباً مسجلاً بالفعل
      const { data: studentRecord } = await supabase
        .from('student_registrations')
        .select('*')
        .eq('student_id', user.id)
        .single();

      if (studentRecord) {
        setFormData({
          first_name: studentRecord.first_name || '',
          father_name: studentRecord.father_name || '',
          grandfather_name: studentRecord.grandfather_name || '',
          great_grandfather_name: studentRecord.great_grandfather_name || '',
          gender: studentRecord.gender || '',
          date_of_birth: studentRecord.date_of_birth || '',
          mother_name: studentRecord.mother_name || '',
          mother_father_name: studentRecord.mother_father_name || '',
          mother_grandfather_name: studentRecord.mother_grandfather_name || '',
          district: studentRecord.district || '',
          sub_district: studentRecord.sub_district || '',
          neighborhood: studentRecord.neighborhood || '',
          mahalla: studentRecord.mahalla || '',
          alley: studentRecord.alley || '',
          house_number: studentRecord.house_number || '',
          place_of_birth: studentRecord.place_of_birth || '',
          marital_status: studentRecord.marital_status || '',
          mobile_number: studentRecord.mobile_number || '',
          religion: studentRecord.religion || '',
          ethnicity: studentRecord.ethnicity || '',
          father_life_status: studentRecord.father_life_status || '',
          is_gov_employee: studentRecord.is_gov_employee || '',
          gov_department: studentRecord.gov_department || '',
          national_id_number: studentRecord.national_id_number || '',
          national_id_date: studentRecord.national_id_date || '',
          national_id_issuer: studentRecord.national_id_issuer || '',
          residence_card_number: studentRecord.residence_card_number || '',
          residence_card_date: studentRecord.residence_card_date || '',
          residence_card_issuer: studentRecord.residence_card_issuer || '',
          previous_school_name: studentRecord.previous_school_name || '',
          education_directorate: studentRecord.education_directorate || '',
          photo_url: studentRecord.photo_url || '',
          application_type: studentRecord.application_type || '',
        });
        if (studentRecord.photo_url) {
          setPhotoPreview(studentRecord.photo_url);
        }
        setSuccess(true); // Indicate that data was loaded successfully
      } else {
        // Student profile exists, but no registration record.
        // They should be allowed to fill the form.
        setSuccess(false); // Ensure success state is false for new registrations
      }

      // Handle role-based redirection after fetching student data
      if (profile.role === 'admin') {
        navigate('/admin'); // Redirect admin to admin dashboard
        return;
      } else if (profile.role !== 'student') {
        // If role is not 'student' (and not 'admin' which was handled above), log out.
        await handleLogout();
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setFetching(false);
    }
  }, [navigate, handleLogout]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // تفاعلي: إزالة التنبيه الأحمر بمجرد بدء الطالب في إدخال البيانات
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: false }));
    }
  }, [formErrors]);

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/jpeg' && file.type !== 'image/jpg') {
      setError('يجب أن تكون صيغة الصورة المرفوعة JPG فقط');
      setPhotoFile(null);
      e.target.value = '';
      return;
    }

    if (file.size > 500 * 1024) {
      setError('يجب أن يكون حجم الصورة أقل أو يساوي 500 كيلوبايت');
      setPhotoFile(null);
      e.target.value = '';
      return;
    }
    
    setError(null);
    const imageUrl = URL.createObjectURL(file);
    setTempImage(imageUrl);
    setShowCropper(true);
  }, []);

  const handleCropSave = async () => {
<<<<<<< HEAD
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
=======
    try {
      if (tempImage && croppedAreaPixels) {
        const croppedBlob = await getCroppedImg(tempImage, croppedAreaPixels);
        const croppedFile = new File([croppedBlob], 'photo.jpg', { type: 'image/jpeg' });
        
        if (photoPreview && photoPreview.startsWith('blob:')) {
          URL.revokeObjectURL(photoPreview);
        }
>>>>>>> parent of d96390a (Cleanup commits)

    try {
      const canvas = cropper.getCroppedCanvas({
        width: 350,
        height: 450,
        imageSmoothingQuality: 'high',
      });

      canvas.toBlob((blob) => {
        if (blob) {
          if (photoPreview && photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
          
          setPhotoFile(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
          setPhotoPreview(URL.createObjectURL(blob));
          setShowCropper(false);
          setTempImage(null);
          setFormErrors(prev => ({ ...prev, photo: false }));
        }
      }, 'image/jpeg', 0.9);
    } catch (e) {
      console.error(e);
      setError('حدث خطأ أثناء معالجة الصورة');
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setTempImage(null);
    const fileInput = document.getElementById('photo') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const removePhoto = useCallback(() => {
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview(null);
    setFormData(prev => ({ ...prev, photo_url: '' }));
    const fileInput = document.getElementById('photo') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }, [photoPreview]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (!validateForm()) {
      showToast('يرجى إكمال جميع الحقول المطلوبة المميزة باللون الأحمر', 'error');
      setLoading(false);
      return;
    }

    try {
      let finalPhotoUrl = formData.photo_url;

      // Upload photo if a new one is selected
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${userId}-${Math.random()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('student_photos')
          .upload(filePath, photoFile, { upsert: true });

        if (uploadError) throw new Error('فشل رفع الصورة، يرجى المحاولة مرة أخرى');

        const { data: { publicUrl } } = supabase.storage
          .from('student_photos')
          .getPublicUrl(filePath);

        finalPhotoUrl = publicUrl;
      }

      const { error: dbError } = await supabase
        .from('student_registrations')
        .upsert({
          ...formData,
          student_id: userId,
          photo_url: finalPhotoUrl,
          // ضمان مطابقة قيد gov_employee_logic: إذا كان ليس موظفاً، يجب أن يكون القسم نصاً فارغاً
          gov_department: formData.is_gov_employee === 'لا' ? '' : formData.gov_department,
        }, { onConflict: 'student_id' });

      if (dbError) {
        throw dbError;
      }
      
      setFormData(prev => ({ ...prev, photo_url: finalPhotoUrl }));
      showToast('تم حفظ البيانات بنجاح');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء حفظ البيانات', 'error');
    } finally {
      setLoading(false);
    }
  }, [formData, photoFile, userId]);

  if (fetching) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-cairo" dir="rtl">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-600 font-bold text-lg">جاري التحميل...</p>
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-cairo" dir="rtl">
        {renderNoConfig()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-cairo" dir="rtl">
      {/* Toast Notification Component */}
{toast && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex flex-col w-full max-w-sm sm:min-w-[340px] sm:max-w-md overflow-hidden rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] border backdrop-blur-2xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-8 ${
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

      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="w-10 h-10 object-contain" />
              <h1 className="text-xl font-bold text-slate-900">لوحة الطالب</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                type="button"
                className="inline-flex items-center px-4 py-2 border border-slate-200 text-sm font-medium rounded-xl text-slate-600 bg-white hover:bg-slate-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-sm"
              >
                <LogOut className="ml-2 h-4 w-4" />
                تسجيل خروج
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* واجهة قص الصورة (Modal) */}
      {showCropper && tempImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4 sm:p-6">
          <div className="bg-white rounded-xl overflow-hidden w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Scissors className="ml-2 h-5 w-5 text-blue-600" />
                تعديل قياس الصورة
              </h3>
            </div>
            <div className="relative flex-1 w-full mx-auto bg-gray-900 overflow-hidden min-h-[350px]">
              <Cropper
                src={tempImage}
                style={{ height: 400, width: "100%" }}
                initialAspectRatio={3.5 / 4.5}
                aspectRatio={3.5 / 4.5}
                guides={true}
                ref={cropperRef}
                viewMode={1}
                dragMode="move"
                background={false}
                responsive={true}
                checkOrientation={false}
              />
            </div>

            <div className="p-4 flex justify-end border-t space-x-3 space-x-reverse">
              <button onClick={handleCropCancel} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium">إلغاء</button>
              <button onClick={handleCropSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors">اعتماد الصورة</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto py-10 sm:px-6 lg:px-8">
        <div className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden sm:rounded-[2rem]">
          <div className="px-4 py-8 sm:px-10 border-b border-slate-100 bg-gradient-to-l from-slate-50 to-white">
            <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600">
              نموذج تسجيل الطلبة
            </h3>
            <p className="mt-2 max-w-2xl text-base text-slate-500">
              يرجى إدخال المعلومات الشخصية والدراسية بعناية لضمان دقة التسجيل.
            </p>
          </div>
          
          <div className="px-4 py-6 sm:p-8">
            {error && (
              <div className="mb-6 flex items-center p-4 text-red-800 border-r-4 border-red-500 rounded-2xl bg-red-50/50 backdrop-blur-sm shadow-sm animate-in fade-in duration-300">
                <AlertTriangle className="flex-shrink-0 w-5 h-5 ml-3" />
                <div className="text-sm font-bold">{error}</div>
              </div>
            )}
            
            {success && (
              <div className="mb-6 flex items-center p-4 text-emerald-800 border-r-4 border-emerald-500 rounded-2xl bg-emerald-50/50 backdrop-blur-sm shadow-sm animate-in fade-in duration-300">
                <CheckCircle className="flex-shrink-0 w-5 h-5 ml-3" />
                <div className="text-sm font-bold">تم حفظ بيانات التسجيل بنجاح.</div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                
                {/* Application Type */}
                <div className="sm:col-span-2">
                  <h4 className="text-lg font-bold text-slate-800 border-r-4 border-blue-600 pr-3 py-2 bg-slate-50/50 rounded-l-xl mb-4">نوع التقديم</h4>
                </div>
                
                <div className="sm:col-span-2">
                  <label htmlFor="application_type" className="block text-sm font-black text-slate-700 mb-1 mr-1">
                    المرحلة الدراسية المراد التقديم إليها <span className="text-red-500 mr-1">*</span>
                  </label>
                  <select id="application_type" name="application_type" value={formData.application_type} onChange={handleChange} className={inputClass('application_type')}>
                    <option value="" disabled>اختر...</option>
                    {APPLICATION_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {formErrors.application_type && <p className="mt-1.5 text-[10px] font-bold text-red-500 flex items-center animate-in slide-in-from-right-1"><AlertTriangle className="w-3 h-3 ml-1" /> هذا الحقل مطلوب</p>}
                </div>

                {/* Section Separator */}
                <div className="sm:col-span-2">
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent w-full my-1"></div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-black text-slate-700 mb-1 mr-1">
                    الصورة الشخصية الرسمية <span className="text-red-500 mr-1">*</span>
                  </label>
                  <div className="mt-2 flex flex-col md:flex-row gap-6 items-stretch">
                    <label 
                      htmlFor="photo" 
                      className={`relative flex-shrink-0 h-44 w-32 cursor-pointer border-2 border-dashed rounded-2xl overflow-hidden flex items-center justify-center transition-all group ${formErrors.photo ? 'border-red-400 bg-red-50/30 ring-4 ring-red-500/5' : 'border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 hover:shadow-xl hover:shadow-blue-500/10'}`}
                    >
                      {photoPreview ? (
                        <>
                          <img src={photoPreview} alt="صورة الطالب" className="h-full w-full object-cover shadow-inner" loading="lazy" />
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="h-8 w-8 text-slate-300 group-hover:text-blue-400 group-hover:scale-110 transition-all" />
                          <span className="text-[10px] font-black text-slate-400 group-hover:text-blue-500">اضغط للرفع</span>
                        </div>
                      )}
                    </label>

                    <div className="flex-1 bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-inner relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/20"></div>
                      <h5 className="flex items-center text-xs font-black text-slate-700 mb-3">
                        <Info className="w-4 h-4 ml-2 text-blue-600" />
                        تعليمات الصورة الشخصية:
                      </h5>
                      <ul className="space-y-3 text-[14px] text-slate-600 leading-normal">
                        <li className="flex items-start"><span className="ml-2 text-blue-500 flex-shrink-0 mt-1.5">•</span> <span>يجب أن تكون ملونة وصيغتها <span className="font-bold text-slate-900">JPG</span> بحجم لا يتجاوز <span className="font-bold text-red-600 whitespace-nowrap" dir="ltr">500 KB</span>.</span></li>
                        <li className="flex items-start"><span className="ml-2 text-blue-500 flex-shrink-0 mt-1.5">•</span> <span>أبعاد عمودية <span className="font-bold text-slate-900 whitespace-nowrap" dir="ltr">(400x600)</span> بكسل كحد أدنى مع تغطية الوجه لـ <span className="font-bold text-slate-900 whitespace-nowrap" dir="ltr">70% - 80%</span> من المساحة.</span></li>
                        <li className="flex items-start"><span className="ml-2 text-blue-500 flex-shrink-0 mt-1.5">•</span> <span>التقطت خلال آخر <span className="font-bold text-slate-900">6 أشهر</span> وبخلفية بيضاء ساطعة ومتناسقة.</span></li>
                        <li className="flex items-start"><span className="ml-2 text-blue-500 flex-shrink-0 mt-1.5">•</span> <span>الوجه باتجاه الكاميرا مباشرة، العينان مفتوحتان، وبدون تعبيرات خاصة.</span></li>
                        <li className="flex items-start"><span className="ml-2 text-blue-500 flex-shrink-0 mt-1.5">•</span> <span>الالتزام بالملابس اليومية العادية (تجنب الزي العسكري، الديني، أو التقليدي).</span></li>
                        <li className="flex items-start"><span className="ml-2 text-blue-500 flex-shrink-0 mt-1.5">•</span> <span>تُرفض الصور الممسوحة ضوئياً (Scanner) أو المأخوذة من الجواز/الرخصة أو صور الموبايل ضعيفة الجودة.</span></li>
                      </ul>
                      
                      {formErrors.photo && (
                        <div className="mt-3 flex items-center gap-2 p-2 bg-red-100/50 rounded-xl animate-shake">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          <span className="text-[10px] font-black text-red-600">يرجى رفع صورة مطابقة للتعليمات</span>
                        </div>
                      )}
                    </div>

                    <input
                      type="file"
                      id="photo"
                      name="photo"
                      accept=".jpg,.jpeg"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Section Separator */}
                <div className="sm:col-span-2">
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent w-full my-1"></div>
                </div>

                {/* Personal Info */}
                <div className="sm:col-span-2">
                  <h4 className="text-lg font-bold text-slate-800 border-r-4 border-blue-600 pr-3 py-2 bg-slate-50/50 rounded-l-xl mb-4">البيانات الشخصية</h4>
                </div>

                <div>
                  <label htmlFor="first_name" className="block text-sm font-black text-slate-700 mb-1 mr-1">الاسم الأول <span className="text-red-500 mr-1">*</span></label>
                  <input type="text" name="first_name" id="first_name" maxLength={100} value={formData.first_name} onChange={handleChange} className={inputClass('first_name')} />
                  {formErrors.first_name && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                <div>
                  <label htmlFor="father_name" className="block text-sm font-black text-slate-700 mb-1 mr-1">اسم الأب <span className="text-red-500 mr-1">*</span></label>
                  <input type="text" name="father_name" id="father_name" maxLength={100} value={formData.father_name} onChange={handleChange} className={inputClass('father_name')} />
                  {formErrors.father_name && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                <div>
                  <label htmlFor="grandfather_name" className="block text-sm font-black text-slate-700 mb-1 mr-1">اسم الجد <span className="text-red-500 mr-1">*</span></label>
                  <input type="text" name="grandfather_name" id="grandfather_name" maxLength={100} value={formData.grandfather_name} onChange={handleChange} className={inputClass('grandfather_name')} />
                  {formErrors.grandfather_name && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                <div>
                  <label htmlFor="great_grandfather_name" className="block text-sm font-black text-slate-700 mb-1 mr-1">اسم والد الجد <span className="text-red-500 mr-1">*</span></label>
                  <input type="text" name="great_grandfather_name" id="great_grandfather_name" maxLength={100} value={formData.great_grandfather_name} onChange={handleChange} className={inputClass('great_grandfather_name')} />
                  {formErrors.great_grandfather_name && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-black text-slate-700 mb-1 mr-1">الجنس <span className="text-red-500 mr-1">*</span></label>
                  <select id="gender" name="gender" value={formData.gender} onChange={handleChange} className={inputClass('gender')}>
                    <option value="" disabled>اختر...</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                  {formErrors.gender && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                <div>
                  <label htmlFor="date_of_birth" className="block text-sm font-black text-slate-700 mb-1 mr-1">تاريخ الميلاد <span className="text-red-500 mr-1">*</span></label>
                  <input type="date" name="date_of_birth" id="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className={inputClass('date_of_birth')} />
                  {formErrors.date_of_birth && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                {/* Section Separator */}
                <div className="sm:col-span-2">
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent w-full my-1"></div>
                </div>

                {/* Additional Personal Info */}
                <div className="sm:col-span-2">
                  <h4 className="text-lg font-bold text-slate-800 border-r-4 border-blue-600 pr-3 py-2 bg-slate-50/50 rounded-l-xl mb-4">معلومات شخصية إضافية</h4>
                </div>

                <div>
                  <label htmlFor="place_of_birth" className="block text-sm font-black text-slate-700 mb-1 mr-1">محل الولادة <span className="text-red-500 mr-1">*</span></label>
                  <select id="place_of_birth" name="place_of_birth" value={formData.place_of_birth} onChange={handleChange} className={inputClass('place_of_birth')}>
                    <option value="" disabled>اختر...</option>
                    <option value="بغداد">بغداد</option>
                    <option value="البصرة">البصرة</option>
                    <option value="النجف الاشرف">النجف الاشرف</option>
                    <option value="كربلاء المقدسة">كربلاء المقدسة</option>
                    <option value="بابل">بابل</option>
                    <option value="واسط">واسط</option>
                    <option value="ميسان">ميسان</option>
                    <option value="ذي قار">ذي قار</option>
                    <option value="المثنى">المثنى</option>
                    <option value="القادسية">القادسية</option>
                    <option value="الأنبار">الأنبار</option>
                    <option value="ديالى">ديالى</option>
                    <option value="صلاح الدين">صلاح الدين</option>
                    <option value="نينوى">نينوى</option>
                    <option value="كركوك">كركوك</option>
                    <option value="أربيل">أربيل</option>
                    <option value="السليمانية">السليمانية</option>
                    <option value="دهوك">دهوك</option>
                  </select>
                  {formErrors.place_of_birth && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                <div>
                  <label htmlFor="marital_status" className="block text-sm font-black text-slate-700 mb-1 mr-1">الحالة الاجتماعية <span className="text-red-500 mr-1">*</span></label>
                  <select id="marital_status" name="marital_status" value={formData.marital_status} onChange={handleChange} className={inputClass('marital_status')}>
                    <option value="" disabled>اختر...</option>
                    <option value="متزوج">متزوج</option>
                    <option value="باكر">باكر</option>
                    <option value="مطلق">مطلق</option>
                    <option value="ارمل">ارمل</option>
                  </select>
                  {formErrors.marital_status && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                <div>
                  <label htmlFor="mobile_number" className="block text-sm font-black text-slate-700 mb-1 mr-1">رقم الموبايل <span className="text-red-500 mr-1">*</span></label>
                  <input type="tel" name="mobile_number" id="mobile_number" pattern="^07[0-9]{9}$" title="يجب أن يبدأ بـ 07 ويتكون من 11 رقم" placeholder="07XXXXXXXXX" value={formData.mobile_number} onChange={handleChange} className={inputClass('mobile_number')} dir="ltr" />
                  {formErrors.mobile_number && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                <div>
                  <label htmlFor="religion" className="block text-sm font-black text-slate-700 mb-1 mr-1">الديانة <span className="text-red-500 mr-1">*</span></label>
                  <select id="religion" name="religion" value={formData.religion} onChange={handleChange} className={inputClass('religion')}>
                    <option value="" disabled>اختر...</option>
                    <option value="مسلم">مسلم</option>
                    <option value="مسيحي">مسيحي</option>
                    <option value="صابئي">صابئي</option>
                    <option value="ايزيدي">ايزيدي</option>
                  </select>
                  {formErrors.religion && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                <div>
                  <label htmlFor="ethnicity" className="block text-sm font-black text-slate-700 mb-1 mr-1">القومية <span className="text-red-500 mr-1">*</span></label>
                  <select id="ethnicity" name="ethnicity" value={formData.ethnicity} onChange={handleChange} className={inputClass('ethnicity')}>
                    <option value="" disabled>اختر...</option>
                    <option value="عربي">عربي</option>
                    <option value="كردي">كردي</option>
                    <option value="تركماني">تركماني</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                  {formErrors.ethnicity && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                <div>
                  <label htmlFor="father_life_status" className="block text-sm font-black text-slate-700 mb-1 mr-1">الحالة الحياتية للأب <span className="text-red-500 mr-1">*</span></label>
                  <select id="father_life_status" name="father_life_status" value={formData.father_life_status} onChange={handleChange} className={inputClass('father_life_status')}>
                    <option value="" disabled>اختر...</option>
                    <option value="حي">حي</option>
                    <option value="متوفي">متوفي</option>
                  </select>
                  {formErrors.father_life_status && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                <div>
                  <label htmlFor="is_gov_employee" className="block text-sm font-black text-slate-700 mb-1 mr-1">هل أنت موظف حكومي؟ <span className="text-red-500 mr-1">*</span></label>
                  <select id="is_gov_employee" name="is_gov_employee" value={formData.is_gov_employee} onChange={handleChange} className={inputClass('is_gov_employee')}>
                    <option value="" disabled>اختر...</option>
                    <option value="نعم">نعم</option>
                    <option value="لا">لا</option>
                  </select>
                  {formErrors.is_gov_employee && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                {formData.is_gov_employee === 'نعم' && (
                  <div>
                    <label htmlFor="gov_department" className="block text-sm font-black text-slate-700 mb-1 mr-1">اسم الدائرة الحكومية <span className="text-red-500 mr-1">*</span></label>
                    <input type="text" name="gov_department" id="gov_department" maxLength={150} value={formData.gov_department} onChange={handleChange} className={inputClass('gov_department')} />
                    {formErrors.gov_department && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                  </div>
                )}

                {/* Section Separator */}
                <div className="sm:col-span-2">
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent w-full my-1"></div>
                </div>

                {/* National ID Info */}
                <div className="sm:col-span-2">
                  <h4 className="text-lg font-bold text-slate-800 border-r-4 border-blue-600 pr-3 py-2 bg-slate-50/50 rounded-l-xl mb-4">معلومات البطاقة الوطنية الموحدة</h4>
                </div>

                <div>
                  <label htmlFor="national_id_number" className="block text-sm font-black text-slate-700 mb-1 mr-1">رقم البطاقة الموحدة <span className="text-red-500 mr-1">*</span></label>
                  <input type="text" name="national_id_number" id="national_id_number" pattern="^[0-9]{12}$" title="يجب أن يتكون رقم البطاقة الموحدة من 12 رقماً" placeholder="123456789012" value={formData.national_id_number} onChange={handleChange} className={inputClass('national_id_number')} dir="ltr" />
                  {formErrors.national_id_number && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                <div>
                  <label htmlFor="national_id_date" className="block text-sm font-black text-slate-700 mb-1 mr-1">تاريخ الإصدار <span className="text-red-500 mr-1">*</span></label>
                  <input type="date" name="national_id_date" id="national_id_date" value={formData.national_id_date} onChange={handleChange} className={inputClass('national_id_date')} />
                  {formErrors.national_id_date && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                <div>
                  <label htmlFor="national_id_issuer" className="block text-sm font-black text-slate-700 mb-1 mr-1">جهة الإصدار <span className="text-red-500 mr-1">*</span></label>
                  <select id="national_id_issuer" name="national_id_issuer" value={formData.national_id_issuer} onChange={handleChange} className={inputClass('national_id_issuer')}>
                    <option value="" disabled>اختر...</option>
                    {NATIONAL_ID_ISSUERS.map(issuer => (
                      <option key={issuer} value={issuer}>{issuer}</option>
                    ))}
                  </select>
                  {formErrors.national_id_issuer && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                {/* Section Separator */}
                <div className="sm:col-span-2">
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent w-full my-1"></div>
                </div>

                {/* Residence Card Info */}
                <div className="sm:col-span-2">
                  <h4 className="text-lg font-bold text-slate-800 border-r-4 border-blue-600 pr-3 py-2 bg-slate-50/50 rounded-l-xl mb-4">معلومات بطاقة السكن</h4>
                </div>

                <div>
                  <label htmlFor="residence_card_number" className="block text-sm font-black text-slate-700 mb-1 mr-1">رقم بطاقة السكن <span className="text-red-500 mr-1">*</span></label>
                  <input type="text" name="residence_card_number" id="residence_card_number" value={formData.residence_card_number} onChange={handleChange} className={inputClass('residence_card_number')} dir="ltr" />
                  {formErrors.residence_card_number && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                <div>
                  <label htmlFor="residence_card_date" className="block text-sm font-black text-slate-700 mb-1 mr-1">تاريخ بطاقة السكن <span className="text-red-500 mr-1">*</span></label>
                  <input type="date" name="residence_card_date" id="residence_card_date" value={formData.residence_card_date} onChange={handleChange} className={inputClass('residence_card_date')} />
                  {formErrors.residence_card_date && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                <div>
                  <label htmlFor="residence_card_issuer" className="block text-sm font-black text-slate-700 mb-1 mr-1">جهة الإصدار <span className="text-red-500 mr-1">*</span></label>
                  <select id="residence_card_issuer" name="residence_card_issuer" value={formData.residence_card_issuer} onChange={handleChange} className={inputClass('residence_card_issuer')}>
                    <option value="" disabled>اختر...</option>
                    {RESIDENCE_CARD_ISSUERS.map(issuer => (
                      <option key={issuer} value={issuer}>{issuer}</option>
                    ))}
                  </select>
                  {formErrors.residence_card_issuer && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                {/* Section Separator */}
                <div className="sm:col-span-2">
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent w-full my-1"></div>
                </div>

                {/* Mother's Info */}
                <div className="sm:col-span-2">
                  <h4 className="text-lg font-bold text-slate-800 border-r-4 border-blue-600 pr-3 py-2 bg-slate-50/50 rounded-l-xl mb-4">بيانات الأم</h4>
                </div>

                <div>
                  <label htmlFor="mother_name" className="block text-sm font-black text-slate-700 mb-1 mr-1">اسم الأم <span className="text-red-500 mr-1">*</span></label>
                  <input type="text" name="mother_name" id="mother_name" value={formData.mother_name} onChange={handleChange} className={inputClass('mother_name')} />
                  {formErrors.mother_name && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                <div>
                  <label htmlFor="mother_father_name" className="block text-sm font-black text-slate-700 mb-1 mr-1">اسم والد الأم <span className="text-red-500 mr-1">*</span></label>
                  <input type="text" name="mother_father_name" id="mother_father_name" value={formData.mother_father_name} onChange={handleChange} className={inputClass('mother_father_name')} />
                  {formErrors.mother_father_name && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                <div>
                  <label htmlFor="mother_grandfather_name" className="block text-sm font-black text-slate-700 mb-1 mr-1">اسم جد الأم <span className="text-red-500 mr-1">*</span></label>
                  <input type="text" name="mother_grandfather_name" id="mother_grandfather_name" value={formData.mother_grandfather_name} onChange={handleChange} className={inputClass('mother_grandfather_name')} />
                  {formErrors.mother_grandfather_name && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                {/* Section Separator */}
                <div className="sm:col-span-2">
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent w-full my-1"></div>
                </div>

                {/* Address Info */}
                <div className="sm:col-span-2">
                  <h4 className="text-lg font-bold text-slate-800 border-r-4 border-blue-600 pr-3 py-2 bg-slate-50/50 rounded-l-xl mb-4">عنوان السكن</h4>
                </div>

                <div>
                  <label htmlFor="district" className="block text-sm font-black text-slate-700 mb-1 mr-1">القضاء <span className="text-red-500 mr-1">*</span></label>
                  <select id="district" name="district" value={formData.district} onChange={handleChange} className={inputClass('district')}>
                    <option value="" disabled>اختر...</option>
                    <option value="النجف">النجف</option>
                    <option value="الكوفة">الكوفة</option>
                    <option value="المناذرة">المناذرة</option>
                    <option value="المشخاب">المشخاب</option>
                  </select>
                  {formErrors.district && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                <div>
                  <label htmlFor="sub_district" className="block text-sm font-black text-slate-700 mb-1 mr-1">الناحية <span className="text-red-500 mr-1">*</span></label>
                  <select id="sub_district" name="sub_district" value={formData.sub_district} onChange={handleChange} className={inputClass('sub_district')}>
                    <option value="" disabled>اختر...</option>
                    <option value="مركز النجف">مركز النجف</option>
                    <option value="الحيدرية">الحيدرية</option>
                    <option value="الرضوية">الرضوية</option>
                    <option value="الشبكة">الشبكة</option>
                    <option value="بانيقيا">بانيقيا</option>
                    <option value="مركز الكوفة">مركز الكوفة</option>
                    <option value="العباسية">العباسية</option>
                    <option value="الحرية">الحرية</option>
                    <option value="مركز المناذرة">مركز المناذرة</option>
                    <option value="الحيرة">الحيرة</option>
                    <option value="مركز المشخاب">مركز المشخاب</option>
                    <option value="القادسية">القادسية</option>
                  </select>
                  {formErrors.sub_district && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                <div>
                  <label htmlFor="neighborhood" className="block text-sm font-black text-slate-700 mb-1 mr-1">اسم الحي <span className="text-red-500 mr-1">*</span></label>
                  <input type="text" name="neighborhood" id="neighborhood" value={formData.neighborhood} onChange={handleChange} className={inputClass('neighborhood')} />
                  {formErrors.neighborhood && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                <div>
                  <label htmlFor="mahalla" className="block text-sm font-black text-slate-700 mb-1 mr-1">محلة</label>
                  <input type="text" name="mahalla" id="mahalla" value={formData.mahalla} onChange={handleChange} className="mt-2 block w-full py-3 px-4 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>

                <div>
                  <label htmlFor="alley" className="block text-sm font-black text-slate-700 mb-1 mr-1">زقاق</label>
                  <input type="text" name="alley" id="alley" value={formData.alley} onChange={handleChange} className="mt-2 block w-full py-3 px-4 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>

                <div>
                  <label htmlFor="house_number" className="block text-sm font-black text-slate-700 mb-1 mr-1">دار</label>
                  <input type="text" name="house_number" id="house_number" value={formData.house_number} onChange={handleChange} className="mt-2 block w-full py-3 px-4 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>

                {/* Section Separator */}
                <div className="sm:col-span-2">
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent w-full my-1"></div>
                </div>

                {/* Previous Education Info */}
                <div className="sm:col-span-2">
                  <h4 className="text-lg font-bold text-slate-800 border-r-4 border-blue-600 pr-3 py-2 bg-slate-50/50 rounded-l-xl mb-4">معلومات الدراسة السابقة</h4>
                </div>

                <div>
                  <label htmlFor="previous_school_name" className="block text-sm font-black text-slate-700 mb-1 mr-1">اسم آخر مدرسة كان فيها الطالب <span className="text-red-500 mr-1">*</span></label>
                  <input type="text" name="previous_school_name" id="previous_school_name" value={formData.previous_school_name} onChange={handleChange} className={inputClass('previous_school_name')} />
                  {formErrors.previous_school_name && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

                <div>
                  <label htmlFor="education_directorate" className="block text-sm font-black text-slate-700 mb-1 mr-1">المديرية العامة التابعة لها المدرسة <span className="text-red-500 mr-1">*</span></label>
                  <select id="education_directorate" name="education_directorate" value={formData.education_directorate} onChange={handleChange} className={inputClass('education_directorate')}>
                    <option value="" disabled>اختر...</option>
                    {EDUCATION_DIRECTORATES.map(directorate => (
                      <option key={directorate} value={directorate}>{directorate}</option>
                    ))}
                  </select>
                  {formErrors.education_directorate && <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 ml-1" /> مطلوب</p>}
                </div>

              </div>

              <div className="pt-8 mt-8 border-t border-slate-100">
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="ml-3 inline-flex justify-center py-3.5 px-8 border border-transparent shadow-lg shadow-blue-500/25 text-base font-bold rounded-2xl text-white bg-blue-600 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-300"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                        جاري الحفظ...
                      </div>
                    ) : (
                      <>
                        <Save className="ml-2 h-5 w-5" />
                        حفظ البيانات
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
