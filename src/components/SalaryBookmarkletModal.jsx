import React, { useState } from 'react';
import { 
  Zap, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  Laptop, 
  ShieldCheck, 
  Sparkles,
  Bookmark
} from 'lucide-react';
import { useModalNotification } from '../context/ModalNotificationContext';

export default function SalaryBookmarkletModal({ isOpen, onClose }) {
  const { toast } = useModalNotification();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const bookmarkletCode = `javascript:(async function(){const U='https://neflzvrowmjkgixaejzt.supabase.co',K='sb_publishable_uFoc3K6tzISb8LXv-CBDLA_cQltuQBx',T=document.body.innerText;let D=0;const R=[/(?:สุทธิ|รับสุทธิ|เงินได้สุทธิ|Net Pay|คงรับ)[^\\d]*([\\d,]+\\.?\\d*)/i,/(?:เงินเดือน|Salary)[^\\d]*([\\d,]+\\.?\\d*)/i];for(const r of R){const m=T.match(r);if(m&&m[1]){const p=parseFloat(m[1].replace(/,/g,''));if(p>1000){D=p;break;}}}const S=prompt('💰 ตรวจพบยอดเงินเดือน: '+(D>0?D.toLocaleString():'')+'\\n\\nกรุณายืนยันยอดเงินเดือนสุทธิที่จะส่งเข้ากระเป๋า [เงินเดือนชลประทานวิทยา]:',D>0?D:'17993.32');if(!S)return;const F=parseFloat(S.replace(/,/g,''));if(isNaN(F)||F<=0){alert('⚠️ ยอดเงินไม่ถูกต้อง');return;}const B=document.createElement('div');B.style='position:fixed;top:20px;right:20px;z-index:999999;background:#0d121f;color:#fff;border:2px solid #06b6d4;padding:16px 20px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.8);font-family:sans-serif;font-size:14px;';B.innerHTML='⏳ กำลังซิงค์ยอด ฿'+F.toLocaleString()+' เข้า Supabase Cloud...';document.body.appendChild(B);try{const r=await fetch(U+'/rest/v1/app_state?id=eq.CURRENT_SOT&select=data',{headers:{apikey:K,Authorization:'Bearer '+K}});const j=await r.json();let d=j&&j[0]&&j[0].data?j[0].data:{};if(d.accounts){d.accounts=d.accounts.map(a=>(a.id==='KTB-SALARY'||a.category==='SALARY')?{...a,balance:F,updatedAt:new Date().toISOString()}:a);}await fetch(U+'/rest/v1/app_state',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'},body:JSON.stringify({id:'CURRENT_SOT',data:d,updated_at:new Date().toISOString()})});B.style.borderColor='#10b981';B.innerHTML='🎉 ซิงค์ยอดเงินเดือน ฿'+F.toLocaleString()+' สำเร็จแล้ว!<br><span style="font-size:11px;color:#94a3b8">เปิดเว็บ Personal Finance AI ดูตัวเลขได้ทันที</span>';setTimeout(()=>B.remove(),4500);}catch(e){B.style.borderColor='#f43f5e';B.innerHTML='❌ ซิงค์ไม่สำเร็จ: '+e.message;setTimeout(()=>B.remove(),5000);}})();`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopied(true);
    toast('📋 คัดลอกโค้ด Bookmarklet เรียบร้อยแล้ว!', { type: 'success' });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5, 7, 13, 0.88)',
      backdropFilter: 'blur(14px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3500,
      padding: '16px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '580px',
          padding: '28px',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(15, 23, 42, 0.99))',
          border: '1px solid rgba(6, 182, 212, 0.4)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.9), 0 0 35px rgba(6, 182, 212, 0.25)',
          animation: 'modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(6, 182, 212, 0.3)'
            }}>
              <Zap size={22} color="var(--accent-cyan)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                ⚡ ปุ่มลัดดูดยอดเงินเดือน (Salary Bookmarklet)
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                คลิกเดียวบนหน้าเว็บเงินเดือนของที่ทำงาน ดูดยอดเข้ากระเป๋าอัตโนมัติ
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Instructions */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Bookmark size={16} /> วิธีติดตั้งบนเบราว์เซอร์ (ทำครั้งเดียว):
          </h4>
          <ol style={{ paddingLeft: '20px', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: '1.5' }}>
            <li>เปิดแถบบุ๊กมาร์กของเบราว์เซอร์ (กด <strong>Ctrl + Shift + B</strong>)</li>
            <li><strong>ลากปุ่มสีฟ้าด้านล่างนี้</strong> ไปวางบนแถบบุ๊กมาร์ก (Bookmarks Bar) ได้ทันที</li>
            <li>(หรือกด Copy โค้ดด้านล่าง แล้วสร้าง Bookmark ใหม่ วางในช่อง URL)</li>
          </ol>
        </div>

        {/* Draggable Bookmarklet Button */}
        <div style={{
          textAlign: 'center',
          padding: '18px',
          background: 'rgba(6, 182, 212, 0.08)',
          border: '2px dashed var(--accent-cyan)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '10px' }}>
            👇 ลากปุ่มนี้ขึ้นไปวางบนแถบ Bookmark ของ Chrome/Edge ได้เลย
          </span>

          <a
            href={bookmarkletCode}
            onClick={(e) => { e.preventDefault(); toast('💡 ลากปุ่มนี้ไปวางบนแถบบุ๊กมาร์ก (Bookmarks Bar) ด้านบนของเบราว์เซอร์ครับ', { type: 'info' }); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
              color: '#fff',
              padding: '10px 22px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.92rem',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)',
              cursor: 'grab'
            }}
          >
            <Zap size={16} /> ⚡ ดูดยอดเงินเดือน (Sync Salary)
          </a>
        </div>

        {/* How to use */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.06)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.5',
          marginBottom: '20px'
        }}>
          🎯 <strong>วิธีใช้งานเมื่อเงินเดือนออก:</strong>
          <p style={{ marginTop: '4px' }}>
            ล็อกอินเข้าเว็บเงินเดือนที่ทำงานตามปกติ ➡️ กดปุ่ม <strong>"⚡ ดูดยอดเงินเดือน"</strong> บนแถบบุ๊กมาร์ก 1 คลิก ➡️ ยอดเงินจะถูกส่งขึ้น Supabase Cloud ของเราทันที!
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handleCopy}
            className="btn btn-outline"
            style={{ fontSize: '0.82rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {copied ? <Check size={15} color="var(--accent-emerald)" /> : <Copy size={15} />}
            {copied ? 'คัดลอกโค้ดแล้ว' : 'คัดลอกโค้ด JavaScript'}
          </button>

          <button 
            type="button" 
            onClick={onClose}
            className="btn btn-primary"
            style={{ padding: '8px 22px' }}
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
