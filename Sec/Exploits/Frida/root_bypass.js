/**
 * Root Detection Bypass
 * Hides root access from applications
 */

const ROOT_PATHS = [
    "/data/local/bin/su", "/data/local/su", "/data/local/xbin/su",
    "/sbin/su", "/su/bin/su", "/system/bin/su", "/system/xbin/su",
    "/system/sbin/su", "/vendor/bin/su", "/system/sd/xbin/su",
    "/system/bin/failsafe/su", "/system/bin/.ext/su",
    "/cache/su", "/data/su", "/dev/su",
    "/system/xbin/daemonsu", "/system/xbin/busybox",
    "/data/adb/magisk", "/sbin/.magisk", "/data/adb/ksu", "/data/adb/ksud"
];

const ROOT_PACKAGES = [
    "com.noshufou.android.su", "eu.chainfire.supersu",
    "com.koushikdutta.superuser", "com.topjohnwu.magisk",
    "me.weishu.kernelsu", "com.kingroot.kinguser"
];

Java.perform(function () {

    console.log("\n[*] Root Detection Bypass Loading...\n");

    /* ================================================
       Build.TAGS
    ================================================ */

    try {
        Java.use("android.os.Build").TAGS.value = "release-keys";
        console.log("[+] Build.TAGS spoofed");
    } catch (err) {}

    /* ================================================
       File.exists
    ================================================ */

    try {
        var File = Java.use("java.io.File");
        var origExists = File.exists;

        File.exists.implementation = function () {
            var path = this.getAbsolutePath();

            for (var i = 0; i < ROOT_PATHS.length; i++) {
                if (path === ROOT_PATHS[i]) {
                    console.log("[+] File.exists blocked: " + path);
                    return false;
                }
            }

            if (path.toLowerCase().includes("magisk") || 
                path.toLowerCase().includes("/su") ||
                path.toLowerCase().includes("superuser")) {
                console.log("[+] File.exists blocked: " + path);
                return false;
            }

            return origExists.call(this);
        };

        console.log("[+] File.exists hooked");

    } catch (err) {}

    /* ================================================
       Runtime.exec
    ================================================ */

    try {
        var Runtime = Java.use("java.lang.Runtime");
        var exec = Runtime.exec.overload("java.lang.String");

        exec.implementation = function (cmd) {
            if (cmd.includes("su") || cmd.includes("which") || cmd.includes("magisk")) {
                console.log("[+] Runtime.exec blocked: " + cmd);
                return exec.call(this, "echo");
            }
            return exec.call(this, cmd);
        };

        console.log("[+] Runtime.exec hooked");

    } catch (err) {}

    /* ================================================
       PackageManager
    ================================================ */

    try {
        var PackageManager = Java.use("android.app.ApplicationPackageManager");
        var getPackageInfo = PackageManager.getPackageInfo.overload("java.lang.String", "int");

        getPackageInfo.implementation = function (pkgName, flags) {
            for (var i = 0; i < ROOT_PACKAGES.length; i++) {
                if (pkgName === ROOT_PACKAGES[i]) {
                    console.log("[+] Package blocked: " + pkgName);
                    var NameNotFoundException = Java.use("android.content.pm.PackageManager$NameNotFoundException");
                    throw NameNotFoundException.$new("Package not found");
                }
            }
            return getPackageInfo.call(this, pkgName, flags);
        };

        console.log("[+] PackageManager hooked");

    } catch (err) {}

    /* ================================================
       System.exit Prevention
    ================================================ */

    try {
        Java.use("java.lang.System").exit.implementation = function (code) {
            console.log("[+] System.exit blocked");
        };

        console.log("[+] System.exit blocked");

    } catch (err) {}

    /* ================================================
       Native Hooks
    ================================================ */

    try {
        var fopen = Module.findExportByName("libc.so", "fopen");
        if (fopen) {
            Interceptor.attach(fopen, {
                onEnter: function (args) {
                    this.path = args[0].readCString();
                },
                onLeave: function (retval) {
                    if (this.path && retval.toInt32() !== 0) {
                        for (var i = 0; i < ROOT_PATHS.length; i++) {
                            if (this.path === ROOT_PATHS[i]) {
                                console.log("[+] fopen blocked: " + this.path);
                                retval.replace(ptr(0x0));
                                break;
                            }
                        }
                    }
                }
            });
            console.log("[+] Native fopen hooked");
        }
    } catch (err) {}

    try {
        var access = Module.findExportByName("libc.so", "access");
        if (access) {
            Interceptor.attach(access, {
                onEnter: function (args) {
                    this.path = args[0].readCString();
                },
                onLeave: function (retval) {
                    if (this.path && retval.toInt32() === 0) {
                        for (var i = 0; i < ROOT_PATHS.length; i++) {
                            if (this.path === ROOT_PATHS[i]) {
                                console.log("[+] access blocked: " + this.path);
                                retval.replace(ptr(-1));
                                break;
                            }
                        }
                    }
                }
            });
            console.log("[+] Native access hooked");
        }
    } catch (err) {}

    console.log("\n[*] Root Bypass Complete!\n");
});
