import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
    getAuth,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

let bannerCurrentIndex = 0;
let bannerTimer = null;

function escapeBannerHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getSafeBannerLink(value) {
    const url = String(value || "").trim();

    if (!url) {
        return "#";
    }

    if (/^https?:\/\//i.test(url)) {
        return url;
    }

    if (/^[a-zA-Z0-9_./?=&%#-]+$/.test(url)) {
        return url;
    }

    return "#";
}

async function loadCustomerBanners() {
    const section = document.getElementById(
        "customerBannerSection"
    );

    const container = document.getElementById(
        "customerBannerContainer"
    );

    if (!section || !container) {
        return;
    }

    try {
        const snapshot = await getDocs(
            collection(db, "banners")
        );

        const banners = [];

        snapshot.forEach((docSnap) => {
            const banner = {
                ...docSnap.data(),
                id: docSnap.id
            };

            if (banner.active === true) {
                banners.push(banner);
            }
        });

        banners.sort((a, b) => {
            return (
                Number(a.displayOrder || 0) -
                Number(b.displayOrder || 0)
            );
        });

        if (banners.length === 0) {
            section.hidden = true;
            container.innerHTML = "";
            return;
        }

        let slidesHTML = "";

        banners.forEach((banner, index) => {
            const title = escapeBannerHTML(
                banner.title || "SportBooking"
            );

            const description = escapeBannerHTML(
                banner.description || ""
            );

            const buttonText = escapeBannerHTML(
                banner.buttonText || "Xem ngay"
            );

            const targetUrl = getSafeBannerLink(
                banner.targetUrl
            );

            const imageUrl =
                /^https?:\/\//i.test(
                    String(banner.imageUrl || "")
                )
                    ? banner.imageUrl
                    : "https://placehold.co/1200x450?text=SportBooking";

            slidesHTML += `
                <div
                    class="customer-banner-slide ${
                        index === 0 ? "active" : ""
                    }"
                    style="
                        background-image:
                            linear-gradient(
                                90deg,
                                rgba(7, 24, 15, 0.88),
                                rgba(7, 24, 15, 0.28)
                            ),
                            url('${imageUrl}');
                    "
                >
                    <div class="customer-banner-content">
                        <h2>${title}</h2>

                        ${
                            description
                                ? `<p>${description}</p>`
                                : ""
                        }

                        <a
                            href="${targetUrl}"
                            class="customer-banner-button"
                        >
                            ${buttonText}
                            <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </div>
            `;
        });

        let navigationHTML = "";

        if (banners.length > 1) {
            navigationHTML = `
                <div class="customer-banner-navigation">
                    <button
                        type="button"
                        id="previousCustomerBanner"
                        aria-label="Banner trước"
                    >
                        <i class="fas fa-chevron-left"></i>
                    </button>

                    <button
                        type="button"
                        id="nextCustomerBanner"
                        aria-label="Banner tiếp theo"
                    >
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>

                <div class="customer-banner-dots">
                    ${banners
                        .map(
                            (_, index) => `
                                <button
                                    type="button"
                                    class="customer-banner-dot ${
                                        index === 0
                                            ? "active"
                                            : ""
                                    }"
                                    data-banner-index="${index}"
                                    aria-label="Banner ${index + 1}"
                                ></button>
                            `
                        )
                        .join("")}
                </div>
            `;
        }

        container.innerHTML = `
            <div class="customer-banner-wrapper">
                ${slidesHTML}
                ${navigationHTML}
            </div>
        `;

        section.hidden = false;

        const slides = Array.from(
            container.querySelectorAll(
                ".customer-banner-slide"
            )
        );

        const dots = Array.from(
            container.querySelectorAll(
                ".customer-banner-dot"
            )
        );

        function showBanner(index) {
            if (slides.length === 0) {
                return;
            }

            bannerCurrentIndex =
                (index + slides.length) %
                slides.length;

            slides.forEach((slide, slideIndex) => {
                slide.classList.toggle(
                    "active",
                    slideIndex === bannerCurrentIndex
                );
            });

            dots.forEach((dot, dotIndex) => {
                dot.classList.toggle(
                    "active",
                    dotIndex === bannerCurrentIndex
                );
            });
        }

        const previousButton =
            document.getElementById(
                "previousCustomerBanner"
            );

        const nextButton =
            document.getElementById(
                "nextCustomerBanner"
            );

        if (previousButton) {
            previousButton.addEventListener(
                "click",
                () => {
                    showBanner(
                        bannerCurrentIndex - 1
                    );
                }
            );
        }

        if (nextButton) {
            nextButton.addEventListener(
                "click",
                () => {
                    showBanner(
                        bannerCurrentIndex + 1
                    );
                }
            );
        }

        dots.forEach((dot) => {
            dot.addEventListener("click", () => {
                showBanner(
                    Number(dot.dataset.bannerIndex)
                );
            });
        });

        if (bannerTimer) {
            clearInterval(bannerTimer);
        }

        if (slides.length > 1) {
            bannerTimer = setInterval(() => {
                showBanner(
                    bannerCurrentIndex + 1
                );
            }, 5000);
        }

    } catch (error) {
        console.error(
            "Lỗi tải banner khách hàng:",
            error
        );

        section.hidden = true;
    }
}

function loadNotifications(user) {
    console.log("Đang load notification cho UID:", user.uid);
    const notificationBox = document.getElementById("notificationBox");
    const notificationBell = document.getElementById("notificationBell");
    const notificationBadge = document.getElementById("notificationBadge");
    const notificationDropdown = document.getElementById("notificationDropdown");
    const notificationList = document.getElementById("notificationList");

    if (!notificationBox || !user) return;

    notificationBox.style.display = "inline-block";

    const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snapshot) => {
        console.log("Số thông báo:", snapshot.size);
        let unreadCount = 0;
        let html = "";

        if (snapshot.empty) {
            notificationList.innerHTML = `
                <p style="padding:15px;color:#777;">
                    Chưa có thông báo.
                </p>
            `;
            notificationBadge.style.display = "none";
            return;
        }

        snapshot.forEach((docSnap) => {
            const n = docSnap.data();

            if (!n.isRead) unreadCount++;

            html += `
                <div
                    onclick="markNotificationRead('${docSnap.id}')"
                    style="
                        padding:12px;
                        border-bottom:1px solid #eee;
                        cursor:pointer;
                        background:${n.isRead ? "#fff" : "#e8f5e9"};
                    ">

                    <strong>${n.title}</strong>

                    <p style="margin:6px 0;">
                        ${n.message}
                    </p>

                    <small style="color:#888;">
                        ${
                            n.createdAt
                                ? new Date(n.createdAt).toLocaleString("vi-VN")
                                : ""
                        }
                    </small>

                </div>
                `;
        });

        notificationList.innerHTML = html;

        if (unreadCount > 0) {
            notificationBadge.textContent = unreadCount;
            notificationBadge.style.display = "flex";
        } else {
            notificationBadge.style.display = "none";
        }
    });

    notificationBell.onclick = (e) => {
        e.preventDefault();

        notificationDropdown.style.display =
            notificationDropdown.style.display === "block"
                ? "none"
                : "block";
    };

    document.addEventListener("click", (e) => {

        if (
            !notificationBox.contains(e.target)
        ) {
            notificationDropdown.style.display = "none";
        }

    });
}

window.markNotificationRead = async function(id){

    try{

        await updateDoc(
            doc(db,"notifications",id),
            {
                isRead:true
            }
        );

    }catch(error){

        console.error(error);

    }

}

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

// ============= LỌC VÀ SẮP XẾP =============
function locVaSapXep() {
    let ds = [...tatCaSan];
    
    // Lấy giá trị từ các dropdown
    const loai = document.getElementById('locLoaiSan')?.value;
    const kvRaw = document.getElementById('locKhuVuc')?.value;
    const sp = document.getElementById('sapXep')?.value;
    
    // 1. Lọc theo loại sân
    if (loai) {
        ds = ds.filter(s => s.loai === loai);
    }
    
    // 2. Lọc theo khu vực (không phân biệt chữ hoa/thường, có dấu/không dấu)
    if (kvRaw) {
        // Hàm đơn giản hóa chuỗi: loại bỏ dấu tiếng Việt và chuyển về chữ thường
        function simplifyString(str) {
            if (!str) return '';
            return str.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Xóa dấu tiếng Việt
                .replace(/đ/g, 'd'); // Xử lý riêng chữ 'đ'
        }
        
        const kvSimplified = simplifyString(kvRaw);
        ds = ds.filter(s => {
            if (!s.diaChi) return false;
            // So sánh chuỗi đã được đơn giản hóa
            return simplifyString(s.diaChi).includes(kvSimplified);
        });
        
        // Thêm log để debug (bạn có thể xem trên Console trình duyệt)
        console.log('Đã lọc theo khu vực:', kvRaw, 'Số lượng kết quả:', ds.length);
    }
    
    // 3. Sắp xếp
    if (sp === 'giaTang') {
        ds.sort((a,b) => a.gia - b.gia);
    } else if (sp === 'giaGiam') {
        ds.sort((a,b) => b.gia - a.gia);
    } else if (sp === 'tenAZ') {
        ds.sort((a,b) => a.ten.localeCompare(b.ten));
    }
    
    // Hiển thị kết quả đã lọc và sắp xếp
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

             loadNotifications(user);
            
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
    loadCustomerBanners();
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