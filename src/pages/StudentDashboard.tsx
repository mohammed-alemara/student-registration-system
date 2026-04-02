import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogOut, Save, CheckCircle, AlertTriangle, Upload } from 'lucide-react';
import { NATIONAL_ID_ISSUERS, RESIDENCE_CARD_ISSUERS, EDUCATION_DIRECTORATES, APPLICATION_TYPES } from '../lib/constants';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
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
    checkUser();
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8" dir="rtl">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-yellow-50 border-r-4 border-yellow-400 p-4 rounded-md shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="mr-3">
                <h3 className="text-sm font-medium text-yellow-800">إعدادات قاعدة البيانات مفقودة</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      // Check if student already has a registration
      const { data, error } = await supabase
        .from('student_registrations')
        .select('*')
        .eq('student_id', user.id)
        .single();

      if (data) {
        setFormData({
          first_name: data.first_name || '',
          father_name: data.father_name || '',
          grandfather_name: data.grandfather_name || '',
          great_grandfather_name: data.great_grandfather_name || '',
          gender: data.gender || '',
          date_of_birth: data.date_of_birth || '',
          mother_name: data.mother_name || '',
          mother_father_name: data.mother_father_name || '',
          mother_grandfather_name: data.mother_grandfather_name || '',
          district: data.district || '',
          sub_district: data.sub_district || '',
          neighborhood: data.neighborhood || '',
          mahalla: data.mahalla || '',
          alley: data.alley || '',
          house_number: data.house_number || '',
          place_of_birth: data.place_of_birth || '',
          marital_status: data.marital_status || '',
          mobile_number: data.mobile_number || '',
          religion: data.religion || '',
          ethnicity: data.ethnicity || '',
          father_life_status: data.father_life_status || '',
          is_gov_employee: data.is_gov_employee || '',
          gov_department: data.gov_department || '',
          national_id_number: data.national_id_number || '',
          national_id_date: data.national_id_date || '',
          national_id_issuer: data.national_id_issuer || '',
          residence_card_number: data.residence_card_number || '',
          residence_card_date: data.residence_card_date || '',
          residence_card_issuer: data.residence_card_issuer || '',
          previous_school_name: data.previous_school_name || '',
          education_directorate: data.education_directorate || '',
          photo_url: data.photo_url || '',
          application_type: data.application_type || '',
        });
        if (data.photo_url) {
          setPhotoPreview(data.photo_url);
        }
        setSuccess(true);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setFetching(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (JPG/JPEG)
    if (file.type !== 'image/jpeg' && file.type !== 'image/jpg') {
      setError('يجب أن تكون صيغة الصورة المرفوعة JPG فقط');
      setPhotoFile(null);
      e.target.value = '';
      return;
    }

    // Validate file size (<= 500 KB)
    if (file.size > 500 * 1024) {
      setError('يجب أن يكون حجم الصورة أقل أو يساوي 500 كيلوبايت');
      setPhotoFile(null);
      e.target.value = '';
      return;
    }

    setError(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let finalPhotoUrl = formData.photo_url;

      // Upload photo if a new one is selected
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('student_photos')
          .upload(filePath, photoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('student_photos')
          .getPublicUrl(filePath);

        finalPhotoUrl = publicUrl;
      }

      const { error: dbError } = await supabase
        .from('student_registrations')
        .upsert({
          student_id: user.id,
          ...formData,
          photo_url: finalPhotoUrl,
        }, { onConflict: 'student_id' });

      if (dbError) throw dbError;
      
      setFormData(prev => ({ ...prev, photo_url: finalPhotoUrl }));
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="min-h-screen flex items-center justify-center" dir="rtl">جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">لوحة الطالب</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-white hover:text-gray-700 focus:outline-none transition ease-in-out duration-150"
              >
                <LogOut className="ml-2 h-4 w-4" />
                تسجيل خروج
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto py-10 sm:px-6 lg:px-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              نموذج تسجيل الطلبة
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              الرجاء تعبئة جميع البيانات المطلوبة بدقة.
            </p>
          </div>
          
          <div className="px-4 py-5 sm:p-6">
            {error && (
              <div className="mb-4 bg-red-50 border-r-4 border-red-400 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="mb-4 bg-green-50 border-r-4 border-green-400 p-4 flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 ml-2" />
                <p className="text-sm text-green-700">تم حفظ بيانات التسجيل بنجاح.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                
                {/* Application Type */}
                <div className="sm:col-span-2">
                  <h4 className="text-md font-medium text-gray-900 border-b pb-2">نوع التقديم</h4>
                </div>
                
                <div className="sm:col-span-2">
                  <label htmlFor="application_type" className="block text-sm font-medium text-gray-700">نوع التقديم</label>
                  <select id="application_type" name="application_type" required value={formData.application_type} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    <option value="" disabled>اختر...</option>
                    {APPLICATION_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Photo Upload */}
                <div className="sm:col-span-2">
                  <h4 className="text-md font-medium text-gray-900 border-b pb-2">صورة الطالب/ة</h4>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">الصورة الشخصية (JPG فقط، الحد الأقصى 500KB)</label>
                  <div className="mt-1 flex items-center space-x-4 space-x-reverse">
                    <div className="flex-shrink-0 h-24 w-24 border-2 border-dashed border-gray-300 rounded-md overflow-hidden bg-gray-50 flex items-center justify-center">
                      {photoPreview ? (
                        <img src={photoPreview} alt="صورة الطالب" className="h-full w-full object-cover" />
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
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        يجب أن تكون الصورة واضحة وبخلفية بيضاء.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Personal Info */}
                <div className="sm:col-span-2 mt-4">
                  <h4 className="text-md font-medium text-gray-900 border-b pb-2">البيانات الشخصية</h4>
                </div>

                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">الاسم الأول</label>
                  <input type="text" name="first_name" id="first_name" required value={formData.first_name} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" />
                </div>

                <div>
                  <label htmlFor="father_name" className="block text-sm font-medium text-gray-700">اسم الأب</label>
                  <input type="text" name="father_name" id="father_name" required value={formData.father_name} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" />
                </div>

                <div>
                  <label htmlFor="grandfather_name" className="block text-sm font-medium text-gray-700">اسم الجد</label>
                  <input type="text" name="grandfather_name" id="grandfather_name" required value={formData.grandfather_name} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" />
                </div>

                <div>
                  <label htmlFor="great_grandfather_name" className="block text-sm font-medium text-gray-700">اسم والد الجد</label>
                  <input type="text" name="great_grandfather_name" id="great_grandfather_name" required value={formData.great_grandfather_name} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" />
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700">الجنس</label>
                  <select id="gender" name="gender" required value={formData.gender} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    <option value="" disabled>اختر...</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">تاريخ الميلاد</label>
                  <input type="date" name="date_of_birth" id="date_of_birth" required value={formData.date_of_birth} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" />
                </div>

                {/* Additional Personal Info */}
                <div className="sm:col-span-2 mt-4">
                  <h4 className="text-md font-medium text-gray-900 border-b pb-2">معلومات شخصية إضافية</h4>
                </div>

                <div>
                  <label htmlFor="place_of_birth" className="block text-sm font-medium text-gray-700">محل الولادة</label>
                  <select id="place_of_birth" name="place_of_birth" required value={formData.place_of_birth} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
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
                  <label htmlFor="marital_status" className="block text-sm font-medium text-gray-700">الحالة الاجتماعية</label>
                  <select id="marital_status" name="marital_status" required value={formData.marital_status} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    <option value="" disabled>اختر...</option>
                    <option value="متزوج">متزوج</option>
                    <option value="باكر">باكر</option>
                    <option value="مطلق">مطلق</option>
                    <option value="ارمل">ارمل</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="mobile_number" className="block text-sm font-medium text-gray-700">رقم الموبايل</label>
                  <input type="tel" name="mobile_number" id="mobile_number" pattern="^07[0-9]{9}$" title="يجب أن يبدأ بـ 07 ويتكون من 11 رقم" placeholder="07XXXXXXXXX" required value={formData.mobile_number} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" dir="ltr" />
                </div>

                <div>
                  <label htmlFor="religion" className="block text-sm font-medium text-gray-700">الديانة</label>
                  <select id="religion" name="religion" required value={formData.religion} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    <option value="" disabled>اختر...</option>
                    <option value="مسلم">مسلم</option>
                    <option value="مسيحي">مسيحي</option>
                    <option value="صابئي">صابئي</option>
                    <option value="ايزيدي">ايزيدي</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ethnicity" className="block text-sm font-medium text-gray-700">القومية</label>
                  <select id="ethnicity" name="ethnicity" required value={formData.ethnicity} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    <option value="" disabled>اختر...</option>
                    <option value="عربي">عربي</option>
                    <option value="كردي">كردي</option>
                    <option value="تركماني">تركماني</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="father_life_status" className="block text-sm font-medium text-gray-700">الحالة الحياتية للأب</label>
                  <select id="father_life_status" name="father_life_status" required value={formData.father_life_status} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    <option value="" disabled>اختر...</option>
                    <option value="حي">حي</option>
                    <option value="متوفي">متوفي</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="is_gov_employee" className="block text-sm font-medium text-gray-700">موظف حكومي</label>
                  <select id="is_gov_employee" name="is_gov_employee" required value={formData.is_gov_employee} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    <option value="" disabled>اختر...</option>
                    <option value="نعم">نعم</option>
                    <option value="لا">لا</option>
                  </select>
                </div>

                {formData.is_gov_employee === 'نعم' && (
                  <div>
                    <label htmlFor="gov_department" className="block text-sm font-medium text-gray-700">اسم الدائرة التي تعمل بها</label>
                    <input type="text" name="gov_department" id="gov_department" required={formData.is_gov_employee === 'نعم'} value={formData.gov_department} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" />
                  </div>
                )}

                {/* National ID Info */}
                <div className="sm:col-span-2 mt-4">
                  <h4 className="text-md font-medium text-gray-900 border-b pb-2">معلومات البطاقة الوطنية الموحدة</h4>
                </div>

                <div>
                  <label htmlFor="national_id_number" className="block text-sm font-medium text-gray-700">رقم البطاقة الموحدة</label>
                  <input type="text" name="national_id_number" id="national_id_number" pattern="^[0-9]{12}$" title="يجب أن يتكون رقم البطاقة الموحدة من 12 رقماً" placeholder="123456789012" required value={formData.national_id_number} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" dir="ltr" />
                </div>

                <div>
                  <label htmlFor="national_id_date" className="block text-sm font-medium text-gray-700">تاريخ الإصدار</label>
                  <input type="date" name="national_id_date" id="national_id_date" required value={formData.national_id_date} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" />
                </div>

                <div>
                  <label htmlFor="national_id_issuer" className="block text-sm font-medium text-gray-700">جهة الإصدار</label>
                  <select id="national_id_issuer" name="national_id_issuer" required value={formData.national_id_issuer} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    <option value="" disabled>اختر...</option>
                    {NATIONAL_ID_ISSUERS.map(issuer => (
                      <option key={issuer} value={issuer}>{issuer}</option>
                    ))}
                  </select>
                </div>

                {/* Residence Card Info */}
                <div className="sm:col-span-2 mt-4">
                  <h4 className="text-md font-medium text-gray-900 border-b pb-2">معلومات بطاقة السكن</h4>
                </div>

                <div>
                  <label htmlFor="residence_card_number" className="block text-sm font-medium text-gray-700">رقم بطاقة السكن</label>
                  <input type="text" name="residence_card_number" id="residence_card_number" required value={formData.residence_card_number} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" dir="ltr" />
                </div>

                <div>
                  <label htmlFor="residence_card_date" className="block text-sm font-medium text-gray-700">تاريخ بطاقة السكن</label>
                  <input type="date" name="residence_card_date" id="residence_card_date" required value={formData.residence_card_date} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" />
                </div>

                <div>
                  <label htmlFor="residence_card_issuer" className="block text-sm font-medium text-gray-700">جهة الإصدار</label>
                  <select id="residence_card_issuer" name="residence_card_issuer" required value={formData.residence_card_issuer} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    <option value="" disabled>اختر...</option>
                    {RESIDENCE_CARD_ISSUERS.map(issuer => (
                      <option key={issuer} value={issuer}>{issuer}</option>
                    ))}
                  </select>
                </div>

                {/* Mother's Info */}
                <div className="sm:col-span-2 mt-4">
                  <h4 className="text-md font-medium text-gray-900 border-b pb-2">بيانات الأم</h4>
                </div>

                <div>
                  <label htmlFor="mother_name" className="block text-sm font-medium text-gray-700">اسم الأم</label>
                  <input type="text" name="mother_name" id="mother_name" required value={formData.mother_name} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" />
                </div>

                <div>
                  <label htmlFor="mother_father_name" className="block text-sm font-medium text-gray-700">اسم والد الأم</label>
                  <input type="text" name="mother_father_name" id="mother_father_name" required value={formData.mother_father_name} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" />
                </div>

                <div>
                  <label htmlFor="mother_grandfather_name" className="block text-sm font-medium text-gray-700">اسم جد الأم</label>
                  <input type="text" name="mother_grandfather_name" id="mother_grandfather_name" required value={formData.mother_grandfather_name} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" />
                </div>

                {/* Address Info */}
                <div className="sm:col-span-2 mt-4">
                  <h4 className="text-md font-medium text-gray-900 border-b pb-2">عنوان السكن</h4>
                </div>

                <div>
                  <label htmlFor="district" className="block text-sm font-medium text-gray-700">القضاء</label>
                  <select id="district" name="district" required value={formData.district} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    <option value="" disabled>اختر...</option>
                    <option value="النجف">النجف</option>
                    <option value="الكوفة">الكوفة</option>
                    <option value="المناذرة">المناذرة</option>
                    <option value="المشخاب">المشخاب</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="sub_district" className="block text-sm font-medium text-gray-700">الناحية</label>
                  <select id="sub_district" name="sub_district" required value={formData.sub_district} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
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
                  <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-700">اسم الحي</label>
                  <input type="text" name="neighborhood" id="neighborhood" required value={formData.neighborhood} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" />
                </div>

                <div>
                  <label htmlFor="mahalla" className="block text-sm font-medium text-gray-700">محلة</label>
                  <input type="text" name="mahalla" id="mahalla" value={formData.mahalla} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" />
                </div>

                <div>
                  <label htmlFor="alley" className="block text-sm font-medium text-gray-700">زقاق</label>
                  <input type="text" name="alley" id="alley" value={formData.alley} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" />
                </div>

                <div>
                  <label htmlFor="house_number" className="block text-sm font-medium text-gray-700">دار</label>
                  <input type="text" name="house_number" id="house_number" value={formData.house_number} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" />
                </div>

                {/* Previous Education Info */}
                <div className="sm:col-span-2 mt-4">
                  <h4 className="text-md font-medium text-gray-900 border-b pb-2">معلومات الدراسة السابقة</h4>
                </div>

                <div>
                  <label htmlFor="previous_school_name" className="block text-sm font-medium text-gray-700">اسم آخر مدرسة كان فيها الطالب</label>
                  <input type="text" name="previous_school_name" id="previous_school_name" required value={formData.previous_school_name} onChange={handleChange} className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border" />
                </div>

                <div>
                  <label htmlFor="education_directorate" className="block text-sm font-medium text-gray-700">المديرية العامة التابعة لها المدرسة</label>
                  <select id="education_directorate" name="education_directorate" required value={formData.education_directorate} onChange={handleChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
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
                    className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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
