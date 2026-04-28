// ================= KONFIGURASI EMQX =================
        // GANTI DENGAN DATA EMQX ANDA!
        const EMQX_CONFIG = {
            broker: 'wss://c2851b04.ala.asia-southeast1.emqxsl.com:8084/mqtt',
            username: 'Lutfi',           // GANTI dengan username Anda
            password: 'Lutfi',   // GANTI dengan password Anda
            topic: 'iot/ph_air'
        };

        let currentPh = 6.8;
        let phHistory = [];
        let mqttClient = null;

        // ================= MQTT CONNECTION =================
        function connectMQTT() {
            const options = {
                clientId: 'dashboard_' + Math.random().toString(36).substr(2, 8),
                username: EMQX_CONFIG.username,
                password: EMQX_CONFIG.password,
                clean: true,
                reconnectPeriod: 1000,
                connectTimeout: 30000
            };

            console.log('🔄 Connecting to EMQX...', EMQX_CONFIG.broker);
            
            mqttClient = mqtt.connect(EMQX_CONFIG.broker, options);

            mqttClient.on('connect', () => {
                console.log('✅ MQTT Connected!');
                document.getElementById('mqttStatus').innerHTML = '✅ Terhubung ke EMQX';
                document.getElementById('mqttStatus').className = 'connection-status status-connected';
                
                mqttClient.subscribe(EMQX_CONFIG.topic, (err) => {
                    if (!err) {
                        console.log('✅ Subscribed to: ' + EMQX_CONFIG.topic);
                    } else {
                        console.log('❌ Subscribe failed:', err);
                    }
                });
            });

            mqttClient.on('message', (topic, message) => {
                const rawMessage = message.toString();
                console.log('📨 Message received - Topic:', topic, '| Message:', rawMessage);
                
                let phValue;
                
                // Coba parse sebagai JSON dulu
                try {
                    const jsonData = JSON.parse(rawMessage);
                    // Kalau format JSON dengan key "iot/ph_air"
                    if (jsonData["iot/ph_air"]) {
                        phValue = parseFloat(jsonData["iot/ph_air"]);
                    }
                    // Atau kalau format JSON lain
                    else if (jsonData.ph) {
                        phValue = parseFloat(jsonData.ph);
                    }
                    else if (jsonData.value) {
                        phValue = parseFloat(jsonData.value);
                    }
                } catch(e) {
                    // Kalau bukan JSON, anggap langsung angka
                    phValue = parseFloat(rawMessage);
                }
                
                if (!isNaN(phValue) && phValue >= 3 && phValue <= 10) {
                    currentPh = phValue;
                    updatePhDisplay();
                    updateTimestamp();
                    addToHistory(phValue);
                    console.log('✅ pH updated to:', currentPh);
                } else {
                    console.log('❌ Invalid pH value:', rawMessage);
                }
            });

            mqttClient.on('error', (err) => {
                console.error('❌ MQTT Error:', err);
                document.getElementById('mqttStatus').innerHTML = '❌ Error: ' + err.message;
                document.getElementById('mqttStatus').className = 'connection-status status-disconnected';
            });

            mqttClient.on('disconnect', () => {
                console.log('⚠️ MQTT Disconnected');
                document.getElementById('mqttStatus').innerHTML = '❌ Terputus dari EMQX';
                document.getElementById('mqttStatus').className = 'connection-status status-disconnected';
            });
        }

        // ================= HISTORY =================
        function addToHistory(ph) {
            phHistory.unshift({ ph: ph, time: new Date() });
            if (phHistory.length > 50) phHistory.pop();
            updateStatistics();
        }

        function updateStatistics() {
            if (phHistory.length === 0) return;
            
            const values = phHistory.map(h => h.ph);
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);
            
            document.getElementById('avgPh').innerHTML = avg.toFixed(2);
            document.getElementById('minPh').innerHTML = min.toFixed(2);
            document.getElementById('maxPh').innerHTML = max.toFixed(2);
            document.getElementById('latestPh').innerHTML = currentPh.toFixed(2);
        }

        // ================= UPDATE DISPLAY =================
        function updatePhDisplay() {
            document.getElementById('phValue').innerHTML = currentPh.toFixed(2);
            document.getElementById('latestPh').innerHTML = currentPh.toFixed(2);
            
            const statusEl = document.getElementById('phStatus');
            const statusInfo = document.getElementById('statusInfo');
            
            if (currentPh >= 5.5 && currentPh <= 6.8) {
                statusEl.className = 'ph-status optimal';
                statusEl.innerHTML = '✓ Optimal';
                statusInfo.innerHTML = 'Optimal ✓';
            } else if (currentPh < 4.5 || currentPh > 7.5) {
                statusEl.className = 'ph-status critical';
                statusEl.innerHTML = '⚠ Kritis';
                statusInfo.innerHTML = 'Kritis - Segera Sesuaikan!';
            } else {
                statusEl.className = 'ph-status warning';
                statusEl.innerHTML = '⚠ Perlu Penyesuaian';
                statusInfo.innerHTML = 'Perlu Penyesuaian';
            }
            
            drawGauge();
        }

        function updateTimestamp() {
            const now = new Date();
            document.getElementById('timestamp').innerHTML = `📡 Data dari sensor | ${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID')}`;
        }

        // ================= GAUGE =================
        function drawGauge() {
            const canvas = document.getElementById('phGauge');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            const w = canvas.width, h = canvas.height;
            const cx = w/2, cy = h/2;
            const radius = 100;
            
            ctx.clearRect(0, 0, w, h);
            
            // Background
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle = '#f3f4f6';
            ctx.fill();
            
            // Nilai pH di tengah
            ctx.font = 'bold 32px Arial';
            ctx.fillStyle = '#2563eb';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(currentPh.toFixed(1), cx, cy);
            
            ctx.font = '12px Arial';
            ctx.fillStyle = '#6b7280';
            ctx.fillText('pH', cx, cy + 35);
            
            // Indikator warna di sekeliling
            let color;
            if (currentPh >= 5.5 && currentPh <= 6.8) color = '#10b981';
            else if (currentPh < 5.5) color = '#ef4444';
            else color = '#f59e0b';
            
            ctx.beginPath();
            ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = 8;
            ctx.stroke();
        }

        // ================= MANUAL CONTROL =================
        function setManualPh() {
            const input = document.getElementById('manualPh');
            const value = parseFloat(input.value);
            
            if (isNaN(value) || value < 4.5 || value > 7.5) {
                alert('Masukkan pH antara 4.5 - 7.5');
                return;
            }
            
            currentPh = value;
            updatePhDisplay();
            updateTimestamp();
            addToHistory(value);
            input.value = '';
            
            // Kirim ke MQTT (opsional)
            if (mqttClient && mqttClient.connected) {
                mqttClient.publish(EMQX_CONFIG.topic, value.toString());
                console.log('📤 Published to MQTT:', value);
            }
        }

        function resetPh() {
            currentPh = 6.8;
            updatePhDisplay();
            updateTimestamp();
            addToHistory(6.8);
            document.getElementById('manualPh').value = '';
        }

        // ================= INIT =================
        document.addEventListener('DOMContentLoaded', () => {
            drawGauge();
            updateTimestamp();
            connectMQTT();
        });