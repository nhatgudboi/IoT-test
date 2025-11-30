# 🏠 IoT SmartHome System với ESP32

Hệ thống SmartHome IoT hiện đại sử dụng ESP32 để điều khiển và giám sát:
- 🔍 Cảm biến khí gas (MQ-2 hoặc tương tự)
- 🔊 Còi báo động
- 💡 Đèn LED với điều chỉnh độ sáng

## 📋 Mục Lục

- [Tính năng](#tính-năng)
- [Yêu cầu phần cứng](#yêu-cầu-phần-cứng)
- [Cài đặt](#cài-đặt)
- [Sử dụng](#sử-dụng)
- [Cấu hình](#cấu-hình)
- [API Endpoints](#api-endpoints)

## ✨ Tính năng

- **Giao diện web hiện đại**: UI đẹp, responsive, dễ sử dụng
- **Giám sát real-time**: Cập nhật dữ liệu cảm biến mỗi giây
- **Tự động hóa thông minh**: 
  - Tự động bật còi khi phát hiện gas nguy hiểm
  - Tự động bật đèn khi mức gas quá cao
- **Điều khiển từ xa**: Bật/tắt còi và đèn qua web
- **Điều chỉnh độ sáng**: Điều khiển độ sáng đèn từ 0-100%
- **Nhật ký hoạt động**: Theo dõi tất cả các sự kiện trong hệ thống

## 🔧 Yêu cầu Phần cứng

### ESP32
- ESP32 Development Board (ESP32-WROOM-32 hoặc tương tự)

### Cảm biến và thiết bị
- **Cảm biến khí gas**: MQ-2, MQ-5, hoặc tương tự
- **Còi**: Buzzer 5V hoặc 3.3V
- **Đèn**: LED với điện trở 220Ω hoặc module LED PWM

### Kết nối
- Kết nối WiFi để ESP32 có thể truy cập internet

## 📦 Cài đặt

### 1. Cài đặt ESP32

1. **Cài đặt Arduino IDE** (nếu chưa có)
   - Tải từ: https://www.arduino.cc/en/software

2. **Thêm ESP32 Board vào Arduino IDE**
   - Mở Arduino IDE
   - Vào `File` → `Preferences`
   - Thêm URL vào "Additional Board Manager URLs":
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Vào `Tools` → `Board` → `Boards Manager`
   - Tìm "esp32" và cài đặt

3. **Cài đặt thư viện cần thiết**
   - Vào `Tools` → `Manage Libraries`
   - Tìm và cài đặt:
     - `ArduinoJson` (bởi Benoit Blanchon)
     - `WebServer` (đã có sẵn trong ESP32)

4. **Nạp code vào ESP32**
   - Mở file `esp32_smarthome.ino`
   - Cấu hình WiFi (xem phần [Cấu hình](#cấu-hình))
   - Chọn board: `Tools` → `Board` → `ESP32 Arduino` → `ESP32 Dev Module`
   - Chọn cổng COM: `Tools` → `Port`
   - Nhấn `Upload`

### 2. Kết nối Phần cứng

```
ESP32          →    Thiết bị
─────────────────────────────────
GPIO 18        →    Còi (Buzzer)
GPIO 19        →    Đèn LED (với điện trở 220Ω)
A0 (ADC)       →    Cảm biến khí gas (MQ-2)
GND            →    GND chung
3.3V hoặc 5V   →    VCC (tùy thiết bị)
```

**Lưu ý**: 
- Cảm biến MQ-2 cần nguồn 5V, nhưng ESP32 chỉ cung cấp 3.3V. Có thể cần module chuyển đổi hoặc nguồn ngoài.
- Đèn LED cần điện trở hạn dòng 220Ω-330Ω.

### 3. Cài đặt Web Interface

1. **Mở file web**
   - Mở file `index.html` trong trình duyệt
   - Hoặc sử dụng web server local (XAMPP, Live Server, etc.)

2. **Cấu hình IP ESP32**
   - Mở file `app.js`
   - Tìm dòng: `const ESP32_IP = '192.168.1.100';`
   - Thay đổi IP thành IP của ESP32 (xem Serial Monitor sau khi nạp code)

## 🚀 Sử dụng

### Khởi động hệ thống

1. **Bật ESP32**
   - Kết nối ESP32 với máy tính qua USB
   - Mở Serial Monitor (115200 baud) để xem IP address
   - Ghi nhớ IP address (ví dụ: 192.168.1.100)

2. **Mở giao diện web**
   - Mở file `index.html` trong trình duyệt
   - Cập nhật IP trong `app.js` nếu cần

3. **Kiểm tra kết nối**
   - Xem chỉ báo trạng thái ở góc trên bên phải
   - Nếu hiển thị "Đã kết nối" (màu xanh) là thành công

### Điều khiển thiết bị

- **Còi**: Nhấn nút "Bật Còi" hoặc "Tắt Còi"
- **Đèn**: 
  - Nhấn nút "Bật Đèn" hoặc "Tắt Đèn"
  - Điều chỉnh độ sáng bằng thanh trượt

### Giám sát cảm biến

- Giá trị gas được hiển thị real-time
- Màu sắc thanh tiến trình thay đổi theo mức độ:
  - **Xanh lá**: Bình thường (0-300 PPM)
  - **Vàng**: Cảnh báo (300-1000 PPM)
  - **Đỏ**: Nguy hiểm (>1000 PPM)

## ⚙️ Cấu hình

### Cấu hình WiFi trong ESP32

Mở file `esp32_smarthome.ino` và thay đổi:

```cpp
const char* ssid = "TEN_WIFI_CUA_BAN";
const char* password = "MAT_KHAU_WIFI";
```

### Cấu hình IP trong Web

Mở file `app.js` và thay đổi:

```javascript
const ESP32_IP = '192.168.1.100'; // IP của ESP32
```

### Cấu hình chân GPIO (nếu cần)

Trong file `esp32_smarthome.ino`:

```cpp
#define GAS_SENSOR_PIN A0      // Chân cảm biến gas
#define BUZZER_PIN 18          // Chân còi
#define LIGHT_PIN 19           // Chân đèn
```

## 📡 API Endpoints

### GET /api/data
Lấy dữ liệu từ tất cả cảm biến và thiết bị.

**Response:**
```json
{
  "gas": 150,
  "buzzer": false,
  "light": true,
  "brightness": 75,
  "timestamp": 12345
}
```

### POST /api/buzzer
Điều khiển còi.

**Request Body:**
```json
{
  "state": 1  // 1 = bật, 0 = tắt
}
```

**Response:**
```json
{
  "success": true,
  "buzzer": true
}
```

### POST /api/light
Điều khiển đèn.

**Request Body:**
```json
{
  "state": 1,        // 1 = bật, 0 = tắt
  "brightness": 80   // 0-100 (chỉ khi state = 1)
}
```

**Response:**
```json
{
  "success": true,
  "light": true,
  "brightness": 80
}
```

## 🔍 Xử lý Sự cố

### ESP32 không kết nối WiFi
- Kiểm tra SSID và mật khẩu
- Đảm bảo WiFi ở chế độ 2.4GHz (ESP32 không hỗ trợ 5GHz)
- Xem Serial Monitor để biết lỗi chi tiết

### Web không kết nối được ESP32
- Kiểm tra IP address trong `app.js` có đúng không
- Đảm bảo ESP32 và máy tính cùng mạng WiFi
- Kiểm tra firewall có chặn kết nối không
- Thử truy cập trực tiếp: `http://[IP_ESP32]/api/data`

### Cảm biến không hoạt động
- Kiểm tra kết nối dây
- Đảm bảo cảm biến được cấp nguồn đúng
- Kiểm tra giá trị ADC trong Serial Monitor

### Còi/Đèn không hoạt động
- Kiểm tra kết nối GPIO
- Kiểm tra nguồn điện
- Thử test trực tiếp bằng code đơn giản

## 📝 Ghi chú

- Hệ thống sử dụng HTTP, không phải HTTPS (phù hợp cho mạng nội bộ)
- Để sử dụng từ xa, cần cấu hình port forwarding hoặc sử dụng dịch vụ như ngrok
- Cảm biến MQ-2 cần thời gian làm nóng (warm-up) khoảng 1-2 phút
- Giá trị gas được mô phỏng nếu không kết nối được ESP32 (để test giao diện)

## 📄 License

Dự án này được tạo cho mục đích giáo dục và học tập.

## 👨‍💻 Tác giả

Tạo bởi AI Assistant cho dự án IoT SmartHome với ESP32.

---

**Chúc bạn thành công với dự án SmartHome! 🎉**

