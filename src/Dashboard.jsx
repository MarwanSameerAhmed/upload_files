import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { Search, Loader2, Download, Lock } from 'lucide-react';

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [filterGroup, setFilterGroup] = useState('');
  const [filterAssignment, setFilterAssignment] = useState('');
  const [searchName, setSearchName] = useState('');

  // يمكنك تغيير كلمة المرور هنا
  const ADMIN_PASSWORD = '123';

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
      
      const formattedData = assignments.map(item => ({
        timestamp: new Date(item.created_at).toLocaleString('ar-EG'),
        studentName: item.student_name,
        studentId: item.student_id,
        groupName: item.group_name,
        assignmentName: item.assignment_name,
        fileName: item.file_name,
        fileUrl: item.file_url
      }));

      setData(formattedData);
    } catch (error) {
      console.error(error);
      alert('حدث خطأ في جلب البيانات من Supabase: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container" style={{maxWidth: '400px', marginTop: '100px'}}>
        <div className="glass-card">
          <div className="header">
            <h2 style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
              <Lock size={24}/> لوحة تحكم المعلم
            </h2>
            <p>يرجى إدخال كلمة المرور</p>
          </div>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <input 
                type="password" 
                className="form-input" 
                placeholder="أدخل كلمة المرور..."
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button className="submit-btn" type="submit">دخول</button>
          </form>
        </div>
      </div>
    );
  }

  const filteredData = data.filter(item => {
    const matchGroup = filterGroup ? item.groupName === filterGroup : true;
    const matchAssignment = filterAssignment ? item.assignmentName === filterAssignment : true;
    const matchName = searchName ? item.studentName.includes(searchName) : true;
    return matchGroup && matchAssignment && matchName;
  });

  return (
    <div className="container dashboard-container" style={{marginTop: '60px'}}>
      <div className="glass-card" style={{padding: '30px'}}>
        <div className="dashboard-header">
          <h2 style={{color: 'var(--text-primary)'}}>إدارة التكاليف ({filteredData.length})</h2>
          <button onClick={fetchData} className="refresh-btn">تحديث البيانات</button>
        </div>
        
        <div className="filters-row">
          <div style={{flex: 1.5, position: 'relative'}}>
            <Search size={18} style={{position: 'absolute', right: '12px', top: '14px', color: 'var(--text-secondary)'}} />
            <input 
              type="text" 
              className="form-input" 
              style={{paddingRight: '38px'}}
              placeholder="ابحث باسم الطالب..."
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
            />
          </div>
          <div style={{flex: 1}}>
            <select 
              className="form-select"
              value={filterGroup}
              onChange={e => setFilterGroup(e.target.value)}
            >
              <option value="">كل المجموعات</option>
              <option value="أولاد - مجموعة 1">أولاد - مجموعة 1</option>
              <option value="أولاد - مجموعة 2">أولاد - مجموعة 2</option>
              <option value="أولاد - مجموعة 3">أولاد - مجموعة 3</option>
              <option value="أولاد - مجموعة 4">أولاد - مجموعة 4</option>
              <option value="بنات - مجموعة 1">بنات - مجموعة 1</option>
              <option value="بنات - مجموعة 2">بنات - مجموعة 2</option>
            </select>
          </div>
          <div style={{flex: 1}}>
            <select 
              className="form-select"
              value={filterAssignment}
              onChange={e => setFilterAssignment(e.target.value)}
            >
              <option value="">كل التكاليف</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                <option key={num} value={`التكليف ${num}`}>التكليف {num}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <Loader2 className="loader" size={40}/> 
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
                  <th>الملف</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr><td colSpan="6" style={{textAlign:'center', padding: '24px'}}>لا توجد بيانات مطابقة للبحث</td></tr>
                ) : (
                  filteredData.map((row, i) => (
                    <tr key={i}>
                      <td dir="ltr" style={{fontSize:'12px', color: 'var(--text-secondary)'}}>{row.timestamp}</td>
                      <td style={{fontWeight: '600'}}>{row.studentName}</td>
                      <td>{row.studentId}</td>
                      <td><span className="badge">{row.groupName}</span></td>
                      <td>{row.assignmentName}</td>
                      <td>
                        <a href={row.fileUrl} target="_blank" rel="noopener noreferrer" className="download-btn">
                          <Download size={16}/> عرض
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
