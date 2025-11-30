#include <WiFi.h>
#include <FirebaseESP32.h>
#include <ESP32Servo.h> 

// ========== 1. CẤU HÌNH WIFI & FIREBASE (GIỮ NGUYÊN) ==========
const char* ssid = "MaiSon Staff"; 
const char* password = "1234567890"; 

// Host không có https:// và không có / ở cuối
#define FIREBASE_HOST "smarthome-iot-2d485-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_AUTH "uRVh255jtrxe9rl8VHgg2On8zpA0zj7j4SL8RbrV"

// ========== 2. CHÂN GPIO ==========
const int gasPin = 34;        // Cảm biến Gas
const int lightSensorPin = 35; // Cảm biến Ánh sáng (Chân DO)

const int servoPin = 13;
const int buzzPin = 12;

// --- HAI ĐÈN RIÊNG BIỆT ---
const int alertLedPin = 14;   // Đèn Báo Động (Đỏ) - Chỉ sáng khi có Gas
const int smartLedPin = 27;   // Đèn Thông Minh (Mới) - Chỉ sáng khi Tối/Bật Web

int gasThreshold = 1000;

// ========== 3. KHAI BÁO BIẾN ==========
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
Servo myWindow;

int gasValue = 0;
int isDark = 0; // 1 là Tối, 0 là Sáng

bool isAutoMode = true; 
bool smartLightState = false;

// Biến kiểm soát mở cửa bằng AI
bool aiDoorOpen = false;

unsigned long lastFirebaseUpdate = 0;
// Cập nhật siêu nhanh (800ms = 0.8 giây)
const unsigned long FIREBASE_UPDATE_INTERVAL = 800; 

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  pinMode(gasPin, INPUT);
  pinMode(lightSensorPin, INPUT); // Đọc Digital DO
  
  pinMode(buzzPin, OUTPUT);
  pinMode(alertLedPin, OUTPUT); 
  pinMode(smartLedPin, OUTPUT); 
  
  // Test Servo
  myWindow.attach(servoPin, 500, 2400);
  myWindow.write(0); // Đóng cửa ban đầu
  
  // WiFi
  Serial.print("WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.println(" OK! IP: ");
  Serial.println(WiFi.localIP());
  
  // Firebase (Cấu hình cũ)
  config.host = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  fbdo.setBSSLBufferSize(8192, 2048);
  fbdo.setResponseSize(4096);
}

// --- HÀM 1: XỬ LÝ ĐÈN THÔNG MINH (D27) ---
void handleSmartLight() {
  if (!Firebase.ready()) return;

  // 1. Đọc chế độ Auto/Manual
  if (Firebase.getBool(fbdo, "/smarthome/config/auto_mode")) {
     if (fbdo.dataType() == "boolean") isAutoMode = fbdo.boolData();
  }

  if (isAutoMode) {
    // === CHẾ ĐỘ TỰ ĐỘNG ===
    // Nếu cảm biến báo Tối (HIGH) -> Bật đèn D27
    if (isDark == HIGH) { 
      smartLightState = true;
    } else {
      smartLightState = false;
    }
    // Gửi trạng thái lên Web
    Firebase.setBool(fbdo, "/smarthome/status/smart_light", smartLightState);
    
  } else {
    // === CHẾ ĐỘ THỦ CÔNG ===
    if (Firebase.getBool(fbdo, "/smarthome/commands/smart_light")) {
       if (fbdo.dataType() == "boolean") smartLightState = fbdo.boolData();
    }
  }

  // Điều khiển Đèn D27
  digitalWrite(smartLedPin, smartLightState ? HIGH : LOW);
}

// --- HÀM 2: KIỂM TRA LỆNH AI FACE UNLOCK (MỚI THÊM) ---
void checkAICommand() {
  if (Firebase.ready()) {
    // Đọc biến ai_door từ Firebase
    if (Firebase.getBool(fbdo, "/smarthome/commands/ai_door")) {
      if (fbdo.dataType() == "boolean") {
        bool shouldOpen = fbdo.boolData();
        
        // NẾU LAPTOP BẢO MỞ CỬA (TRUE)
        if (shouldOpen == true) {
          Serial.println("AI DETECTED! OPENING DOOR...");
          
          // 1. Mở cửa
          myWindow.write(90); 
          
          // 2. Kêu bíp bíp chào mừng (Khác tiếng báo động)
          tone(buzzPin, 2000); delay(100); noTone(buzzPin); delay(100);
          tone(buzzPin, 2000); delay(100); noTone(buzzPin);
          
          // 3. Đợi 5 giây cho người đi vào
          delay(5000); 
          
          // 4. Đóng cửa
          myWindow.write(0);
          
          // 5. Reset biến trên Firebase về false (để không mở mãi)
          Firebase.setBool(fbdo, "/smarthome/commands/ai_door", false);
          
          Serial.println("Door Closed & Reset.");
        }
      }
    }
  }
}

void updateFirebaseData() {
  if (Firebase.ready()) {
    Firebase.setInt(fbdo, "/smarthome/data/gas", gasValue);
    Firebase.setInt(fbdo, "/smarthome/data/light_sensor", isDark);
    Firebase.setInt(fbdo, "/smarthome/data/timestamp", millis());
  }
}

void loop() {
  // 1. Đọc cảm biến
  gasValue = analogRead(gasPin);
  isDark = digitalRead(lightSensorPin); 

  // In ra màn hình kiểm tra (1s/lần)
  static unsigned long lastPrint = 0;
  if (millis() - lastPrint > 1000) {
    Serial.print("Gas: "); Serial.print(gasValue);
    Serial.print(" | Is Dark: "); Serial.print(isDark);
    Serial.print(" | D14 (Alert): "); Serial.print(gasValue > gasThreshold);
    Serial.print(" | D27 (Smart): "); Serial.println(smartLightState);
    lastPrint = millis();
  }

  // ====================================================
  // PHẦN A: LOGIC AN NINH (GAS) - Ưu tiên số 1
  // ====================================================
  if (gasValue > gasThreshold) {
    // --- CÓ GAS ---
    tone(buzzPin, 1000);
    myWindow.write(90); // Mở cửa sổ thoát khí
    
    // Nháy đèn D14 (Chớp tắt nhanh 50ms)
    digitalWrite(alertLedPin, HIGH); 
    delay(50); 
    digitalWrite(alertLedPin, LOW); 
    delay(50);
    
    // Lưu ý: Khi báo động Gas thì KHÔNG kiểm tra AI để tránh xung đột
    
  } else {
    // --- AN TOÀN ---
    noTone(buzzPin);
    
    // Chỉ đóng cửa khi AI KHÔNG đang ra lệnh mở
    // (Logic đóng cửa AI đã nằm trong hàm checkAICommand rồi)
    // Để an toàn, ta set mặc định về 0 ở đây, nhưng checkAICommand sẽ ghi đè lên nếu cần
    // Tuy nhiên để mượt nhất, ta chỉ đóng ở đây nếu không có gas, 
    // còn việc mở/đóng của AI thì để hàm checkAICommand tự lo.
    // Dòng dưới đây để đảm bảo nếu vừa hết gas thì cửa đóng lại:
    // myWindow.write(0); <--- Bỏ dòng này ở đây để tránh đánh nhau với AI
    
    // Nếu muốn an toàn tuyệt đối: "Không có Gas VÀ Không có AI thì mới đóng cửa"
    // Nhưng vì hàm AI có delay 5s rồi đóng luôn, nên ở trạng thái bình thường cửa luôn đóng.
    // Ta chỉ cần đảm bảo D14 tắt.
    digitalWrite(alertLedPin, LOW); 

    // ====================================================
    // PHẦN B: CÁC TÍNH NĂNG THÔNG MINH (CHẠY SONG SONG)
    // ====================================================
    
    handleSmartLight(); // Xử lý đèn D27
    checkAICommand();   // Xử lý mở cửa bằng AI
  }

  // ====================================================
  // PHẦN C: GỬI DỮ LIỆU
  // ====================================================
  if (millis() - lastFirebaseUpdate >= FIREBASE_UPDATE_INTERVAL) {
    updateFirebaseData();
    lastFirebaseUpdate = millis();
  }
}