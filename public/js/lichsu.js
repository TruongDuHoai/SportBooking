import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

let allBookings = [];
let currentUser = null;
let currentStatus = "all";
let currentKeyword = "";

function getStatusInfo(status) {
    const normalized = (status || "").toLowerCase().trim();
    
    const isConfirmed = normalized === "đã_xác_nhận" || normalized === "đã xác nhận";
    const isPending = normalized === "chờ_xác_nhận" || normalized === "chờ xác nhận";
    const isCancelled = normalized === "đã_hủy" || normalized === "đã hủy";
    
    if (isConfirmed) {
        return { class: "success", text: "Đã xác nhận" };
    } else if (isPending) {
        return { class: "pending", text: "Chờ xác nhận" };
    } else if (isCancelled) {
        return { class: "cancel", text: "Đã hủy" };
    } else {
        return { class: "pending", text: status || "Chờ xác nhận" };
    }
}

async function loadBookings(uid) {
    const q = query(collection(db, "donDat"), where("userId", "==", uid));
    const snap = await getDocs(q);

    allBookings = [];

    snap.forEach(docSnap => {
        const data = docSnap.data();
        allBookings.push({ id: docSnap.id, ...data });
    });

    allBookings.sort((a, b) => {
        const timeA = a.createdAt?.seconds
            ? a.createdAt.seconds * 1000
            : new Date(a.createdAt || 0).getTime();

        const timeB = b.createdAt?.seconds
            ? b.createdAt.seconds * 1000
            : new Date(b.createdAt || 0).getTime();

        return timeB - timeA;
    });

    allBookings = mergeBookings(allBookings);
    applyFilters();
}

function mergeBookings(bookings) {
    const groups = {};

    bookings.forEach(item => {
        const key = item.orderGroupId || item.maThanhToan || item.createdAt || item.id;

        if (!groups[key]) {
            groups[key] = {
                ...item,
                sanInfo: null,
                foodItems: [],
                tongTien: 0,
                ids: [],
                trangThai: item.trangThai || "Chờ xác nhận",
                type: item.type || "field"
            };
        }

        groups[key].ids.push(item.id);
        groups[key].tongTien += Number(item.tongTien || item.gia || 0);

        if (item.trangThai) {
            groups[key].trangThai = item.trangThai;
        }

        if (item.type === "food") {
            const foodName = item.tenMon || item.tenSan || "Món ăn";
            const quantity = Number(item.soLuong || 1);
            groups[key].foodItems.push(foodName + " x" + quantity);
        } else {
            if (!groups[key].sanInfo) {
                groups[key].sanInfo = {
                    tenSan: item.tenSan,
                    ngayDat: item.ngayDat,
                    gioBatDau: Number(item.gioBatDau),
                    gioKetThuc: Number(item.gioKetThuc)
                };
            } else {
                groups[key].sanInfo.gioBatDau = Math.min(
                    groups[key].sanInfo.gioBatDau,
                    Number(item.gioBatDau)
                );
                groups[key].sanInfo.gioKetThuc = Math.max(
                    groups[key].sanInfo.gioKetThuc,
                    Number(item.gioKetThuc)
                );
            }
        }
    });

    return Object.values(groups);
}

function renderBookings(bookings) {
    const box = document.getElementById("bookingList");

    if (bookings.length === 0) {
        box.innerHTML = `
            <div class="empty-box">
                <p>Chưa có lịch sử đặt sân</p>
            </div>
        `;
        return;
    }

    let html = "";

    bookings.forEach(item => {
        const statusInfo = getStatusInfo(item.trangThai);
        const isCancelled = (item.trangThai || "").toLowerCase().includes("hủy");

        html += `
            <div class="booking-card">
                <div class="booking-top">
                    <div class="booking-info">
                        <h3>Đơn hàng SportBooking</h3>

                        ${item.sanInfo ? `
                            <p><strong>Sân:</strong> ${item.sanInfo.tenSan}</p>
                            <p><strong>Ngày:</strong> ${item.sanInfo.ngayDat}</p>
                            <p><strong>Giờ:</strong> ${item.sanInfo.gioBatDau}:00 - ${item.sanInfo.gioKetThuc}:00</p>
                        ` : ''}

                        ${item.foodItems && item.foodItems.length > 0 ? `
                            <p><strong>Đồ ăn / thức uống:</strong> ${item.foodItems.join(", ")}</p>
                        ` : ''}

                        <p><strong>Tổng tiền:</strong> ${(item.tongTien || 0).toLocaleString()}đ</p>
                    </div>

                    <div>
                        <div class="status ${statusInfo.class}">
                            ${statusInfo.text}
                        </div>
                    </div>
                </div>

                <div class="booking-actions">
                    ${item.sanInfo ? `
                        <button class="btn btn-rebook" onclick="window.location.href='chitiet.html?id=${item.sanId || 'san1'}'">
                            Đặt lại
                        </button>
                    ` : `
                        <button class="btn btn-rebook" onclick="window.location.href='doan.html'">
                            Đặt lại
                        </button>
                    `}

                    ${!isCancelled ? `
                        <button class="btn btn-cancel" onclick='huyDonNhieu(${JSON.stringify(item.ids)})'>
                            Hủy đơn
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    box.innerHTML = html;
}

function applyFilters() {
    let result = [...allBookings];

    if (currentStatus !== "all") {
        const filterValue = currentStatus.toLowerCase().trim();
        
        result = result.filter(item => {
            const status = (item.trangThai || "").toLowerCase().trim();
            
            const isConfirmed = status === "đã_xác_nhận" || status === "đã xác nhận";
            const isPending = status === "chờ_xác_nhận" || status === "chờ xác nhận";
            const isCancelled = status === "đã_hủy" || status === "đã hủy";
            
            if (filterValue === "đã xác nhận" || filterValue === "đã_xác_nhận") {
                return isConfirmed;
            } else if (filterValue === "chờ xác nhận" || filterValue === "chờ_xác_nhận") {
                return isPending;
            } else if (filterValue === "đã hủy" || filterValue === "đã_hủy") {
                return isCancelled;
            }
            
            return status === filterValue;
        });
    }

    if (currentKeyword.trim() !== "") {
        const keyword = currentKeyword.toLowerCase().trim();
        result = result.filter(item => {
            const sanName = (item.sanInfo?.tenSan || "").toLowerCase();
            const ngay = (item.sanInfo?.ngayDat || "").toLowerCase();
            const status = (item.trangThai || "").toLowerCase();
            const food = (item.foodItems || []).join(" ").toLowerCase();
            
            return sanName.includes(keyword) ||
                   ngay.includes(keyword) ||
                   status.includes(keyword) ||
                   food.includes(keyword);
        });
    }

    renderBookings(result);
}

window.huyDonNhieu = async function(ids) {
    if (!confirm("Bạn chắc chắn muốn hủy đơn này?")) return;

    try {
        for (const id of ids) {
            await updateDoc(doc(db, "donDat", id), {
                trangThai: "đã_hủy",
                updatedAt: new Date()
            });
        }

        alert("Đã hủy đơn thành công!");
        loadBookings(currentUser.uid);
    } catch (error) {
        console.error("Lỗi hủy đơn:", error);
        alert("Không thể hủy đơn. Vui lòng thử lại!");
    }
};

document.getElementById("filterStatus").addEventListener("change", (e) => {
    currentStatus = e.target.value;
    applyFilters();
});

document.getElementById("historySearch").addEventListener("keyup", (e) => {
    currentKeyword = e.target.value;
    applyFilters();
});

onAuthStateChanged(auth, (user) => {
    const loginBtn = document.getElementById("loginBtn");
    const userDropdownArea = document.getElementById("userDropdownArea");
    const userInfoBtn = document.getElementById("userInfoBtn");
    const dropdownMenu = document.getElementById("dropdownMenu");

    if (user) {
        currentUser = user;
        loginBtn.style.display = "none";
        userDropdownArea.style.display = "inline-block";

        userInfoBtn.onclick = () => {
            dropdownMenu.style.display =
                dropdownMenu.style.display === "none" ? "block" : "none";
        };

        loadBookings(user.uid);
    } else {
        window.location.href = "dangnhap.html";
    }
});

document.getElementById("logoutBtn").onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
};

window.datLai = function(sanId) {
    window.location.href = "chitiet.html?id=" + sanId;
};