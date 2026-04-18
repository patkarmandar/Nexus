function capitalize(text) {
    return text
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

function insertTableRows(table, data) {
    Object.entries(data).forEach(([key, value]) => {
        const row = table.insertRow();
        row.insertCell(0).textContent = capitalize(key);
        row.insertCell(1).textContent = typeof value === "object" ? JSON.stringify(value) : value;
    });
}

function getDeviceInfo() {
    return {
        userAgent: navigator.userAgent,
        userAgentData: "userAgentData" in navigator ? {
            platform: navigator.userAgentData.platform || "Unknown",
            mobile: navigator.userAgentData.mobile ? "Yes" : "No",
            brands: navigator.userAgentData.brands.map(b => `${b.brand} ${b.version}`).join(", ")
        } : "User Agent Client Hints API not supported",
        language: navigator.language,
        screenResolution: `${screen.width}x${screen.height}`,
        pixelRatio: window.devicePixelRatio,
        deviceMemory: navigator.deviceMemory || "Unknown",
        hardwareConcurrency: navigator.hardwareConcurrency || "Unknown",
        maxTouchPoints: navigator.maxTouchPoints || 0,
        onLine: navigator.onLine,
        buildID: navigator.buildID || "Not available",
        platform: navigator.platform,
        oscpu: navigator.oscpu || "Not available",
        vendor: navigator.vendor,
        vendorSub: navigator.vendorSub || "Not available",
        product: navigator.product,
        appName: navigator.appName,
        appCodeName: navigator.appCodeName,
        appVersion: navigator.appVersion,
        mimeTypes: Array.from(navigator.mimeTypes).map(mime => mime.type).join(", ") || "No MIME types available"
    };
}

function getGPUInfo() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        return { error: "WebGL not supported" };
    }
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    return {
        webGLRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "Unknown GPU",
        webGLVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "Unknown Vendor"
    };
}

async function getHIDInfo() {
    if (!("hid" in navigator)) {
        return { hidSupported: "No", devices: "HID not supported" };
    }
    const devices = await navigator.hid.getDevices();
    return {
        hidSupported: "Yes",
        devices: devices.length > 0 ? devices.map(device => device.productName).join(", ") : "No HID devices connected"
    };
}

async function getKeyboardInfo() {
    if (!("keyboard" in navigator)) {
        return { keyboardSupported: "No", layouts: "Keyboard API not supported" };
    }
    try {
        const layoutMap = await navigator.keyboard.getLayoutMap();
        const layouts = [...layoutMap.values()].join(", ");
        return { keyboardSupported: "Yes", layouts: layouts || "Unknown Layout" };
    } catch (error) {
        return { keyboardSupported: "Yes", layouts: "Permission denied or required to access layouts" };
    }
}

function getNetworkInfo() {
    if ("connection" in navigator) {
        const connection = navigator.connection;
        return {
            type: connection.type || "Unknown",
            effectiveType: connection.effectiveType || "Unknown",
            downlink: connection.downlink ? `${connection.downlink} Mbps` : "Unknown",
            rtt: connection.rtt ? `${connection.rtt} ms` : "Unknown",
            saveData: connection.saveData ? "Enabled" : "Disabled",
        };
    } else {
        return { error: "NetworkInformation API is not supported" };
    }
}

async function getGeolocationInfo() {
    if (!("geolocation" in navigator)) {
        return { error: "Geolocation is not supported" };
    }

    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: `${position.coords.accuracy} meters`,
                    altitude: position.coords.altitude !== null ? `${position.coords.altitude} meters` : "Not available",
                    altitudeAccuracy: position.coords.altitudeAccuracy !== null ? `${position.coords.altitudeAccuracy} meters` : "Not available",
                    speed: position.coords.speed !== null ? `${position.coords.speed} m/s` : "Not moving",
                    heading: position.coords.heading !== null ? `${position.coords.heading}°` : "Not moving",
                    timestamp: new Date(position.timestamp).toLocaleString(),
                });
            },
            (error) => {
                reject({ error: error.message });
            },
            { enableHighAccuracy: true }
        );
    });
}

function getBrowserFeatures() {
    return {
        pdfViewerEnabled: "pdfViewerEnabled" in navigator ? (navigator.pdfViewerEnabled ? "Enabled" : "Disabled") : "Not Supported",
        cookiesEnabled: navigator.cookieEnabled,
        javaEnabled: navigator.javaEnabled(),
        plugins: Array.from(navigator.plugins).map(plugin => plugin.name)
    };
}

async function getMediaCapabilitiesInfo() {
    if (!("mediaCapabilities" in navigator)) {
        return { mediaCapabilitiesSupported: "No", message: "MediaCapabilities API not supported" };
    }

    try {
        const mediaConfig = {
            type: "file",
            video: {
                contentType: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
                width: 1920,
                height: 1080,
                bitrate: 5000000,
                framerate: 30
            },
            audio: {
                contentType: 'audio/mp4; codecs="mp4a.40.2"'
            }
        };

        const result = await navigator.mediaCapabilities.decodingInfo(mediaConfig);
        return {
            mediaCapabilitiesSupported: "Yes",
            smoothPlayback: result.smooth ? "Yes" : "No",
            powerEfficient: result.powerEfficient ? "Yes" : "No"
        };
    } catch (error) {
        return { mediaCapabilitiesSupported: "Yes", message: "Error retrieving media capabilities" };
    }
}

async function getMediaDevicesInfo() {
    if (!("mediaDevices" in navigator)) {
        return { mediaDevicesSupported: "No", message: "Media Devices API not supported" };
    }

    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const deviceList = devices.map(device => `${device.kind}: ${device.label || "Unknown Device"}`).join(", ");
        return {
            mediaDevicesSupported: "Yes",
            devices: deviceList || "No media devices found"
        };
    } catch (error) {
        return { mediaDevicesSupported: "Yes", devices: "Permission required to access devices" };
    }
}

async function getPermissionsInfo() {
    if (!("permissions" in navigator)) {
        return { error: "Permissions API not supported" };
    }

    const permissionsList = ["geolocation", "notifications", "camera", "microphone", "clipboard-read", "clipboard-write"];
    let permissionsStatus = {};

    for (let permission of permissionsList) {
        try {
            const status = await navigator.permissions.query({ name: permission });
            permissionsStatus[permission] = status.state;
        } catch (error) {
            permissionsStatus[permission] = "Not available";
        }
    }

    return permissionsStatus;
}

async function getStorageInfo() {
    if (!("storage" in navigator)) {
        return { storageSupported: "No", quota: "Storage API not supported" };
    }

    try {
        const estimate = await navigator.storage.estimate();
        return {
            storageSupported: "Yes",
            quota: `${(estimate.quota / (1024 * 1024)).toFixed(2)} MB`,
            usage: `${(estimate.usage / (1024 * 1024)).toFixed(2)} MB`,
            persistent: (await navigator.storage.persisted()) ? "Yes" : "No"
        };
    } catch (error) {
        return { storageSupported: "Yes", quota: "Error fetching storage info" };
    }
}

function getWebRTCIP() {
    return new Promise((resolve, reject) => {
        const peer = new RTCPeerConnection({ iceServers: [] });
        let resolved = false;

        peer.createDataChannel("");
        peer.createOffer().then(offer => peer.setLocalDescription(offer)).catch(reject);

        peer.onicecandidate = (event) => {
            if (event.candidate && !resolved) {
                const ipMatch = /([0-9]{1,3}\.){3}[0-9]{1,3}/.exec(event.candidate.candidate);
                if (ipMatch) {
                    resolved = true;
                    resolve({ webrtcIP: ipMatch[0] });
                    peer.close();
                }
            }
        };

        setTimeout(() => {
            if (!resolved) {
                resolve({ webrtcIP: "Not available (WebRTC leak protection enabled)" });
                peer.close();
            }
        }, 3000);
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    const startButton = document.getElementById("startButton");
    const tableContainer = document.getElementById("tableContainer");

    startButton.addEventListener("click", async () => {
        tableContainer.style.display = "block";

        const deviceInfoTable = document.getElementById("deviceInfoTable");
        const gpuInfoTable = document.getElementById("gpuInfoTable");
        const hidInfoTable = document.getElementById("hidInfoTable");
        const keyboardInfoTable = document.getElementById("keyboardInfoTable");
        const networkInfoTable = document.getElementById("networkInfoTable");
        const geolocationInfoTable = document.getElementById("geolocationInfoTable");
        const browserFeaturesTable = document.getElementById("browserFeaturesTable");
        const mediaCapabilitiesTable = document.getElementById("mediaCapabilitiesTable");
        const mediaDevicesTable = document.getElementById("mediaDevicesTable");
        const storageInfoTable = document.getElementById("storageInfoTable");
        const webrtcInfoTable = document.getElementById("webrtcInfoTable");
        const permissionsTable = document.getElementById("permissionsTable");

        deviceInfoTable.innerHTML = "";
        gpuInfoTable.innerHTML = "";
        hidInfoTable.innerHTML = "";
        keyboardInfoTable.innerHTML = "";
        networkInfoTable.innerHTML = "";
        geolocationInfoTable.innerHTML = "";
        browserFeaturesTable.innerHTML = "";
        mediaCapabilitiesTable.innerHTML = "";
        mediaDevicesTable.innerHTML = "";
        storageInfoTable.innerHTML = "";
        webrtcInfoTable.innerHTML = "";
        permissionsTable.innerHTML = "";

        const deviceInfo = getDeviceInfo();
        const gpuInfo = getGPUInfo();
        const browserFeatures = getBrowserFeatures();
        const networkInfo = getNetworkInfo();

        insertTableRows(deviceInfoTable, deviceInfo);
        insertTableRows(gpuInfoTable, gpuInfo);
        insertTableRows(browserFeaturesTable, browserFeatures);
        insertTableRows(networkInfoTable, networkInfo);

        getHIDInfo().then(hidInfo => insertTableRows(hidInfoTable, hidInfo));
        getKeyboardInfo().then(keyboardInfo => insertTableRows(keyboardInfoTable, keyboardInfo));
        getGeolocationInfo().then(location => insertTableRows(geolocationInfoTable, location))
            .catch(err => insertTableRows(geolocationInfoTable, { error: err.error }));

        const mediaInfo = await getMediaCapabilitiesInfo();
        insertTableRows(mediaCapabilitiesTable, mediaInfo);

        const mediaDevicesInfo = await getMediaDevicesInfo();
        insertTableRows(mediaDevicesTable, mediaDevicesInfo);

        getStorageInfo().then(storageInfo => insertTableRows(storageInfoTable, storageInfo));

        getWebRTCIP().then(webrtcData => insertTableRows(webrtcInfoTable, webrtcData));

        const permissionsInfo = await getPermissionsInfo();
        insertTableRows(permissionsTable, permissionsInfo);
    });
});