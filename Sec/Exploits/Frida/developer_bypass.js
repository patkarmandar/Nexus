/**
 * Developer Mode Bypass
 * Hides USB debugging and developer options
 */

Java.perform(function () {

    console.log("\n[*] Developer Mode Bypass Loading...\n");

    /* ================================================
       Settings.Global
    ================================================ */

    try {
        var SettingsGlobal = Java.use("android.provider.Settings$Global");

        SettingsGlobal.getInt.overloads.forEach(function (overload) {
            overload.implementation = function () {
                var name = arguments[1];

                if (name === "development_settings_enabled") {
                    console.log("[+] Developer settings check bypassed");
                    return 0;
                }

                if (name === "adb_enabled") {
                    console.log("[+] ADB check bypassed");
                    return 0;
                }

                return overload.apply(this, arguments);
            };
        });

        console.log("[+] Settings.Global hooked");

    } catch (err) {}

    /* ================================================
       Settings.Secure
    ================================================ */

    try {
        var SettingsSecure = Java.use("android.provider.Settings$Secure");
        var origGetInt = SettingsSecure.getInt.overload(
            "android.content.ContentResolver", "java.lang.String", "int"
        );

        SettingsSecure.getInt.overload(
            "android.content.ContentResolver", "java.lang.String", "int"
        ).implementation = function (resolver, name, def) {
            if (name === "adb_enabled" || name === "development_settings_enabled") {
                console.log("[+] Settings.Secure check bypassed: " + name);
                return 0;
            }
            return origGetInt.call(this, resolver, name, def);
        };

        console.log("[+] Settings.Secure hooked");

    } catch (err) {}

    /* ================================================
       Debug.isDebuggerConnected
    ================================================ */

    try {
        var Debug = Java.use("android.os.Debug");

        Debug.isDebuggerConnected.implementation = function () {
            console.log("[+] isDebuggerConnected() -> false");
            return false;
        };

        console.log("[+] Debug.isDebuggerConnected hooked");

    } catch (err) {}

    /* ================================================
       Build.TAGS
    ================================================ */

    try {
        Java.use("android.os.Build").TAGS.value = "release-keys";
        console.log("[+] Build.TAGS set to release-keys");
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

    console.log("\n[*] Developer Bypass Complete!\n");
});
