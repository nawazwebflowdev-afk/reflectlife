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
