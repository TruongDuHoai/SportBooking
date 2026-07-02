import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    deleteDoc,
    collection,
    addDoc,
    serverTimestamp,
    getDocs,
    query,
    where
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

let originalTotal = 0;
let discountValue = 0;
let finalTotal = 0;
let appliedPromotion = null;

function getItemTotal(item) {
    const price = Number(item.gia || 0);

    if (item.type === "food") {
        return price * Number(item.soLuong || 1);
    }

    return price;
}

function formatMoney(value) {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

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

        appliedPromotion = null;
        discountValue = 0;

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

    originalTotal = 0;
    discountValue = 0;
    finalTotal = 0;
    appliedPromotion = null;

    let itemsHtml = "";

    cartItems.forEach((item) => {
        const itemTotal = getItemTotal(item);
        originalTotal += itemTotal;

        if (item.type === "food") {
            const quantity = Number(item.soLuong || 1);

            itemsHtml += `
                <div class="order-item">
                    <div>
                        <strong>${escapeHTML(item.tenMon || "Món ăn")}</strong><br>
                        <small>Đồ ăn / Thức uống</small><br>
                        <small>Số lượng: ${quantity}</small>
                    </div>

                    <div>
                        <strong>${formatMoney(itemTotal)}</strong>
                    </div>
                </div>
            `;
        } else {
            itemsHtml += `
                <div class="order-item">
                    <div>
                        <strong>${escapeHTML(item.tenSan || "Sân")}</strong><br>
                        <small>Ngày: ${escapeHTML(item.ngayDat || "")}</small><br>
                        <small>Giờ: ${Number(item.gioBatDau || 0)}:00 - ${Number(item.gioKetThuc || 0)}:00</small>
                    </div>

                    <div>
                        <strong>${formatMoney(itemTotal)}</strong>
                    </div>
                </div>
            `;
        }
    });

    finalTotal = originalTotal;

    container.innerHTML = `
        <div class="checkout-card">

            <h3>Thông tin đơn hàng</h3>

            ${itemsHtml}

            <div class="promo-box">
                <label for="promoCodeInput">
                    Mã khuyến mãi
                </label>

                <div class="promo-input-row">
                    <input
                        type="text"
                        id="promoCodeInput"
                        placeholder="Nhập mã khuyến mãi"
                    >

                    <button
                        type="button"
                        id="applyPromoBtn"
                    >
                        Áp dụng
                    </button>
                </div>

                <div id="promoMessage"></div>
            </div>

            <div class="payment-summary">
                <div>
                    <span>Tạm tính:</span>
                    <strong id="originalTotalText">${formatMoney(originalTotal)}</strong>
                </div>

                <div id="discountRow" style="display:none;">
                    <span>Giảm giá:</span>
                    <strong id="discountAmountText">-0đ</strong>
                </div>

                <div class="summary-final">
                    <span>Tổng thanh toán:</span>
                    <strong id="finalTotalText">${formatMoney(finalTotal)}</strong>
                </div>
            </div>

            <h3>Thông tin người đặt</h3>

            <div class="form-group">
                <input type="text" id="fullName"
                    placeholder="Họ tên"
                    value="${escapeHTML(currentUser.displayName || "")}">
            </div>

            <div class="form-group">
                <input type="email" id="email"
                    value="${escapeHTML(currentUser.email || "")}" readonly>
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

    document.getElementById("applyPromoBtn")
        .addEventListener("click", applyPromotionCode);

    document.getElementById("promoCodeInput")
        .addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                applyPromotionCode();
            }
        });
}

function updatePaymentSummary() {
    finalTotal = Math.max(originalTotal - discountValue, 0);

    const discountRow = document.getElementById("discountRow");
    const discountAmountText = document.getElementById("discountAmountText");
    const finalTotalText = document.getElementById("finalTotalText");

    if (discountValue > 0) {
        discountRow.style.display = "flex";
        discountAmountText.textContent = "-" + formatMoney(discountValue);
    } else {
        discountRow.style.display = "none";
        discountAmountText.textContent = "-0đ";
    }

    finalTotalText.textContent = formatMoney(finalTotal);
}

function getPromotionDate(value) {
    if (!value) {
        return null;
    }

    if (typeof value.toDate === "function") {
        return value.toDate();
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? null
        : date;
}

async function applyPromotionCode() {
    const promoInput = document.getElementById("promoCodeInput");
    const promoMessage = document.getElementById("promoMessage");
    const applyButton = document.getElementById("applyPromoBtn");

    const code = promoInput.value.trim().toUpperCase();

    appliedPromotion = null;
    discountValue = 0;
    updatePaymentSummary();

    if (!code) {
        promoMessage.textContent = "Vui lòng nhập mã khuyến mãi.";
        promoMessage.style.color = "#dc2626";
        return;
    }

    try {
        applyButton.disabled = true;
        applyButton.textContent = "Đang kiểm tra...";

        promoMessage.textContent = "Đang kiểm tra mã khuyến mãi...";
        promoMessage.style.color = "#64748b";

        const promoQuery = query(
            collection(db, "promotions"),
            where("code", "==", code)
        );

        const snapshot = await getDocs(promoQuery);

        if (snapshot.empty) {
            promoMessage.textContent = "Mã khuyến mãi không tồn tại.";
            promoMessage.style.color = "#dc2626";
            return;
        }

        let promotion = null;

        snapshot.forEach((docSnap) => {
            promotion = {
                id: docSnap.id,
                ...docSnap.data()
            };
        });

        if (!promotion.active) {
            promoMessage.textContent = "Mã khuyến mãi chưa được kích hoạt.";
            promoMessage.style.color = "#dc2626";
            return;
        }

        const now = new Date();
        const startDate = getPromotionDate(promotion.startDate);
        const endDate = getPromotionDate(promotion.endDate);

        if (startDate && now < startDate) {
            promoMessage.textContent = "Mã khuyến mãi chưa đến thời gian sử dụng.";
            promoMessage.style.color = "#dc2626";
            return;
        }

        if (endDate && now > endDate) {
            promoMessage.textContent = "Mã khuyến mãi đã hết hạn.";
            promoMessage.style.color = "#dc2626";
            return;
        }

        const value = Number(promotion.value || 0);

        if (value <= 0) {
            promoMessage.textContent = "Mã khuyến mãi không hợp lệ.";
            promoMessage.style.color = "#dc2626";
            return;
        }

        const discountType = String(
            promotion.discountType ||
            promotion.type ||
            "fixed"
        ).toLowerCase();

        if (
            discountType === "percent" ||
            discountType === "percentage" ||
            discountType === "phan_tram"
        ) {
            discountValue = Math.floor(originalTotal * value / 100);
        } else {
            discountValue = value;
        }

        if (discountValue > originalTotal) {
            discountValue = originalTotal;
        }

        appliedPromotion = promotion;
        updatePaymentSummary();

        promoMessage.textContent =
            `Áp dụng mã ${code} thành công.`;
        promoMessage.style.color = "#16a34a";

    } catch (error) {
        console.error("Lỗi áp dụng khuyến mãi:", error);

        promoMessage.textContent =
            "Không thể áp dụng mã khuyến mãi: " + error.message;
        promoMessage.style.color = "#dc2626";

    } finally {
        applyButton.disabled = false;
        applyButton.textContent = "Áp dụng";
    }
}

function validatePhone(phone) {
    return /^0[0-9]{9}$/.test(phone);
}

function getItemDiscount(itemTotal, index) {
    if (!discountValue || !originalTotal) {
        return 0;
    }

    if (index === cartItems.length - 1) {
        const usedDiscount = cartItems
            .slice(0, -1)
            .reduce((sum, item, itemIndex) => {
                return sum + Math.floor(
                    getItemTotal(item) * discountValue / originalTotal
                );
            }, 0);

        return discountValue - usedDiscount;
    }

    return Math.floor(itemTotal * discountValue / originalTotal);
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

    updatePaymentSummary();

    if (!confirm(`Xác nhận thanh toán ${formatMoney(finalTotal)} ?`)) {
        return;
    }

    const btn = document.getElementById("submitOrderBtn");
    btn.disabled = true;
    btn.textContent = "Đang xử lý...";

    try {
        for (const [index, item] of cartItems.entries()) {
            const itemTotal = getItemTotal(item);
            const itemDiscount = getItemDiscount(itemTotal, index);
            const itemFinalTotal = Math.max(itemTotal - itemDiscount, 0);

            await addDoc(collection(db, "donDat"), {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                userName: fullName,
                userPhone: phone,

                sanId: item.sanId || "",
                tenSan: item.tenSan || item.tenMon || "Dịch vụ",
                ngayDat: item.ngayDat || "",
                gioBatDau: Number(item.gioBatDau || 0),
                gioKetThuc: Number(item.gioKetThuc || 0),

                gia: Number(item.gia || 0),
                tongTienGoc: itemTotal,
                soTienGiam: itemDiscount,
                tongTien: itemFinalTotal,

                maKhuyenMai: appliedPromotion ? appliedPromotion.code : "",
                khuyenMaiId: appliedPromotion ? appliedPromotion.id : "",

                diaChi: item.diaChi || "",
                loai: item.loai || "",
                hinhAnh: item.hinhAnh || "",
                type: item.type || "booking",
                soLuong: Number(item.soLuong || 1),

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
