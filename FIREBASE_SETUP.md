# 🔥 Hướng Dẫn Cấu Hình Firebase

Hướng dẫn chi tiết để cấu hình Firebase cho dự án IoT SmartHome ESP32.

## 📋 Bước 1: Tạo Firebase Project

1. Truy cập https://console.firebase.google.com
2. Nhấn **"Add project"** hoặc **"Thêm dự án"**
3. Nhập tên project (ví dụ: `smarthome-esp32`)
4. Chọn **"Continue"** → **"Continue"** → **"Create project"**
5. Đợi Firebase tạo project (khoảng 30 giây)

## 📋 Bước 2: Tạo Realtime Database

1. Trong Firebase Console, vào **"Realtime Database"** ở menu bên trái
2. Nhấn **"Create Database"**
3. Chọn **"Start in test mode"** (để test nhanh) hoặc **"Start in locked mode"** (an toàn hơn)
4. Chọn location gần bạn nhất (ví dụ: `asia-southeast1`)
5. Nhấn **"Enable"**

## 📋 Bước 3: Lấy Thông Tin Cấu Hình

### Lấy Database URL:
1. Vào **Realtime Database**
2. Copy **Database URL** (ví dụ: `https://smarthome-esp32-default-rtdb.firebaseio.com`)
3. Chỉ lấy phần host: `smarthome-esp32-default-rtdb.firebaseio.com`

### Lấy Database Secret (cho ESP32):
1. Vào **Project Settings** (biểu tượng bánh răng)
2. Tab **"Service accounts"**
3. Nhấn **"Database secrets"**
4. Copy **Database secret** (chuỗi dài)

**LƯU Ý**: Nếu không thấy "Database secrets", có thể cần dùng Service Account token (xem bước 4)

## 📋 Bước 4: Lấy Web API Config

1. Vào **Project Settings** → Tab **"General"**
2. Cuộn xuống phần **"Your apps"**
3. Nhấn biểu tượng **Web (</>)** để thêm Web app
4. Nhập tên app (ví dụ: `SmartHome Web`)
5. **KHÔNG** tích chọn Firebase Hosting
6. Nhấn **"Register app"**
7. Copy toàn bộ object `firebaseConfig`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "smarthome-esp32.firebaseapp.com",
  databaseURL: "https://smarthome-esp32-default-rtdb.firebaseio.com",
  projectId: "smarthome-esp32",
  storageBucket: "smarthome-esp32.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## 📋 Bước 5: Cấu Hình ESP32 Code

Mở file `esp32_smarthome.ino` và thay đổi:

```cpp
// Thay đổi WiFi
const char* ssid = "TEN_WIFI_CUA_BAN";
const char* password = "MAT_KHAU_WIFI";

// Thay đổi Firebase
#define FIREBASE_HOST "smarthome-esp32-default-rtdb.firebaseio.com"  // Database URL (chỉ phần host)
#define FIREBASE_AUTH "YOUR_DATABASE_SECRET"  // Database Secret từ bước 3
```

## 📋 Bước 6: Cấu Hình Web (HTML)

Mở file `index.html` và tìm phần Firebase config, thay bằng thông tin của bạn:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSy...",  // Từ bước 4
    authDomain: "smarthome-esp32.firebaseapp.com",
    databaseURL: "https://smarthome-esp32-default-rtdb.firebaseio.com",
    projectId: "smarthome-esp32",
    storageBucket: "smarthome-esp32.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};
```

## 📋 Bước 7: Cài Đặt Thư Viện ESP32

1. Mở **Arduino IDE**
2. Vào **Tools** → **Manage Libraries**
3. Tìm và cài đặt: **"Firebase ESP32 Client"** (bởi mobizt)
4. Đảm bảo đã cài: **"ESP32Servo"** (cho Servo)

## 📋 Bước 8: Cấu Hình Security Rules (Quan trọng!)

1. Vào **Realtime Database** → Tab **"Rules"**
2. Thay đổi rules để cho phép đọc/ghi:

```json
{
  "rules": {
    "smarthome": {
      ".read": true,
      ".write": true
    }
  }
}
```

**LƯU Ý**: Rules trên cho phép mọi người đọc/ghi (chỉ dùng cho test). 
Để bảo mật hơn, nên dùng Authentication (xem phần nâng cao).

3. Nhấn **"Publish"**

## 📋 Bước 9: Test Kết Nối

1. **Nạp code vào ESP32** với thông tin đã cấu hình
2. Mở **Serial Monitor** (115200 baud)
3. Kiểm tra xem có thông báo "Firebase đã kết nối!" không
4. Mở **Firebase Console** → **Realtime Database**
5. Kiểm tra xem có dữ liệu xuất hiện trong `/smarthome/data` không
6. Mở **Web interface** (`index.html`)
7. Kiểm tra xem dữ liệu có hiển thị không

## 🔒 Bảo Mật Nâng Cao (Tùy chọn)

### Sử dụng Authentication:

1. Vào **Authentication** → **Sign-in method**
2. Bật **Email/Password** hoặc **Anonymous**
3. Cập nhật Rules:

```json
{
  "rules": {
    "smarthome": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

4. Thêm authentication vào Web code (xem Firebase Auth docs)

## 🐛 Xử Lý Lỗi Thường Gặp

### Lỗi: "Firebase connection failed"
- Kiểm tra WiFi đã kết nối chưa
- Kiểm tra FIREBASE_HOST có đúng không
- Kiểm tra FIREBASE_AUTH có đúng không
- Kiểm tra Security Rules có cho phép đọc/ghi không

### Lỗi: "Permission denied"
- Kiểm tra Security Rules trong Firebase Console
- Đảm bảo rules cho phép đọc/ghi tại `/smarthome`

### ESP32 không ghi được dữ liệu
- Kiểm tra Serial Monitor để xem lỗi chi tiết
- Kiểm tra buffer size trong code (đã set 4096, 1024)
- Thử tăng delay giữa các lần ghi

### Web không hiển thị dữ liệu
- Mở Console (F12) để xem lỗi
- Kiểm tra Firebase config có đúng không
- Kiểm tra database URL có đúng không

## 📊 Cấu Trúc Database

Sau khi chạy, database sẽ có cấu trúc:

```
smarthome/
├── data/
│   ├── gas: 500
│   ├── buzzer: false
│   ├── led: false
│   ├── servo: 0
│   └── timestamp: 1234567890
└── commands/
    ├── buzzer: false (tạm thời, sẽ bị xóa sau khi ESP32 đọc)
    ├── led: false
    └── servo: 0
```

## ✅ Checklist Hoàn Thành

- [ ] Đã tạo Firebase Project
- [ ] Đã tạo Realtime Database
- [ ] Đã lấy Database URL và Secret
- [ ] Đã lấy Web API Config
- [ ] Đã cấu hình ESP32 code
- [ ] Đã cấu hình HTML
- [ ] Đã cài thư viện Firebase ESP32
- [ ] Đã cấu hình Security Rules
- [ ] Đã test kết nối thành công

## 🎉 Hoàn Thành!

Bây giờ hệ thống của bạn đã sẵn sàng sử dụng Firebase! ESP32 sẽ tự động ghi dữ liệu lên Firebase và Web sẽ đọc real-time.

