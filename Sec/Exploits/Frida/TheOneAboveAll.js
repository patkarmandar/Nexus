/**
 * All Bypasses Combined
 * SSL + Root + Emulator + Proxy + Developer
 * 
 * Usage: frida -U -f com.target.app -l all_bypass.js --no-pause
 */

console.log("\n╔═══════════════════════════════════════════════════════════╗");
console.log("║              ALL BYPASSES                                 ║");
console.log("╚═══════════════════════════════════════════════════════════╝\n");

Java.perform(function () {

    /* ═══════════════════════════════════════════════════════════
       SSL PINNING BYPASS
    ═══════════════════════════════════════════════════════════ */

    console.log("[*] Loading SSL Bypass...");

    // TrustManagerImpl
    try {
        var TrustManagerImpl = Java.use("com.android.org.conscrypt.TrustManagerImpl");
        TrustManagerImpl.verifyChain.implementation = function (untrustedChain, trustAnchorChain, host, clientAuth, ocspData, tlsSctData) {
            console.log("[SSL] TrustManagerImpl: " + host);
            return untrustedChain;
        };
        TrustManagerImpl.checkTrustedRecursive.implementation = function (certs, host, clientAuth, untrustedChain, trustAnchorChain, used) {
            console.log("[SSL] checkTrustedRecursive: " + host);
            return Java.use("java.util.ArrayList").$new();
        };
    } catch (e) {}

    // SSLContext
    try {
        var SSLContext = Java.use("javax.net.ssl.SSLContext");
        var X509TrustManager = Java.use("javax.net.ssl.X509TrustManager");

        var TrustManager = Java.registerClass({
            name: "dev.ssl.TrustManager",
            implements: [X509TrustManager],
            methods: {
                checkClientTrusted: function () {},
                checkServerTrusted: function () {},
                getAcceptedIssuers: function () { return []; }
            }
        });

        SSLContext.init.overload("[Ljavax.net.ssl.KeyManager;", "[Ljavax.net.ssl.TrustManager;", "java.security.SecureRandom")
            .implementation = function (km, tm, sr) {
            console.log("[SSL] SSLContext bypassed");
            SSLContext.init.call(this, km, [TrustManager.$new()], sr);
        };
    } catch (e) {}

    // HostnameVerifier
    try {
        Java.use("javax.net.ssl.HttpsURLConnection").setDefaultHostnameVerifier.implementation = function (verifier) {
            console.log("[SSL] HostnameVerifier bypassed");
        };
    } catch (e) {}

    // OkHttp3
    try {
        Java.use("okhttp3.CertificatePinner").check.overload("java.lang.String", "java.util.List")
            .implementation = function (hostname, certs) {
            console.log("[SSL] OkHttp3: " + hostname);
        };
    } catch (e) {}

    // WebView
    try {
        Java.use("android.webkit.WebViewClient").onReceivedSslError.implementation = function (view, handler, error) {
            console.log("[SSL] WebView bypassed");
            handler.proceed();
        };
    } catch (e) {}

    console.log("[✓] SSL Bypass Loaded\n");

    /* ═══════════════════════════════════════════════════════════
       ROOT DETECTION BYPASS
    ═══════════════════════════════════════════════════════════ */

    console.log("[*] Loading Root Bypass...");

    var ROOT_PATHS = [
        "/data/local/bin/su", "/data/local/su", "/sbin/su", "/system/bin/su",
        "/system/xbin/su", "/data/adb/magisk", "/data/adb/ksu"
    ];

    // Build.TAGS
    try {
        Java.use("android.os.Build").TAGS.value = "release-keys";
    } catch (e) {}

    // File.exists
    try {
        var File = Java.use("java.io.File");
        var origExists = File.exists;
        File.exists.implementation = function () {
            var path = this.getAbsolutePath();
            if (ROOT_PATHS.some(p => path.includes(p)) || path.includes("magisk") || path.includes("/su")) {
                console.log("[ROOT] Blocked: " + path);
                return false;
            }
            return origExists.call(this);
        };
    } catch (e) {}

    // Runtime.exec
    try {
        var Runtime = Java.use("java.lang.Runtime");
        Runtime.exec.overload("java.lang.String").implementation = function (cmd) {
            if (cmd.includes("su") || cmd.includes("magisk")) {
                console.log("[ROOT] Blocked cmd: " + cmd);
                return Runtime.exec.call(this, "echo");
            }
            return Runtime.exec.call(this, cmd);
        };
    } catch (e) {}

    // System.exit
    try {
        Java.use("java.lang.System").exit.implementation = function (code) {
            console.log("[ROOT] System.exit blocked");
        };
    } catch (e) {}

    console.log("[✓] Root Bypass Loaded\n");

    /* ═══════════════════════════════════════════════════════════
       EMULATOR DETECTION BYPASS
    ═══════════════════════════════════════════════════════════ */

    console.log("[*] Loading Emulator Bypass...");

    // Build properties
    try {
        var Build = Java.use("android.os.Build");
        Build.MANUFACTURER.value = "samsung";
        Build.BRAND.value = "samsung";
        Build.MODEL.value = "SM-G973F";
        Build.DEVICE.value = "beyond1";
        Build.HARDWARE.value = "exynos9820";
        Build.FINGERPRINT.value = "samsung/beyond1lte/beyond1:9/PPR1.180610.011/G973FXXU3ASG8:user/release-keys";
    } catch (e) {}

    // TelephonyManager
    try {
        Java.use("android.telephony.TelephonyManager").getDeviceId.overload().implementation = function () {
            return "358673065498721";
        };
    } catch (e) {}

    // NetworkInterface
    try {
        var NetworkInterface = Java.use("java.net.NetworkInterface");
        var origGetName = NetworkInterface.getName;
        NetworkInterface.getName.implementation = function () {
            var name = origGetName.call(this);
            if (["eth0", "tun0"].includes(name)) {
                console.log("[EMU] Interface hidden: " + name);
                return "wlan0";
            }
            return name;
        };
    } catch (e) {}

    console.log("[✓] Emulator Bypass Loaded\n");

    /* ═══════════════════════════════════════════════════════════
       PROXY DETECTION BYPASS
    ═══════════════════════════════════════════════════════════ */

    console.log("[*] Loading Proxy Bypass...");

    // System.getProperty
    try {
        var System = Java.use("java.lang.System");
        var origGetProp = System.getProperty.overload("java.lang.String");
        System.getProperty.overload("java.lang.String").implementation = function (key) {
            if (key.toLowerCase().includes("proxy")) {
                console.log("[PROXY] Blocked: " + key);
                return null;
            }
            return origGetProp.call(this, key);
        };
    } catch (e) {}

    // ProxySelector
    try {
        Java.use("java.net.ProxySelector").getDefault.implementation = function () {
            return null;
        };
    } catch (e) {}

    // NetworkCapabilities (VPN)
    try {
        Java.use("android.net.NetworkCapabilities").hasTransport.implementation = function (type) {
            if (type === 4) return false; // Hide VPN
            return this.hasTransport(type);
        };
    } catch (e) {}

    console.log("[✓] Proxy Bypass Loaded\n");

    /* ═══════════════════════════════════════════════════════════
       DEVELOPER MODE BYPASS
    ═══════════════════════════════════════════════════════════ */

    console.log("[*] Loading Developer Bypass...");

    // Settings.Global
    try {
        var SettingsGlobal = Java.use("android.provider.Settings$Global");
        SettingsGlobal.getInt.overloads.forEach(function (overload) {
            overload.implementation = function () {
                var name = arguments[1];
                if (name === "development_settings_enabled" || name === "adb_enabled") {
                    return 0;
                }
                return overload.apply(this, arguments);
            };
        });
    } catch (e) {}

    // Debug.isDebuggerConnected
    try {
        Java.use("android.os.Debug").isDebuggerConnected.implementation = function () {
            return false;
        };
    } catch (e) {}

    console.log("[✓] Developer Bypass Loaded\n");

    console.log("╔═══════════════════════════════════════════════════════════╗");
    console.log("║          ALL BYPASSES LOADED SUCCESSFULLY!                ║");
    console.log("╚═══════════════════════════════════════════════════════════╝\n");
});
