import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
    getFirestore,
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    getDocs,
    updateDoc,
    deleteDoc,
    doc
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

const app = getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function deleteOldNotifications(userId) {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId)
    );

    const snap = await getDocs(q);
    const now = Date.now();

    const jobs = [];

    snap.forEach((docSnap) => {
        const n = docSnap.data();

        let createdTime = 0;

        if (typeof n.createdAt === "string") {
            createdTime = new Date(n.createdAt).getTime();
        }

        if (n.createdAt?.seconds) {
            createdTime = n.createdAt.seconds * 1000;
        }

        if (createdTime && now - createdTime > thirtyDays) {
            jobs.push(
                deleteDoc(doc(db, "notifications", docSnap.id))
            );
        }
    });

    await Promise.all(jobs);
}

async function loadNotifications(user) {
    await deleteOldNotifications(user.uid);
    const notificationBox = document.getElementById("notificationBox");
    const notificationBell = document.getElementById("notificationBell");
    const notificationBadge = document.getElementById("notificationBadge");
    const notificationDropdown = document.getElementById("notificationDropdown");
    const notificationList = document.getElementById("notificationList");
    const markAllBtn = document.getElementById("markAllNotificationsReadBtn");

    if (!notificationBox || !notificationBell || !notificationList) return;

    notificationBox.style.display = "inline-block";

    const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snapshot) => {
        let unreadCount = 0;
        let html = "";

        if (snapshot.empty) {
            notificationList.innerHTML = `
                <p style="padding:15px;color:#777;">
                    Chưa có thông báo.
                </p>
            `;
            notificationBadge.style.display = "none";
            return;
        }

        snapshot.forEach((docSnap) => {
            const n = docSnap.data();

            if (!n.isRead) unreadCount++;

            html += `
                <div
                    onclick="markNotificationRead('${docSnap.id}')"
                    style="
                        padding:12px;
                        border-bottom:1px solid #eee;
                        cursor:pointer;
                        background:${n.isRead ? "#fff" : "#e8f5e9"};
                    "
                >
                    <strong>${n.title || "Thông báo"}</strong>

                    <p style="margin:6px 0;color:#555;">
                        ${n.message || ""}
                    </p>

                    <small style="color:#888;">
                        ${
                            n.createdAt
                                ? new Date(n.createdAt).toLocaleString("vi-VN")
                                : ""
                        }
                    </small>
                </div>
            `;
        });

        notificationList.innerHTML = html;

        if (unreadCount > 0) {
            notificationBadge.textContent = unreadCount;
            notificationBadge.style.display = "flex";
        } else {
            notificationBadge.style.display = "none";
        }
    });

    notificationBell.onclick = (e) => {
        e.preventDefault();

        notificationDropdown.style.display =
            notificationDropdown.style.display === "block"
                ? "none"
                : "block";
    };

    if (markAllBtn) {
        markAllBtn.onclick = async (e) => {
            e.preventDefault();

            const qUnread = query(
                collection(db, "notifications"),
                where("userId", "==", user.uid),
                where("isRead", "==", false)
            );

            const snap = await getDocs(qUnread);

            const jobs = [];

            snap.forEach((docSnap) => {
                jobs.push(
                    updateDoc(doc(db, "notifications", docSnap.id), {
                        isRead: true
                    })
                );
            });

            await Promise.all(jobs);
        };
    }

    document.addEventListener("click", (e) => {
        if (!notificationBox.contains(e.target)) {
            notificationDropdown.style.display = "none";
        }
    });

}

window.markNotificationRead = async function (notificationId) {
    await updateDoc(doc(db, "notifications", notificationId), {
        isRead: true
    });
};

onAuthStateChanged(auth, async (user) => {
    const notificationBox = document.getElementById("notificationBox");

    if (!notificationBox) return;

    if (user) {
        await deleteOldNotifications(user.uid);
        loadNotifications(user);
    } else {
        notificationBox.style.display = "none";
    }
});
