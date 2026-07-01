import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA0qNvl-i24wG9wOH-ajLu77MxNFvMvwjU",
    authDomain: "thue-san-the-thao.firebaseapp.com",
    projectId: "thue-san-the-thao",
    storageBucket: "thue-san-the-thao.firebasestorage.app",
    messagingSenderId: "90803956356",
    appId: "1:90803956356:web:7c63edc595f6ad25acb0d1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

function formatDate(date){
    if(!date) return "---";
    return new Date(date).toLocaleDateString("vi-VN");
}

function getRole(role){
    if(role === "admin") return "Quản trị viên";
    if(role === "staff") return "Nhân viên";
    return "Khách hàng";
}

async function loadProfile(user){
    currentUser = user;

    const userRef = doc(db,"users",user.uid);
    const userSnap = await getDoc(userRef);

    let userData;

    if(userSnap.exists()){
        userData = userSnap.data();
    }else{
        userData = {
            fullName:user.displayName || "",
            email:user.email,
            phone:"",
            role:"user",
            createdAt:new Date().toISOString()
        };

        await setDoc(userRef,userData);
    }

    document.getElementById("displayName").textContent = userData.fullName;
    document.getElementById("userEmail").textContent = userData.email;
    document.getElementById("avatarText").textContent =
        userData.fullName.charAt(0).toUpperCase();

    document.getElementById("infoFullName").textContent = userData.fullName;
    document.getElementById("infoEmail").textContent = userData.email;
    document.getElementById("infoPhone").textContent = userData.phone || "Chưa cập nhật";
    document.getElementById("infoRole").textContent = getRole(userData.role);
    document.getElementById("infoCreatedAt").textContent = formatDate(userData.createdAt);

    document.getElementById("editFullName").value = userData.fullName;
    document.getElementById("editPhone").value = userData.phone || "";

    loadOrders(user.uid);
    loadFavorite(user.uid);
}

async function loadOrders(userId){
    const orderList = document.getElementById("orderList");

    const q = query(collection(db,"donDat"),where("userId","==",userId));
    const snap = await getDocs(q);

    if(snap.empty){
        orderList.innerHTML = `<p>Chưa có đơn đặt sân nào.</p>`;
        return;
    }

    let html = "";

    snap.forEach(docSnap=>{
        const order = docSnap.data();

        html += `
            <div class="order-item">
                <strong>${order.tenSan || "Sân bóng"}</strong><br>
                Ngày: ${order.ngayDat}<br>
                Tổng tiền: ${(order.tongTien || 0).toLocaleString()}đ<br>
                Trạng thái: ${order.trangThai || "Chờ xác nhận"}
            </div>
        `;
    });

    orderList.innerHTML = html;
}

async function loadFavorite(userId){
    const favoriteBox = document.getElementById("favoriteList");
    const q = query(collection(db,"favorites"),where("userId","==",userId));
    const snap = await getDocs(q);
    if(snap.empty){
        favoriteBox.innerHTML = `<p>Chưa có sân yêu thích nào.</p>`;
        return;
    }
    let html = "";
    snap.forEach(docSnap=>{
        const fav = docSnap.data();
        html += `
            <div class="favorite-item">
                <strong>${fav.tenSan}</strong>
                <div>
                    <button class="btn-rebook" onclick="datLaiYeuThich('${fav.sanId}')">
                        Đặt sân
                    </button>
                    <button class="btn-cancel" onclick="xoaYeuThich('${docSnap.id}')">
                        Xóa
                    </button>
                </div>
            </div>
        `;
    });
    favoriteBox.innerHTML = html;
}

window.datLaiYeuThich = function(sanId){
    window.location.href = `chitiet.html?id=${sanId}`;
}

window.xoaYeuThich = async function(docId){
    if(!confirm("Bạn chắc chắn muốn xóa sân này khỏi danh sách yêu thích?")) return;
    await deleteDoc(doc(db,"favorites",docId));
    alert("Đã xóa khỏi danh sách yêu thích");
    loadFavorite(auth.currentUser.uid);
}

document.getElementById("editBtn").onclick = ()=>{
    document.getElementById("editForm").style.display = "block";
};

document.getElementById("cancelBtn").onclick = ()=>{
    document.getElementById("editForm").style.display = "none";
};

document.getElementById("saveBtn").onclick = async ()=>{
    const newName = document.getElementById("editFullName").value.trim();
    const newPhone = document.getElementById("editPhone").value.trim();

    if(!newName){
        alert("Vui lòng nhập họ tên");
        return;
    }

    await updateProfile(auth.currentUser,{
        displayName:newName
    });

    await updateDoc(doc(db,"users",auth.currentUser.uid),{
        fullName:newName,
        phone:newPhone,
        updatedAt:new Date().toISOString()
    });

    alert("Cập nhật thành công");
    window.location.reload();
};

document.getElementById("logoutBtnInProfile").onclick = async (e)=>{
    e.preventDefault();

    await signOut(auth);
    alert("Đã đăng xuất");
    window.location.href = "index.html";
};

onAuthStateChanged(auth,(user)=>{
    if(!user){
        window.location.href = "dangnhap.html";
        return;
    }

    loadProfile(user);
});
