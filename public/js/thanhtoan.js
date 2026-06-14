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
        const gia = Number(item.gia || 0);
        total += gia;

        itemsHtml += `
            <div class="order-item">
                <div>
                    <strong>${item.tenSan}</strong><br>
                    <small>Ngày: ${item.ngayDat}</small><br>
                    <small>Giờ: ${item.gioBatDau}:00 - ${item.gioKetThuc}:00</small>
                </div>

                <div>
                    <strong>${gia.toLocaleString()}đ</strong>
                </div>
            </div>
        `;
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

    document.getElementById("submitOrderBtn")
        .addEventListener("click", submitOrder);

    document.getElementById("backCartBtn")
        .addEventListener("click", () => {
            window.location.href = "giohang.html";
        });
}

function validatePhone(phone) {
    return /^0[0-9]{9}$/.test(phone);
}

async function submitOrder() {
    const fullName = document.getElementById("fullName").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const paymentMethod =
        document.querySelector('input[name="paymentMethod"]:checked').value;

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
        return sum + Number(item.gia || 0);
    }, 0);

    if (!confirm(`Xác nhận thanh toán ${total.toLocaleString()}đ ?`)) {
        return;
    }

    const btn = document.getElementById("submitOrderBtn");
    btn.disabled = true;
    btn.textContent = "Đang xử lý...";

    try {
        for (const item of cartItems) {
            await addDoc(collection(db, "donDat"), {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                userName: fullName,
                userPhone: phone,

                sanId: item.sanId,
                tenSan: item.tenSan,
                ngayDat: item.ngayDat,
                gioBatDau: Number(item.gioBatDau),
                gioKetThuc: Number(item.gioKetThuc),

                gia: Number(item.gia),
                tongTien: Number(item.gia),

                diaChi: item.diaChi || "",
                loai: item.loai || "",
                hinhAnh: item.hinhAnh || "",

                trangThai: "Chờ xác nhận",
                phuongThucThanhToan: methodText,
                trangThaiThanhToan:
                    paymentMethod === "cod"
                        ? "Chưa thanh toán"
                        : "Chờ thanh toán",

                createdAt: new Date().toISOString(),
                createdAtServer: serverTimestamp()
            });
        }

        await deleteDoc(doc(db, "carts", currentUser.uid));

        alert("Đặt sân thành công!");
        window.location.href = "lichsu.html";

    } catch (error) {
        console.error(error);
        alert("Thanh toán thất bại");

        btn.disabled = false;
        btn.textContent = "Xác nhận thanh toán";
    }
}

function setupAuthUI() {
    const loginBtn = document.getElementById("loginBtn");
    const userDropdownArea = document.getElementById("userDropdownArea");
    const userInfoBtn = document.getElementById("userInfoBtn");
    const dropdownMenu = document.getElementById("dropdownMenu");
    const logoutBtn = document.getElementById("logoutBtn");

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;

            loginBtn.style.display = "none";
            userDropdownArea.style.display = "inline-block";

            userInfoBtn.onclick = (e) => {
                e.preventDefault();

                dropdownMenu.style.display =
                    dropdownMenu.style.display === "none"
                        ? "block"
                        : "none";
            };

            loadCart();

        } else {
            window.location.href = "dangnhap.html";
        }
    });

    logoutBtn.onclick = async () => {
        await signOut(auth);
        window.location.href = "index.html";
    };

    document.addEventListener("click", (e) => {
        if (!userDropdownArea.contains(e.target)) {
            dropdownMenu.style.display = "none";
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    setupAuthUI();
});