import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import {
  Search,
  Loader2,
  Download,
  CheckCircle2,
  FileText,
  User,
  BookOpen,
  Calendar,
  RotateCcw,
  Sparkles,
  UploadCloud
} from 'lucide-react';

export default function StudentAssignments() {
  const [studentIdInput, setStudentIdInput] = useState('');
  const [activeStudentId, setActiveStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // فلاتر العرض
  const [filterAssignment, setFilterAssignment] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'

  // التحقق من وجود رقم طالب محفوظ محلياً عند فتح الصفحة
  useEffect(() => {
    const savedId = localStorage.getItem('student_id');
    const savedName = localStorage.getItem('student_name');
    if (savedName) setStudentName(savedName);

    if (savedId) {
      setStudentIdInput(savedId);
      fetchStudentAssignments(savedId);
    }
  }, []);

  const fetchStudentAssignments = async (idToSearch) => {
    const cleanId = (idToSearch || '').trim();
    if (!cleanId) return;

    setIsLoading(true);
    setErrorMsg('');
    setHasSearched(true);
    setActiveStudentId(cleanId);

    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('student_id', cleanId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let localGrades = {};
      try {
        localGrades = JSON.parse(localStorage.getItem('flutter_bootcamp_teacher_grades_v1') || '{}');
      } catch (e) {
        console.error('Error reading local grades:', e);
      }

      const formatted = (data || []).map(item => {
        const localKey = `${item.student_id}_${item.assignment_name}`;
        const localGradeData = localGrades[localKey];
        const grade = item.grade !== undefined && item.grade !== null && item.grade !== '' 
          ? String(item.grade) 
          : (localGradeData?.grade || '');
        const notes = item.notes || (localGradeData?.notes || '');

        return {
          id: item.id,
          timestamp: new Date(item.created_at).toLocaleString('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          rawDate: new Date(item.created_at),
          studentName: item.student_name,
          studentId: item.student_id,
          groupName: item.group_name,
          assignmentName: item.assignment_name,
          fileName: item.file_name,
          fileUrl: item.file_url,
          grade,
          notes
        };
      });

      setAssignments(formatted);

      // حفظ الرقم الأكاديمي واسم الطالب لسهولة العودة
      localStorage.setItem('student_id', cleanId);
      if (formatted.length > 0 && formatted[0].studentName) {
        setStudentName(formatted[0].studentName);
        localStorage.setItem('student_name', formatted[0].studentName);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('حدث خطأ أثناء جلب بيانات التكاليف. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (studentIdInput.trim()) {
      fetchStudentAssignments(studentIdInput);
    }
  };

  // حساب التكاليف الفريدة المنجزة
  const uniqueSubmittedAssignments = Array.from(new Set(assignments.map(a => a.assignmentName)));
  const completedCount = uniqueSubmittedAssignments.length;
  const totalExpected = 12;
  const progressPercent = Math.min(100, Math.round((completedCount / totalExpected) * 100));

  // حساب إجمالي الدرجات المرصودة
  const totalGradedPoints = assignments.reduce((sum, item) => {
    const g = Number(item.grade);
    return !isNaN(g) && item.grade !== '' ? sum + g : sum;
  }, 0);
  const gradedAssignmentsCount = assignments.filter(item => item.grade !== '' && !isNaN(Number(item.grade))).length;

  // تطبيق الفلترة والترتيب
  const filteredAssignments = assignments
    .filter(item => {
      if (!filterAssignment) return true;
      return item.assignmentName === filterAssignment;
    })
    .sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.rawDate - a.rawDate;
      } else {
        return a.rawDate - b.rawDate;
      }
    });

  return (
    <div className="container dashboard-container" style={{ marginTop: '60px' }}>
      <div className="glass-card" style={{ padding: '32px' }}>
        {/* ترويسة الصفحة */}
        <div className="dashboard-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary-color)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BookOpen size={26} />
              سجل تكاليفي المسلّمة
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px' }}>
              تابع تكاليفك المرفوعة وتأكد من حالة تسليمها في معسكر Flutter
            </p>
          </div>

          <Link to="/" className="download-btn" style={{ background: 'var(--primary-color)', padding: '10px 18px', fontSize: '14px' }}>
            <UploadCloud size={18} />
            تسليم تكليف جديد
          </Link>
        </div>

        {/* شريط البحث بالرقم الأكاديمي */}
        <form onSubmit={handleSearchSubmit} style={{ marginTop: '20px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', right: '14px', top: '15px', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingRight: '40px', fontSize: '15px' }}
                placeholder="أدخل رقمك الأكاديمي (مثال: 20211010)..."
                value={studentIdInput}
                onChange={(e) => setStudentIdInput(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="submit-btn"
              style={{ width: 'auto', margin: 0, padding: '12px 28px', whiteSpace: 'nowrap' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="loader" size={18} />
                  جاري البحث...
                </>
              ) : (
                <>
                  <Search size={18} />
                  عرض تكاليفي
                </>
              )}
            </button>

            {hasSearched && (
              <button
                type="button"
                onClick={() => fetchStudentAssignments(studentIdInput)}
                className="refresh-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                title="تحديث البيانات"
              >
                <RotateCcw size={16} />
                تحديث
              </button>
            )}
          </div>
        </form>

        {/* رسالة الخطأ إن وجدت */}
        {errorMsg && (
          <div className="status-msg status-error" style={{ marginBottom: '24px' }}>
            {errorMsg}
          </div>
        )}

        {/* محتوى النتائج عند الانتهاء من البحث */}
        {hasSearched && !isLoading && (
          <>
            {assignments.length > 0 ? (
              <>
                {/* بطاقة ملخص الإنجاز ومعلومات الطالب */}
                <div className="student-stats-card">
                  <div className="student-info-row">
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '2px' }}>اسم الطالب</div>
                      <div style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {studentName || assignments[0].studentName}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '2px' }}>الرقم الأكاديمي</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--primary-color)' }}>
                        {activeStudentId}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '2px' }}>المجموعة</div>
                      <span className="badge">{assignments[0].groupName}</span>
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '2px' }}>مستوى الإنجاز</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Sparkles size={16} />
                        {completedCount} من {totalExpected} تكليف ({progressPercent}%)
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '2px' }}>إجمالي الدرجات</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: gradedAssignmentsCount > 0 ? 'var(--primary-color)' : 'var(--text-secondary)' }}>
                        {gradedAssignmentsCount > 0 ? `${totalGradedPoints} درجة` : 'قيد التقييم'}
                      </div>
                    </div>
                  </div>

                  {/* شريط التقدم */}
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ width: '100%', backgroundColor: 'var(--border-color)', borderRadius: '99px', height: '10px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${progressPercent}%`,
                          backgroundColor: progressPercent === 100 ? 'var(--success-color)' : 'var(--primary-color)',
                          height: '100%',
                          transition: 'width 0.4s ease',
                          borderRadius: '99px'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* شريط الفلاتر والفرز */}
                <div className="filters-row" style={{ marginTop: '24px', alignItems: 'center' }}>
                  <div style={{ flex: 1.5 }}>
                    <select
                      className="form-select"
                      value={filterAssignment}
                      onChange={(e) => setFilterAssignment(e.target.value)}
                    >
                      <option value="">جميع التكاليف ({assignments.length} تسليم)</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(num => {
                        const count = assignments.filter(a => a.assignmentName === `التكليف ${num}`).length;
                        return (
                          <option key={num} value={`التكليف ${num}`}>
                            التكليف {num} {count > 0 ? `(${count} تسليم)` : '(غير مسلّم)'}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div style={{ flex: 1 }}>
                    <select
                      className="form-select"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                    >
                      <option value="newest">الأحدث أولاً</option>
                      <option value="oldest">الأقدم أولاً</option>
                    </select>
                  </div>

                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', padding: '0 8px', whiteSpace: 'nowrap' }}>
                    النتائج المعروضة: <strong>{filteredAssignments.length}</strong>
                  </div>
                </div>

                {/* جدول التكاليف */}
                {filteredAssignments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-color)', borderRadius: '10px', marginTop: '16px' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>لا توجد تسليمات تطابق الفلتر المحدد.</p>
                  </div>
                ) : (
                  <div className="table-responsive" style={{ marginTop: '16px' }}>
                    <table className="glass-table">
                      <thead>
                        <tr>
                          <th>التكليف</th>
                          <th>تاريخ التسليم</th>
                          <th>اسم الملف المرفوع</th>
                          <th>الحالة</th>
                          <th>الدرجة المرصودة</th>
                          <th>الملف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAssignments.map((row) => (
                          <tr key={row.id || row.fileUrl}>
                            <td style={{ fontWeight: '700', color: 'var(--primary-color)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={18} color="var(--primary-color)" />
                                {row.assignmentName}
                              </div>
                            </td>
                            <td dir="ltr" style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                                <Calendar size={14} />
                                {row.timestamp}
                              </div>
                            </td>
                            <td style={{ fontSize: '13.5px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.fileName}>
                              {row.fileName}
                            </td>
                            <td>
                              <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', color: '#047857' }}>
                                <CheckCircle2 size={13} />
                                مسلّم بنجاح
                              </span>
                            </td>
                            <td>
                              {row.grade ? (
                                <div>
                                  <span style={{ fontWeight: '700', color: 'var(--success-color)' }}>
                                    {row.grade} درجة
                                  </span>
                                  {row.notes && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                      {row.notes}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  بانتظار التقييم
                                </span>
                              )}
                            </td>
                            <td>
                              <a
                                href={row.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="download-btn"
                                title="تحميل أو معاينة الملف"
                              >
                                <Download size={15} />
                                تحميل / معاينة
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              /* حالة عدم العثور على أي تكاليف */
              <div style={{ textAlign: 'center', padding: '48px 20px', background: 'var(--bg-color)', borderRadius: '12px', marginTop: '20px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <FileText size={30} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  لم يتم العثور على تكاليف مسلّمة لهذا الرقم الأكاديمي
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', maxWidth: '460px', margin: '0 auto 20px', lineHeight: '1.6' }}>
                  تأكد من كتابة الرقم الأكاديمي الخاص بك بشكل صحيح، أو تفضل برفع أول تكليف لك الآن.
                </p>
                <Link to="/" className="submit-btn" style={{ width: 'auto', display: 'inline-flex', padding: '12px 28px', marginTop: '0' }}>
                  الانتقال لصفحة تسليم التكليف <UploadCloud size={18} />
                </Link>
              </div>
            )}
          </>
        )}

        {/* حالة التمهيد قبل البحث إذا لم يكن هناك رقم محفوظ */}
        {!hasSearched && (
          <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--bg-color)', borderRadius: '12px', marginTop: '20px' }}>
            <Search size={44} style={{ color: 'var(--secondary-color)', opacity: 0.6, marginBottom: '14px' }} />
            <h3 style={{ fontSize: '17px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
              أدخل رقمك الأكاديمي في الحقل أعلاه
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              سيتم عرض قائمة بجميع التكاليف التي قمت برفعها مسبقاً وروابط تحميلها ومستوى إنجازك.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
