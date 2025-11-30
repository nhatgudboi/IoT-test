import cv2
import face_recognition
import firebase_admin
from firebase_admin import credentials, db
import numpy as np
import time

# --- CẤU HÌNH ---
DATABASE_URL = 'https://smarthome-iot-2d485-default-rtdb.asia-southeast1.firebasedatabase.app/'
KEY_PATH = "serviceAccountKey.json"
IMAGE_PATH = "images/admin.jpg"  # <-- ĐƯỜNG DẪN ĐẾN ẢNH CỦA BẠN

# --- 1. KẾT NỐI FIREBASE ---
try:
    cred = credentials.Certificate(KEY_PATH)
    firebase_admin.initialize_app(cred, {'databaseURL': DATABASE_URL})
    print("Ket noi Firebase OK!")
except Exception as e:
    print(f"Loi Firebase: {e}")
    exit()

# --- 2. HỌC KHUÔN MẶT CHỦ NHÂN (SỬA LẠI ĐOẠN NÀY) ---
print("Dang load anh chu nhan...")
try:
    # BƯỚC SỬA LỖI: Dùng OpenCV đọc ảnh để kiểm soát định dạng
    img_bgr = cv2.imread(IMAGE_PATH)
    
    if img_bgr is None:
        print(f"LOI: Khong tim thay file anh tai: {IMAGE_PATH}")
        print("Hay kiem tra lai ten file va thu muc images.")
        exit()

    # Chuyển đổi cưỡng bức từ BGR (OpenCV) sang RGB (Face Recognition)
    # Bước này giúp loại bỏ kênh Alpha (trong suốt) nếu có
    admin_image = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    # Mã hóa khuôn mặt
    # (Lấy khuôn mặt đầu tiên tìm thấy [0])
    encodings = face_recognition.face_encodings(admin_image)
    
    if len(encodings) == 0:
        print("LOI: Khong tim thay khuon mat nao trong anh admin.jpg!")
        print("Hay chup anh khac ro net hon, nhin thang vao camera.")
        exit()

    admin_encoding = encodings[0]
    
    known_face_encodings = [admin_encoding]
    known_face_names = ["ADMIN"] # Tên hiển thị
    print("Da hoc xong khuon mat Admin!")

except Exception as e:
    print(f"Co loi xay ra khi xu ly anh: {e}")
    exit()

# --- 3. KHỞI ĐỘNG CAMERA ---
video_capture = cv2.VideoCapture(0)

door_opened = False
process_this_frame = True # Biến để giảm tải (xử lý 1 khung hình, bỏ qua 1 khung hình)

print("---------------------------------------")
print("HE THONG FACE ID DA KICH HOAT")
print("Nhan 'q' de thoat.")
print("---------------------------------------")

while True:
    ret, frame = video_capture.read()
    if not ret: break

    # Giảm kích thước ảnh xuống 1/4 để xử lý nhanh hơn
    small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
    
    # Chuyển màu từ BGR (OpenCV) sang RGB (face_recognition)
    # Sửa lỗi numpy mới: dùng cv2.cvtColor thay vì small_frame[:, :, ::-1]
    rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

    face_names = []
    
    # Chỉ xử lý mỗi frame thứ 2 để tiết kiệm CPU
    if process_this_frame:
        # Tìm tất cả khuôn mặt trong khung hình hiện tại
        face_locations = face_recognition.face_locations(rgb_small_frame)
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

        for face_encoding in face_encodings:
            # So sánh với khuôn mặt Admin
            matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=0.5)
            name = "Unknown"

            # Tính độ sai lệch (càng thấp càng giống)
            face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
            best_match_index = np.argmin(face_distances)
            
            if matches[best_match_index]:
                name = known_face_names[best_match_index]
                
                # --- LOGIC MỞ CỬA ---
                if not door_opened:
                    print(f"--> CHAO MUNG {name}! GUI LENH MO CUA...")
                    ref = db.reference('/smarthome/commands')
                    ref.update({'ai_door': True})
                    door_opened = True
                    # Lưu thời điểm mở để tránh gửi lệnh liên tục
                    unlock_time = time.time()

            face_names.append(name)

    # Reset trạng thái mở cửa sau 5 giây (để sẵn sàng cho lần sau)
    if door_opened and (time.time() - unlock_time > 5):
        door_opened = False

    process_this_frame = not process_this_frame

    # --- HIỂN THỊ KẾT QUẢ LÊN MÀN HÌNH ---
    for (top, right, bottom, left), name in zip(face_locations, face_names):
        # Vì lúc nãy thu nhỏ 1/4, giờ phải nhân 4 lên để vẽ đúng vị trí
        top *= 4
        right *= 4
        bottom *= 4
        left *= 4

        # Vẽ khung hình chữ nhật
        color = (0, 255, 0) if name == "ADMIN" else (0, 0, 255) # Xanh nếu đúng, Đỏ nếu sai
        cv2.rectangle(frame, (left, top), (right, bottom), color, 2)

        # Vẽ tên
        cv2.rectangle(frame, (left, bottom - 35), (right, bottom), color, cv2.FILLED)
        font = cv2.FONT_HERSHEY_DUPLEX
        cv2.putText(frame, name, (left + 6, bottom - 6), font, 1.0, (255, 255, 255), 1)

    cv2.imshow('Smart Home Face ID', frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

video_capture.release()
cv2.destroyAllWindows()