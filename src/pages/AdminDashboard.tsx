import { useState, useEffect, useCallback, useRef } from 'react';
import logo from '../../logo.png';
import { supabase, StudentRegistration, isSupabaseConfigured } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, Search, AlertTriangle, Loader2, Eye, Edit2, Trash2, X, Save, CheckCircle, Upload, Scissors } from 'lucide-react';
import { NATIONAL_ID_ISSUERS, RESIDENCE_CARD_ISSUERS, EDUCATION_DIRECTORATES, APPLICATION_TYPES } from '../lib/constants';
import Cropper, { Area, Point } from 'react-easy-crop';

// الثوابت الخاصة بقياس الصورة المطلوب (3.5 * 4.5)
const OUTPUT_WIDTH = 350; 
const OUTPUT_HEIGHT = 450;
const ASPECT = 3.5 / 4.5;

// دالة مساعدة لإنشاء صورة من رابط
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    // لا تقم بتعيين crossOrigin للروابط المحلية (blob: أو data:) لضمان ظهور الصورة في آيفون
    if (url && !url.startsWith('blob:') && !url.startsWith('data:')) {
      image.setAttribute('crossOrigin', 'anonymous');
    }
    image.src = url;
  });

// دالة معالجة قص الصورة وتحويلها إلى Blob
const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<string> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('No 2d context');

  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    OUTPUT_WIDTH,
    OUTPUT_HEIGHT
  );

  return canvas.toDataURL('image/jpeg', 0.9);
};

// دالة محسنة لتحويل رابط خارجي إلى Base64 مع دعم CORS كامل للطباعة الموثوقة
  const urlToBase64 = async (url: string | null): Promise<string | null> => {
    if (!url) return null;
    if (!url.startsWith('http')) return url; // Already data/blob URL

    try {
      // محاولة 1: Fetch مباشر مع CORS
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(url, { 
        mode: 'cors',
        cache: 'force-cache',
        signal: controller.signal 
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      
      // Convert blob → data URL
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('FileReader failed'));
        reader.readAsDataURL(blob);
      });

    } catch (error: any) {
      console.warn(`urlToBase64 failed for ${url}:`, error.message);
      
      // محاولة 2: Canvas drawing fallback
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        
        return new Promise((resolve) => {
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/jpeg', 0.9));
            } else {
              resolve(url);
            }
          };
          img.onerror = () => resolve(url);
        });
      } catch {
        return url;
      }
    }
  };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentRegistration | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // حالات تعديل الصورة في لوحة المشرف
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    checkAdminAndFetchData();
  }, []);

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
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const checkAdminAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        navigate('/student');
        return;
      }

      fetchStudents();
    } catch (err) {
      console.error('Error checking admin status:', err);
      navigate('/');
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('student_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setActionLoading(true);
      const { error } = await supabase.from('student_registrations').delete().eq('id', deleteConfirmId);
      if (error) throw error;
      setStudents(students.filter(s => s.id !== deleteConfirmId));
      showToast('تم حذف سجل الطالب بنجاح');
    } catch (err) {
      console.error('Error deleting:', err);
      showToast('حدث خطأ أثناء محاولة الحذف', 'error');
    } finally {
      setActionLoading(false);
      setDeleteConfirmId(null);
    }
  };

  const handleOpenModal = async (student: StudentRegistration, editMode: boolean = false) => {
    setSelectedStudent({ ...student });
    setIsEditing(editMode);
    const base64Photo = await urlToBase64(student.photo_url || null);
    if (base64Photo && !base64Photo?.startsWith('data:') && !base64Photo?.startsWith('blob:')) {
      console.warn('Admin: Image preview not data URL');
    }
    setPhotoPreview(base64Photo);
    setPhotoFile(null);
    setIsModalOpen(true);
  };

  const handleUpdateStudent = async () => {
    if (!selectedStudent) return;
    
    try {
      setActionLoading(true);

      let finalPhotoUrl = selectedStudent.photo_url;

      // رفع الصورة الجديدة إذا قام المشرف بتغييرها
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${selectedStudent.student_id}-${Math.random()}.${fileExt}`;
        const filePath = `${selectedStudent.student_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('student_photos')
          .upload(filePath, photoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('student_photos')
          .getPublicUrl(filePath);

        finalPhotoUrl = publicUrl;
      }
      
      // استبعاد الحقول التي لا يمكن تعديلها (مثل المعرفات والحقول التلقائية)
      const { id, student_id, student_number, created_at, photo_url, ...updateData } = selectedStudent as any;

      const { error } = await supabase
        .from('student_registrations')
        .update({ ...updateData, photo_url: finalPhotoUrl })
        .eq('id', id);

      if (error) throw error;
      
      await fetchStudents();
      setIsModalOpen(false);
      showToast('تم تحديث بيانات الطالب بنجاح');
    } catch (err) {
      console.error('Error updating:', err);
      showToast('فشل التحديث. تأكد من صلاحيات قاعدة البيانات.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/jpeg' && file.type !== 'image/jpg') {
      showToast('يجب أن تكون صيغة الصورة JPG فقط', 'error');
      e.target.value = '';
      return;
    }

    if (file.size > 500 * 1024) {
      showToast('يجب أن يكون حجم الصورة أقل من 500 كيلوبايت', 'error');
      e.target.value = '';
      return;
    }

    // تنظيف الذاكرة قبل إنشاء رابط جديد
    if (tempImage && tempImage.startsWith('blob:')) URL.revokeObjectURL(tempImage);

    const imageUrl = URL.createObjectURL(file);
    setTempImage(imageUrl);
    setShowCropper(true);
  }, [tempImage]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleCropSave = async () => {
    try {
      if (tempImage && croppedAreaPixels) {
        const croppedDataUrl = await getCroppedImg(tempImage, croppedAreaPixels);
        
        if (photoPreview && photoPreview.startsWith('blob:')) {
          URL.revokeObjectURL(photoPreview);
        }

        const blob = await (await fetch(croppedDataUrl)).blob();
        setPhotoFile(new File([blob], 'student_photo.jpg', { type: 'image/jpeg' }));
        setPhotoPreview(croppedDataUrl); // Use Data URL for preview
        setShowCropper(false);
        if (tempImage.startsWith('blob:')) URL.revokeObjectURL(tempImage);
        setTempImage(null);
      }
    } catch (e) {
      showToast('خطأ في معالجة الصورة', 'error');
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    if (tempImage && tempImage.startsWith('blob:')) URL.revokeObjectURL(tempImage);
    setTempImage(null);
  };

  const filteredStudents = students.filter(student => 
    `${student.first_name} ${student.father_name} ${student.grandfather_name}`.includes(searchTerm) ||
    student.mother_name.includes(searchTerm)
  );

  const getApplicationTypeColor = (type: string) => {
    switch (type) {
      case 'المرحلة الابتدائية':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'المرحلة المتوسطة':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'المرحلة الاعدادية (العلمي)':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'المرحلة الاعدادية (الادبي)':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'الخريجون':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-cairo" dir="rtl">
      {/* تنسيق خاص لضمان ظهور الصور والألوان عند الطباعة */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 0; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav, button, .no-print { display: none !important; }
          
          /* معالجة ظهور Modal التعديل/التفاصيل عند الطباعة */
          .fixed.inset-0 {
            position: static !important;
            padding: 0 !important;
            background: white !important;
          }
          .bg-white.rounded-[2rem] {
            border: none !important;
            box-shadow: none !important;
            max-height: none !important;
            overflow: visible !important;
          }
          .overflow-y-auto {
            overflow: visible !important;
            max-height: none !important;
          }
          img { 
            display: block !important;
            width: 3.5cm !important;
            height: 4.5cm !important;
            visibility: visible !important;
            opacity: 1 !important;
            border: 1.5pt solid #000 !important;
            object-fit: cover !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .group.w-32.h-44, .photo-box {
            width: 3.5cm !important;
            height: 4.5cm !important;
            display: block !important;
            border: 1.5pt solid #000 !important;
            position: static !important;
          }
        }
      ` }} />
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-sm w-full text-center border border-slate-100 scale-in-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="h-10 w-10 text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">تأكيد الحذف</h3>
            <p className="text-slate-500 mb-8 font-medium leading-relaxed">
              هل أنت متأكد من حذف سجل الطالب؟ <br/> <span className="text-red-500 text-sm">هذا الإجراء لا يمكن التراجع عنه.</span>
            </p>
            <div className="flex space-x-3 space-x-reverse">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black transition-all"
              >
                إلغاء
              </button>
              <button 
                onClick={confirmDelete}
                disabled={actionLoading}
                className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-200 transition-all flex items-center justify-center"
              >
                {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'نعم، احذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="w-10 h-10 object-contain" />
              <h1 className="text-xl font-black text-slate-900">
                لوحة المشرف
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-slate-200 text-sm font-medium rounded-xl text-slate-600 bg-white hover:bg-slate-50 hover:text-red-600 focus:outline-none transition-all duration-200 shadow-sm"
              >
                <LogOut className="ml-2 h-4 w-4" />
                تسجيل خروج
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Modal التفاصيل والتعديل */}
      {isModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  {isEditing ? <Edit2 className="text-blue-600 h-5 w-5" /> : <Eye className="text-blue-600 h-5 w-5" />}
                </div>
                <h3 className="text-xl font-black text-slate-800">
                  {isEditing ? 'تعديل بيانات الطالب' : 'تفاصيل الطالب الكاملة'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="h-6 w-6 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 text-right">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="relative group w-32 h-44 flex-shrink-0">
                  <div className="w-full h-full bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-200">
                    {photoPreview ? (
                      <img 
                        src={photoPreview} 
                        alt="Student" 
                        className="w-full h-full object-cover" 
                        loading="eager"
                        decoding="async"
                        crossOrigin={photoPreview.startsWith('http') ? 'anonymous' : undefined}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">لا توجد صورة</div>
                    )}
                  </div>
                  {isEditing && (
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-2xl">
                      <Upload className="text-white h-8 w-8" />
                      <input type="file" className="hidden" accept="image/jpeg,image/jpg" onChange={handlePhotoChange} />
                    </label>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 w-full">
                  {[
                    { label: 'الاسم الأول', key: 'first_name' },
                    { label: 'اسم الأب', key: 'father_name' },
                    { label: 'اسم الجد', key: 'grandfather_name' },
                    { label: 'اسم والد الجد', key: 'great_grandfather_name' },
                    { label: 'الجنس', key: 'gender', options: ['male', 'female'], labels: { male: 'ذكر', female: 'أنثى' } },
                    { label: 'تاريخ الميلاد', key: 'date_of_birth', type: 'date' },
                    { label: 'محل الولادة', key: 'place_of_birth', options: ['بغداد', 'البصرة', 'النجف الاشرف', 'كربلاء المقدسة', 'بابل', 'واسط', 'ميسان', 'ذي قار', 'المثنى', 'القادسية', 'الأنبار', 'ديالى', 'صلاح الدين', 'نينوى', 'كركوك', 'أربيل', 'السليمانية', 'دهوك'] },
                    { label: 'نوع التقديم', key: 'application_type', options: APPLICATION_TYPES },
                    { label: 'رقم الموبايل', key: 'mobile_number' },
                    { label: 'الحالة الاجتماعية', key: 'marital_status', options: ['متزوج', 'باكر', 'مطلق', 'ارمل'] },
                    { label: 'الديانة', key: 'religion', options: ['مسلم', 'مسيحي', 'صابئي', 'ايزيدي'] },
                    { label: 'هل هو موظف؟', key: 'is_gov_employee', options: ['نعم', 'لا'] },
                    { label: 'الدائرة الحكومية', key: 'gov_department' },
                    { label: 'القومية', key: 'ethnicity', options: ['عربي', 'كردي', 'تركماني', 'أخرى'] },
                    { label: 'الحالة الحياتية للأب', key: 'father_life_status', options: ['حي', 'متوفي'] },
                    { label: 'اسم الأم الثلاثي', key: 'mother_name' },
                    { label: 'اسم والد الأم', key: 'mother_father_name' },
                    { label: 'اسم جد الأم', key: 'mother_grandfather_name' },
                    { label: 'القضاء', key: 'district', options: ['النجف', 'الكوفة', 'المناذرة', 'المشخاب'] },
                    { label: 'الناحية', key: 'sub_district', options: ['مركز النجف', 'الحيدرية', 'الرضوية', 'الشبكة', 'بانيقيا', 'مركز الكوفة', 'العباسية', 'الحرية', 'مركز المناذرة', 'الحيرة', 'مركز المشخاب', 'القادسية'] },
                    { label: 'اسم الحي', key: 'neighborhood' },
                    { label: 'محلة', key: 'mahalla' },
                    { label: 'زقاق', key: 'alley' },
                    { label: 'دار', key: 'house_number' },
                    { label: 'رقم البطاقة الوطنية', key: 'national_id_number' },
                    { label: 'تاريخ إصدارها', key: 'national_id_date', type: 'date' },
                    { label: 'جهة الإصدار', key: 'national_id_issuer', options: NATIONAL_ID_ISSUERS },
                    { label: 'رقم بطاقة السكن', key: 'residence_card_number' },
                    { label: 'تاريخ بطاقة السكن', key: 'residence_card_date', type: 'date' },
                    { label: 'جهة إصدار بطاقة السكن', key: 'residence_card_issuer', options: RESIDENCE_CARD_ISSUERS },
                    { label: 'اسم آخر مدرسة', key: 'previous_school_name' },
                    { label: 'مديرية التربية', key: 'education_directorate', options: EDUCATION_DIRECTORATES },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-bold text-slate-400 mb-1 mr-1">{field.label}</label>
                      {isEditing ? (
                        field.options ? (
                          <select
                            value={(selectedStudent as any)[field.key] || ''}
                            onChange={(e) => setSelectedStudent({ ...selectedStudent, [field.key]: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                          >
                            <option value="">اختر...</option>
                            {field.options.map(opt => (
                              <option key={opt} value={opt}>{(field.labels as any)?.[opt] || opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type || 'text'}
                            value={(selectedStudent as any)[field.key] || ''}
                            onChange={(e) => setSelectedStudent({ ...selectedStudent, [field.key]: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                          />
                        )
                  ) : (
                        <div className="px-4 py-2 bg-slate-50 border border-transparent rounded-xl text-slate-700 font-semibold text-sm">
                          {field.key === 'gender' ? ((field.labels as any)[(selectedStudent as any).gender] || '-') : ((selectedStudent as any)[field.key] || '-')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex justify-end space-x-3 space-x-reverse">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
              >
                إغلاق
              </button>
              {isEditing && (
                <button
                  onClick={handleUpdateStudent}
                  disabled={actionLoading}
                  className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center"
                >
                  {actionLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin ml-2" />
                  ) : (
                    <Save className="h-5 w-5 ml-2" />
                  )}
                  حفظ التعديلات
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* واجهة قص الصورة للمشرف */}
      {showCropper && tempImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-white rounded-[2rem] overflow-hidden w-full max-w-lg shadow-2xl flex flex-col max-h-[95vh]">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 flex items-center">
                <Scissors className="ml-2 h-5 w-5 text-blue-600" />
                تعديل قياس صورة الطالب
              </h3>
            </div>
            <div className="relative flex-1 w-full mx-auto bg-gray-900 min-h-[400px]">
              <Cropper
                key={tempImage || 'no-image'}
                image={tempImage}
                crop={crop}
                zoom={zoom}
                aspect={ASPECT}
                objectFit="contain"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="p-6 bg-white border-t space-y-6">
              <div className="flex items-center space-x-4 space-x-reverse px-2">
                <span className="text-sm font-black text-slate-500">الزوم</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
              <div className="flex justify-end space-x-3 space-x-reverse">
              <button onClick={handleCropCancel} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all">إلغاء</button>
              <button onClick={handleCropSave} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">حفظ الصورة</button>
            </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto py-10 sm:px-6 lg:px-8">
        <div className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden sm:rounded-[2.5rem]">
          <div className="px-6 py-8 sm:px-10 flex flex-col sm:flex-row justify-between items-center border-b border-slate-100 bg-gradient-to-l from-slate-50 to-white">
            <div>
              <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600">
                الطلبة المسجلين
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                قائمة بجميع الطلبة الذين قاموا بتعبئة نموذج التسجيل.
              </p>
            </div>
            
            <div className="mt-6 sm:mt-0 relative w-full sm:w-80">
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pr-11 py-3 border border-slate-200 rounded-2xl bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                placeholder="بحث بالاسم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/80">
                <tr>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                    التسلسلي
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                    نوع التقديم
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                    الاسم الرباعي
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                    الجنس
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                    رقم الموبايل
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                    تاريخ الميلاد
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                    تاريخ التسجيل
                  </th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-20 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-3" />
                        <span className="text-slate-500 font-medium">جاري التحميل...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 whitespace-nowrap text-center text-sm text-slate-400">
                      لا يوجد طلبة مسجلين
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-slate-500">
                        <span className="bg-slate-100 px-2 py-1 rounded-md">#{student.student_number}</span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm">
                        <span className={`px-3 py-1 rounded-full border font-bold text-[10px] ${getApplicationTypeColor(student.application_type)}`}>
                          {student.application_type}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-slate-900">
                        {student.first_name} {student.father_name} {student.grandfather_name} {student.great_grandfather_name}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-600">
                        <span className={`px-2 py-1 rounded-md ${student.gender === 'male' ? 'bg-slate-100' : 'bg-pink-50 text-pink-600'}`}>
                          {student.gender === 'male' ? 'ذكر' : 'أنثى'}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-blue-600" dir="ltr">
                        {student.mobile_number}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-600" dir="ltr">
                        {student.date_of_birth}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500 font-medium" dir="ltr">
                        {new Date(student.created_at).toLocaleDateString('ar-IQ', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-center">
                        <div className="flex items-center justify-center space-x-2 space-x-reverse">
                          <button
                            onClick={() => handleOpenModal(student, false)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleOpenModal(student, true)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="تعديل"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(student.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
