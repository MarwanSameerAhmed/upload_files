import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, File, Loader2 } from 'lucide-react';
import { supabase, supabaseUrl, supabaseAnonKey } from './supabaseClient';

export default function UploadPage() {
  const [formData, setFormData] = useState({
    studentName: '',
    studentId: '',
    groupName: '',
    assignmentName: ''
  });
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success' | 'error' | null
  const [statusMessage, setStatusMessage] = useState('');
  
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const onFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setUploadStatus('error');
      setStatusMessage('الرجاء إرفاق ملف التكليف');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus(null);
    setStatusMessage('');

    try {
      const fileExt = file.name.split('.').pop();
      const randomName = `${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${fileExt}`;
      const safeStudentId = formData.studentId.replace(/[^0-9a-zA-Z]/g, "");
      // نستخدم مساراً إنجليزياً نقياً 100% لتجنب خطأ Invalid key
      const filePath = `${safeStudentId}/assignment_${randomName}`;

      // استخدام XMLHttpRequest بدلاً من fetch للحصول على نسبة تقدم الرفع الحقيقية
      const uploadUrl = `${supabaseUrl}/storage/v1/object/assignments_bucket/${filePath}`;
      
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${supabaseAnonKey}`);
        xhr.setRequestHeader('apikey', supabaseAnonKey);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(JSON.parse(xhr.responseText).message || 'فشل الرفع'));
          }
        };

        xhr.onerror = () => reject(new Error('فشل الاتصال بالخادم. تأكد من اتصالك بالإنترنت.'));
        xhr.send(file);
      });

      // 2. Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('assignments_bucket')
        .getPublicUrl(filePath);

      const fileUrl = publicUrlData.publicUrl;

      // 3. Save to Supabase Database
      const { error: dbError } = await supabase
        .from('assignments')
        .insert([
          {
            student_name: formData.studentName,
            student_id: formData.studentId,
            group_name: formData.groupName,
            assignment_name: formData.assignmentName,
            file_name: file.name,
            file_url: fileUrl
          }
        ]);

      if (dbError) {
        throw new Error('فشل حفظ البيانات: ' + dbError.message);
      }

      setUploadStatus('success');
      setStatusMessage('تم رفع التكليف بنجاح وبسرعة فائقة!');
      setFormData({ studentName: '', studentId: '', groupName: '', assignmentName: '' });
      setFile(null);
      
    } catch (error) {
      setUploadProgress(0);
      console.error(error);
      setUploadStatus('error');
      setStatusMessage(error.message || 'حدث خطأ غير متوقع أثناء الرفع.');
    } finally {
      setTimeout(() => setIsUploading(false), 500);
    }
  };

  return (
    <div className="container" style={{marginTop: '60px'}}>
      <div className="glass-card">
        <div className="header">
          <h1>منصة تسليم التكاليف</h1>
          <p>Flutter Bootcamp</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">اسم الطالب (الرباعي)</label>
            <input 
              type="text" 
              name="studentName"
              className="form-input" 
              placeholder="أدخل اسمك الكامل..."
              value={formData.studentName}
              onChange={handleInputChange}
              required 
            />
          </div>

          <div style={{display: 'flex', gap: '16px', marginBottom: '24px'}}>
            <div style={{flex: 1}}>
              <label className="form-label">الرقم الأكاديمي</label>
              <input 
                type="text" 
                name="studentId"
                className="form-input" 
                placeholder="مثال: 20211010"
                value={formData.studentId}
                onChange={handleInputChange}
                required 
              />
            </div>
            
            <div style={{flex: 1}}>
              <label className="form-label">المجموعة</label>
              <select 
                name="groupName"
                className="form-select"
                value={formData.groupName}
                onChange={handleInputChange}
                required
              >
                <option value="" disabled>-- اختر مجموعتك --</option>
                <option value="أولاد - مجموعة 1">أولاد - مجموعة 1</option>
                <option value="أولاد - مجموعة 2">أولاد - مجموعة 2</option>
                <option value="أولاد - مجموعة 3">أولاد - مجموعة 3</option>
                <option value="أولاد - مجموعة 4">أولاد - مجموعة 4</option>
                <option value="بنات - مجموعة 1">بنات - مجموعة 1</option>
                <option value="بنات - مجموعة 2">بنات - مجموعة 2</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">اختر التكليف</label>
            <select 
              name="assignmentName"
              className="form-select"
              value={formData.assignmentName}
              onChange={handleInputChange}
              required
            >
              <option value="" disabled>-- الرجاء اختيار التكليف --</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                <option key={num} value={`التكليف ${num}`}>التكليف {num}</option>
              ))}
            </select>
          </div>

          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14.5px', lineHeight: '1.6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 'bold' }}>
              <AlertCircle size={20} />
              <span>تنبيهات هامة قبل الرفع:</span>
            </div>
            <ul style={{ paddingRight: '24px', margin: 0 }}>
              <li style={{marginBottom: '4px'}}>يجب <strong>حذف مجلد <code style={{backgroundColor:'#fef3c7', padding:'2px 6px', borderRadius:'4px'}}>build</code></strong> من مشروع Flutter لتقليل حجم الملف.</li>
              <li style={{marginBottom: '4px'}}>يجب <strong>ضغط مجلد المشروع (Compress to ZIP)</strong>. لن يتم قبول رفع مجلدات عادية.</li>
              <li>الصيغ المقبولة للرفع هي <code>.zip</code> أو <code>.dart</code> فقط.</li>
            </ul>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={onFileSelect}
          />
          <div 
            className={`file-drop-zone ${isDragging ? 'drag-active' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {file ? (
              <>
                <File className="file-icon" />
                <p style={{ color: 'var(--text-primary)' }}>تم اختيار الملف:</p>
                <p className="file-name">{file.name}</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </>
            ) : (
              <>
                <UploadCloud className="file-icon" />
                <p style={{ color: 'var(--text-primary)', marginBottom: '8px', fontWeight: '600' }}>
                  اضغط لاختيار ملف، أو اسحب الملف وأفلته هنا
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  يدعم ملفات .dart أو .zip
                </p>
              </>
            )}
          </div>

          {isUploading && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-color)' }}>
                <span>جاري الرفع...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ width: '100%', backgroundColor: '#e2e8f0', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, backgroundColor: 'var(--primary-color)', height: '100%', transition: 'width 0.3s ease' }}></div>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="submit-btn" 
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="loader" /> جاري الرفع...
              </>
            ) : (
              <>
                إرسال التكليف <UploadCloud size={20} />
              </>
            )}
          </button>

          {uploadStatus && (
            <div className={`status-msg ${uploadStatus === 'success' ? 'status-success' : 'status-error'}`}>
              {uploadStatus === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              {statusMessage}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
