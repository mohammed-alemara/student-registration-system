import React, { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogOut, Save, CheckCircle, AlertTriangle, Upload, X, Scissors } from 'lucide-react';
import { NATIONAL_ID_ISSUERS, RESIDENCE_CARD_ISSUERS, EDUCATION_DIRECTORATES, APPLICATION_TYPES } from '../lib/constants';
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

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // حالات أداة القص
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  
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
  }, []);

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

  const onCropComplete = useCallback((_sharedArea: Area, bypassedAreaPixels: Area) => {
    setCroppedAreaPixels(bypassedAreaPixels);
  }, []);

  const handleCropSave = async () => {
    try {
      if (tempImage && croppedAreaPixels) {
        const croppedBlob = await getCroppedImg(tempImage, croppedAreaPixels);
        const croppedFile = new File([croppedBlob], 'photo.jpg', { type: 'image/jpeg' });
        
        if (photoPreview && photoPreview.startsWith('blob:')) {
          URL.revokeObjectURL(photoPreview);
        }

        setPhotoFile(croppedFile);
        setPhotoPreview(URL.createObjectURL(croppedBlob));
        setShowCropper(false);
        setTempImage(null);
      }
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
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setLoading(false);
    }
  }, [formData, photoFile, userId]);

  if (fetching) {
    return <div className="min-h-screen flex items-center justify-center" dir="rtl">جاري التحميل...</div>;
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8" dir="rtl">
        {renderNoConfig()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">لوحة الطالب</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="bg-white rounded-xl overflow-hidden w-full max-w-lg shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <Scissors className="ml-2 h-5 w-5 text-blue-600" />
                تعديل قياس الصورة
              </h3>
            </div>
            <div className="relative h-80 w-full bg-gray-200">
              <Cropper
                image={tempImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="p-4 flex justify-end space-x-3 space-x-reverse">
              <button onClick={handleCropCancel} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium">إلغاء</button>
              <button onClick={handleCropSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors">اعتماد الصورة</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto py-10 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg overflow-hidden sm:rounded-xl">
          <div className="px-4 py-6 sm:px-8 border-b border-gray-200">
            <h3 className="text-2xl font-extrabold text-gray-900">
              نموذج تسجيل الطلبة
            </h3>
            <p className="mt-2 max-w-2xl text-base text-gray-600">
              الرجاء تعبئة جميع البيانات المطلوبة بدقة.
            </p>
          </div>
          
          <div className="px-4 py-6 sm:p-8">
            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow-md">
                <p className="text-base text-red-700">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-lg shadow-md flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 ml-2" />
                <p className="text-sm text-green-700">تم حفظ بيانات التسجيل بنجاح.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                
                {/* Application Type */}
                <div className="sm:col-span-2">
                  <h4 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-4">نوع التقديم</h4>
                </div>
                
                <div className="sm:col-span-2">
                  <label htmlFor="application_type" className="block text-sm font-medium text-gray-800">نوع التقديم</label>
                  <select id="application_type" name="application_type" required value={formData.application_type} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    <option value="" disabled>اختر...</option>
                    {APPLICATION_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Photo Upload */}
                <div className="sm:col-span-2">
                  <h4 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-4">صورة الطالب/ة</h4>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-800">الصورة الشخصية (JPG فقط، الحد الأقصى 500KB)</label>
                  <div className="mt-1 flex items-center space-x-4 space-x-reverse">
                    <div className="relative flex-shrink-0 h-32 w-32 border-2 border-dashed border-blue-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center transition-all hover:border-blue-400 group">
                      {photoPreview ? (
                        <>
                          <img src={photoPreview} alt="صورة الطالب" className="h-full w-full object-cover shadow-inner" loading="lazy" />
                          <button
                            type="button"
                            onClick={removePhoto}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
                            title="حذف الصورة"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <Upload className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        id="photo"
                        name="photo"
                        accept=".jpg,.jpeg"
                        onChange={handlePhotoChange}
                        required={!formData.photo_url}
                        className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors duration-200"
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        يجب أن تكون الصورة واضحة وبخلفية بيضاء.
                      </p>
                    </div>
                  </div>
                </div>
                {/* Personal Info */}
                <div className="sm:col-span-2 mt-4">
                  <h4 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-4">البيانات الشخصية</h4>
                </div>

                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-800">الاسم الأول</label>
                  <input type="text" name="first_name" id="first_name" required maxLength={100} value={formData.first_name} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border transition-all duration-200" />
                </div>

                <div>
                  <label htmlFor="father_name" className="block text-sm font-medium text-gray-800">اسم الأب</label>
                  <input type="text" name="father_name" id="father_name" required maxLength={100} value={formData.father_name} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border transition-all duration-200" />
                </div>

                <div>
                  <label htmlFor="grandfather_name" className="block text-sm font-medium text-gray-800">اسم الجد</label>
                  <input type="text" name="grandfather_name" id="grandfather_name" required maxLength={100} value={formData.grandfather_name} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border transition-all duration-200" />
                </div>

                <div>
                  <label htmlFor="great_grandfather_name" className="block text-sm font-medium text-gray-800">اسم والد الجد</label>
                  <input type="text" name="great_grandfather_name" id="great_grandfather_name" required maxLength={100} value={formData.great_grandfather_name} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border transition-all duration-200" />
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-800">الجنس</label>
                  <select id="gender" name="gender" required value={formData.gender} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200">
                    <option value="" disabled>اختر...</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-800">تاريخ الميلاد</label>
                  <input type="date" name="date_of_birth" id="date_of_birth" required value={formData.date_of_birth} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border transition-all duration-200" />
                </div>

                {/* Additional Personal Info */}
                <div className="sm:col-span-2 mt-4">
                  <h4 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-4">معلومات شخصية إضافية</h4>
                </div>

                <div>
                  <label htmlFor="place_of_birth" className="block text-sm font-medium text-gray-800">محل الولادة</label>
                  <select id="place_of_birth" name="place_of_birth" required value={formData.place_of_birth} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200">
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
                </div>

                <div>
                  <label htmlFor="marital_status" className="block text-sm font-medium text-gray-800">الحالة الاجتماعية</label>
                  <select id="marital_status" name="marital_status" required value={formData.marital_status} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200">
                    <option value="" disabled>اختر...</option>
                    <option value="متزوج">متزوج</option>
                    <option value="باكر">باكر</option>
                    <option value="مطلق">مطلق</option>
                    <option value="ارمل">ارمل</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="mobile_number" className="block text-sm font-medium text-gray-800">رقم الموبايل</label>
                  <input type="tel" name="mobile_number" id="mobile_number" pattern="^07[0-9]{9}$" title="يجب أن يبدأ بـ 07 ويتكون من 11 رقم" placeholder="07XXXXXXXXX" required value={formData.mobile_number} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border transition-all duration-200" dir="ltr" />
                </div>

                <div>
                  <label htmlFor="religion" className="block text-sm font-medium text-gray-800">الديانة</label>
                  <select id="religion" name="religion" required value={formData.religion} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200">
                    <option value="" disabled>اختر...</option>
                    <option value="مسلم">مسلم</option>
                    <option value="مسيحي">مسيحي</option>
                    <option value="صابئي">صابئي</option>
                    <option value="ايزيدي">ايزيدي</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ethnicity" className="block text-sm font-medium text-gray-800">القومية</label>
                  <select id="ethnicity" name="ethnicity" required value={formData.ethnicity} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200">
                    <option value="" disabled>اختر...</option>
                    <option value="عربي">عربي</option>
                    <option value="كردي">كردي</option>
                    <option value="تركماني">تركماني</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="father_life_status" className="block text-sm font-medium text-gray-800">الحالة الحياتية للأب</label>
                  <select id="father_life_status" name="father_life_status" required value={formData.father_life_status} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200">
                    <option value="" disabled>اختر...</option>
                    <option value="حي">حي</option>
                    <option value="متوفي">متوفي</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="is_gov_employee" className="block text-sm font-medium text-gray-800">موظف حكومي</label>
                  <select id="is_gov_employee" name="is_gov_employee" required value={formData.is_gov_employee} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200">
                    <option value="" disabled>اختر...</option>
                    <option value="نعم">نعم</option>
                    <option value="لا">لا</option>
                  </select>
                </div>

                {formData.is_gov_employee === 'نعم' && (
                  <div>
                    <label htmlFor="gov_department" className="block text-sm font-medium text-gray-800">اسم الدائرة التي تعمل بها</label>
                    <input type="text" name="gov_department" id="gov_department" required={formData.is_gov_employee === 'نعم'} maxLength={150} value={formData.gov_department} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border transition-all duration-200" />
                  </div>
                )}

                {/* National ID Info */}
                <div className="sm:col-span-2 mt-4">
                  <h4 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-4">معلومات البطاقة الوطنية الموحدة</h4>
                </div>

                <div>
                  <label htmlFor="national_id_number" className="block text-sm font-medium text-gray-800">رقم البطاقة الموحدة</label>
                  <input type="text" name="national_id_number" id="national_id_number" pattern="^[0-9]{12}$" title="يجب أن يتكون رقم البطاقة الموحدة من 12 رقماً" placeholder="123456789012" required value={formData.national_id_number} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border transition-all duration-200" dir="ltr" />
                </div>

                <div>
                  <label htmlFor="national_id_date" className="block text-sm font-medium text-gray-800">تاريخ الإصدار</label>
                  <input type="date" name="national_id_date" id="national_id_date" required value={formData.national_id_date} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border transition-all duration-200" />
                </div>

                <div>
                  <label htmlFor="national_id_issuer" className="block text-sm font-medium text-gray-800">جهة الإصدار</label>
                  <select id="national_id_issuer" name="national_id_issuer" required value={formData.national_id_issuer} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200">
                    <option value="" disabled>اختر...</option>
                    {NATIONAL_ID_ISSUERS.map(issuer => (
                      <option key={issuer} value={issuer}>{issuer}</option>
                    ))}
                  </select>
                </div>

                {/* Residence Card Info */}
                <div className="sm:col-span-2 mt-4">
                  <h4 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-4">معلومات بطاقة السكن</h4>
                </div>

                <div>
                  <label htmlFor="residence_card_number" className="block text-sm font-medium text-gray-800">رقم بطاقة السكن</label>
                  <input type="text" name="residence_card_number" id="residence_card_number" required value={formData.residence_card_number} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border transition-all duration-200" dir="ltr" />
                </div>

                <div>
                  <label htmlFor="residence_card_date" className="block text-sm font-medium text-gray-800">تاريخ بطاقة السكن</label>
                  <input type="date" name="residence_card_date" id="residence_card_date" required value={formData.residence_card_date} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border transition-all duration-200" />
                </div>

                <div>
                  <label htmlFor="residence_card_issuer" className="block text-sm font-medium text-gray-800">جهة الإصدار</label>
                  <select id="residence_card_issuer" name="residence_card_issuer" required value={formData.residence_card_issuer} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200">
                    <option value="" disabled>اختر...</option>
                    {RESIDENCE_CARD_ISSUERS.map(issuer => (
                      <option key={issuer} value={issuer}>{issuer}</option>
                    ))}
                  </select>
                </div>

                {/* Mother's Info */}
                <div className="sm:col-span-2 mt-4">
                  <h4 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-4">بيانات الأم</h4>
                </div>

                <div>
                  <label htmlFor="mother_name" className="block text-sm font-medium text-gray-800">اسم الأم</label>
                  <input type="text" name="mother_name" id="mother_name" required value={formData.mother_name} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border transition-all duration-200" />
                </div>

                <div>
                  <label htmlFor="mother_father_name" className="block text-sm font-medium text-gray-800">اسم والد الأم</label>
                  <input type="text" name="mother_father_name" id="mother_father_name" required value={formData.mother_father_name} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border transition-all duration-200" />
                </div>

                <div>
                  <label htmlFor="mother_grandfather_name" className="block text-sm font-medium text-gray-800">اسم جد الأم</label>
                  <input type="text" name="mother_grandfather_name" id="mother_grandfather_name" required value={formData.mother_grandfather_name} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border transition-all duration-200" />
                </div>

                {/* Address Info */}
                <div className="sm:col-span-2 mt-4">
                  <h4 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-4">عنوان السكن</h4>
                </div>

                <div>
                  <label htmlFor="district" className="block text-sm font-medium text-gray-800">القضاء</label>
                  <select id="district" name="district" required value={formData.district} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200">
                    <option value="" disabled>اختر...</option>
                    <option value="النجف">النجف</option>
                    <option value="الكوفة">الكوفة</option>
                    <option value="المناذرة">المناذرة</option>
                    <option value="المشخاب">المشخاب</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="sub_district" className="block text-sm font-medium text-gray-800">الناحية</label>
                  <select id="sub_district" name="sub_district" required value={formData.sub_district} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200">
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
                </div>

                <div>
                  <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-800">اسم الحي</label>
                  <input type="text" name="neighborhood" id="neighborhood" required value={formData.neighborhood} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border transition-all duration-200" />
                </div>

                <div>
                  <label htmlFor="mahalla" className="block text-sm font-medium text-gray-800">محلة</label>
                  <input type="text" name="mahalla" id="mahalla" value={formData.mahalla} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border transition-all duration-200" />
                </div>

                <div>
                  <label htmlFor="alley" className="block text-sm font-medium text-gray-800">زقاق</label>
                  <input type="text" name="alley" id="alley" value={formData.alley} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border transition-all duration-200" />
                </div>

                <div>
                  <label htmlFor="house_number" className="block text-sm font-medium text-gray-800">دار</label>
                  <input type="text" name="house_number" id="house_number" value={formData.house_number} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border transition-all duration-200" />
                </div>

                {/* Previous Education Info */}
                <div className="sm:col-span-2 mt-4">
                  <h4 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-4">معلومات الدراسة السابقة</h4>
                </div>

                <div>
                  <label htmlFor="previous_school_name" className="block text-sm font-medium text-gray-800">اسم آخر مدرسة كان فيها الطالب</label>
                  <input type="text" name="previous_school_name" id="previous_school_name" required value={formData.previous_school_name} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border transition-all duration-200" />
                </div>

                <div>
                  <label htmlFor="education_directorate" className="block text-sm font-medium text-gray-800">المديرية العامة التابعة لها المدرسة</label>
                  <select id="education_directorate" name="education_directorate" required value={formData.education_directorate} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200">
                    <option value="" disabled>اختر...</option>
                    {EDUCATION_DIRECTORATES.map(directorate => (
                      <option key={directorate} value={directorate}>{directorate}</option>
                    ))}
                  </select>
                </div>

              </div>

              <div className="pt-5 border-t border-gray-200">
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="ml-3 inline-flex justify-center py-2.5 px-5 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
                  >
                    {loading ? 'جاري الحفظ...' : (
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
