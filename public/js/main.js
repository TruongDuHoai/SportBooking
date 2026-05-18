import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

// Firebase config của bạn
const firebaseConfig = {
  apiKey: "AIzaSyA0qNvl-i24wG9wOH-ajLu77MxNFvMvwjU", 
  authDomain: "thue-san-the-thao.firebaseapp.com",
  projectId: "thue-san-the-thao",
  storageBucket: "thue-san-the-thao.firebasestorage.app",
  messagingSenderId: "90803956356",
  appId: "1:90803956356:web:7c63edc595f6ad25acb0d1"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ============= BIẾN TOÀN CỤC =============
let tatCaSan = [];

// ============= HIỂN THỊ DANH SÁCH SÂN =============
function hienThiSan(danhSach) {
    const container = document.getElementById('danhSachSan');
    if (!container) return;
    
    if (danhSach.length === 0) {
        container.innerHTML = '<p style="text-align:center;">Không có sân nào.</p>';
        return;
    }
    
    let html = '';
    danhSach.forEach(san => {
        let loaiText = '';
        let loaiIcon = '';
        if (san.loai === 'caulong') { loaiText = 'Cầu lông'; loaiIcon = '🏸'; }
        else if (san.loai === 'pickleball') { loaiText = 'Pickleball'; loaiIcon = '🎾'; }
        else { loaiText = 'Bóng đá'; loaiIcon = '⚽'; }
        
        html += `
            <div class="san-card">
                <img src="${san.hinhAnh}" alt="${san.ten}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                <div class="info">
                    <div class="ten-san">${loaiIcon} ${san.ten}</div>
                    <div class="loai-san">📌 ${loaiText}</div>
                    <div class="gia-san">💰 ${san.gia.toLocaleString()}đ / giờ</div>
                    <div class="dia-chi">📍 ${san.diaChi || 'Chưa cập nhật'}</div>
                    <button class="btn-dat" onclick="datSan('${san.id}')">📅 Đặt sân</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ============= TẢI DỮ LIỆU TỪ FIREBASE =============
async function loadSanTuFirebase() {
    const container = document.getElementById('danhSachSan');
    if (container) container.innerHTML = '<p style="text-align:center;">⏳ Đang tải dữ liệu...</p>';
    
    try {
        const sanCollection = collection(db, "san");
        const snapshot = await getDocs(sanCollection);
        
        if (snapshot.empty) {
            console.log("Chưa có dữ liệu trong Firebase, dùng dữ liệu mẫu");
            // Dùng dữ liệu mẫu nếu chưa có
            tatCaSan = [
                { id: "1", ten: "Sân Cầu Lông Nguyễn Du", loai: "caulong", gia: 120000, diaChi: "Quận 1", hinhAnh: "https://images.unsplash.com/photo-1534158914592-062992fbea52" },
                { id: "2", ten: "Sân Pickleball Thảo Điền", loai: "pickleball", gia: 150000, diaChi: "Quận 2", hinhAnh: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea" },
                { id: "3", ten: "Sân Bóng Đá Phú Thọ", loai: "bongda", gia: 350000, diaChi: "Quận 10", hinhAnh: "https://images.unsplash.com/photo-1459865264687-595d652de67e" }
            ];
        } else {
            tatCaSan = [];
            snapshot.forEach(doc => {
                tatCaSan.push({ id: doc.id, ...doc.data() });
            });
            console.log("✅ Đã tải", tatCaSan.length, "sân từ Firebase");
        }
        
        hienThiSan(tatCaSan);
        
    } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
        const container = document.getElementById('danhSachSan');
        if (container) container.innerHTML = '<p style="color:red;">❌ Lỗi kết nối Firebase! Kiểm tra lại cấu hình.</p>';
    }
}

// ============= LỌC VÀ SẮP XẾP =============
function locVaSapXep() {
    let ds = [...tatCaSan];
    const loai = document.getElementById('locLoaiSan')?.value;
    const kv = document.getElementById('locKhuVuc')?.value;
    const sp = document.getElementById('sapXep')?.value;
    
    if (loai) ds = ds.filter(s => s.loai === loai);
    if (kv) ds = ds.filter(s => s.diaChi === kv);
    if (sp === 'giaTang') ds.sort((a,b) => a.gia - b.gia);
    if (sp === 'giaGiam') ds.sort((a,b) => b.gia - a.gia);
    if (sp === 'tenAZ') ds.sort((a,b) => a.ten.localeCompare(b.ten));
    
    hienThiSan(ds);
}

// ============= TÌM KIẾM =============
function timKiem() {
    const keyword = document.querySelector('.search-box input')?.value.toLowerCase().trim();
    if (!keyword) return hienThiSan(tatCaSan);
    const ketQua = tatCaSan.filter(s => s.ten.toLowerCase().includes(keyword) || (s.diaChi && s.diaChi.toLowerCase().includes(keyword)));
    hienThiSan(ketQua);
}

// ============= ĐẶT SÂN =============
window.datSan = function(sanId) {
    console.log("San ID:", sanId);  // In ra console để debug
    if (!auth.currentUser) {
        alert('Vui lòng đăng nhập để đặt sân!');
        window.location.href = 'dangnhap.html';
        return;
    }
    window.location.href = 'chitiet.html?id=' + sanId;
};

// ============= KIỂM TRA ĐĂNG NHẬP =============
function kiemTraDangNhap() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfoBtn = document.getElementById('userInfoBtn');
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'inline';
            if (userInfoBtn) {
                userInfoBtn.style.display = 'inline';
                userInfoBtn.onclick = (e) => {
                    e.preventDefault();
                    window.location.href = 'taikhoan.html';
                };
            }
            if (logoutBtn) {
                logoutBtn.onclick = (e) => {
                    e.preventDefault();
                    signOut(auth).then(() => {
                        alert('Đã đăng xuất!');
                        window.location.reload();
                    });
                };
            }
        } else {
            if (loginBtn) loginBtn.style.display = 'inline';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (userInfoBtn) userInfoBtn.style.display = 'none';
            if (loginBtn) {
                loginBtn.onclick = (e) => {
                    e.preventDefault();
                    window.location.href = 'dangnhap.html';
                };
            }
        }
    });
}
// ============= KHỞI TẠO TRANG =============
document.addEventListener('DOMContentLoaded', () => {
    loadSanTuFirebase();  // ← ĐỌC DỮ LIỆU TỪ FIREBASE
    kiemTraDangNhap();
    
    // Gắn sự kiện cho bộ lọc
    document.getElementById('locLoaiSan')?.addEventListener('change', locVaSapXep);
    document.getElementById('locKhuVuc')?.addEventListener('change', locVaSapXep);
    document.getElementById('sapXep')?.addEventListener('change', locVaSapXep);
    document.querySelector('.search-box button')?.addEventListener('click', timKiem);
    
    // Tìm kiếm khi nhấn Enter
    document.querySelector('.search-box input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') timKiem();
    });
});

console.log('✅ Website đã sẵn sàng!');