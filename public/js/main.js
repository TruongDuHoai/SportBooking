import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyA0qNvl-i24wG9wOH-ajLu77MxNFvMvwjU",
    authDomain: "thue-san-the-thao.firebaseapp.com",
    projectId: "thue-san-the-thao",
    storageBucket: "thue-san-the-thao.firebasestorage.app",
    messagingSenderId: "90803956356",
    appId: "1:90803956356:web:7c63edc595f6ad25acb0d1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let tatCaSan = [];

// Hiển thị danh sách sân
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
        if (san.loai === 'caulong') loaiText = 'Cầu lông';
        else if (san.loai === 'pickleball') loaiText = 'Pickleball';
        else loaiText = 'Bóng đá';
        
        html += `
            <div class="san-card">
                <img src="${san.hinhAnh}" alt="${san.ten}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                <div class="info">
                    <div class="ten-san">${san.ten}</div>
                    <div class="loai-san">${loaiText}</div>
                    <div class="gia-san">${san.gia.toLocaleString()}đ / giờ</div>
                    <div class="dia-chi">${san.diaChi || 'Chưa cập nhật'}</div>
                    <button class="btn-dat" onclick="datSan('${san.id}')">Đặt sân</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Tải dữ liệu từ Firebase
async function loadSanTuFirebase() {
    const container = document.getElementById('danhSachSan');
    if (container) container.innerHTML = '<p>Đang tải dữ liệu...</p>';
    
    try {
        const sanCollection = collection(db, "san");
        const snapshot = await getDocs(sanCollection);
        
        if (snapshot.empty) {
            tatCaSan = [];
            container.innerHTML = '<p style="text-align:center;">Chưa có dữ liệu sân.</p>';
        } else {
            tatCaSan = [];
            snapshot.forEach(doc => {
                tatCaSan.push({ id: doc.id, ...doc.data() });
            });
            hienThiSan(tatCaSan);
        }
    } catch (error) {
        console.error("Lỗi:", error);
        container.innerHTML = '<p style="color:red;">Lỗi kết nối Firebase!</p>';
    }
}

// Lọc và sắp xếp
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

// Tìm kiếm
function timKiem() {
    const keyword = document.querySelector('.search-box input')?.value.toLowerCase().trim();
    if (!keyword) return hienThiSan(tatCaSan);
    const ketQua = tatCaSan.filter(s => 
        s.ten.toLowerCase().includes(keyword) || 
        (s.diaChi && s.diaChi.toLowerCase().includes(keyword))
    );
    hienThiSan(ketQua);
}

// Đặt sân
window.datSan = function(sanId) {
    if (!auth.currentUser) {
        alert('Vui lòng đăng nhập để đặt sân!');
        window.location.href = 'dangnhap.html';
        return;
    }
    window.location.href = 'chitiet.html?id=' + sanId;
};

// Kiểm tra đăng nhập
function kiemTraDangNhap() {
    const loginBtn = document.getElementById('loginBtn');
    const userDropdownArea = document.getElementById('userDropdownArea');
    const userInfoBtn = document.getElementById('userInfoBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const logoutDropdownBtn = document.getElementById('logoutDropdownBtn');
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loginBtn.style.display = 'none';
            userDropdownArea.style.display = 'inline-block';
            
            userInfoBtn.onclick = (e) => {
                e.preventDefault();
                dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
            };
            
            document.addEventListener('click', function closeDropdown(e) {
                if (!userDropdownArea.contains(e.target)) {
                    dropdownMenu.style.display = 'none';
                }
            });
            
            if (logoutDropdownBtn) {
                logoutDropdownBtn.onclick = async (e) => {
                    e.preventDefault();
                    await signOut(auth);
                    alert('Đã đăng xuất!');
                    window.location.reload();
                };
            }
        } else {
            loginBtn.style.display = 'inline-block';
            userDropdownArea.style.display = 'none';
            loginBtn.onclick = (e) => {
                e.preventDefault();
                window.location.href = 'dangnhap.html';
            };
        }
    });
}

// Khởi tạo
document.addEventListener('DOMContentLoaded', () => {
    loadSanTuFirebase();
    kiemTraDangNhap();
    
    document.getElementById('locLoaiSan')?.addEventListener('change', locVaSapXep);
    document.getElementById('locKhuVuc')?.addEventListener('change', locVaSapXep);
    document.getElementById('sapXep')?.addEventListener('change', locVaSapXep);
    document.querySelector('.search-box button')?.addEventListener('click', timKiem);
    document.querySelector('.search-box input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') timKiem();
    });
});

console.log('Website đã sẵn sàng!');