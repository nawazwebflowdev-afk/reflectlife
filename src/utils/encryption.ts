import CryptoJS from "crypto-js";

/**
 * Encrypts text using AES encryption
 * @param text - The text to encrypt
 * @param passphrase - The encryption passphrase (user's secret key)
 * @returns Encrypted text
 */
export function encryptText(text: string, passphrase: string): string {
  return CryptoJS.AES.encrypt(text, passphrase).toString();
}

/**
 * Decrypts AES encrypted text
 * @param encryptedText - The encrypted text
 * @param passphrase - The decryption passphrase (user's secret key)
 * @returns Decrypted text
 */
export function decryptText(encryptedText: string, passphrase: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedText, passphrase);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Generates a secure passphrase from user ID and additional secret
 * @param userId - The user's ID
 * @param secret - Additional secret (could be from environment or user-provided)
 * @returns A secure passphrase
 */
export function generatePassphrase(userId: string, secret: string): string {
  return CryptoJS.SHA256(userId + secret).toString();
}
const SECRET_KEY = "ReflectLife2025!secure@key";
// src/pages/test-encryption.jsx
import React, { useEffect, useState } from "react";
import { encryptContent, decryptContent } from "@/lib/utils/encryption";

export default function TestEncryptionPage() {
  const [result, setResult] = useState(null);

  useEffect(() => {
    const runTest = () => {
      const original = "This is my private diary entry 🕯️ — test at " + new Date().toISOString();
      try {
        const encrypted = encryptContent(original);
        const decrypted = decryptContent(encrypted);

        setResult({
          ok: decrypted === original,
          original,
          encrypted,
          decrypted,
        });

        console.log("Encryption Test:", { original, encrypted, decrypted });
      } catch (err) {
        setResult({ ok: false, error: err.message });
        console.error("Encryption test error:", err);
      }
    };

    runTest();
  }, []);

  if (!result) return <div style={{ padding: 20 }}>Running encryption test…</div>;

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h2>Encryption Test</h2>
      <p>
        <strong>Passed:</strong> {String(result.ok)}
      </p>
      {result.error ? (
        <pre style={{ color: "red" }}>{result.error}</pre>
      ) : (
        <>
          <div>
            <strong>Original:</strong> {result.original}
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>Encrypted:</strong>
            <pre style={{ whiteSpace: "pre-wrap", maxWidth: 800 }}>{result.encrypted}</pre>
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>Decrypted:</strong> {result.decrypted}
          </div>
        </>
      )}
      <p style={{ marginTop: 12, color: "#666" }}>Check browser console for the same output.</p>
    </div>
  );
}
