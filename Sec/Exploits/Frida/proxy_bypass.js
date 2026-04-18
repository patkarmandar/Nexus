/**
 * Proxy Detection Bypass
 * Hides proxy/VPN configuration
 */

Java.perform(function () {

    console.log("\n[*] Proxy Detection Bypass Loading...\n");

    /* ================================================
       System.getProperty
    ================================================ */

    try {
        var System = Java.use("java.lang.System");
        var origGetProp1 = System.getProperty.overload("java.lang.String");
        var origGetProp2 = System.getProperty.overload("java.lang.String", "java.lang.String");

        System.getProperty.overload("java.lang.String").implementation = function (key) {
            if (key.toLowerCase().includes("proxy")) {
                console.log("[+] System.getProperty blocked: " + key);
                return null;
            }
            return origGetProp1.call(this, key);
        };

        System.getProperty.overload("java.lang.String", "java.lang.String").implementation = function (key, def) {
            if (key.toLowerCase().includes("proxy")) {
                console.log("[+] System.getProperty blocked: " + key);
                return def;
            }
            return origGetProp2.call(this, key, def);
        };

        console.log("[+] System.getProperty hooked");

    } catch (err) {}

    /* ================================================
       ProxySelector
    ================================================ */

    try {
        var ProxySelector = Java.use("java.net.ProxySelector");

        ProxySelector.getDefault.implementation = function () {
            console.log("[+] ProxySelector.getDefault bypassed");
            return null;
        };

        console.log("[+] ProxySelector hooked");

    } catch (err) {}

    /* ================================================
       NetworkCapabilities (VPN Detection)
    ================================================ */

    try {
        var NetworkCapabilities = Java.use("android.net.NetworkCapabilities");

        NetworkCapabilities.hasTransport.implementation = function (transportType) {
            if (transportType === 4) { // TRANSPORT_VPN
                console.log("[+] VPN transport hidden");
                return false;
            }
            return this.hasTransport(transportType);
        };

        console.log("[+] NetworkCapabilities hooked");

    } catch (err) {}

    /* ================================================
       NetworkInterface (Hide VPN Interfaces)
    ================================================ */

    try {
        var NetworkInterface = Java.use("java.net.NetworkInterface");
        var origGetName = NetworkInterface.getName;

        NetworkInterface.getName.implementation = function () {
            var name = origGetName.call(this);

            if (["tun0", "ppp0", "pptp0", "l2tp0"].includes(name)) {
                console.log("[+] VPN interface hidden: " + name);
                return "wlan0";
            }

            return name;
        };

        console.log("[+] NetworkInterface hooked");

    } catch (err) {}

    /* ================================================
       ConnectivityManager
    ================================================ */

    try {
        var ConnectivityManager = Java.use("android.net.ConnectivityManager");

        try {
            var origGetActiveNetworkInfo = ConnectivityManager.getActiveNetworkInfo;
            ConnectivityManager.getActiveNetworkInfo.implementation = function () {
                var networkInfo = origGetActiveNetworkInfo.call(this);

                if (networkInfo) {
                    var type = networkInfo.getType();
                    if (type === 17) { // VPN
                        console.log("[+] VPN network hidden");
                        return null;
                    }
                }

                return networkInfo;
            };
        } catch (e) {}

        console.log("[+] ConnectivityManager hooked");

    } catch (err) {}

    /* ================================================
       Runtime.exec (Block Proxy Detection Commands)
    ================================================ */

    try {
        var Runtime = Java.use("java.lang.Runtime");
        var exec = Runtime.exec.overload("java.lang.String");

        exec.implementation = function (cmd) {
            if (cmd.includes("netstat") || 
                cmd.includes("ifconfig") ||
                cmd.includes("ip addr")) {
                console.log("[+] Proxy detection command blocked: " + cmd);
                return exec.call(this, "echo");
            }
            return exec.call(this, cmd);
        };

        console.log("[+] Runtime.exec hooked");

    } catch (err) {}

    console.log("\n[*] Proxy Bypass Complete!\n");
});
