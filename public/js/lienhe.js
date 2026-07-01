import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp,
    doc,
    getDoc,
    query,
    where,
    getDocs
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

function showMessage(msg, type = "success") {
    const box = document.getElementById("resultMsg");

    if (!box) return;

    box.style.color = type === "success" ? "green" : "red";
    box.innerText = msg;
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(value) {
    if (!value) return "Không rõ thời gian";

    const date =
        typeof value.toDate === "function"
            ? value.toDate()
            : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Không rõ thời gian";
    }

    return date.toLocaleString("vi-VN");
}

async function autoFill(user) {
    document.getElementById("email").value = user.email || "";

    const userSnap = await getDoc(doc(db, "users", user.uid));

    if (userSnap.exists()) {
        const data = userSnap.data();

        document.getElementById("hoTen").value = data.fullName || "";
        document.getElementById("soDienThoai").value = data.phone || "";
    }
}

async function loadUserFeedback() {
    const resultBox = document.getElementById("responseResult");

    if (!resultBox) return;

    if (!currentUser) {
        resultBox.innerHTML = `
            <p>Vui lòng đăng nhập để xem phản hồi.</p>
        `;
        return;
    }

    try {
        const q = query(
            collection(db, "feedback"),
            where("userId", "==", currentUser.uid)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            resultBox.innerHTML = `
                <p>Chưa có phản hồi nào.</p>
            `;
            return;
        }

        let feedbackList = [];

        snapshot.forEach(docSnap => {
            feedbackList.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        feedbackList.sort((a, b) => {
            const timeA = a.createdAt?.toDate
                ? a.createdAt.toDate().getTime()
                : new Date(a.createdAt || 0).getTime();

            const timeB = b.createdAt?.toDate
                ? b.createdAt.toDate().getTime()
                : new Date(b.createdAt || 0).getTime();

            return timeB - timeA;
        });

        let html = `
            <div class="feedback-table-wrap">
                <table class="feedback-table">
                    <thead>
                        <tr>
                            <th>Chủ đề</th>
                            <th>Nội dung đã gửi</th>
                            <th>Trạng thái</th>
                            <th>Phản hồi admin</th>
                            <th>Thời gian gửi</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        feedbackList.forEach(data => {
            const isDone =
                data.status === "done" ||
                data.status === "processed" ||
                data.status === "Đã xử lý" ||
                data.trangThai === "Đã xử lý";

            const reply =
                data.adminReply ||
                data.adminNote ||
                data.reply ||
                "Chưa có phản hồi";

            html += `
                <tr>
                    <td>${escapeHTML(data.subject || data.chuDe || "Không có")}</td>
                    <td>${escapeHTML(data.message || data.noiDung || "")}</td>
                    <td>
                        <span class="response-status ${isDone ? "status-done" : "status-pending"}">
                            ${isDone ? "Đã xử lý" : "Đang xử lý"}
                        </span>
                    </td>
                    <td>${escapeHTML(reply)}</td>
                    <td>${formatDate(data.createdAt)}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        resultBox.innerHTML = html;

    } catch (error) {
        console.error("Lỗi tải phản hồi:", error);

        resultBox.innerHTML = `
            <p style="color:red;">Không thể tải phản hồi: ${error.message}</p>
        `;
    }
}

onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    const loginBtn = document.getElementById("loginBtn");
    const userDropdownArea = document.getElementById("userDropdownArea");
    const userInfoBtn = document.getElementById("userInfoBtn");
    const dropdownMenu = document.getElementById("dropdownMenu");

    if (user) {
        if (loginBtn) loginBtn.style.display = "none";
        if (userDropdownArea) userDropdownArea.style.display = "inline-block";

        if (userInfoBtn && dropdownMenu) {
            userInfoBtn.onclick = (e) => {
                e.preventDefault();

                dropdownMenu.style.display =
                    dropdownMenu.style.display === "none" ? "block" : "none";
            };
        }

        await autoFill(user);
        await loadUserFeedback();

    } else {
        if (loginBtn) loginBtn.style.display = "inline-block";
        if (userDropdownArea) userDropdownArea.style.display = "none";

        if (loginBtn) {
            loginBtn.onclick = (e) => {
                e.preventDefault();
                window.location.href = "dangnhap.html";
            };
        }

        await loadUserFeedback();
    }
});

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.onclick = async (e) => {
        e.preventDefault();
        await signOut(auth);
        window.location.href = "index.html";
    };
}

document.addEventListener("click", (e) => {
    const userDropdownArea = document.getElementById("userDropdownArea");
    const dropdownMenu = document.getElementById("dropdownMenu");

    if (
        userDropdownArea &&
        dropdownMenu &&
        !userDropdownArea.contains(e.target)
    ) {
        dropdownMenu.style.display = "none";
    }
});

document.getElementById("sendBtn").onclick = async () => {
    const hoTen = document.getElementById("hoTen").value.trim();
    const email = document.getElementById("email").value.trim();
    const soDienThoai = document.getElementById("soDienThoai").value.trim();
    const chuDe = document.getElementById("chuDe").value;
    const noiDung = document.getElementById("noiDung").value.trim();

    if (!hoTen || !email || !chuDe || !noiDung) {
        showMessage("Vui lòng nhập đầy đủ thông tin", "error");
        return;
    }

    try {
        await addDoc(collection(db, "feedback"), {
            userId: currentUser ? currentUser.uid : null,
            userName: hoTen,
            email: email,
            phone: soDienThoai,
            subject: chuDe,
            message: noiDung,
            status: "new",
            adminNote: "",
            adminReply: "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        showMessage("Gửi liên hệ thành công");

        document.getElementById("chuDe").value = "";
        document.getElementById("noiDung").value = "";

        await loadUserFeedback();

    } catch (error) {
        console.error("Lỗi gửi phản hồi:", error);

        showMessage(
            "Gửi thất bại: " + error.message,
            "error"
        );
    }
};