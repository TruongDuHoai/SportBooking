import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    setDoc,
    addDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
    getAuth,
    onAuthStateChanged
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

const sanId = new URLSearchParams(window.location.search).get("id");

let currentSan = null;
let currentUser = null;
let selectedDate = "";
let selectedHours = [];

const gioTrongNgay = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21];

async function loadSan() {
    const sanSnap = await getDoc(doc(db, "san", sanId));

    if (!sanSnap.exists()) {
        alert("Không tìm thấy sân");
        location.href = "index.html";
        return;
    }

    currentSan = { id: sanSnap.id, ...sanSnap.data() };
    renderSan();
}

function renderSan() {
    const container = document.getElementById("detailContainer");

    const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(currentSan.diaChi)}&output=embed`;

    container.innerHTML = `
        <div class="detail-image">
            <img src="${currentSan.hinhAnh}">
        </div>

        <div class="detail-info">
            <h2>${currentSan.ten}</h2>
            <div class="detail-price">${currentSan.gia.toLocaleString()}đ / giờ</div>

            <div class="detail-meta">
                <i class="fa-solid fa-location-dot"></i>
                ${currentSan.diaChi}
            </div>

            <div class="detail-meta">
                ${currentSan.moTa || ""}
            </div>

            <div class="map-container">
                <iframe src="${mapUrl}"></iframe>
            </div>

            <div class="booking-form">
                <h3>Đặt sân</h3>

                <div class="form-group">
                    <label>Ngày đặt</label>
                    <input type="date" id="ngayDat">
                </div>

                <div id="timeSlots"></div>

                <div id="totalPrice" class="total-price"></div>

                <button class="btn-book" id="bookBtn">Thêm vào giỏ hàng</button>
                <button class="btn-book btn-favorite" id="favoriteBtn">Lưu yêu thích</button>
            </div>

            <div class="review-section">
                <h3>Đánh giá sân</h3>

                <div class="review-form">
                    <select id="soSao">
                        <option value="5">★★★★★</option>
                        <option value="4">★★★★☆</option>
                        <option value="3">★★★☆☆</option>
                        <option value="2">★★☆☆☆</option>
                        <option value="1">★☆☆☆☆</option>
                    </select>

                    <textarea id="noiDungDanhGia" rows="4"></textarea>

                    <button class="btn-book" id="btnGuiDanhGia">Gửi đánh giá</button>
                </div>

                <div id="danhSachDanhGia"></div>
            </div>
        </div>
    `;

    bindEvents();
    loadDanhGia();
}

function bindEvents() {
    document.getElementById("ngayDat").addEventListener("change", e => {
        selectedDate = e.target.value;
        loadLichTrong();
    });

    document.getElementById("bookBtn").onclick = datSan;
    document.getElementById("favoriteBtn").onclick = luuYeuThich;
    document.getElementById("btnGuiDanhGia").onclick = guiDanhGia;
}

async function loadLichTrong() {
    selectedHours = [];

    let html = `<div class="time-slots-grid">`;

    gioTrongNgay.forEach(gio => {
        html += `
            <label class="time-slot-label">
                <input type="checkbox" value="${gio}" class="time-checkbox">
                ${String(gio).padStart(2, "0")}:00 - ${String(gio + 1).padStart(2, "0")}:00
            </label>
        `;
    });

    html += `</div>`;
    document.getElementById("timeSlots").innerHTML = html;

    document.querySelectorAll(".time-checkbox").forEach(cb => {
        cb.addEventListener("change", e => {
            const gio = Number(e.target.value);
            const label = e.target.closest(".time-slot-label");

            if (e.target.checked) {
                if (!selectedHours.includes(gio)) {
                    selectedHours.push(gio);
                }
                label.classList.add("selected");
            } else {
                selectedHours = selectedHours.filter(h => h !== gio);
                label.classList.remove("selected");
            }

            selectedHours.sort((a, b) => a - b);
            updateTotal();
        });
    });
}

function updateTotal() {
    const total = currentSan.gia * selectedHours.length;
    document.getElementById("totalPrice").innerHTML =
        `Tổng: ${total.toLocaleString()}đ`;
}

async function datSan() {
    if (!currentUser) return location.href = "dangnhap.html";

    const cartRef = doc(db, "carts", currentUser.uid);
    const cartSnap = await getDoc(cartRef);

    let items = cartSnap.exists() ? cartSnap.data().items || [] : [];

    selectedHours.forEach(gio => {
        items.push({
            sanId: sanId,
            tenSan: currentSan.ten,
            ngayDat: selectedDate,
            gioBatDau: gio,
            gia: currentSan.gia
        });
    });

    await setDoc(cartRef, { items });
    alert("Đã thêm vào giỏ");
    location.href = "giohang.html";
}

async function luuYeuThich() {
    if (!currentUser) return location.href = "dangnhap.html";

    await setDoc(doc(db, "favorites", currentUser.uid), {
        sanId: sanId,
        tenSan: currentSan.ten
    });

    alert("Đã lưu yêu thích");
}

async function guiDanhGia() {
    if (!currentUser) return location.href = "dangnhap.html";

    await addDoc(collection(db, "danhGia"), {
        sanId,
        userEmail: currentUser.email,
        soSao: Number(document.getElementById("soSao").value),
        noiDung: document.getElementById("noiDungDanhGia").value,
        createdAt: new Date().toISOString()
    });

    loadDanhGia();
}

async function loadDanhGia() {
    const q = query(collection(db, "danhGia"), where("sanId", "==", sanId));
    const snap = await getDocs(q);

    let html = "";

    snap.forEach(doc => {
        const dg = doc.data();

        html += `
            <div class="review-item">
                <div class="review-email">${dg.userEmail}</div>
                <div class="review-stars">${"★".repeat(dg.soSao)}</div>
                <p>${dg.noiDung}</p>
                <div class="review-date">${new Date(dg.createdAt).toLocaleDateString("vi-VN")}</div>
            </div>
        `;
    });

    document.getElementById("danhSachDanhGia").innerHTML = html;
}

onAuthStateChanged(auth, user => {
    currentUser = user;

    if (user) {
        document.getElementById("loginBtn").style.display = "none";
        document.getElementById("userInfoBtn").style.display = "inline";
    }
});

loadSan();