import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
    getFirestore,
    doc,
    getDoc,
    setDoc
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

function hienThiGioHang(cartItems) {
    const container = document.getElementById("cartContent");

    if (!cartItems || cartItems.length === 0) {
        container.innerHTML = `
            <div class="cart-empty">
                <i class="fa-solid fa-cart-shopping"></i>
                <p>Giỏ hàng của bạn đang trống.</p>
                <br>
                <a href="chitiet.html?id=san1" style="color:#1a6b30;font-weight:bold;">
                    Đặt sân ngay
                </a>
            </div>
        `;
        return;
    }

    let total = 0;

    let html = `
        <div class="cart-card">
            <table class="cart-table">
                <thead>
                    <tr>
                        <th>Sân</th>
                        <th>Ngày đặt</th>
                        <th>Khung giờ</th>
                        <th>Đơn giá</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
    `;

    cartItems.forEach((item, index) => {
        const gia = Number(item.gia || 0);
        total += gia;

        const gioBatDau = Number(item.gioBatDau || 0);
        const gioKetThuc = item.gioKetThuc !== undefined
            ? Number(item.gioKetThuc)
            : gioBatDau + 1;

        html += `
            <tr>
                <td>
                    <div class="cart-item-info">
                        <h4>${item.tenSan || "Sân bóng"}</h4>
                        <small>${item.diaChi || "Quận 12"}</small>
                    </div>
                </td>

                <td>${item.ngayDat || "Chưa chọn"}</td>

                <td>${gioBatDau}:00 - ${gioKetThuc}:00</td>

                <td>${gia.toLocaleString()}đ</td>

                <td>
                    <button class="cart-remove" data-index="${index}">
                        Xóa
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>

        <div class="cart-total">
            <h3>Tổng tiền: <span class="total-price">${total.toLocaleString()}đ</span></h3>

            <button class="btn-continue" id="btnContinue">
                Tiếp tục đặt sân
            </button>

            <button class="btn-checkout" id="btnCheckout">
                Thanh toán
            </button>
        </div>
    `;

    container.innerHTML = html;

    document.getElementById("btnContinue").onclick = () => {
        window.location.href = "chitiet.html?id=san1";
    };

    document.getElementById("btnCheckout").onclick = () => {
        window.location.href = "thanhtoan.html";
    };

    document.querySelectorAll(".cart-remove").forEach(btn => {
        btn.addEventListener("click", async () => {
            const index = Number(btn.dataset.index);

            if (!confirm("Bạn có chắc muốn xóa khung giờ này khỏi giỏ hàng?")) {
                return;
            }

            await xoaKhoiGioHang(index);
        });
    });
}

async function xoaKhoiGioHang(index) {
    if (!currentUser) return;

    try {
        const cartRef = doc(db, "carts", currentUser.uid);
        const cartSnap = await getDoc(cartRef);

        if (!cartSnap.exists()) return;

        let items = cartSnap.data().items || [];

        items.splice(index, 1);

        await setDoc(cartRef, {
            items,
            updatedAt: new Date().toISOString()
        });

        alert("Đã xóa khỏi giỏ hàng!");
        loadGioHang();

    } catch (error) {
        console.error("Lỗi xóa giỏ hàng:", error);
        alert("Xóa thất bại: " + error.message);
    }
}

async function loadGioHang() {
    const container = document.getElementById("cartContent");

    if (!currentUser) {
        container.innerHTML = `
            <div class="cart-empty">
                <i class="fa-solid fa-user-lock"></i>
                <p>Vui lòng đăng nhập để xem giỏ hàng.</p>
                <br>
                <a href="dangnhap.html" style="color:#1a6b30;font-weight:bold;">
                    Đăng nhập ngay
                </a>
            </div>
        `;
        return;
    }

    try {
        const cartRef = doc(db, "carts", currentUser.uid);
        const cartSnap = await getDoc(cartRef);

        if (!cartSnap.exists()) {
            hienThiGioHang([]);
            return;
        }

        const items = cartSnap.data().items || [];
        hienThiGioHang(items);

    } catch (error) {
        console.error("Lỗi tải giỏ hàng:", error);
        container.innerHTML = `
            <div class="cart-empty">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p style="color:red;">Không thể tải giỏ hàng. Vui lòng thử lại.</p>
            </div>
        `;
    }
}

function kiemTraDangNhap() {
    const loginBtn = document.getElementById("loginBtn");
    const userDropdownArea = document.getElementById("userDropdownArea");
    const userInfoBtn = document.getElementById("userInfoBtn");
    const dropdownMenu = document.getElementById("dropdownMenu");
    const logoutDropdownBtn = document.getElementById("logoutDropdownBtn");

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;

            loginBtn.style.display = "none";
            userDropdownArea.style.display = "inline-block";

            userInfoBtn.onclick = (e) => {
                e.preventDefault();
                dropdownMenu.style.display =
                    dropdownMenu.style.display === "none" ? "block" : "none";
            };

            logoutDropdownBtn.onclick = async (e) => {
                e.preventDefault();

                await signOut(auth);
                alert("Đã đăng xuất!");
                window.location.href = "index.html";
            };

            loadGioHang();

        } else {
            currentUser = null;

            loginBtn.style.display = "inline-block";
            userDropdownArea.style.display = "none";

            loginBtn.onclick = (e) => {
                e.preventDefault();
                window.location.href = "dangnhap.html";
            };

            loadGioHang();
        }
    });

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
    kiemTraDangNhap();
});