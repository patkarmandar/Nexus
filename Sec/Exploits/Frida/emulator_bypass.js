/**
 * Emulator Detection Bypass
 * Spoofs real device to hide emulator/VM
 */

Java.perform(function () {

    console.log("\n[*] Emulator Detection Bypass Loading...\n");

    /* ================================================
       Build Properties (Samsung Galaxy S10)
    ================================================ */

    try {
        var Build = Java.use("android.os.Build");

        Build.BOARD.value = "exynos9820";
        Build.BRAND.value = "samsung";
        Build.DEVICE.value = "beyond1";
        Build.DISPLAY.value = "PPR1.180610.011.G973FXXU3ASG8";
        Build.FINGERPRINT.value = "samsung/beyond1lte/beyond1:9/PPR1.180610.011/G973FXXU3ASG8:user/release-keys";
        Build.HARDWARE.value = "exynos9820";
        Build.MANUFACTURER.value = "samsung";
        Build.MODEL.value = "SM-G973F";
        Build.PRODUCT.value = "beyond1lte";
        Build.TAGS.value = "release-keys";

        try {
            Build.SERIAL.value = "RZ8M802WY0X";
        } catch (e) {}

        console.log("[+] Build properties spoofed to Samsung Galaxy S10");

    } catch (err) {}

    /* ================================================
       CPU Architecture
    ================================================ */

    try {
        var Build = Java.use("android.os.Build");
        var supportedAbis = ["arm64-v8a", "armeabi-v7a", "armeabi"];

        Build.SUPPORTED_ABIS.value = Java.array('java.lang.String', supportedAbis);
        Build.SUPPORTED_32_BIT_ABIS.value = Java.array('java.lang.String', ["armeabi-v7a", "armeabi"]);
        Build.SUPPORTED_64_BIT_ABIS.value = Java.array('java.lang.String', ["arm64-v8a"]);

        console.log("[+] CPU ABI spoofed to ARM");

    } catch (err) {}

    /* ================================================
       TelephonyManager
    ================================================ */

    try {
        var TelephonyManager = Java.use("android.telephony.TelephonyManager");

        try {
            TelephonyManager.getDeviceId.overload().implementation = function () {
                return "358673065498721";
            };
        } catch (e) {}

        try {
            TelephonyManager.getImei.overload().implementation = function () {
                return "358673065498721";
            };
        } catch (e) {}

        try {
            TelephonyManager.getSubscriberId.overload().implementation = function () {
                return "310260000000000";
            };
        } catch (e) {}

        try {
            TelephonyManager.getLine1Number.overload().implementation = function () {
                return "15555215558";
            };
        } catch (e) {}

        console.log("[+] TelephonyManager spoofed");

    } catch (err) {}

    /* ================================================
       NetworkInterface (Hide eth0/tun0)
    ================================================ */

    try {
        var NetworkInterface = Java.use("java.net.NetworkInterface");
        var origGetName = NetworkInterface.getName;

        NetworkInterface.getName.implementation = function () {
            var name = origGetName.call(this);

            if (["eth0", "tun0", "ppp0"].includes(name)) {
                console.log("[+] Network interface hidden: " + name);
                return "wlan0";
            }

            return name;
        };

        console.log("[+] NetworkInterface hooked");

    } catch (err) {}

    /* ================================================
       Settings.Secure (android_id)
    ================================================ */

    try {
        var Settings = Java.use("android.provider.Settings$Secure");
        var origGetString = Settings.getString;

        Settings.getString.implementation = function (contentResolver, name) {
            if (name === "android_id") {
                console.log("[+] android_id spoofed");
                return "8af8770a01e0f4a7";
            }
            return origGetString.call(this, contentResolver, name);
        };

        console.log("[+] Settings.Secure hooked");

    } catch (err) {}

    /* ================================================
       File.exists (Hide Emulator Files)
    ================================================ */

    try {
        var File = Java.use("java.io.File");
        var origExists = File.exists;

        File.exists.implementation = function () {
            var path = this.getAbsolutePath();
            var lowerPath = path.toLowerCase();

            if (lowerPath.includes("qemu") || 
                lowerPath.includes("genymotion") ||
                lowerPath.includes("bluestacks") ||
                lowerPath.includes("nox")) {
                console.log("[+] Emulator file hidden: " + path);
                return false;
            }

            return origExists.call(this);
        };

        console.log("[+] File.exists hooked for emulator detection");

    } catch (err) {}

    /* ================================================
       Native CPU Family Hook
    ================================================ */

    try {
        var getCpuFamily = Module.findExportByName(null, "android_getCpuFamily");
        if (getCpuFamily) {
            Interceptor.attach(getCpuFamily, {
                onLeave: function (retval) {
                    // X86 = 2, X86_64 = 5
                    if ([2, 5].includes(retval.toInt32())) {
                        // ARM64 = 4
                        console.log("[+] CPU family spoofed: x86 -> ARM64");
                        retval.replace(4);
                    }
                }
            });
            console.log("[+] Native android_getCpuFamily hooked");
        }
    } catch (err) {}

    console.log("\n[*] Emulator Bypass Complete!\n");
});
