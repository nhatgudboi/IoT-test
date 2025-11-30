// Trạng thái thiết bị
const deviceState = {
    gasValue: 0,
    lightSensor: 0, // 0 = Sáng, 1 = Tối
    alertLedOn: false,
    smartLightOn: false,
    smartLightAutoMode: true,
    aiDoorOpen: false,
    doorOpen: false,
    buzzerOn: false,
    connected: false,
    lastAIOpen: null
};

// Firebase database reference
const dbRef = database.ref('smarthome');

// Khởi tạo ứng dụng
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    startFirebaseListener();
    setupEventListeners();
    addLog('Hệ thống đã khởi động', 'success');
});

// Khởi tạo giao diện
function initializeUI() {
    updateGasDisplay(0);
    updateLightSensorDisplay(0);
    updateAlertLedDisplay(false);
    updateSmartLightDisplay(false, true);
    updateAIDisplay(false, null);
    updateDoorDisplay(false);
    updateBuzzerDisplay(false);
    updateConnectionStatus(false);
}

// Thiết lập event listeners
function setupEventListeners() {
    // Smart Light Auto/Manual Toggle
    const autoModeToggle = document.getElementById('auto-mode-toggle');
    autoModeToggle.addEventListener('change', (e) => {
        const isAuto = e.target.checked;
        controlSmartLightMode(isAuto);
    });

    // Smart Light Manual Controls
    document.getElementById('smart-light-on').addEventListener('click', () => {
        controlSmartLight(true);
    });

    document.getElementById('smart-light-off').addEventListener('click', () => {
        controlSmartLight(false);
    });

    // AI Test Door Button
    document.getElementById('test-ai-door').addEventListener('click', () => {
        testAIDoor();
    });
}

// Bắt đầu lắng nghe dữ liệu từ Firebase (Real-time)
function startFirebaseListener() {
    // Lắng nghe dữ liệu cảm biến
    dbRef.child('data').on('value', (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            deviceState.gasValue = data.gas || 0;
            deviceState.lightSensor = data.light_sensor || 0;
            deviceState.connected = true;

            // Cập nhật giao diện
            updateGasDisplay(deviceState.gasValue);
            updateLightSensorDisplay(deviceState.lightSensor);
            updateConnectionStatus(true);
        } else {
            updateConnectionStatus(false);
            addLog('Chưa có dữ liệu từ ESP32', 'warning');
        }
    }, (error) => {
        console.error('Lỗi Firebase:', error);
        updateConnectionStatus(false);
        addLog('Lỗi kết nối Firebase: ' + error.message, 'error');
    });

    // Lắng nghe trạng thái đèn thông minh
    dbRef.child('status/smart_light').on('value', (snapshot) => {
        if (snapshot.exists()) {
            deviceState.smartLightOn = snapshot.val();
            updateSmartLightDisplay(deviceState.smartLightOn, deviceState.smartLightAutoMode);
        }
    });

    // Lắng nghe lệnh AI door (để hiển thị trạng thái)
    dbRef.child('commands/ai_door').on('value', (snapshot) => {
        if (snapshot.exists()) {
            const aiCommand = snapshot.val();
            if (aiCommand === true) {
                deviceState.aiDoorOpen = true;
                deviceState.lastAIOpen = new Date();
                updateAIDisplay(true, deviceState.lastAIOpen);
                addLog('🤖 AI đã nhận diện và mở cửa!', 'success');
                
                // Reset sau 5 giây
                setTimeout(() => {
                    deviceState.aiDoorOpen = false;
                    updateAIDisplay(false, deviceState.lastAIOpen);
                }, 5000);
            } else {
                deviceState.aiDoorOpen = false;
                updateAIDisplay(false, deviceState.lastAIOpen);
            }
        }
    });

    // Tính toán trạng thái các thiết bị dựa trên gas value
    dbRef.child('data/gas').on('value', (snapshot) => {
        if (snapshot.exists()) {
            const gasValue = snapshot.val();
            const isDanger = gasValue > 1000;
            
            // Cập nhật trạng thái báo động
            deviceState.alertLedOn = isDanger;
            deviceState.buzzerOn = isDanger;
            deviceState.doorOpen = isDanger; // Cửa mở khi có gas
            
            updateAlertLedDisplay(deviceState.alertLedOn);
            updateBuzzerDisplay(deviceState.buzzerOn);
            updateDoorDisplay(deviceState.doorOpen);
        }
    });
}

// Cập nhật hiển thị cảm biến gas
function updateGasDisplay(value) {
    const gasValueEl = document.getElementById('gas-value');
    const gasProgressEl = document.getElementById('gas-progress');
    const gasStatusEl = document.getElementById('gas-status');

    gasValueEl.textContent = value;

    // Tính phần trăm (max là 2000 PPM)
    const percentage = Math.min((value / 2000) * 100, 100);
    gasProgressEl.style.width = percentage + '%';

    // Cập nhật trạng thái và màu sắc
    if (value < 1000) {
        gasStatusEl.textContent = 'Bình thường';
        gasStatusEl.className = 'card-status';
        gasProgressEl.className = 'progress-fill';
    } else {
        gasStatusEl.textContent = 'Nguy hiểm';
        gasStatusEl.className = 'card-status danger';
        gasProgressEl.className = 'progress-fill danger';
        addLog(`⚠️ CẢNH BÁO! Nồng độ gas: ${value} PPM - Hệ thống đã tự động bật báo động`, 'error');
    }
}

// Cập nhật hiển thị cảm biến ánh sáng
function updateLightSensorDisplay(value) {
    const lightSensorStatusEl = document.getElementById('light-sensor-status');
    const lightSensorTextEl = document.getElementById('light-sensor-text');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');

    // value = 0 là Sáng, value = 1 (HIGH) là Tối
    if (value === 0 || value === false) {
        lightSensorStatusEl.textContent = 'Sáng';
        lightSensorStatusEl.className = 'card-status active';
        lightSensorTextEl.textContent = 'Môi trường sáng';
        sunIcon.classList.add('active');
        moonIcon.classList.remove('active');
    } else {
        lightSensorStatusEl.textContent = 'Tối';
        lightSensorStatusEl.className = 'card-status';
        lightSensorTextEl.textContent = 'Môi trường tối';
        sunIcon.classList.remove('active');
        moonIcon.classList.add('active');
    }
}

// Cập nhật hiển thị đèn báo động
function updateAlertLedDisplay(isOn) {
    const alertLedStatusEl = document.getElementById('alert-led-status');
    const alertLedIconEl = document.getElementById('alert-led-icon');

    if (isOn) {
        alertLedStatusEl.textContent = 'Đang bật';
        alertLedStatusEl.className = 'card-status danger';
        alertLedIconEl.classList.add('active');
    } else {
        alertLedStatusEl.textContent = 'Tắt';
        alertLedStatusEl.className = 'card-status';
        alertLedIconEl.classList.remove('active');
    }
}

// Cập nhật hiển thị đèn thông minh
function updateSmartLightDisplay(isOn, isAuto) {
    const smartLightStatusEl = document.getElementById('smart-light-status');
    const smartLightIconEl = document.getElementById('smart-light-icon');
    const autoModeToggle = document.getElementById('auto-mode-toggle');
    const modeText = document.getElementById('mode-text');
    const manualControl = document.getElementById('manual-control');

    deviceState.smartLightAutoMode = isAuto;
    autoModeToggle.checked = isAuto;
    modeText.textContent = isAuto ? 'Tự động' : 'Thủ công';

    // Hiển thị/ẩn nút điều khiển thủ công
    if (isAuto) {
        manualControl.style.display = 'none';
    } else {
        manualControl.style.display = 'flex';
    }

    if (isOn) {
        smartLightStatusEl.textContent = isAuto ? 'Bật (Tự động)' : 'Bật (Thủ công)';
        smartLightStatusEl.className = 'card-status active';
        smartLightIconEl.classList.add('active');
    } else {
        smartLightStatusEl.textContent = isAuto ? 'Tắt (Tự động)' : 'Tắt (Thủ công)';
        smartLightStatusEl.className = 'card-status';
        smartLightIconEl.classList.remove('active');
    }
}

// Cập nhật hiển thị AI Face Unlock
function updateAIDisplay(isActive, lastOpenTime) {
    const aiStatusEl = document.getElementById('ai-status');
    const aiStatusTextEl = document.getElementById('ai-status-text');
    const aiLastOpenEl = document.getElementById('ai-last-open');
    const aiIconEl = document.getElementById('ai-icon');

    if (isActive) {
        aiStatusEl.textContent = 'Đang mở cửa';
        aiStatusEl.className = 'card-status active';
        aiStatusTextEl.textContent = 'Đã nhận diện khuôn mặt';
        aiIconEl.classList.add('active');
        
        if (lastOpenTime) {
            const timeStr = lastOpenTime.toLocaleTimeString('vi-VN');
            aiLastOpenEl.textContent = timeStr;
        }
    } else {
        aiStatusEl.textContent = 'Sẵn sàng';
        aiStatusEl.className = 'card-status';
        aiStatusTextEl.textContent = 'Đang chờ nhận diện';
        aiIconEl.classList.remove('active');
        
        if (lastOpenTime) {
            const timeStr = lastOpenTime.toLocaleTimeString('vi-VN');
            aiLastOpenEl.textContent = timeStr;
        } else {
            aiLastOpenEl.textContent = 'Chưa có';
        }
    }
}

// Cập nhật hiển thị cửa
function updateDoorDisplay(isOpen) {
    const doorStatusEl = document.getElementById('door-status');
    const doorIconEl = document.getElementById('door-icon');

    if (isOpen) {
        doorStatusEl.textContent = 'Mở';
        doorStatusEl.className = 'card-status active';
        doorIconEl.classList.add('active');
    } else {
        doorStatusEl.textContent = 'Đóng';
        doorStatusEl.className = 'card-status';
        doorIconEl.classList.remove('active');
    }
}

// Cập nhật hiển thị còi
function updateBuzzerDisplay(isOn) {
    const buzzerStatusEl = document.getElementById('buzzer-status');
    const buzzerIconEl = document.getElementById('buzzer-icon');

    if (isOn) {
        buzzerStatusEl.textContent = 'Đang bật';
        buzzerStatusEl.className = 'card-status danger';
        buzzerIconEl.classList.add('active');
    } else {
        buzzerStatusEl.textContent = 'Tắt';
        buzzerStatusEl.className = 'card-status';
        buzzerIconEl.classList.remove('active');
    }
}

// Điều khiển chế độ đèn thông minh (Auto/Manual)
async function controlSmartLightMode(isAuto) {
    try {
        await database.ref('smarthome/config/auto_mode').set(isAuto);
        deviceState.smartLightAutoMode = isAuto;
        updateSmartLightDisplay(deviceState.smartLightOn, isAuto);
        addLog(`Đèn thông minh chuyển sang chế độ: ${isAuto ? 'Tự động' : 'Thủ công'}`, 'success');
    } catch (error) {
        console.error('Lỗi Firebase:', error);
        addLog('Lỗi khi thay đổi chế độ đèn', 'error');
    }
}

// Điều khiển đèn thông minh (chỉ khi Manual mode)
async function controlSmartLight(on) {
    if (deviceState.smartLightAutoMode) {
        addLog('Vui lòng tắt chế độ tự động để điều khiển thủ công', 'warning');
        return;
    }

    try {
        await database.ref('smarthome/commands/smart_light').set(on);
        deviceState.smartLightOn = on;
        updateSmartLightDisplay(on, false);
        addLog(`Đèn thông minh đã ${on ? 'bật' : 'tắt'}`, on ? 'success' : '');
    } catch (error) {
        console.error('Lỗi Firebase:', error);
        addLog('Lỗi khi điều khiển đèn', 'error');
    }
}

// Test mở cửa bằng AI (gửi lệnh thủ công)
async function testAIDoor() {
    try {
        await database.ref('smarthome/commands/ai_door').set(true);
        addLog('🧪 Đã gửi lệnh test mở cửa AI', 'success');
        
        // Reset sau 5 giây
        setTimeout(async () => {
            try {
                await database.ref('smarthome/commands/ai_door').set(false);
            } catch (error) {
                console.error('Lỗi reset AI door:', error);
            }
        }, 5000);
    } catch (error) {
        console.error('Lỗi Firebase:', error);
        addLog('Lỗi khi test mở cửa AI', 'error');
    }
}

// Cập nhật trạng thái kết nối
function updateConnectionStatus(connected) {
    const statusDot = document.getElementById('connection-status');
    const statusText = document.getElementById('connection-text');

    if (connected) {
        statusDot.className = 'status-dot online';
        statusText.textContent = 'Đã kết nối';
    } else {
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Mất kết nối';
    }
}

// Thêm log vào nhật ký
function addLog(message, type = '') {
    const logContainer = document.getElementById('log-container');
    const logItem = document.createElement('div');
    logItem.className = `log-item ${type}`;
    
    const timestamp = new Date().toLocaleTimeString('vi-VN');
    logItem.textContent = `[${timestamp}] ${message}`;
    
    logContainer.insertBefore(logItem, logContainer.firstChild);
    
    // Giới hạn số lượng log
    while (logContainer.children.length > 50) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

// Xử lý lỗi toàn cục
window.addEventListener('error', (event) => {
    addLog(`Lỗi: ${event.message}`, 'error');
});

// Xử lý khi trang bị đóng
window.addEventListener('beforeunload', () => {
    // Có thể gửi lệnh tắt tất cả thiết bị trước khi đóng
});
