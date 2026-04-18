/**
 * Crypto Monitor
 * Intercepts and logs cryptographic operations
 */

function toHex(byteArray) {
    if (!byteArray) return "null";
    var hex = [];
    for (var i = 0; i < byteArray.length; i++) {
        var b = byteArray[i] & 0xff;
        hex.push((b >>> 4).toString(16));
        hex.push((b & 0xF).toString(16));
    }
    return hex.join("");
}

function toBase64(bytes) {
    try {
        return Java.use("android.util.Base64").encodeToString(bytes, 0);
    } catch (e) {
        return "(error)";
    }
}

function toString(bytes) {
    try {
        return Java.use("java.lang.String").$new(bytes);
    } catch (e) {
        return "(non-string)";
    }
}

var cryptoState = {
    keys: {},
    ivs: {},
    operations: []
};

Java.perform(function () {

    console.log("\n[*] Crypto Monitor Loading...\n");

    var Base64 = Java.use("android.util.Base64");

    /* ================================================
       SecretKeySpec (AES/DES Keys)
    ================================================ */

    try {
        var SecretKeySpec = Java.use("javax.crypto.spec.SecretKeySpec");
        var origInit = SecretKeySpec.$init.overload('[B', 'java.lang.String');

        SecretKeySpec.$init.overload('[B', 'java.lang.String').implementation = function (keyBytes, algorithm) {
            try {
                var keyArray = Java.array('byte', keyBytes);
                var keyB64 = Base64.encodeToString(keyArray, 0);
                var keyHex = toHex(keyArray);

                console.log("\n[+] SecretKeySpec");
                console.log("  Algorithm: " + algorithm);
                console.log("  Key (B64): " + keyB64);
                console.log("  Key (HEX): " + keyHex);
                console.log("  Length: " + keyArray.length + " bytes");

                cryptoState.keys[keyB64] = {
                    hex: keyHex,
                    alg: algorithm + "",
                    timestamp: new Date().toISOString()
                };

            } catch (e) {}

            return origInit.call(this, keyBytes, algorithm);
        };

        console.log("[+] SecretKeySpec hooked");

    } catch (err) {
        console.log("[-] SecretKeySpec hook failed");
    }

    /* ================================================
       IvParameterSpec (Initialization Vectors)
    ================================================ */

    try {
        var IvParameterSpec = Java.use("javax.crypto.spec.IvParameterSpec");
        var origInit = IvParameterSpec.$init.overload('[B');

        IvParameterSpec.$init.overload('[B').implementation = function (ivBytes) {
            try {
                var ivArray = Java.array('byte', ivBytes);
                var ivB64 = Base64.encodeToString(ivArray, 0);
                var ivHex = toHex(ivArray);
                var threadId = Java.use('java.lang.Thread').currentThread().getId() + "";

                console.log("\n[+] IvParameterSpec");
                console.log("  IV (B64): " + ivB64);
                console.log("  IV (HEX): " + ivHex);
                console.log("  Length: " + ivArray.length + " bytes");

                cryptoState.ivs[threadId] = {
                    b64: ivB64,
                    hex: ivHex,
                    timestamp: new Date().toISOString()
                };

            } catch (e) {}

            return origInit.call(this, ivBytes);
        };

        console.log("[+] IvParameterSpec hooked");

    } catch (err) {
        console.log("[-] IvParameterSpec hook failed");
    }

    /* ================================================
       Cipher.doFinal (Encryption/Decryption)
    ================================================ */

    try {
        var Cipher = Java.use("javax.crypto.Cipher");

        try {
            var doFinal = Cipher.doFinal.overload('[B');
            doFinal.implementation = function (input) {
                try {
                    var inputArray = Java.array('byte', input);
                    var result = doFinal.call(this, input);
                    var resultArray = Java.array('byte', result);

                    console.log("\n[+] Cipher.doFinal");
                    console.log("  Algorithm: " + this.getAlgorithm());
                    console.log("  Input (B64): " + toBase64(inputArray));
                    console.log("  Input (HEX): " + toHex(inputArray));
                    console.log("  Output (B64): " + toBase64(resultArray));
                    console.log("  Output (HEX): " + toHex(resultArray));

                    return result;
                } catch (e) {
                    return doFinal.call(this, input);
                }
            };
        } catch (e) {}

        console.log("[+] Cipher.doFinal hooked");

    } catch (err) {
        console.log("[-] Cipher.doFinal hook failed");
    }

    /* ================================================
       MessageDigest (Hash Functions)
    ================================================ */

    try {
        var MessageDigest = Java.use("java.security.MessageDigest");
        var origDigest = MessageDigest.digest.overload('[B');

        MessageDigest.digest.overload('[B').implementation = function (input) {
            try {
                var inputArray = Java.array('byte', input);
                var result = origDigest.call(this, input);
                var resultArray = Java.array('byte', result);

                console.log("\n[+] MessageDigest");
                console.log("  Algorithm: " + this.getAlgorithm());
                console.log("  Input (B64): " + toBase64(inputArray));
                console.log("  Hash (HEX): " + toHex(resultArray));

                return result;
            } catch (e) {
                return origDigest.call(this, input);
            }
        };

        console.log("[+] MessageDigest hooked");

    } catch (err) {
        console.log("[-] MessageDigest hook failed");
    }

    /* ================================================
       RPC Exports
    ================================================ */

    rpc.exports = {
        getCryptoState: function () {
            return cryptoState;
        },
        getKeys: function () {
            return cryptoState.keys;
        },
        getIVs: function () {
            return cryptoState.ivs;
        },
        clearState: function () {
            cryptoState.keys = {};
            cryptoState.ivs = {};
            cryptoState.operations = [];
            console.log("[+] Crypto state cleared");
        }
    };

    console.log("\n[*] Crypto Monitor Active!");
    console.log("[*] RPC exports: getCryptoState, getKeys, getIVs, clearState\n");
});
