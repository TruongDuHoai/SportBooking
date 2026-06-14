import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp,
    doc,
    getDoc
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

function showMessage(msg, type="success"){
    const box = document.getElementById("resultMsg");
    box.style.color = type === "success" ? "green" : "red";
    box.innerText = msg;
}

async function autoFill(user){
    document.getElementById("email").value = user.email || "";

    const userSnap = await getDoc(doc(db,"users",user.uid));

    if(userSnap.exists()){
        const data = userSnap.data();

        document.getElementById("hoTen").value = data.fullName || "";
        document.getElementById("soDienThoai").value = data.phone || "";
    }
}

onAuthStateChanged(auth, async(user)=>{
    currentUser = user;

    const loginBtn = document.getElementById("loginBtn");
    const userDropdownArea = document.getElementById("userDropdownArea");
    const userInfoBtn = document.getElementById("userInfoBtn");
    const dropdownMenu = document.getElementById("dropdownMenu");

    if(user){
        loginBtn.style.display = "none";
        userDropdownArea.style.display = "inline-block";

        userInfoBtn.onclick = ()=>{
            dropdownMenu.style.display =
                dropdownMenu.style.display === "none" ? "block" : "none";
        };

        await autoFill(user);
    }
});

document.getElementById("logoutBtn").onclick = async ()=>{
    await signOut(auth);
    window.location.href = "index.html";
};

document.getElementById("sendBtn").onclick = async ()=>{
    const hoTen = document.getElementById("hoTen").value.trim();
    const email = document.getElementById("email").value.trim();
    const soDienThoai = document.getElementById("soDienThoai").value.trim();
    const chuDe = document.getElementById("chuDe").value;
    const noiDung = document.getElementById("noiDung").value.trim();

    if(!hoTen || !email || !chuDe || !noiDung){
        showMessage("Vui lòng nhập đầy đủ thông tin","error");
        return;
    }

    try{
        await addDoc(collection(db,"lienHeFeedback"),{
            userId: currentUser ? currentUser.uid : null,
            hoTen,
            email,
            soDienThoai,
            chuDe,
            noiDung,
            loai:"Liên hệ",
            trangThai:"Chưa xử lý",
            createdAt:new Date().toISOString(),
            createdAtServer: serverTimestamp()
        });

        showMessage("Gửi liên hệ thành công");

        document.getElementById("chuDe").value = "";
        document.getElementById("noiDung").value = "";

    }catch(error){
        showMessage("Gửi thất bại","error");
    }
};