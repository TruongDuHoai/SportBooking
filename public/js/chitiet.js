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

const gioTrongNgay = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22];

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

    if (!selectedDate) {
        document.getElementById("timeSlots").innerHTML =
            "<p>Vui lòng chọn ngày.</p>";
        return;
    }

    try {
        const q = query(
            collection(db, "donDat"),
            where("sanId", "==", sanId),
            where("ngayDat", "==", selectedDate)
        );

        const snapshot = await getDocs(q);

        const bookedHours = [];

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();

            if (data.trangThai !== "Đã hủy") {
                bookedHours.push(Number(data.gioBatDau));
            }
        });

        let html = `<div class="time-slots-grid">`;

        gioTrongNgay.forEach(gio => {
            const daDat = bookedHours.includes(gio);

            html += `
                <label class="time-slot-label ${daDat ? "disabled" : ""}">
                    <input 
                        type="checkbox" 
                        value="${gio}" 
                        class="time-checkbox"
                        ${daDat ? "disabled" : ""}
                    >
                    ${String(gio).padStart(2, "0")}:00 - ${String(gio + 1).padStart(2, "0")}:00
                    ${daDat ? " (Đã đặt)" : ""}
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
                    selectedHours.push(gio);
                    label.classList.add("selected");
                } else {
                    selectedHours = selectedHours.filter(h => h !== gio);
                    label.classList.remove("selected");
                }

                selectedHours.sort((a, b) => a - b);
                updateTotal();
            });
        });

    } catch (error) {
        console.error("Lỗi load lịch:", error);
    }
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
            gioKetThuc: gio + 1,
            gia: currentSan.gia,
            diaChi: currentSan.diaChi || "",
            loai: currentSan.loai || "",
            hinhAnh: currentSan.hinhAnh || ""
        });
    });

    await setDoc(cartRef, { items });
    alert("Đã thêm vào giỏ");
    location.href = "giohang.html";
}

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

const gioTrongNgay = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22];

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

    if (!selectedDate) {
        document.getElementById("timeSlots").innerHTML =
            "<p>Vui lòng chọn ngày.</p>";
        return;
    }

    try {
        const q = query(
            collection(db, "donDat"),
            where("sanId", "==", sanId),
            where("ngayDat", "==", selectedDate)
        );

        const snapshot = await getDocs(q);

        const bookedHours = [];

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();

            if (data.trangThai !== "Đã hủy") {
                bookedHours.push(Number(data.gioBatDau));
            }
        });

        let html = `<div class="time-slots-grid">`;

        gioTrongNgay.forEach(gio => {
            const daDat = bookedHours.includes(gio);

            html += `
                <label class="time-slot-label ${daDat ? "disabled" : ""}">
                    <input 
                        type="checkbox" 
                        value="${gio}" 
                        class="time-checkbox"
                        ${daDat ? "disabled" : ""}
                    >
                    ${String(gio).padStart(2, "0")}:00 - ${String(gio + 1).padStart(2, "0")}:00
                    ${daDat ? " (Đã đặt)" : ""}
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
                    selectedHours.push(gio);
                    label.classList.add("selected");
                } else {
                    selectedHours = selectedHours.filter(h => h !== gio);
                    label.classList.remove("selected");
                }

                selectedHours.sort((a, b) => a - b);
                updateTotal();
            });
        });

    } catch (error) {
        console.error("Lỗi load lịch:", error);
    }
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
            gioKetThuc: gio + 1,
            gia: currentSan.gia,
            diaChi: currentSan.diaChi || "",
            loai: currentSan.loai || "",
            hinhAnh: currentSan.hinhAnh || ""
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
    if (!currentUser) {
        window.location.href = "dangnhap.html";
        return;
    }

    const rating = Number(
        document.getElementById("soSao").value
    );

    const content = document
        .getElementById("noiDungDanhGia")
        .value
        .trim();

    if (!content) {
        alert("Vui lòng nhập nội dung đánh giá!");
        return;
    }

    const submitButton =
        document.getElementById("btnGuiDanhGia");

    try {
        submitButton.disabled = true;
        submitButton.textContent = "Đang gửi...";

        await addDoc(
            collection(db, "comments"),
            {
                userId: currentUser.uid,

                userName:
                    currentUser.displayName ||
                    currentUser.email?.split("@")[0] ||
                    "Khách hàng",

                userEmail: currentUser.email || "",

                sanId: sanId,
                tenSan: currentSan.ten || "",

                content: content,
                rating: rating,

                status: "pending",

                approvedAt: null,
                approvedBy: "",

                createdAt: new Date(),
                updatedAt: new Date()
            }
        );

        document.getElementById(
            "noiDungDanhGia"
        ).value = "";

        alert(
            "Đã gửi đánh giá! Bình luận sẽ hiển thị sau khi quản trị viên duyệt."
        );

    } catch (error) {
        console.error(
            "Lỗi gửi đánh giá:",
            error
        );

        alert(
            "Không thể gửi đánh giá: " +
            error.message
        );

    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Gửi đánh giá";
    }
}
async function loadDanhGia() {
    const container =
        document.getElementById("danhSachDanhGia");

    container.innerHTML = `
        <p style="
            text-align: center;
            color: #777;
            padding: 15px;
        ">
            Đang tải đánh giá...
        </p>
    `;

    try {
        const commentsQuery = query(
            collection(db, "comments"),
            where("sanId", "==", sanId)
        );

        const snapshot = await getDocs(
            commentsQuery
        );

        const comments = [];

        snapshot.forEach((docSnap) => {
            const comment = {
                id: docSnap.id,
                ...docSnap.data()
            };

            if (comment.status === "approved") {
                comments.push(comment);
            }
        });

        const getTime = (value) => {
            if (!value) {
                return 0;
            }

            if (typeof value.toDate === "function") {
                return value.toDate().getTime();
            }

            const date = new Date(value);

            return Number.isNaN(date.getTime())
                ? 0
                : date.getTime();
        };

        comments.sort(
            (a, b) =>
                getTime(b.createdAt) -
                getTime(a.createdAt)
        );

        const escapeHTML = (value) => {
            return String(value ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };

        const formatDate = (value) => {
            if (!value) {
                return "Không rõ ngày";
            }

            const date =
                typeof value.toDate === "function"
                    ? value.toDate()
                    : new Date(value);

            if (Number.isNaN(date.getTime())) {
                return "Không rõ ngày";
            }

            return date.toLocaleDateString(
                "vi-VN"
            );
        };

        if (comments.length === 0) {
            container.innerHTML = `
                <p style="
                    text-align: center;
                    color: #777;
                    padding: 20px;
                ">
                    Chưa có đánh giá nào được duyệt.
                </p>
            `;

            return;
        }

        let html = "";

        comments.forEach((comment) => {
            const rating = Math.min(
                Math.max(
                    Number(comment.rating || 0),
                    0
                ),
                5
            );

            const stars =
                "★".repeat(rating) +
                "☆".repeat(5 - rating);

            html += `
                <div class="review-item">
                    <div class="review-email">
                        ${escapeHTML(
                            comment.userName ||
                            comment.userEmail ||
                            "Khách hàng"
                        )}
                    </div>

                    <div class="review-stars">
                        ${stars}
                    </div>

                    <p>
                        ${escapeHTML(
                            comment.content || ""
                        )}
                    </p>

                    <div class="review-date">
                        ${formatDate(
                            comment.createdAt
                        )}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

     } catch (error) {
        console.error(
            "Lỗi tải đánh giá:",
            error
        );

        container.textContent =
            "Không thể tải đánh giá: " +
            error.message;

        container.style.color = "red";
        container.style.textAlign = "center";
        container.style.padding = "15px";
    }
}

onAuthStateChanged(auth, user => {
    currentUser = user;

    if (user) {
        document.getElementById("loginBtn").style.display = "none";
        document.getElementById("userInfoBtn").style.display = "inline";
    }
});

loadSan();

async function guiDanhGia() {
    if (!currentUser) {
        window.location.href = "dangnhap.html";
        return;
    }

    const rating = Number(
        document.getElementById("soSao").value
    );

    const content = document
        .getElementById("noiDungDanhGia")
        .value
        .trim();

    if (!content) {
        alert("Vui lòng nhập nội dung đánh giá!");
        return;
    }

    const submitButton =
        document.getElementById("btnGuiDanhGia");

    try {
        submitButton.disabled = true;
        submitButton.textContent = "Đang gửi...";

        await addDoc(
            collection(db, "comments"),
            {
                userId: currentUser.uid,

                userName:
                    currentUser.displayName ||
                    currentUser.email?.split("@")[0] ||
                    "Khách hàng",

                userEmail: currentUser.email || "",

                sanId: sanId,
                tenSan: currentSan.ten || "",

                content: content,
                rating: rating,

                status: "pending",

                approvedAt: null,
                approvedBy: "",

                createdAt: new Date(),
                updatedAt: new Date()
            }
        );

        document.getElementById(
            "noiDungDanhGia"
        ).value = "";

        alert(
            "Đã gửi đánh giá! Bình luận sẽ hiển thị sau khi quản trị viên duyệt."
        );

    } catch (error) {
        console.error(
            "Lỗi gửi đánh giá:",
            error
        );

        alert(
            "Không thể gửi đánh giá: " +
            error.message
        );

    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Gửi đánh giá";
    }
}
async function loadDanhGia() {
    const container =
        document.getElementById("danhSachDanhGia");

    container.innerHTML = `
        <p style="
            text-align: center;
            color: #777;
            padding: 15px;
        ">
            Đang tải đánh giá...
        </p>
    `;

    try {
        const commentsQuery = query(
            collection(db, "comments"),
            where("sanId", "==", sanId)
        );

        const snapshot = await getDocs(
            commentsQuery
        );

        const comments = [];

        snapshot.forEach((docSnap) => {
            const comment = {
                id: docSnap.id,
                ...docSnap.data()
            };

            if (comment.status === "approved") {
                comments.push(comment);
            }
        });

        const getTime = (value) => {
            if (!value) {
                return 0;
            }

            if (typeof value.toDate === "function") {
                return value.toDate().getTime();
            }

            const date = new Date(value);

            return Number.isNaN(date.getTime())
                ? 0
                : date.getTime();
        };

        comments.sort(
            (a, b) =>
                getTime(b.createdAt) -
                getTime(a.createdAt)
        );

        const escapeHTML = (value) => {
            return String(value ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };

        const formatDate = (value) => {
            if (!value) {
                return "Không rõ ngày";
            }

            const date =
                typeof value.toDate === "function"
                    ? value.toDate()
                    : new Date(value);

            if (Number.isNaN(date.getTime())) {
                return "Không rõ ngày";
            }

            return date.toLocaleDateString(
                "vi-VN"
            );
        };

        if (comments.length === 0) {
            container.innerHTML = `
                <p style="
                    text-align: center;
                    color: #777;
                    padding: 20px;
                ">
                    Chưa có đánh giá nào được duyệt.
                </p>
            `;

            return;
        }

        let html = "";

        comments.forEach((comment) => {
            const rating = Math.min(
                Math.max(
                    Number(comment.rating || 0),
                    0
                ),
                5
            );

            const stars =
                "★".repeat(rating) +
                "☆".repeat(5 - rating);

            html += `
                <div class="review-item">
                    <div class="review-email">
                        ${escapeHTML(
                            comment.userName ||
                            comment.userEmail ||
                            "Khách hàng"
                        )}
                    </div>

                    <div class="review-stars">
                        ${stars}
                    </div>

                    <p>
                        ${escapeHTML(
                            comment.content || ""
                        )}
                    </p>

                    <div class="review-date">
                        ${formatDate(
                            comment.createdAt
                        )}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

     } catch (error) {
        console.error(
            "Lỗi tải đánh giá:",
            error
        );

        container.textContent =
            "Không thể tải đánh giá: " +
            error.message;

        container.style.color = "red";
        container.style.textAlign = "center";
        container.style.padding = "15px";
    }
}

onAuthStateChanged(auth, user => {
    currentUser = user;

    if (user) {
        document.getElementById("loginBtn").style.display = "none";
        document.getElementById("userInfoBtn").style.display = "inline";
    }
});

loadSan();
