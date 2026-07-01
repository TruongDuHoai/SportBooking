import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
    getFirestore,
    doc,
    getDoc,
    deleteDoc,
    collection,
    addDoc,
    serverTimestamp
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

let currentUser = null;
let cartItems = [];

async function loadCart() {
    const container = document.getElementById("checkoutContent");

    if (!currentUser) {
        window.location.href = "dangnhap.html";
        return;
    }

    try {
        const cartRef = doc(db, "carts", currentUser.uid);
        const cartSnap = await getDoc(cartRef);

        if (!cartSnap.exists()) {
            hienThiGioHangTrong();
            return;
        }

        cartItems = cartSnap.data().items || [];

        if (cartItems.length === 0) {
            hienThiGioHangTrong();
            return;
        }

        hienThiThanhToan();

    } catch (error) {
        console.error("Lỗi tải giỏ hàng:", error);

        container.innerHTML = `
            <div class="empty-cart">
                <p style="color:red;">Không thể tải giỏ hàng</p>
            </div>
        `;
    }
}

function hienThiGioHangTrong() {
    const container = document.getElementById("checkoutContent");

    container.innerHTML = `
        <div class="empty-cart">
            <p>Giỏ hàng đang trống</p>
            <br>
            <a href="chitiet.html?id=san1" style="color:#1a6b30;font-weight:bold;">
                Tiếp tục đặt sân
            </a>
        </div>
    `;
}

function hienThiThanhToan() {
    const container = document.getElementById("checkoutContent");

    let total = 0;
    let itemsHtml = "";

    cartItems.forEach(item => {
        if (item.type === "food") {
            const soLuong = Number(item.soLuong || 1);
            const gia = Number(item.gia || 0);
            const thanhTien = gia * soLuong;
            total += thanhTien;

            itemsHtml += `
                <div class="order-item">
                    <div>
                        <strong>${item.tenMon || item.ten || "Món ăn"}</strong><br>
                        <small>Loại: Đồ ăn / Thức uống</small><br>
                        <small>Số lượng: ${soLuong}</small>
                    </div>

                    <div>
                        <strong>${thanhTien.toLocaleString()}đ</strong>
                    </div>
                </div>
            `;
        } else {
            const gia = Number(item.gia || 0);
            total += gia;

            const gioBatDau = Number(item.gioBatDau || 0);
            const gioKetThuc = Number(item.gioKetThuc || gioBatDau + 1);

            itemsHtml += `
                <div class="order-item">
                    <div>
                        <strong>${item.tenSan || "Sân bóng đá quận 12"}</strong><br>
                        <small>Ngày: ${item.ngayDat || "Không có ngày"}</small><br>
                        <small>Giờ: ${gioBatDau}:00 - ${gioKetThuc}:00</small>
                    </div>

                    <div>
                        <strong>${gia.toLocaleString()}đ</strong>
                    </div>
                </div>
            `;
        }
    });

    container.innerHTML = `
        <div class="checkout-card">
            <h3>Thông tin đơn hàng</h3>

            ${itemsHtml}

            <div class="order-total">
                Tổng tiền: <span>${total.toLocaleString()}đ</span>
            </div>

            <h3>Thông tin người đặt</h3>

            <div class="form-group">
                <input type="text" id="fullName"
                    placeholder="Họ tên"
                    value="${currentUser.displayName || ''}">
            </div>

            <div class="form-group">
                <input type="email" id="email"
                    value="${currentUser.email || ''}" readonly>
            </div>

            <div class="form-group">
                <input type="tel" id="phone"
                    placeholder="Số điện thoại">
            </div>

            <div class="payment-methods">
                <label>
                    <input type="radio" name="paymentMethod" value="cod" checked>
                    Thanh toán tại sân
                </label>

                <label>
                    <input type="radio" name="paymentMethod" value="bank">
                    Chuyển khoản ngân hàng
                </label>

                <label>
                    <input type="radio" name="paymentMethod" value="momo">
                    Ví MoMo
                </label>
            </div>

            <button class="btn-submit btn-main" id="submitOrderBtn">
                Xác nhận thanh toán
            </button>

            <button class="btn-submit btn-back" id="backCartBtn">
                Quay lại giỏ hàng
            </button>
        </div>
    `;

    document.getElementById("submitOrderBtn").addEventListener("click", submitOrder);

    document.getElementById("backCartBtn").addEventListener("click", () => {
        window.location.href = "giohang.html";
    });
}

function validatePhone(phone) {
    return /^0[0-9]{9}$/.test(phone);
}

function showPaymentModal(methodText, total) {
    return new Promise((resolve) => {
        const modal = document.getElementById("paymentModal");
        const modalText = document.getElementById("paymentModalText");
        const paymentContent = document.getElementById("paymentContent");
        const confirmPaidBtn = document.getElementById("confirmPaidBtn");
        const cancelPaymentBtn = document.getElementById("cancelPaymentBtn");
        const qrImage = document.getElementById("qrImage");

        const code = "SB" + Date.now();

        modalText.innerHTML = `
            Phương thức: <strong>${methodText}</strong><br>
            Số tiền: <strong>${total.toLocaleString()}đ</strong>
        `;

        paymentContent.textContent = code;

        const qrText = `SPORTBOOKING|${methodText}|${total}|${code}`;
        qrImage.src =
            `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrText)}`;

        modal.style.display = "flex";

        confirmPaidBtn.onclick = () => {
            modal.style.display = "none";
            resolve({
                paid: true,
                code: code
            });
        };

        cancelPaymentBtn.onclick = () => {
            modal.style.display = "none";
            resolve({
                paid: false,
                code: ""
            });
        };
    });
}

async function submitOrder() {
    const fullName = document.getElementById("fullName").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;

    if (!fullName) {
        alert("Vui lòng nhập họ tên");
        return;
    }

    if (!phone) {
        alert("Vui lòng nhập số điện thoại");
        return;
    }

    if (!validatePhone(phone)) {
        alert("Số điện thoại không hợp lệ");
        return;
    }

    let methodText = "";

    if (paymentMethod === "cod") {
        methodText = "Thanh toán tại sân";
    } else if (paymentMethod === "bank") {
        methodText = "Chuyển khoản ngân hàng";
    } else {
        methodText = "Ví MoMo";
    }

    const total = cartItems.reduce((sum, item) => {
        if (item.type === "food") {
            return sum + Number(item.gia || 0) * Number(item.soLuong || 1);
        }
        return sum + Number(item.gia || 0);
    }, 0);

    if (paymentMethod === "cod") {
        const confirmCOD = confirm(
            `Xác nhận đặt sân ${total.toLocaleString()}đ?\nThanh toán tại sân`
        );

        if (!confirmCOD) return;
    }

    let paymentStatus = "Chưa thanh toán";
    let orderStatus = "Chờ xác nhận";

    let paymentCode = "";

    if (paymentMethod === "bank" || paymentMethod === "momo") {
        const result = await showPaymentModal(methodText, total);

        if (!result.paid) {
            alert("Bạn đã hủy thanh toán.");
            return;
        }

        paymentCode = result.code;
        paymentStatus = "Chờ xác nhận thanh toán";
        orderStatus = "Chờ xác nhận";
    }

    const btn = document.getElementById("submitOrderBtn");
    btn.disabled = true;
    btn.textContent = "Đang xử lý...";

    try {
        const sanItems = cartItems.filter(item => item.type !== "food");
        const foodItems = cartItems.filter(item => item.type === "food");

        for (const item of sanItems) {
            const gioBatDau = Number(item.gioBatDau || 0);
            const gioKetThuc = Number(item.gioKetThuc || gioBatDau + 1);

            await addDoc(collection(db, "donDat"), {
                userId: currentUser.uid,
                userEmail: currentUser.email || "",
                userName: fullName,
                userPhone: phone,

                sanId: item.sanId || "san1",
                tenSan: item.tenSan || "Sân bóng đá quận 12",
                ngayDat: item.ngayDat || "",
                gioBatDau: gioBatDau,
                gioKetThuc: gioKetThuc,

                gia: Number(item.gia || 0),
                tongTien: Number(item.gia || 0),

                diaChi: item.diaChi || "Quận 12",
                loai: item.loai || "bongda",
                hinhAnh: item.hinhAnh || "",

                trangThai: orderStatus,
                phuongThucThanhToan: methodText,
                trangThaiThanhToan: paymentStatus,

                maThanhToan: paymentCode,
                soTienThanhToan: total,

                createdAt: new Date().toISOString(),
                createdAtServer: serverTimestamp()
            });
        }

        if (foodItems.length > 0) {
            const foodTotal = foodItems.reduce((sum, item) => {
                return sum + Number(item.gia || 0) * Number(item.soLuong || 1);
            }, 0);

            const foodOrderRef = await addDoc(collection(db, "donDoAn"), {
                userId: currentUser.uid,
                userEmail: currentUser.email || "",
                userName: fullName,
                userPhone: phone,

                items: foodItems.map(item => ({
                    id: item.id || "",
                    tenMon: item.tenMon || item.ten || "Món ăn",
                    danhMuc: item.danhMuc || "",
                    gia: Number(item.gia || 0),
                    soLuong: Number(item.soLuong || 1),
                    hinhAnh: item.hinhAnh || "",
                    moTa: item.moTa || ""
                })),

                tongTien: foodTotal,
                trangThai: orderStatus,
                phuongThucThanhToan: methodText,
                trangThaiThanhToan: paymentStatus,

                createdAt: new Date().toISOString(),
                createdAtServer: serverTimestamp()
            });

            await addDoc(collection(db, "notifications"), {
                type: "food_order",
                title: "Có đơn đồ ăn mới",
                message: `${fullName} vừa đặt ${foodItems.length} món đồ ăn/nước uống.`,
                orderId: foodOrderRef.id,
                userId: currentUser.uid,
                userName: fullName,
                userPhone: phone,
                tongTien: foodTotal,
                isRead: false,
                createdAt: new Date().toISOString(),
                createdAtServer: serverTimestamp()
            });
        }

        await deleteDoc(doc(db, "carts", currentUser.uid));

        alert("Thanh toán thành công!");
        window.location.href = "lichsu.html";

    } catch (error) {
        console.error("LỖI THANH TOÁN:", error);
        alert("Thanh toán thất bại: " + error.message);

        btn.disabled = false;
        btn.textContent = "Xác nhận thanh toán";
    }
}

function setupAuthUI() {
    const loginBtn = document.getElementById("loginBtn");
    const userDropdownArea = document.getElementById("userDropdownArea");
    const userInfoBtn = document.getElementById("userInfoBtn");
    const dropdownMenu = document.getElementById("dropdownMenu");
    const logoutBtn = document.getElementById("logoutBtn") || document.getElementById("logoutDropdownBtn");

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;

            if (loginBtn) loginBtn.style.display = "none";
            if (userDropdownArea) userDropdownArea.style.display = "inline-block";

            if (userInfoBtn && dropdownMenu) {
                userInfoBtn.onclick = (e) => {
                    e.preventDefault();

                    dropdownMenu.style.display =
                        dropdownMenu.style.display === "none"
                            ? "block"
                            : "none";
                };
            }

            loadCart();

        } else {
            window.location.href = "dangnhap.html";
        }
    });

    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            await signOut(auth);
            window.location.href = "index.html";
        };
    }

    document.addEventListener("click", (e) => {
        if (
            userDropdownArea &&
            dropdownMenu &&
            !userDropdownArea.contains(e.target)
        ) {
            dropdownMenu.style.display = "none";
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    setupAuthUI();
});