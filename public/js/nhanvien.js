```javascript
// js/nhanvien.js

const db = firebase.firestore();
const auth = firebase.auth();

auth.onAuthStateChanged(user => {
    if (user) {
        loadCalendar();
        loadBookings();
        loadContacts();
        loadFoodOrders();
    } else {
        window.location.href = 'dangnhap.html';
    }
});

document.getElementById('btnLogout').addEventListener('click', () => {
    auth.signOut().then(() => window.location.href = 'dangnhap.html');
});

// C7.2: Xem lịch sân
function loadCalendar() {
    db.collection('datSan').where('trangThai', '==', 'Đã check-in')
    .onSnapshot(snapshot => {
        const container = document.getElementById('calendarView');
        container.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            container.innerHTML += `
                <div class="calendar-slot">
                    <p><strong>Sân:</strong> ${data.tenSan} | <strong>Ngày:</strong> ${data.ngayDat} | <strong>Giờ:</strong> ${data.khungGio}</p>
                </div>`;
        });
    });
}

// C7.3: Tạo đơn đặt sân (Hotline)
document.getElementById('btnCreateBooking').addEventListener('click', () => {
    const tenKhach = prompt("Nhập tên khách hàng:");
    const sdt = prompt("Nhập số điện thoại:");
    const ngayDat = prompt("Nhập ngày đặt (YYYY-MM-DD):");
    const khungGio = prompt("Nhập khung giờ (HH:MM - HH:MM):");
    const tenSan = prompt("Nhập tên sân:");

    if (tenKhach && sdt && ngayDat && khungGio && tenSan) {
        db.collection('datSan').add({
            tenKhachHang: tenKhach,
            sdt: sdt,
            ngayDat: ngayDat,
            khungGio: khungGio,
            tenSan: tenSan,
            hinhThuc: 'Hotline',
            trangThai: 'Chờ duyệt',
            ngayTao: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => alert('Tạo đơn đặt sân thành công!'));
    }
});

// C7.4 & C7.5: Hiển thị và xử lý Đặt sân
function loadBookings() {
    db.collection('datSan').orderBy('ngayTao', 'desc')
    .onSnapshot(snapshot => {
        const list = document.getElementById('bookingList');
        list.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            const statusClass = data.trangThai === 'Đã check-in' ? 'success' : data.trangThai === 'Đã hủy' ? 'danger' : 'pending';
            
            list.innerHTML += `
                <tr>
                    <td>${id.substring(0,5)}</td>
                    <td>${data.tenKhachHang} (${data.hinhThuc})</td>
                    <td>${data.ngayDat} - ${data.khungGio}</td>
                    <td><span class="badge ${statusClass}">${data.trangThai}</span></td>
                    <td>
                        ${data.trangThai === 'Chờ duyệt' ? `
                            <button onclick="checkInBooking('${id}')" class="btn-success">Check-in</button>
                            <button onclick="cancelBooking('${id}')" class="btn-danger">Cancel</button>
                        ` : ''}
                    </td>
                </tr>`;
        });
    });
}

function checkInBooking(id) {
    db.collection('datSan').doc(id).update({ trangThai: 'Đã check-in' })
    .then(() => alert('Xác nhận check-in thành công!'));
}

function cancelBooking(id) {
    if (confirm('Bạn có chắc chắn muốn hủy đơn này?')) {
        db.collection('datSan').doc(id).update({ trangThai: 'Đã hủy' })
        .then(() => alert('Đã hủy đơn đặt sân!'));
    }
}

// C7.6 & C7.7: Liên hệ & Phản hồi
function loadContacts() {
    db.collection('lienHe').orderBy('ngayGui', 'desc')
    .onSnapshot(snapshot => {
        const list = document.getElementById('contactList');
        list.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;

            list.innerHTML += `
                <tr>
                    <td><strong>${data.tenKhachHang}</strong><br>${data.email}</td>
                    <td>${data.noiDung}</td>
                    <td>
                        ${data.traLoi ? `<i>${data.traLoi}</i>` : `
                            <button onclick="replyContact('${id}')" class="btn-primary">Reply</button>
                        `}
                    </td>
                </tr>`;
        });
    });
}

function replyContact(id) {
    const noiDungReply = prompt("Nhập nội dung phản hồi:");
    if (noiDungReply) {
        db.collection('lienHe').doc(id).update({
            traLoi: noiDungReply,
            trangThai: 'Đã phản hồi'
        }).then(() => alert('Đã gửi phản hồi thành công!'));
    }
}

// C7.10 & C7.11: Tạo đơn tại quầy & Trừ kho
document.getElementById('btnCounterOrder').addEventListener('click', () => {
    const tenMon = prompt("Nhập tên món:");
    const soLuong = parseInt(prompt("Nhập số lượng:"));

    if (tenMon && soLuong) {
        db.collection('khoHang').where('tenMon', '==', tenMon).get().then(snapshot => {
            if (!snapshot.empty) {
                const itemDoc = snapshot.docs[0];
                const tonKhoHienTai = itemDoc.data().soLuongTon;

                if (tonKhoHienTai >= soLuong) {
                    db.collection('khoHang').doc(itemDoc.id).update({
                        soLuongTon: tonKhoHienTai - soLuong
                    });

                    db.collection('donDoAn').add({
                        loaiDon: 'Counter',
                        tenMon: tenMon,
                        soLuong: soLuong,
                        trangThai: 'Chờ xử lý',
                        ngayTao: firebase.firestore.FieldValue.serverTimestamp()
                    }).then(() => alert('Tạo đơn Counter thành công và đã cập nhật tồn kho!'));
                } else {
                    alert('Số lượng tồn kho không đủ!');
                }
            } else {
                alert('Không tìm thấy món trong kho!');
            }
        });
    }
});

// C7.8: Xem danh sách đơn đồ ăn
function loadFoodOrders() {
    db.collection('donDoAn').orderBy('ngayTao', 'desc')
    .onSnapshot(snapshot => {
        const list = document.getElementById('foodOrderList');
        list.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            const statusClass = data.trangThai === 'Hoàn thành' ? 'success' : 'pending';

            list.innerHTML += `
                <tr>
                    <td>${id.substring(0,5)}</td>
                    <td>${data.loaiDon} (${data.tenMon} x${data.soLuong})</td>
                    <td><span class="badge ${statusClass}">${data.trangThai}</span></td>
                    <td>
                        ${data.trangThai === 'Chờ xử lý' ? `
                            <button onclick="confirmKitchen('${id}')" class="btn-warning">Xác nhận (Kitchen)</button>
                        ` : ''}
                    </td>
                </tr>`;
        });
    });
}

// C7.9: Xác nhận đơn đồ ăn (Kitchen)
function confirmKitchen(id) {
    db.collection('donDoAn').doc(id).update({ trangThai: 'Hoàn thành' })
    .then(() => alert('Bếp đã xác nhận hoàn thành!'));
}

```
