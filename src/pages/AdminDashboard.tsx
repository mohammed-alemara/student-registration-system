import { useState, useEffect } from 'react';
import { supabase, StudentRegistration, isSupabaseConfigured } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, Search, AlertTriangle, Loader2, Eye, Edit2, Trash2, X, Save, CheckCircle } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentRegistration | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف سجل هذا الطالب نهائياً؟')) return;
    
    try {
      setActionLoading(true);
      const { error } = await supabase.from('student_registrations').delete().eq('id', id);
      if (error) throw error;
      setStudents(students.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting:', err);
      alert('حدث خطأ أثناء الحذف');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenModal = (student: StudentRegistration, editMode: boolean = false) => {
    setSelectedStudent({ ...student });
    setIsEditing(editMode);
    setIsModalOpen(true);
  };

  const handleUpdateStudent = async () => {
    if (!selectedStudent) return;
    
    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('student_registrations')
        .update(selectedStudent)
        .eq('id', selectedStudent.id);

      if (error) throw error;
      
      await fetchStudents();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error updating:', err);
      alert('حدث خطأ أثناء التحديث');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredStudents = students.filter(student => 
    `${student.first_name} ${student.father_name} ${student.grandfather_name}`.includes(searchTerm) ||
    student.mother_name.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-slate-50 font-cairo" dir="rtl">
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Users className="text-white h-6 w-6" />
              </div>
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
                <div className="w-32 h-44 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-slate-200">
                  {selectedStudent.photo_url ? (
                    <img src={selectedStudent.photo_url} alt="Student" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">لا توجد صورة</div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 w-full">
                  {[
                    { label: 'الاسم الأول', key: 'first_name' },
                    { label: 'اسم الأب', key: 'father_name' },
                    { label: 'اسم الجد', key: 'grandfather_name' },
                    { label: 'اسم والد الجد', key: 'great_grandfather_name' },
                    { label: 'تاريخ الميلاد', key: 'date_of_birth', type: 'date' },
                    { label: 'محل الولادة', key: 'place_of_birth' },
                    { label: 'نوع التقديم', key: 'application_type' },
                    { label: 'رقم الموبايل', key: 'mobile_number' },
                    { label: 'الحالة الاجتماعية', key: 'marital_status' },
                    { label: 'الديانة', key: 'religion' },
                    { label: 'القومية', key: 'ethnicity' },
                    { label: 'الحالة الحياتية للأب', key: 'father_life_status' },
                    { label: 'اسم الأم الثلاثي', key: 'mother_name' },
                    { label: 'اسم والد الأم', key: 'mother_father_name' },
                    { label: 'اسم جد الأم', key: 'mother_grandfather_name' },
                    { label: 'القضاء', key: 'district' },
                    { label: 'الناحية', key: 'sub_district' },
                    { label: 'اسم الحي', key: 'neighborhood' },
                    { label: 'محلة', key: 'mahalla' },
                    { label: 'زقاق', key: 'alley' },
                    { label: 'دار', key: 'house_number' },
                    { label: 'رقم البطاقة الوطنية', key: 'national_id_number' },
                    { label: 'تاريخ إصدارها', key: 'national_id_date', type: 'date' },
                    { label: 'جهة الإصدار', key: 'national_id_issuer' },
                    { label: 'رقم بطاقة السكن', key: 'residence_card_number' },
                    { label: 'جهة إصدار بطاقة السكن', key: 'residence_card_issuer' },
                    { label: 'اسم آخر مدرسة', key: 'previous_school_name' },
                    { label: 'مديرية التربية', key: 'education_directorate' },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-bold text-slate-400 mb-1 mr-1">{field.label}</label>
                      {isEditing ? (
                        <input
                          type={field.type || 'text'}
                          value={(selectedStudent as any)[field.key] || ''}
                          onChange={(e) => setSelectedStudent({ ...selectedStudent, [field.key]: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                        />
                      ) : (
                        <div className="px-4 py-2 bg-slate-50 border border-transparent rounded-xl text-slate-700 font-semibold text-sm">
                          {(selectedStudent as any)[field.key] || '-'}
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
                    <td colSpan={7} className="px-6 py-20 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-3" />
                        <span className="text-slate-500 font-medium">جاري التحميل...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 whitespace-nowrap text-center text-sm text-slate-400">
                      لا يوجد طلبة مسجلين
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-slate-500">
                        <span className="bg-slate-100 px-2 py-1 rounded-md">#{student.student_number}</span>
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
                            onClick={() => handleDelete(student.id)}
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
