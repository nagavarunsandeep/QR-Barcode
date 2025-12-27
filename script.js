const qrInput = document.getElementById('qr-input');
const qrCodeContainer = document.getElementById('qrcode');
const barcodeContainer = document.getElementById('barcode');
const codeTypeSelect = document.getElementById('code-type');
const resultArea = document.getElementById('result-area');
let html5QrCode = null;
let currentFacingMode = "environment";
let torchEnabled = false;
let scannerClearPromise = Promise.resolve();
let lastScannedCode = null;

function switchTab(tab) {
    const tabGenerate = document.getElementById('tab-generate');
    const tabScan = document.getElementById('tab-scan');
    const sectionGenerate = document.getElementById('generate-section');
    const sectionScan = document.getElementById('scan-section');

    // Tailwind classes for active/inactive states
    const activeClasses = ['text-blue-600', 'border-b-2', 'border-blue-600', 'dark:text-blue-400', 'dark:border-blue-400'];
    const inactiveClasses = ['text-gray-500', 'dark:text-gray-400', 'hover:text-gray-700', 'dark:hover:text-gray-200'];

    if (tab === 'generate') {
        tabGenerate.classList.add(...activeClasses);
        tabGenerate.classList.remove(...inactiveClasses);
        tabScan.classList.remove(...activeClasses);
        tabScan.classList.add(...inactiveClasses);

        sectionGenerate.classList.remove('hidden');
        sectionScan.classList.add('hidden');

        if (html5QrCode) {
            stopScanner();
        }
    } else {
        tabScan.classList.add(...activeClasses);
        tabScan.classList.remove(...inactiveClasses);
        tabGenerate.classList.remove(...activeClasses);
        tabGenerate.classList.add(...inactiveClasses);

        sectionScan.classList.remove('hidden');
        sectionGenerate.classList.add('hidden');

        loadHistory();
    }
}

function generateCode() {
    const type = codeTypeSelect.value;
    const placeholder = document.getElementById('result-placeholder');
    const generatedContent = document.getElementById('generated-content');
    const colorDark = document.getElementById('qr-color-dark').value;
    const colorLight = document.getElementById('qr-color-light').value;
    const colorDarkEnd = document.getElementById('qr-color-dark-end').value;
    const password = document.getElementById('qr-password').value.trim();
    const size = parseInt(document.getElementById('qr-size').value) || 300;
    const ecc = parseInt(document.getElementById('qr-ecc').value);
    let text = "";

    qrCodeContainer.innerHTML = "";
    barcodeContainer.style.display = "none";
    qrCodeContainer.style.display = "none";
    placeholder.classList.remove('hidden');
    generatedContent.classList.add('hidden');

    if (type === 'wifi') {
        const ssid = document.getElementById('wifi-ssid').value.trim();
        const password = document.getElementById('wifi-password').value.trim();
        const encryption = document.getElementById('wifi-encryption').value;

        if (!ssid) {
            alert("Please enter the Network Name (SSID).");
            return;
        }
        text = `WIFI:T:${encryption};S:${ssid};P:${password};;`;
    } else if (type === 'vcard') {
        const name = document.getElementById('vcard-name').value.trim();
        const phone = document.getElementById('vcard-phone').value.trim();
        const email = document.getElementById('vcard-email').value.trim();
        const org = document.getElementById('vcard-org').value.trim();
        const title = document.getElementById('vcard-title').value.trim();
        const url = document.getElementById('vcard-url').value.trim();

        if (!name) {
            alert("Please enter a Full Name.");
            return;
        }
        // Construct vCard 3.0 string
        text = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nN:${name};;;;\nTEL;TYPE=CELL:${phone}\nEMAIL:${email}\nORG:${org}\nTITLE:${title}\nURL:${url}\nEND:VCARD`;
    } else if (type === 'email') {
        const to = document.getElementById('email-to').value.trim();
        const subject = document.getElementById('email-subject').value.trim();
        const body = document.getElementById('email-body').value.trim();

        if (!to) {
            alert("Please enter a Recipient Email.");
            return;
        }
        text = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else if (type === 'sms') {
        const phone = document.getElementById('sms-phone').value.trim();
        const message = document.getElementById('sms-message').value.trim();

        if (!phone) {
            alert("Please enter a Phone Number.");
            return;
        }
        text = `SMSTO:${phone}:${message}`;
    } else if (type === 'geo') {
        const lat = document.getElementById('geo-lat').value.trim();
        const long = document.getElementById('geo-long').value.trim();
        if (!lat || !long) {
            alert("Please enter Latitude and Longitude.");
            return;
        }
        text = `geo:${lat},${long}`;
    } else if (type === 'event') {
        const summary = document.getElementById('event-summary').value.trim();
        const start = document.getElementById('event-start').value.replace(/[-:]/g, '');
        const end = document.getElementById('event-end').value.replace(/[-:]/g, '');
        const location = document.getElementById('event-location').value.trim();
        
        if (!summary || !start || !end) {
            alert("Please enter Event Title, Start and End times.");
            return;
        }
        // Format: YYYYMMDDTHHMMSS
        const dtStart = start ? start + "00" : "";
        const dtEnd = end ? end + "00" : "";
        text = `BEGIN:VEVENT\nSUMMARY:${summary}\nDTSTART:${dtStart}\nDTEND:${dtEnd}\nLOCATION:${location}\nEND:VEVENT`;
    } else if (type === 'whatsapp') {
        const phone = document.getElementById('whatsapp-phone').value.trim();
        const message = document.getElementById('whatsapp-message').value.trim();
        if (!phone) {
            alert("Please enter a Phone Number.");
            return;
        }
        text = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    } else if (type === 'upi') {
        const vpa = document.getElementById('upi-vpa').value.trim();
        const name = document.getElementById('upi-name').value.trim();
        const amount = document.getElementById('upi-amount').value.trim();
        const note = document.getElementById('upi-note').value.trim();
        if (!vpa) {
            alert("Please enter a UPI ID.");
            return;
        }
        text = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(name)}`;
        if (amount) text += `&am=${amount}`;
        if (note) text += `&tn=${encodeURIComponent(note)}`;
    } else {
        text = qrInput.value.trim();
    }

    if (!text) {
        alert("Please enter text to generate.");
        return;
    }

    if (password) {
        try {
            text = "ENC:" + CryptoJS.AES.encrypt(text, password).toString();
        } catch (e) {
            alert("Encryption failed: " + e.message);
            return;
        }
    }

    placeholder.classList.add('hidden');
    generatedContent.classList.remove('hidden');

    if (type !== 'barcode') {
        qrCodeContainer.style.display = "flex";
        try {
            new QRCode(qrCodeContainer, {
                text: text,
                width: size,
                height: size,
                colorDark: colorDark, // Base color, will be overridden by gradient
                colorLight: "rgba(0,0,0,0)", // Transparent for composition
                correctLevel: ecc
            });

            // Post-process for Gradient and Logo
            const canvas = qrCodeContainer.querySelector('canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                const size = canvas.width;

                // 1. Create Gradient
                const gradient = ctx.createLinearGradient(0, 0, size, size);
                gradient.addColorStop(0, colorDark);
                gradient.addColorStop(1, colorDarkEnd);

                // 2. Apply Gradient to modules (source-in)
                ctx.globalCompositeOperation = 'source-in';
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, size, size);

                // 3. Draw Background (destination-over)
                ctx.globalCompositeOperation = 'destination-over';
                ctx.fillStyle = colorLight;
                ctx.fillRect(0, 0, size, size);

                // Reset composite
                ctx.globalCompositeOperation = 'source-over';

                // 4. Draw Logo if exists
                const logoFile = document.getElementById('qr-logo').files[0];
                if (logoFile) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const img = new Image();
                        img.onload = function() {
                            const logoSize = size * 0.2;
                            const logoX = (size - logoSize) / 2;
                            const logoY = (size - logoSize) / 2;

                            // Draw background for logo
                            ctx.fillStyle = colorLight;
                            ctx.fillRect(logoX, logoY, logoSize, logoSize);
                            ctx.drawImage(img, logoX, logoY, logoSize, logoSize);

                            // Update img tag
                            const qrImg = qrCodeContainer.querySelector('img');
                            if (qrImg) qrImg.src = canvas.toDataURL();
                        };
                        img.src = e.target.result;
                    };
                    reader.readAsDataURL(logoFile);
                } else {
                     // Update img tag if no logo
                    const qrImg = qrCodeContainer.querySelector('img');
                    if (qrImg) qrImg.src = canvas.toDataURL();
                }
            }
        } catch (e) {
            alert("Error generating QR Code.");
            placeholder.classList.remove('hidden');
            generatedContent.classList.add('hidden');
        }
    } else {
        try {
            barcodeContainer.style.display = "block";
            barcodeContainer.innerHTML = "";
            barcodeContainer.removeAttribute("viewBox");
            barcodeContainer.removeAttribute("width");
            barcodeContainer.removeAttribute("height");
            JsBarcode(barcodeContainer, text, {
                format: "CODE128",
                lineColor: colorDark,
                width: 2,
                height: 100,
                displayValue: true,
                background: colorLight,
                margin: 10
            });
        } catch (e) {
             alert("Error generating Barcode. Text might contain unsupported characters.");
             placeholder.classList.remove('hidden');
             generatedContent.classList.add('hidden');
        }
    }
}

function downloadCode() {
    const type = codeTypeSelect.value;
    if (type === 'qr') {
        const img = qrCodeContainer.querySelector("img");
        const canvas = qrCodeContainer.querySelector("canvas");

        const link = document.createElement("a");
        link.download = "qrcode.png";

        if (img && img.src) {
            link.href = img.src;
        } else if (canvas) {
            link.href = canvas.toDataURL("image/png");
        } else {
            return;
        }
        link.click();
    } else {
        // For SVG barcode
        const svgData = new XMLSerializer().serializeToString(barcodeContainer);
        const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "barcode.svg";
        link.click();
    }
}

function shareCode() {
    const canvas = qrCodeContainer.querySelector('canvas');
    if (canvas) {
        canvas.toBlob(blob => {
            const file = new File([blob], "qrcode.png", { type: "image/png" });
            if (navigator.share) {
                navigator.share({
                    title: 'QR Code',
                    text: 'Created with QR & Barcode Tool',
                    files: [file]
                }).catch(console.error);
            } else {
                alert("Web Share API not supported in this browser.");
            }
        });
    }
}

function toggleCamera() {
    if (html5QrCode) {
        stopScanner();
    } else {
        startScanner();
    }
}

function startScanner() {
    scannerClearPromise.then(() => {
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("reader");
        }
        lastScannedCode = null;

        // Clear placeholder content
        document.getElementById('reader').innerHTML = '';
        document.querySelector('.scanner-laser').classList.remove('hidden');
        document.getElementById('scanner-hud').classList.remove('hidden');
        
        // Update Toggle Button
        const btn = document.getElementById('btn-cam-toggle');
        btn.innerText = "Stop Camera";
        btn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        btn.classList.add('bg-red-500', 'hover:bg-red-600');
        
        Html5Qrcode.getCameras().then(devices => {
            updateCameraList(devices);
            
            const cameraSelect = document.getElementById('camera-select');
            const selectedDeviceId = cameraSelect.value;
            
            // Use selected device ID if available, otherwise use facing mode
            const config = (selectedDeviceId) 
                ? { deviceId: { exact: selectedDeviceId } }
                : { facingMode: currentFacingMode };

            return html5QrCode.start(
                config,
                { fps: 10, qrbox: { width: 250, height: 250 } },
                // Success callback
                onScanSuccess,
                onScanFailure
            );
        }).catch(err => {
            console.error("Error starting scanner", err);
            alert("Error starting camera: " + err);
        });
    });
}

function toggleTorch() {
    if (html5QrCode) {
        torchEnabled = !torchEnabled;
        html5QrCode.applyVideoConstraints({
            advanced: [{ torch: torchEnabled }]
        }).catch(err => {
            console.error(err);
            torchEnabled = !torchEnabled;
            alert("Torch not supported or failed to toggle.");
        });
    }
}

function stopScanner() {
    if (html5QrCode) {
        scannerClearPromise = html5QrCode.stop().then(() => {
            html5QrCode.clear();
            html5QrCode = null;
            document.querySelector('.scanner-laser').classList.add('hidden');
            document.getElementById('scanner-hud').classList.add('hidden');
            
            // Update Toggle Button
            const btn = document.getElementById('btn-cam-toggle');
            btn.innerText = "Start Camera";
            btn.classList.remove('bg-red-500', 'hover:bg-red-600');
            btn.classList.add('bg-blue-600', 'hover:bg-blue-700');

            document.getElementById('reader').innerHTML = `
                <div class="flex flex-col items-center justify-center h-64">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p class="text-gray-500 dark:text-gray-400 text-sm">Camera is inactive</p>
                </div>`;
        }).catch(error => console.error("Failed to stop scanner", error));
    }
}

function updateCameraList(devices) {
    const select = document.getElementById('camera-select');
    const container = document.getElementById('camera-select-container');
    
    if (devices && devices.length > 0) {
        const currentVal = select.value;
        select.innerHTML = '<option value="">Select Camera (Auto)</option>';
        
        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.id;
            option.text = device.label || `Camera ${device.id}`;
            select.appendChild(option);
        });

        if (currentVal) {
            select.value = currentVal;
        }
        
        container.classList.remove('hidden');
    }
}

function scanFromFile(input) {
    if (input.files && input.files.length > 0) {
        const file = input.files[0];
        
        const scan = () => {
            document.getElementById('reader').innerHTML = ''; // Clear placeholder
            lastScannedCode = null;
            document.querySelector('.scanner-laser').classList.add('hidden'); // Ensure laser is hidden for file scan
            const tempHtml5QrCode = new Html5Qrcode("reader");
            tempHtml5QrCode.scanFile(file, true)
                .then(decodedText => {
                    onScanSuccess(decodedText);
                })
                .catch(err => {
                    alert("Failed to scan image: " + err);
                });
        };

        if (html5QrCode) {
            stopScanner();
            scannerClearPromise.then(() => {
                scan();
            });
        } else {
            scannerClearPromise.then(() => {
                scan();
            });
        }
        input.value = '';
    }
}

function onScanSuccess(decodedText, decodedResult) {
    if (decodedText === lastScannedCode) return;
    lastScannedCode = decodedText;

    if (decodedText.startsWith("ENC:")) {
        const encrypted = decodedText.substring(4);
        const password = prompt("This code is password protected. Enter password to decrypt:");
        if (password) {
            try {
                const bytes = CryptoJS.AES.decrypt(encrypted, password);
                const originalText = bytes.toString(CryptoJS.enc.Utf8);
                if (originalText) {
                    decodedText = originalText;
                } else {
                    alert("Incorrect password.");
                    return;
                }
            } catch (e) {
                alert("Decryption failed.");
                return;
            }
        } else {
            return;
        }
    }

    const resultDiv = document.getElementById('scan-result');
    const resultText = document.getElementById('scan-text');
    resultDiv.style.display = "block";
    resultText.innerText = decodedText;

    const linkActions = document.getElementById('scan-link-actions');
    const btnOpen = document.getElementById('btn-open-link');
    
    if (/^(http|https):\/\/[^ "]+$/.test(decodedText)) {
        linkActions.classList.remove('hidden');
        btnOpen.href = decodedText;
    } else {
        linkActions.classList.add('hidden');
    }

    playScanSound();
    
    // Audio Feedback
    if (document.getElementById('scan-audio').checked) {
        if (navigator.vibrate) navigator.vibrate(200);
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("Scanned: " + decodedText);
        window.speechSynthesis.speak(utterance);
    }
    
    saveToHistory(decodedText);
}

function onScanFailure(error) {
    // console.warn(`Code scan error = ${error}`);
}

function playScanSound() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = 880; // A5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1); // 100ms beep
    }
}

function copyResult() {
    const text = document.getElementById('scan-text').innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert("Copied to clipboard!");
    });
}

// History Functions
const historyKey = 'qr_scan_history';

function loadHistory() {
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    const historyContainer = document.getElementById('scan-history');
    const historyList = document.getElementById('history-list');

    if (history.length === 0) {
        historyContainer.classList.add('hidden');
        return;
    }

    historyContainer.classList.remove('hidden');
    historyList.innerHTML = '';

    history.forEach(text => {
        const item = document.createElement('div');
        item.className = 'p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex justify-between items-center shadow-sm transition-all hover:shadow-md';
        
        const displayText = document.createElement('span');
        displayText.className = 'text-sm text-gray-700 dark:text-gray-300 truncate mr-2 flex-1 font-mono';
        displayText.innerText = text;

        const btnContainer = document.createElement('div');
        btnContainer.className = 'flex items-center space-x-1';

        const insertBtn = document.createElement('button');
        insertBtn.className = 'text-green-500 hover:text-green-600 p-1 rounded-md hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors';
        insertBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>';
        insertBtn.title = "Insert into Generator";
        insertBtn.onclick = () => {
            switchTab('generate');
            setType('qr');
            document.getElementById('qr-input').value = text;
        };

        const copyBtn = document.createElement('button');
        copyBtn.className = 'text-blue-500 hover:text-blue-600 p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors';
        copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(text).then(() => alert("Copied to clipboard!"));
        };

        btnContainer.appendChild(insertBtn);
        btnContainer.appendChild(copyBtn);

        item.appendChild(displayText);
        item.appendChild(btnContainer);
        historyList.appendChild(item);
    });
}

function saveToHistory(text) {
    let history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    history = history.filter(item => item !== text); // Remove duplicates
    history.unshift(text); // Add to top
    if (history.length > 5) history = history.slice(0, 5); // Keep last 5
    localStorage.setItem(historyKey, JSON.stringify(history));
    loadHistory();
}

function clearHistory() {
    localStorage.removeItem(historyKey);
    loadHistory();
}

qrInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        generateCode();
    }
});
// Add Enter key support for Wi-Fi inputs
['wifi-ssid', 'wifi-password', 'wifi-encryption', 'vcard-name', 'vcard-phone', 'vcard-email', 'vcard-org', 'vcard-title', 'vcard-url', 'email-to', 'email-subject', 'email-body', 'sms-phone', 'sms-message', 'geo-lat', 'geo-long', 'event-summary', 'event-start', 'event-end', 'event-location', 'whatsapp-phone', 'whatsapp-message', 'upi-vpa', 'upi-name', 'upi-amount', 'upi-note', 'qr-password', 'qr-size'].forEach(id => {
    document.getElementById(id)?.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            generateCode();
        }
    });
});

function setType(type) {
    const input = document.getElementById('code-type');
    input.value = type;
    
    // Update visual state
    const buttons = {
        qr: document.getElementById('btn-type-qr'),
        barcode: document.getElementById('btn-type-barcode'),
        wifi: document.getElementById('btn-type-wifi'),
        vcard: document.getElementById('btn-type-vcard'),
        email: document.getElementById('btn-type-email'),
        sms: document.getElementById('btn-type-sms'),
        geo: document.getElementById('btn-type-geo'),
        event: document.getElementById('btn-type-event'),
        whatsapp: document.getElementById('btn-type-whatsapp'),
        upi: document.getElementById('btn-type-upi')
    };
    
    const activeClasses = ['border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30', 'text-blue-600', 'dark:text-blue-400', 'shadow-sm'];
    const inactiveClasses = ['border-transparent', 'bg-gray-100', 'dark:bg-gray-800', 'text-gray-600', 'dark:text-gray-400', 'hover:bg-gray-200', 'dark:hover:bg-gray-700'];
    
    for (const key in buttons) {
        const btn = buttons[key];
        if (key === type) {
            btn.classList.add(...activeClasses);
            btn.classList.remove(...inactiveClasses);
        } else {
            btn.classList.remove(...activeClasses);
            btn.classList.add(...inactiveClasses);
        }
    }

    // Toggle inputs
    const textContainer = document.getElementById('text-input-container');
    const wifiContainer = document.getElementById('wifi-input-container');
    const vcardContainer = document.getElementById('vcard-input-container');
    const emailContainer = document.getElementById('email-input-container');
    const smsContainer = document.getElementById('sms-input-container');
    const geoContainer = document.getElementById('geo-input-container');
    const eventContainer = document.getElementById('event-input-container');
    const whatsappContainer = document.getElementById('whatsapp-input-container');
    const upiContainer = document.getElementById('upi-input-container');
    const logoContainer = document.getElementById('logo-input-container');

    if (type === 'wifi') {
        textContainer.classList.add('hidden');
        wifiContainer.classList.remove('hidden');
        vcardContainer.classList.add('hidden');
        emailContainer.classList.add('hidden');
        smsContainer.classList.add('hidden');
        geoContainer.classList.add('hidden');
        eventContainer.classList.add('hidden');
        whatsappContainer.classList.add('hidden');
        upiContainer.classList.add('hidden');
    } else if (type === 'vcard') {
        textContainer.classList.add('hidden');
        wifiContainer.classList.add('hidden');
        vcardContainer.classList.remove('hidden');
        emailContainer.classList.add('hidden');
        smsContainer.classList.add('hidden');
        geoContainer.classList.add('hidden');
        eventContainer.classList.add('hidden');
        whatsappContainer.classList.add('hidden');
        upiContainer.classList.add('hidden');
    } else if (type === 'email') {
        textContainer.classList.add('hidden');
        wifiContainer.classList.add('hidden');
        vcardContainer.classList.add('hidden');
        emailContainer.classList.remove('hidden');
        smsContainer.classList.add('hidden');
        geoContainer.classList.add('hidden');
        eventContainer.classList.add('hidden');
        whatsappContainer.classList.add('hidden');
        upiContainer.classList.add('hidden');
    } else if (type === 'sms') {
        textContainer.classList.add('hidden');
        wifiContainer.classList.add('hidden');
        vcardContainer.classList.add('hidden');
        emailContainer.classList.add('hidden');
        smsContainer.classList.remove('hidden');
        geoContainer.classList.add('hidden');
        eventContainer.classList.add('hidden');
        whatsappContainer.classList.add('hidden');
        upiContainer.classList.add('hidden');
    } else if (type === 'geo') {
        textContainer.classList.add('hidden');
        wifiContainer.classList.add('hidden');
        vcardContainer.classList.add('hidden');
        emailContainer.classList.add('hidden');
        smsContainer.classList.add('hidden');
        geoContainer.classList.remove('hidden');
        eventContainer.classList.add('hidden');
        whatsappContainer.classList.add('hidden');
        upiContainer.classList.add('hidden');
    } else if (type === 'event') {
        textContainer.classList.add('hidden');
        wifiContainer.classList.add('hidden');
        vcardContainer.classList.add('hidden');
        emailContainer.classList.add('hidden');
        smsContainer.classList.add('hidden');
        geoContainer.classList.add('hidden');
        eventContainer.classList.remove('hidden');
        whatsappContainer.classList.add('hidden');
        upiContainer.classList.add('hidden');
    } else if (type === 'whatsapp') {
        textContainer.classList.add('hidden');
        wifiContainer.classList.add('hidden');
        vcardContainer.classList.add('hidden');
        emailContainer.classList.add('hidden');
        smsContainer.classList.add('hidden');
        geoContainer.classList.add('hidden');
        eventContainer.classList.add('hidden');
        whatsappContainer.classList.remove('hidden');
        upiContainer.classList.add('hidden');
    } else if (type === 'upi') {
        textContainer.classList.add('hidden');
        wifiContainer.classList.add('hidden');
        vcardContainer.classList.add('hidden');
        emailContainer.classList.add('hidden');
        smsContainer.classList.add('hidden');
        geoContainer.classList.add('hidden');
        eventContainer.classList.add('hidden');
        whatsappContainer.classList.add('hidden');
        upiContainer.classList.remove('hidden');
    } else {
        textContainer.classList.remove('hidden');
        wifiContainer.classList.add('hidden');
        vcardContainer.classList.add('hidden');
        emailContainer.classList.add('hidden');
        smsContainer.classList.add('hidden');
        geoContainer.classList.add('hidden');
        eventContainer.classList.add('hidden');
        whatsappContainer.classList.add('hidden');
        upiContainer.classList.add('hidden');
    }

    if (type === 'barcode') {
        logoContainer.classList.add('hidden');
    } else {
        logoContainer.classList.remove('hidden');
    }
    
    // Only auto-generate if we are switching back to text/barcode and there is text
    if (type !== 'wifi' && qrInput.value.trim()) {
        generateCode();
    }
}

// Camera selection change listener
document.getElementById('camera-select').addEventListener('change', () => {
    if (html5QrCode) {
        stopScanner();
        startScanner();
    }
});

function populateInputs(text, type) {
    setType(type);
    
    if (type === 'wifi') {
        const encryptionMatch = text.match(/T:([^;]*)/);
        const ssidMatch = text.match(/S:([^;]*)/);
        const passwordMatch = text.match(/P:([^;]*)/);
        
        if (encryptionMatch) document.getElementById('wifi-encryption').value = encryptionMatch[1];
        if (ssidMatch) document.getElementById('wifi-ssid').value = ssidMatch[1];
        if (passwordMatch) document.getElementById('wifi-password').value = passwordMatch[1];
    } else if (type === 'vcard') {
        const fnMatch = text.match(/FN:([^\n]*)/);
        const telMatch = text.match(/TEL;TYPE=CELL:([^\n]*)/);
        const emailMatch = text.match(/EMAIL:([^\n]*)/);
        const orgMatch = text.match(/ORG:([^\n]*)/);
        const titleMatch = text.match(/TITLE:([^\n]*)/);
        const urlMatch = text.match(/URL:([^\n]*)/);

        if (fnMatch) document.getElementById('vcard-name').value = fnMatch[1];
        if (telMatch) document.getElementById('vcard-phone').value = telMatch[1];
        if (emailMatch) document.getElementById('vcard-email').value = emailMatch[1];
        if (orgMatch) document.getElementById('vcard-org').value = orgMatch[1];
        if (titleMatch) document.getElementById('vcard-title').value = titleMatch[1];
        if (urlMatch) document.getElementById('vcard-url').value = urlMatch[1];
    } else if (type === 'email') {
        const mailtoParts = text.match(/^mailto:([^?]*)\?(.*)$/);
        if (mailtoParts) {
            document.getElementById('email-to').value = mailtoParts[1];
            const params = new URLSearchParams(mailtoParts[2]);
            document.getElementById('email-subject').value = params.get('subject') || '';
            document.getElementById('email-body').value = params.get('body') || '';
        } else if (text.startsWith('mailto:')) {
             document.getElementById('email-to').value = text.replace('mailto:', '');
        }
    } else if (type === 'sms') {
        const smsMatch = text.match(/^SMSTO:([^:]*):(.*)$/);
        if (smsMatch) {
            document.getElementById('sms-phone').value = smsMatch[1];
            document.getElementById('sms-message').value = smsMatch[2];
        } else if (text.startsWith('SMSTO:')) {
            document.getElementById('sms-phone').value = text.replace('SMSTO:', '').split(':')[0];
        }
    } else if (type === 'geo') {
        const geoMatch = text.match(/^geo:([^,]*),(.*)$/);
        if (geoMatch) {
            document.getElementById('geo-lat').value = geoMatch[1];
            document.getElementById('geo-long').value = geoMatch[2];
        }
    } else if (type === 'event') {
        const summaryMatch = text.match(/SUMMARY:([^\n]*)/);
        const startMatch = text.match(/DTSTART:([^\n]*)/);
        const endMatch = text.match(/DTEND:([^\n]*)/);
        const locMatch = text.match(/LOCATION:([^\n]*)/);

        if (summaryMatch) document.getElementById('event-summary').value = summaryMatch[1];
        if (locMatch) document.getElementById('event-location').value = locMatch[1];
        
        // Helper to convert YYYYMMDDTHHMMSS to YYYY-MM-DDTHH:MM
        const formatDT = (dt) => {
            return dt ? `${dt.substr(0,4)}-${dt.substr(4,2)}-${dt.substr(6,2)}T${dt.substr(9,2)}:${dt.substr(11,2)}` : '';
        };
        if (startMatch) document.getElementById('event-start').value = formatDT(startMatch[1]);
        if (endMatch) document.getElementById('event-end').value = formatDT(endMatch[1]);
    } else if (type === 'whatsapp') {
        const waMatch = text.match(/wa\.me\/([^?]*)\?text=(.*)/);
        if (waMatch) {
            document.getElementById('whatsapp-phone').value = waMatch[1];
            document.getElementById('whatsapp-message').value = decodeURIComponent(waMatch[2]);
        }
    } else if (type === 'upi') {
        const upiMatch = text.match(/^upi:\/\/pay\?(.*)$/);
        if (upiMatch) {
            const params = new URLSearchParams(upiMatch[1]);
            document.getElementById('upi-vpa').value = params.get('pa') || '';
            document.getElementById('upi-name').value = params.get('pn') || '';
            document.getElementById('upi-amount').value = params.get('am') || '';
            document.getElementById('upi-note').value = params.get('tn') || '';
        } else if (text.includes('@')) {
             document.getElementById('upi-vpa').value = text;
        }
    } else {
        document.getElementById('qr-input').value = text;
    }
}

function togglePasswordVisibility(id) {
    const input = document.getElementById(id);
    const icon = document.getElementById('eye-icon-' + id);
    if (input.type === "password") {
        input.type = "text";
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7 .47 0 .927.038 1.372.113M15.98 8.04A6.002 6.002 0 0012 6c-3.314 0-6 2.686-6 6a6.002 6.002 0 002.04 4.02m5.94-5.94a3 3 0 10-4.243 4.243M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />';
    } else {
        input.type = "password";
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />';
    }
}

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
}

function generateRandomData() {
    const type = document.getElementById('code-type').value;
    const firstNames = ['John', 'Jane', 'Alex', 'Emily', 'Chris', 'Katie', 'Mike', 'Sarah'];
    const lastNames = ['Doe', 'Smith', 'Jones', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson'];
    const domains = ['example.com', 'mail.net', 'web.org', 'test.io', 'future.tech'];
    const tlds = ['.com', '.net', '.org'];
    const randomString = (length = 8) => Math.random().toString(36).substring(2, 2 + length);
    const randomNumString = (length = 8) => Math.floor(Math.random() * (10 ** length)).toString().padStart(length, '0');
    const randomName = () => `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    const randomEmail = (name) => `${name.split(' ')[0].toLowerCase()}${randomNumString(3)}@${domains[Math.floor(Math.random() * domains.length)]}`;

    // Reset all fields first
    const allInputs = document.querySelectorAll('#generate-section input[type="text"], #generate-section input[type="number"], #generate-section input[type="tel"], #generate-section input[type="email"], #generate-section input[type="url"], #generate-section textarea');
    allInputs.forEach(input => input.value = '');

    switch (type) {
        case 'qr':
            document.getElementById('qr-input').value = `https://futuristic-site.dev/${randomString()}`;
            break;
        case 'vcard':
            const name = randomName();
            document.getElementById('vcard-name').value = name;
            document.getElementById('vcard-phone').value = `555-${randomNumString(3)}-${randomNumString(4)}`;
            document.getElementById('vcard-email').value = randomEmail(name);
            document.getElementById('vcard-org').value = 'Future Corp.';
            document.getElementById('vcard-title').value = 'Innovator';
            document.getElementById('vcard-url').value = `https://www.${randomString(8)}${tlds[Math.floor(Math.random() * tlds.length)]}`;
            break;
        case 'email':
            document.getElementById('email-to').value = randomEmail('recipient');
            document.getElementById('email-subject').value = 'Inquiry from the Future';
            document.getElementById('email-body').value = `This is a randomly generated test message.\n\nRegards,\nA Friend`;
            break;
        case 'wifi':
            document.getElementById('wifi-ssid').value = `FutureNet_${randomString(4)}`;
            document.getElementById('wifi-password').value = randomString(12);
            break;
        case 'upi':
            document.getElementById('upi-vpa').value = `${randomString(8)}@okfuture`;
            document.getElementById('upi-name').value = randomName();
            document.getElementById('upi-amount').value = (Math.random() * 1000).toFixed(2);
            document.getElementById('upi-note').value = `Payment for ${randomString(6)}`;
            break;
        default:
            document.getElementById('qr-input').value = `Random data: ${randomString()}`;
            break;
    }

    generateCode();
}

// Holographic Tilt Effect
const resultCard = document.getElementById('result-area');

resultCard.addEventListener('mousemove', (e) => {
    const rect = resultCard.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate rotation (max 10 degrees)
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

    resultCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
});

resultCard.addEventListener('mouseleave', () => {
    resultCard.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
});

// UI Sound Effects
function playClickSound() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    }
}

// Attach sound to all buttons
document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', playClickSound);
});

function applyTheme(theme) {
    const dark = document.getElementById('qr-color-dark');
    const light = document.getElementById('qr-color-light');
    const darkEnd = document.getElementById('qr-color-dark-end');
    
    switch(theme) {
        case 'cyberpunk':
            dark.value = '#fcee0a'; darkEnd.value = '#00f0ff'; light.value = '#000000';
            break;
        case 'matrix':
            dark.value = '#00ff00'; darkEnd.value = '#003300'; light.value = '#000000';
            break;
        case 'neon':
            dark.value = '#ff00ff'; darkEnd.value = '#00ffff'; light.value = '#1a1a2e';
            break;
        case 'custom':
        default:
            // Do nothing, keep current or reset to default if desired
            break;
    }
    if (document.getElementById('qr-input').value.trim()) {
        generateCode();
    }
}

function toggleDictation(inputId) {
    if (!('webkitSpeechRecognition' in window)) {
        alert("Speech recognition not supported in this browser.");
        return;
    }
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onresult = function(event) {
        document.getElementById(inputId).value = event.results[0][0].transcript;
        generateCode();
    };
    recognition.start();
}