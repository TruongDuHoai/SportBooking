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

async function loadBookings(uid){
    const q = query(collection(db,"donDat"),where("userId","==",uid));
    const snap = await getDocs(q);

    allBookings = [];
    snap.forEach(docSnap=>{
        allBookings.push({
            id: docSnap.id,
            ...docSnap.data()
        });
    });

    applyFilters();
}

function renderBookings(bookings){
    const box = document.getElementById("bookingList");

    if(bookings.length === 0){
        box.innerHTML = `
            <div class="empty-box">
                Chưa có lịch sử đặt sân
            </div>
        `;
        return;
    }

    let html = "";

    bookings.forEach(item=>{
        let statusClass = "pending";

        if(item.trangThai === "Đã xác nhận") statusClass = "success";
        if(item.trangThai === "Đã hủy") statusClass = "cancel";

        html += `
            <div class="booking-card history-row">
                <div class="booking-top">
                    <div class="booking-info">
                        <h3>${item.tenSan}</h3>
                        <p>Ngày: ${item.ngayDat}</p>
                        <p>Giờ: ${item.gioBatDau}:00 - ${item.gioKetThuc}:00</p>
                        <p>Tổng tiền: ${(item.tongTien || item.gia).toLocaleString()}đ</p>
                    </div>

                    <div>
                        <div class="status ${statusClass}">
                            ${item.trangThai || "Chờ xác nhận"}
                        </div>
                    </div>
                </div>

                <div class="booking-actions">
                    <button class="btn btn-rebook" onclick="datLai('${item.sanId}')">
                        Đặt lại
                    </button>

                    ${
                        item.trangThai === "Chờ xác nhận"
                        ? `<button class="btn btn-cancel" onclick="huyDon('${item.id}')">Hủy đơn</button>`
                        : ""
                    }
                </div>
            </div>
        `;
    });

    box.innerHTML = html;
}

function applyFilters() {

    let result = [...allBookings];

    // Lọc trạng thái
    if (currentStatus !== "all") {
        result = result.filter(item => item.trangThai === currentStatus);
    }

    // Lọc tìm kiếm
    if (currentKeyword.trim() !== "") {

        const keyword = currentKeyword.toLowerCase();

        result = result.filter(item => {

            return (
                (item.tenSan || "").toLowerCase().includes(keyword) ||
                (item.ngayDat || "").toLowerCase().includes(keyword) ||
                (item.trangThai || "").toLowerCase().includes(keyword)
            );

        });

    }

    renderBookings(result);

}

window.datLai = function(sanId){
    window.location.href = `chitiet.html?id=${sanId}`;
}

window.huyDon = async function(id){
    if(!confirm("Bạn chắc chắn muốn hủy đơn?")) return;

    await updateDoc(doc(db,"donDat",id),{
        trangThai:"Đã hủy"
    });

    alert("Đã hủy đơn");
    loadBookings(currentUser.uid);
}

document.getElementById("filterStatus").addEventListener("change", (e) => {

    currentStatus = e.target.value;

    applyFilters();

});

document.getElementById("historySearch").addEventListener("keyup", (e) => {

    currentKeyword = e.target.value;

    applyFilters();

});

onAuthStateChanged(auth,(user)=>{
    const loginBtn = document.getElementById("loginBtn");
    const userDropdownArea = document.getElementById("userDropdownArea");
    const userInfoBtn = document.getElementById("userInfoBtn");
    const dropdownMenu = document.getElementById("dropdownMenu");

    if(user){
        currentUser = user;

        loginBtn.style.display = "none";
        userDropdownArea.style.display = "inline-block";

        userInfoBtn.onclick = ()=>{
            dropdownMenu.style.display =
                dropdownMenu.style.display === "none" ? "block" : "none";
        };

        loadBookings(user.uid);

    }else{
        window.location.href = "dangnhap.html";
    }
});

document.getElementById("logoutBtn").onclick = async ()=>{
    await signOut(auth);
    window.location.href = "index.html";
}