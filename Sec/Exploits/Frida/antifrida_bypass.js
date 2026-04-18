/**
 * Anti-Frida Detection Bypass
 * Hides Frida from detection mechanisms
 */

const FRIDA_STRINGS = [
    "frida", "frida-server", "frida-agent", "frida-gadget",
    "re.frida", "linjector", "gum-js-loop", "gmain", "gdbus"
];

const FRIDA_PORTS = [27042, 27043, 27044, 27045];

console.log("\n[*] Anti-Frida Bypass Loading...\n");

/* ================================================
   Socket/Port Detection
================================================ */

try {
    var connectPtr = Module.getExportByName("libc.so", "connect");
    var connect = new NativeFunction(connectPtr, 'int', ['int', 'pointer', 'int']);

    Interceptor.replace(connectPtr, new NativeCallback(function (sockfd, addr, addrlen) {
        var port = addr.add(2).readU16();
        var portNum = ((port & 0xff) << 8) | (port >> 8);

        if (FRIDA_PORTS.includes(portNum)) {
            console.log("[+] Blocked connection to Frida port: " + portNum);
            return -1;
        }

        return connect(sockfd, addr, addrlen);
    }, 'int', ['int', 'pointer', 'int']));

    console.log("[+] Socket/connect hooked");

} catch (err) {
    console.log("[-] Socket hook failed");
}

/* ================================================
   File Access (Hide Frida Binaries)
================================================ */

try {
    var accessPtr = Module.getExportByName('libc.so', 'access');
    var access = new NativeFunction(accessPtr, 'int', ['pointer', 'int']);

    Interceptor.replace(accessPtr, new NativeCallback(function (pathname, mode) {
        var path = pathname.readCString();

        if (path && FRIDA_STRINGS.some(str => path.toLowerCase().includes(str.toLowerCase()))) {
            console.log("[+] access() blocked: " + path);
            return -1;
        }

        return access(pathname, mode);
    }, 'int', ['pointer', 'int']));

    console.log("[+] Native access() hooked");

} catch (err) {
    console.log("[-] access() hook failed");
}

/* ================================================
   Java Stack Trace Filtering
================================================ */

Java.perform(function () {
    try {
        var Throwable = Java.use("java.lang.Throwable");
        var origGetStackTrace = Throwable.getStackTrace;

        Throwable.getStackTrace.implementation = function () {
            var stack = origGetStackTrace.call(this);
            var filteredStack = [];

            for (var i = 0; i < stack.length; i++) {
                var element = stack[i].toString();

                if (!FRIDA_STRINGS.some(str => element.toLowerCase().includes(str.toLowerCase()))) {
                    filteredStack.push(stack[i]);
                }
            }

            return Java.array('java.lang.StackTraceElement', filteredStack);
        };

        console.log("[+] Stack trace filtering enabled");

    } catch (err) {
        console.log("[-] Stack trace hook failed");
    }
});

/* ================================================
   Runtime.exec (Block Frida Detection Commands)
================================================ */

Java.perform(function () {
    try {
        var Runtime = Java.use("java.lang.Runtime");
        var exec = Runtime.exec.overload("java.lang.String");

        exec.implementation = function (cmd) {
            if (cmd.includes("frida") || 
                cmd.includes("lsof") ||
                cmd.includes("ps") && cmd.includes("grep")) {
                console.log("[+] Frida detection command blocked: " + cmd);
                return exec.call(this, "echo");
            }
            return exec.call(this, cmd);
        };

        console.log("[+] Runtime.exec hooked");

    } catch (err) {}
});

console.log("\n[*] Anti-Frida Bypass Complete!\n");
