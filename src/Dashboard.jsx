import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import {
  Search,
  Loader2,
  Download,
  Lock,
  Users,
  FileText,
  CheckCircle2,
  Clock,
  Award,
  Filter,
  Sparkles,
  X,
  ExternalLink,
  Save,
  FileSpreadsheet,
  RotateCcw,
  BookOpen,
  ArrowUpDown,
  AlertCircle
} from 'lucide-react';

const LOCAL_GRADES_STORAGE_KEY = 'flutter_bootcamp_teacher_grades_v1';
const TOTAL_ASSIGNMENTS_COUNT = 12;
const GROUPS_LIST = [
  'أولاد - مجموعة 1',
  'أولاد - مجموعة 2',
  'أولاد - مجموعة 3',
  'أولاد - مجموعة 4',
  'بنات - مجموعة 1',
  'بنات - مجموعة 2'
];

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // نظام التبويبات
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'all_submissions'

  // فلاتر عرض الطلاب
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [completionFilter, setCompletionFilter] = useState('all'); // 'all' | 'completed' | 'incomplete' | 'graded' | 'ungraded'
  const [sortBy, setSortBy] = useState('highest_submissions'); // 'highest_submissions' | 'lowest_submissions' | 'name_asc' | 'newest'

  // فلاتر عرض جميع التسليمات
  const [filterRawGroup, setFilterRawGroup] = useState('');
  const [filterRawAssignment, setFilterRawAssignment] = useState('');
  const [rawSearchName, setRawSearchName] = useState('');

  // الطالب المحدد لعرض تفاصيله ورصد درجاته في النافذة المنبثقة
  const [selectedStudent, setSelectedStudent] = useState(null);

  // سجل الدرجات المحفوظة محلياً (key: `${studentId}_${assignmentName}`)
  const [gradesStore, setGradesStore] = useState({});
  const [savingGradeId, setSavingGradeId] = useState(null);
  const [saveSuccessMap, setSaveSuccessMap] = useState({});

  // كلمة مرور لوحة التحكم
  const ADMIN_PASSWORD = '778836';

  // تحميل الدرجات المحفوظة محلياً
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_GRADES_STORAGE_KEY);
      if (saved) {
        setGradesStore(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading local grades:', e);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      fetchData();
    } else {
      alert('كلمة المرور خاطئة');
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: assignments, error } = await supabase
        .from('assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const formattedData = (assignments || []).map((item) => ({
        id: item.id,
        timestamp: new Date(item.created_at).toLocaleString('ar-EG', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        rawDate: new Date(item.created_at),
        studentName: (item.student_name || '').trim(),
        studentId: (item.student_id || '').trim(),
        groupName: item.group_name || 'غير محدد',
        assignmentName: (item.assignment_name || '').trim(),
        fileName: item.file_name || 'ملف التكليف',
        fileUrl: item.file_url,
        dbGrade: item.grade !== undefined && item.grade !== null ? String(item.grade) : '',
        dbNotes: item.notes || ''
      }));

      setData(formattedData);
    } catch (error) {
      console.error(error);
      alert('حدث خطأ في جلب البيانات من Supabase: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // دمج الدرجات من Supabase ومخزن localStorage
  const getGradeInfo = (studentId, assignmentName, submissionItem) => {
    const key = `${studentId}_${assignmentName}`;
    const local = gradesStore[key];
    if (local && (local.grade !== undefined || local.notes !== undefined)) {
      return {
        grade: local.grade || '',
        notes: local.notes || ''
      };
    }
    if (submissionItem) {
      return {
        grade: submissionItem.dbGrade || '',
        notes: submissionItem.dbNotes || ''
      };
    }
    return { grade: '', notes: '' };
  };

  // حفظ الدرجة والملاحظة لتكليف معين
  const handleSaveGrade = async (studentId, assignmentName, submissionId, newGrade, newNotes) => {
    const key = `${studentId}_${assignmentName}`;
    setSavingGradeId(key);

    const updatedStore = {
      ...gradesStore,
      [key]: {
        grade: newGrade,
        notes: newNotes,
        updatedAt: new Date().toISOString()
      }
    };

    setGradesStore(updatedStore);
    try {
      localStorage.setItem(LOCAL_GRADES_STORAGE_KEY, JSON.stringify(updatedStore));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }

    // محاولة التحديث في Supabase إن وجد رقم التكليف
    if (submissionId) {
      try {
        const { error } = await supabase
          .from('assignments')
          .update({
            grade: newGrade,
            notes: newNotes
          })
          .eq('id', submissionId);

        if (error) {
          console.info('Supabase column not present or update restricted; stored locally:', error.message);
        }
      } catch (err) {
        console.warn('DB update skipped:', err);
      }
    }

    // إشارة نجاح الحفظ
    setSaveSuccessMap((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setSaveSuccessMap((prev) => ({ ...prev, [key]: false }));
      setSavingGradeId(null);
    }, 1500);
  };

  // تجميع وتحليل بيانات الطلاب
  const aggregatedStudents = useMemo(() => {
    const studentsMap = new Map();

    data.forEach((sub) => {
      const studentKey = sub.studentId || sub.studentName;
      if (!studentKey) return;

      if (!studentsMap.has(studentKey)) {
        studentsMap.set(studentKey, {
          studentKey,
          studentId: sub.studentId,
          studentName: sub.studentName,
          groupName: sub.groupName,
          submissions: [],
          assignmentsMap: new Map(),
          latestDate: sub.rawDate
        });
      }

      const student = studentsMap.get(studentKey);
      student.submissions.push(sub);

      if (sub.rawDate > student.latestDate) {
        student.latestDate = sub.rawDate;
      }

      // حفظ أحدث تسليم لكل تكليف
      if (!student.assignmentsMap.has(sub.assignmentName)) {
        student.assignmentsMap.set(sub.assignmentName, sub);
      }
    });

    return Array.from(studentsMap.values()).map((student) => {
      const uniqueAssignments = Array.from(student.assignmentsMap.keys());
      const submittedCount = uniqueAssignments.length;
      const progressPercent = Math.min(100, Math.round((submittedCount / TOTAL_ASSIGNMENTS_COUNT) * 100));

      // حساب إجمالي الدرجات المرصودة
      let totalGrade = 0;
      let gradedAssignmentsCount = 0;

      for (let i = 1; i <= TOTAL_ASSIGNMENTS_COUNT; i++) {
        const asgName = `التكليف ${i}`;
        const subItem = student.assignmentsMap.get(asgName);
        const gradeInfo = getGradeInfo(student.studentId, asgName, subItem);
        if (gradeInfo.grade && !isNaN(Number(gradeInfo.grade))) {
          totalGrade += Number(gradeInfo.grade);
          gradedAssignmentsCount++;
        }
      }

      return {
        ...student,
        submittedCount,
        progressPercent,
        isCompleted: submittedCount >= TOTAL_ASSIGNMENTS_COUNT,
        totalGrade,
        gradedAssignmentsCount,
        formattedLatestDate: student.latestDate.toLocaleString('ar-EG', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };
    });
  }, [data, gradesStore]);

  // إحصائيات عامة
  const stats = useMemo(() => {
    const totalStudents = aggregatedStudents.length;
    const totalSubmissions = data.length;
    const completedStudents = aggregatedStudents.filter((s) => s.isCompleted).length;
    const averageSubmissions = totalStudents > 0 ? (totalSubmissions / totalStudents).toFixed(1) : 0;

    return {
      totalStudents,
      totalSubmissions,
      completedStudents,
      averageSubmissions
    };
  }, [aggregatedStudents, data]);

  // تصفية وترتيب الطلاب
  const filteredStudents = useMemo(() => {
    return aggregatedStudents
      .filter((student) => {
        // تصفية بالاسم أو الرقم الأكاديمي
        if (studentSearch.trim()) {
          const query = studentSearch.trim().toLowerCase();
          const matchName = student.studentName.toLowerCase().includes(query);
          const matchId = student.studentId.toLowerCase().includes(query);
          if (!matchName && !matchId) return false;
        }

        // تصفية بالمجموعة
        if (selectedGroup && student.groupName !== selectedGroup) {
          return false;
        }

        // تصفية بحالة الإنجاز أو الرصد
        if (completionFilter === 'completed' && !student.isCompleted) return false;
        if (completionFilter === 'incomplete' && student.isCompleted) return false;
        if (completionFilter === 'graded' && student.gradedAssignmentsCount === 0) return false;
        if (completionFilter === 'ungraded' && student.gradedAssignmentsCount > 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'highest_submissions') {
          return b.submittedCount - a.submittedCount;
        }
        if (sortBy === 'lowest_submissions') {
          return a.submittedCount - b.submittedCount;
        }
        if (sortBy === 'name_asc') {
          return a.studentName.localeCompare(b.studentName, 'ar');
        }
        if (sortBy === 'newest') {
          return b.latestDate - a.latestDate;
        }
        return 0;
      });
  }, [aggregatedStudents, studentSearch, selectedGroup, completionFilter, sortBy]);

  // تصفية سجل جميع التسليمات
  const filteredRawData = useMemo(() => {
    return data.filter((item) => {
      const matchGroup = filterRawGroup ? item.groupName === filterRawGroup : true;
      const matchAssignment = filterRawAssignment ? item.assignmentName === filterRawAssignment : true;
      const matchName = rawSearchName
        ? item.studentName.toLowerCase().includes(rawSearchName.toLowerCase()) ||
        item.studentId.includes(rawSearchName)
        : true;
      return matchGroup && matchAssignment && matchName;
    });
  }, [data, filterRawGroup, filterRawAssignment, rawSearchName]);

  // تصدير كشف الدرجات إلى ملف CSV يدعم اللغة العربية UTF-8
  const handleExportCSV = () => {
    if (aggregatedStudents.length === 0) {
      alert('لا توجد بيانات طلاب لتصديرها.');
      return;
    }

    let csvContent = '\uFEFF'; // BOM لدعم الحروف العربية في Excel
    // الترويسة
    const headers = [
      'اسم الطالب',
      'الرقم الأكاديمي',
      'المجموعة',
      'عدد التكاليف المرفوعة',
      'نسبة الإنجاز %',
      'إجمالي الدرجات'
    ];

    for (let i = 1; i <= TOTAL_ASSIGNMENTS_COUNT; i++) {
      headers.push(`درجة تكليف ${i}`);
    }

    csvContent += headers.map((h) => `"${h}"`).join(',') + '\n';

    // الصفوف
    aggregatedStudents.forEach((student) => {
      const row = [
        `"${student.studentName}"`,
        `"${student.studentId}"`,
        `"${student.groupName}"`,
        student.submittedCount,
        `${student.progressPercent}%`,
        student.totalGrade
      ];

      for (let i = 1; i <= TOTAL_ASSIGNMENTS_COUNT; i++) {
        const asgName = `التكليف ${i}`;
        const subItem = student.assignmentsMap.get(asgName);
        const gradeInfo = getGradeInfo(student.studentId, asgName, subItem);
        row.push(gradeInfo.grade ? `"${gradeInfo.grade}"` : '""');
      }

      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `كشف_درجات_معسكر_فلاتر_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // شاشة تسجيل الدخول
  if (!isAuthenticated) {
    return (
      <div className="container" style={{ maxWidth: '420px', marginTop: '100px' }}>
        <div className="glass-card">
          <div className="header">
            <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--primary-color)' }}>
              <Lock size={26} /> لوحة تحكم المعلم
            </h2>
            <p style={{ marginTop: '6px' }}>يرجى إدخال كلمة المرور للمتابعة</p>
          </div>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <input
                type="password"
                className="form-input"
                placeholder="أدخل كلمة المرور (123)..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
              />
            </div>
            <button className="submit-btn" type="submit">
              تسجيل الدخول
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container dashboard-container" style={{ marginTop: '60px', maxWidth: '1200px' }}>
      <div className="glass-card" style={{ padding: '32px' }}>
        {/* الترويسة الرئيسية */}
        <div className="dashboard-header" style={{ flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BookOpen size={26} color="var(--primary-color)" />
              لوحة متابعة وتقييم الطلاب
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
              معسكر Flutter - استعراض تفاصيل تسليم كل طالب ورصد الدرجات والتقييمات
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleExportCSV} className="btn-secondary" title="تحميل كشف درجات الطلاب كملف Excel/CSV">
              <FileSpreadsheet size={17} color="var(--success-color)" />
              تصدير كشف الدرجات (CSV)
            </button>
            <button onClick={fetchData} className="refresh-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RotateCcw size={16} />
              تحديث البيانات
            </button>
          </div>
        </div>

        {/* بطاقات الإحصائيات السريعة */}
        <div className="stats-grid" style={{ marginTop: '20px' }}>
          <div className="stat-box">
            <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}>
              <Users size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-num">{stats.totalStudents}</span>
              <span className="stat-title">إجمالي الطلاب</span>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon" style={{ background: '#ecfdf5', color: '#047857' }}>
              <FileText size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-num">{stats.totalSubmissions}</span>
              <span className="stat-title">إجمالي التسليمات</span>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
              <CheckCircle2 size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-num">{stats.completedStudents}</span>
              <span className="stat-title">أكملوا 12 تكليفاً</span>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon" style={{ background: '#f3e8ff', color: '#7e22ce' }}>
              <Sparkles size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-num">{stats.averageSubmissions}</span>
              <span className="stat-title">متوسط التسليم/طالب</span>
            </div>
          </div>
        </div>

        {/* أزرار التبديل بين التبويبات */}
        <div className="dashboard-tabs">
          <button
            className={`dash-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            <Users size={18} />
            عرض تفصيلي حسب كل طالب ({filteredStudents.length})
          </button>
          <button
            className={`dash-tab-btn ${activeTab === 'all_submissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('all_submissions')}
          >
            <FileText size={18} />
            سجل كل التسليمات المباشرة ({filteredRawData.length})
          </button>
        </div>

        {/* التبويب الأول: تفاصيل كل طالب على حدة وفلترته ورصد درجاته */}
        {activeTab === 'students' && (
          <div>
            {/* شريط البحث والفلاتر */}
            <div className="filters-row" style={{ flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              {/* البحث بالاسم أو الرقم */}
              <div style={{ flex: '2 1 240px', position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', right: '12px', top: '14px', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingRight: '38px' }}
                  placeholder="ابحث باسم الطالب أو رقمه الأكاديمي..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>

              {/* فلتر المجموعة */}
              <div style={{ flex: '1 1 180px' }}>
                <select
                  className="form-select"
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                >
                  <option value="">جميع المجموعات</option>
                  {GROUPS_LIST.map((grp) => (
                    <option key={grp} value={grp}>
                      {grp}
                    </option>
                  ))}
                </select>
              </div>

              {/* فلتر حالة الإنجاز / التقييم */}
              <div style={{ flex: '1 1 160px' }}>
                <select
                  className="form-select"
                  value={completionFilter}
                  onChange={(e) => setCompletionFilter(e.target.value)}
                >
                  <option value="all">جميع الحالات</option>
                  <option value="completed">مكتمل (12/12 تكليف)</option>
                  <option value="incomplete">غير مكتمل (أقل من 12)</option>
                  <option value="graded">تم رصد درجات له</option>
                  <option value="ungraded">بانتظار رصد الدرجات</option>
                </select>
              </div>

              {/* ترتيب العرض */}
              <div style={{ flex: '1 1 160px' }}>
                <select
                  className="form-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="highest_submissions">الأكثر تسليماً</option>
                  <option value="lowest_submissions">الأقل تسليماً</option>
                  <option value="newest">أحدث نشاط تسليم</option>
                  <option value="name_asc">أبجدياً بالاسم</option>
                </select>
              </div>
            </div>

            {/* محتوى جدول الطلاب */}
            {isLoading ? (
              <div className="loading-state">
                <Loader2 className="loader" size={40} />
                <p>جاري تحميل وتحليل بيانات الطلاب...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', background: 'var(--bg-color)', borderRadius: '12px', marginTop: '16px' }}>
                <AlertCircle size={36} style={{ color: 'var(--text-secondary)', marginBottom: '10px' }} />
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  لم يتم العثور على أي طلاب يطابقون خيارات البحث
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
                  جرب تغيير نص البحث أو اختيار كل المجموعات.
                </p>
              </div>
            ) : (
              <div className="table-responsive" style={{ marginTop: '16px' }}>
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>اسم الطالب</th>
                      <th>الرقم الأكاديمي</th>
                      <th>المجموعة</th>
                      <th>التكاليف المرفوعة</th>
                      <th>نسبة الإنجاز</th>
                      <th>إجمالي الدرجات</th>
                      <th>آخر تسليم</th>
                      <th style={{ textAlign: 'center' }}>الإجراءات ورصد الدرجات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((st) => (
                      <tr key={st.studentKey}>
                        {/* اسم الطالب */}
                        <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                          {st.studentName}
                        </td>

                        {/* الرقم الأكاديمي */}
                        <td dir="ltr" style={{ textAlign: 'right', fontWeight: '600', color: 'var(--primary-color)' }}>
                          {st.studentId || '—'}
                        </td>

                        {/* المجموعة */}
                        <td>
                          <span className="badge">{st.groupName}</span>
                        </td>

                        {/* كم رفع من أصل 12 */}
                        <td>
                          <span
                            className={
                              st.submittedCount === TOTAL_ASSIGNMENTS_COUNT
                                ? 'badge-success'
                                : st.submittedCount > 0
                                  ? 'badge-pending'
                                  : 'badge-missing'
                            }
                          >
                            {st.submittedCount === TOTAL_ASSIGNMENTS_COUNT && <CheckCircle2 size={13} />}
                            {st.submittedCount} من {TOTAL_ASSIGNMENTS_COUNT} تكليف
                          </span>
                        </td>

                        {/* شريط التقدم */}
                        <td style={{ minWidth: '130px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, backgroundColor: 'var(--border-color)', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${st.progressPercent}%`,
                                  backgroundColor: st.progressPercent === 100 ? 'var(--success-color)' : 'var(--primary-color)',
                                  height: '100%',
                                  transition: 'width 0.3s ease'
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                              {st.progressPercent}%
                            </span>
                          </div>
                        </td>

                        {/* إجمالي الدرجات المرصودة */}
                        <td>
                          {st.gradedAssignmentsCount > 0 ? (
                            <span style={{ fontWeight: '700', color: 'var(--success-color)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Award size={15} />
                              {st.totalGrade} درجة
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                ({st.gradedAssignmentsCount} مقيّم)
                              </span>
                            </span>
                          ) : (
                            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                              لم ترصد درجات
                            </span>
                          )}
                        </td>

                        {/* تاريخ آخر تسليم */}
                        <td dir="ltr" style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>
                          {st.formattedLatestDate}
                        </td>

                        {/* زر فتح التفاصيل والرصد */}
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => setSelectedStudent(st)}
                            className="download-btn"
                            style={{
                              background: 'var(--primary-color)',
                              padding: '8px 14px',
                              cursor: 'pointer',
                              border: 'none'
                            }}
                          >
                            <Award size={16} />
                            عرض التفاصيل والدرجات
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* التبويب الثاني: سجل جميع التسليمات المباشرة */}
        {activeTab === 'all_submissions' && (
          <div>
            <div className="filters-row">
              <div style={{ flex: 1.5, position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', right: '12px', top: '14px', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingRight: '38px' }}
                  placeholder="ابحث باسم الطالب أو الرقم..."
                  value={rawSearchName}
                  onChange={(e) => setRawSearchName(e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <select
                  className="form-select"
                  value={filterRawGroup}
                  onChange={(e) => setFilterRawGroup(e.target.value)}
                >
                  <option value="">كل المجموعات</option>
                  {GROUPS_LIST.map((grp) => (
                    <option key={grp} value={grp}>
                      {grp}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <select
                  className="form-select"
                  value={filterRawAssignment}
                  onChange={(e) => setFilterRawAssignment(e.target.value)}
                >
                  <option value="">كل التكاليف</option>
                  {Array.from({ length: TOTAL_ASSIGNMENTS_COUNT }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={`التكليف ${num}`}>
                      التكليف {num}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="loading-state">
                <Loader2 className="loader" size={40} />
                <p>جاري تحميل البيانات من Supabase...</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>الوقت</th>
                      <th>اسم الطالب</th>
                      <th>الرقم</th>
                      <th>المجموعة</th>
                      <th>التكليف</th>
                      <th>الدرجة</th>
                      <th>الملف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRawData.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>
                          لا توجد بيانات مطابقة للبحث
                        </td>
                      </tr>
                    ) : (
                      filteredRawData.map((row) => {
                        const gradeInfo = getGradeInfo(row.studentId, row.assignmentName, row);
                        return (
                          <tr key={row.id || row.fileUrl}>
                            <td dir="ltr" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {row.timestamp}
                            </td>
                            <td style={{ fontWeight: '600' }}>{row.studentName}</td>
                            <td>{row.studentId}</td>
                            <td>
                              <span className="badge">{row.groupName}</span>
                            </td>
                            <td style={{ fontWeight: '600', color: 'var(--primary-color)' }}>
                              {row.assignmentName}
                            </td>
                            <td>
                              <span
                                style={{
                                  fontWeight: '700',
                                  color: gradeInfo.grade ? 'var(--success-color)' : 'var(--text-secondary)'
                                }}
                              >
                                {gradeInfo.grade ? `${gradeInfo.grade} درجة` : '—'}
                              </span>
                            </td>
                            <td>
                              <a href={row.fileUrl} target="_blank" rel="noopener noreferrer" className="download-btn">
                                <Download size={16} /> عرض
                              </a>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* النافذة المنبثقة: تفاصيل كل طالب ورصد الدرجات لجميع التكاليف الـ 12 */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          getGradeInfo={getGradeInfo}
          onSaveGrade={handleSaveGrade}
          savingGradeId={savingGradeId}
          saveSuccessMap={saveSuccessMap}
        />
      )}
    </div>
  );
}

// مكون النافذة المنبثقة لعرض الطالب الواحد ورصد درجات تكاليفه
function StudentDetailModal({
  student,
  onClose,
  getGradeInfo,
  onSaveGrade,
  savingGradeId,
  saveSuccessMap
}) {
  // حالة محلية لإدخال الدرجات والملاحظات قبل الحفظ
  const [localGrades, setLocalGrades] = useState({});

  useEffect(() => {
    // تهيئة الدرجات الحالية
    const initial = {};
    for (let i = 1; i <= TOTAL_ASSIGNMENTS_COUNT; i++) {
      const asgName = `التكليف ${i}`;
      const sub = student.assignmentsMap.get(asgName);
      const info = getGradeInfo(student.studentId, asgName, sub);
      initial[asgName] = {
        grade: info.grade || '',
        notes: info.notes || ''
      };
    }
    setLocalGrades(initial);
  }, [student]);

  const handleGradeChange = (asgName, field, value) => {
    setLocalGrades((prev) => ({
      ...prev,
      [asgName]: {
        ...(prev[asgName] || { grade: '', notes: '' }),
        [field]: value
      }
    }));
  };

  // حفظ درجة تكليف معين
  const submitSingleGrade = (asgName) => {
    const sub = student.assignmentsMap.get(asgName);
    const gradeData = localGrades[asgName] || { grade: '', notes: '' };
    onSaveGrade(
      student.studentId,
      asgName,
      sub ? sub.id : null,
      gradeData.grade,
      gradeData.notes
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* ترويسة النافذة */}
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={22} color="var(--primary-color)" />
              تفاصيل ورصد درجات: {student.studentName}
            </h2>
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
              <span>
                الرقم الأكاديمي: <strong style={{ color: 'var(--primary-color)' }}>{student.studentId || 'غير متوفر'}</strong>
              </span>
              <span>•</span>
              <span>
                المجموعة: <strong style={{ color: 'var(--text-primary)' }}>{student.groupName}</strong>
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="إغلاق">
            <X size={20} />
          </button>
        </div>

        {/* جسم النافذة */}
        <div className="modal-body">
          {/* بطاقة ملخص الإنجاز */}
          <div className="student-stats-card" style={{ marginTop: 0, marginBottom: '24px' }}>
            <div className="student-info-row">
              <div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                  حالة إنجاز التكاليف
                </div>
                <div style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {student.submittedCount} من أصل {TOTAL_ASSIGNMENTS_COUNT} تكليف ({student.progressPercent}%)
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                  إجمالي درجات المعسكر المرصودة
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--success-color)' }}>
                  {student.totalGrade} درجة
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                  التكاليف المتبقية
                </div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: student.submittedCount === TOTAL_ASSIGNMENTS_COUNT ? 'var(--success-color)' : 'var(--error-color)' }}>
                  {TOTAL_ASSIGNMENTS_COUNT - student.submittedCount === 0
                    ? 'اكتملت جميعها 🎉'
                    : `${TOTAL_ASSIGNMENTS_COUNT - student.submittedCount} تكليف متبقي`}
                </div>
              </div>
            </div>

            {/* شريط التقدم */}
            <div style={{ marginTop: '14px' }}>
              <div style={{ width: '100%', backgroundColor: 'var(--border-color)', borderRadius: '99px', height: '10px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${student.progressPercent}%`,
                    backgroundColor: student.progressPercent === 100 ? 'var(--success-color)' : 'var(--primary-color)',
                    height: '100%',
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>
            </div>
          </div>

          {/* جدول كل التكاليف من 1 إلى 12 */}
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>
            قائمة التكاليف الـ 12 ورصد الدرجة:
          </h3>

          <div className="table-responsive">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>التكليف</th>
                  <th>حالة التسليم</th>
                  <th>الملف والتاريخ</th>
                  <th style={{ width: '100px' }}>الدرجة</th>
                  <th>الملاحظة</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>حفظ</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: TOTAL_ASSIGNMENTS_COUNT }, (_, i) => i + 1).map((num) => {
                  const asgName = `التكليف ${num}`;
                  const sub = student.assignmentsMap.get(asgName);
                  const key = `${student.studentId}_${asgName}`;
                  const currentGrade = localGrades[asgName]?.grade || '';
                  const currentNotes = localGrades[asgName]?.notes || '';
                  const isSaving = savingGradeId === key;
                  const isSuccess = saveSuccessMap[key];

                  return (
                    <tr key={num} style={{ background: sub ? 'transparent' : 'rgba(0,0,0,0.01)' }}>
                      {/* اسم التكليف */}
                      <td style={{ fontWeight: '700', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={16} color="var(--primary-color)" />
                          {asgName}
                        </div>
                      </td>

                      {/* حالة التسليم */}
                      <td>
                        {sub ? (
                          <span className="badge-success">
                            <CheckCircle2 size={13} />
                            مسلّم بنجاح
                          </span>
                        ) : (
                          <span className="badge-missing">
                            <Clock size={13} />
                            لم يُسلَّم
                          </span>
                        )}
                      </td>

                      {/* الملف ورابط المعاينة والتاريخ */}
                      <td>
                        {sub ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <a
                              href={sub.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="download-btn"
                              style={{ width: 'fit-content', padding: '4px 10px', fontSize: '12px' }}
                              title={sub.fileName}
                            >
                              <Download size={13} />
                              معاينة ({sub.fileName.slice(-15)})
                            </a>
                            <span dir="ltr" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {sub.timestamp}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            بانتظار رفع الطالب
                          </span>
                        )}
                      </td>

                      {/* إدخال الدرجة */}
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="grade-input-field"
                          placeholder="الدرجة"
                          value={currentGrade}
                          onChange={(e) => handleGradeChange(asgName, 'grade', e.target.value)}
                        />
                      </td>

                      {/* إدخال ملاحظات التقييم */}
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '6px 10px', fontSize: '13px' }}
                          placeholder="اكتب ملاحظة أو توجيه للطالب..."
                          value={currentNotes}
                          onChange={(e) => handleGradeChange(asgName, 'notes', e.target.value)}
                        />
                      </td>

                      {/* زر الحفظ الفردي */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-save-sm"
                          onClick={() => submitSingleGrade(asgName)}
                          disabled={isSaving}
                          style={{
                            background: isSuccess ? 'var(--success-color)' : 'var(--primary-color)'
                          }}
                          title="حفظ الدرجة والملاحظة"
                        >
                          {isSaving ? (
                            <Loader2 className="loader" size={14} />
                          ) : isSuccess ? (
                            <>
                              <CheckCircle2 size={14} /> تم
                            </>
                          ) : (
                            <>
                              <Save size={14} /> حفظ
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
