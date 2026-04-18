/**
 * SSL Pinning Bypass
 * Bypasses certificate pinning for HTTPS traffic interception
 */

Java.perform(function () {

    console.log("\n[*] SSL Pinning Bypass Loading...\n");

    /* ================================================
       TrustManagerImpl (Android 7+)
    ================================================ */

    try {
        var TrustManagerImpl = Java.use("com.android.org.conscrypt.TrustManagerImpl");

        TrustManagerImpl.verifyChain.implementation = function (
            untrustedChain, trustAnchorChain, host, clientAuth, ocspData, tlsSctData
        ) {
            console.log("[+] TrustManagerImpl.verifyChain: " + host);
            return untrustedChain;
        };

        TrustManagerImpl.checkTrustedRecursive.implementation = function (
            certs, host, clientAuth, untrustedChain, trustAnchorChain, used
        ) {
            console.log("[+] TrustManagerImpl.checkTrustedRecursive: " + host);
            return Java.use("java.util.ArrayList").$new();
        };

        console.log("[+] TrustManagerImpl hooked");

    } catch (err) {
        console.log("[-] TrustManagerImpl not found");
    }

    /* ================================================
       SSLContext
    ================================================ */

    try {
        var SSLContext = Java.use("javax.net.ssl.SSLContext");
        var X509TrustManager = Java.use("javax.net.ssl.X509TrustManager");

        var TrustManager = Java.registerClass({
            name: "dev.ssl.TrustManager",
            implements: [X509TrustManager],
            methods: {
                checkClientTrusted: function (chain, authType) {},
                checkServerTrusted: function (chain, authType) {},
                getAcceptedIssuers: function () { return []; }
            }
        });

        SSLContext.init.overload(
            "[Ljavax.net.ssl.KeyManager;",
            "[Ljavax.net.ssl.TrustManager;",
            "java.security.SecureRandom"
        ).implementation = function (km, tm, sr) {
            console.log("[+] SSLContext.init bypassed");
            SSLContext.init.call(this, km, [TrustManager.$new()], sr);
        };

        console.log("[+] SSLContext hooked");

    } catch (err) {
        console.log("[-] SSLContext hook failed");
    }

    /* ================================================
       HttpsURLConnection
    ================================================ */

    try {
        var HttpsURLConnection = Java.use("javax.net.ssl.HttpsURLConnection");

        HttpsURLConnection.setDefaultHostnameVerifier.implementation = function (verifier) {
            console.log("[+] HostnameVerifier bypassed");
        };

        console.log("[+] HttpsURLConnection hooked");

    } catch (err) {
        console.log("[-] HttpsURLConnection hook failed");
    }

    /* ================================================
       HostnameVerifier
    ================================================ */

    try {
        var HostnameVerifier = Java.use("javax.net.ssl.HostnameVerifier");

        HostnameVerifier.verify.overload(
            "java.lang.String",
            "javax.net.ssl.SSLSession"
        ).implementation = function (hostname, session) {
            console.log("[+] HostnameVerifier.verify: " + hostname);
            return true;
        };

        console.log("[+] HostnameVerifier hooked");

    } catch (err) {
        console.log("[-] HostnameVerifier hook failed");
    }

    /* ================================================
       OkHttp3 CertificatePinner
    ================================================ */

    try {
        var CertificatePinner = Java.use("okhttp3.CertificatePinner");

        CertificatePinner.check.overload(
            "java.lang.String",
            "java.util.List"
        ).implementation = function (hostname, certs) {
            console.log("[+] OkHttp3 bypassed: " + hostname);
            return;
        };

        console.log("[+] OkHttp3 hooked");

    } catch (err) {
        console.log("[-] OkHttp3 not found");
    }

    /* ================================================
       OkHttp2 CertificatePinner (Legacy)
    ================================================ */

    try {
        var CertPinner = Java.use("com.squareup.okhttp.CertificatePinner");

        CertPinner.check.overload(
            "java.lang.String",
            "java.util.List"
        ).implementation = function (hostname, certs) {
            console.log("[+] OkHttp2 bypassed: " + hostname);
            return;
        };

        console.log("[+] OkHttp2 hooked");

    } catch (err) {
        console.log("[-] OkHttp2 not found");
    }

    /* ================================================
       WebView
    ================================================ */

    try {
        var WebViewClient = Java.use("android.webkit.WebViewClient");

        WebViewClient.onReceivedSslError.implementation = function (view, handler, error) {
            console.log("[+] WebView SSL bypassed");
            handler.proceed();
        };

        console.log("[+] WebView hooked");

    } catch (err) {
        console.log("[-] WebView hook failed");
    }

    /* ================================================
       Apache HttpClient
    ================================================ */

    try {
        var AbstractVerifier = Java.use("org.apache.http.conn.ssl.AbstractVerifier");

        AbstractVerifier.verify.overload(
            "java.lang.String",
            "[Ljava.lang.String;",
            "[Ljava.lang.String;",
            "boolean"
        ).implementation = function (host, cns, subjectAlts, strict) {
            console.log("[+] Apache bypassed: " + host);
            return;
        };

        console.log("[+] Apache HttpClient hooked");

    } catch (err) {
        console.log("[-] Apache HttpClient not found");
    }

    console.log("\n[*] SSL Bypass Complete!\n");
});
