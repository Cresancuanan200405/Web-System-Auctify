<?php

namespace App\Support;

class Totp
{
    private const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public static function generateSecret(int $bytes = 20): string
    {
        $bytes = max(16, min(64, $bytes));
        return self::base32Encode(random_bytes($bytes));
    }

    public static function provisioningUri(string $issuer, string $accountName, string $secret): string
    {
        $normalizedIssuer = rawurlencode($issuer);
        $normalizedAccount = rawurlencode($accountName);

        return "otpauth://totp/{$normalizedIssuer}:{$normalizedAccount}?secret={$secret}&issuer={$normalizedIssuer}&algorithm=SHA1&digits=6&period=30";
    }

    public static function verifyCode(string $secret, string $code, int $window = 1): bool
    {
        $normalizedCode = preg_replace('/\D+/', '', $code) ?? '';

        if (strlen($normalizedCode) !== 6) {
            return false;
        }

        $timeSlice = (int) floor(time() / 30);

        for ($offset = -$window; $offset <= $window; $offset++) {
            $expected = self::at($secret, $timeSlice + $offset);

            if (hash_equals($expected, $normalizedCode)) {
                return true;
            }
        }

        return false;
    }

    private static function at(string $secret, int $timeSlice): string
    {
        $binarySecret = self::base32Decode($secret);
        $time = pack('N*', 0).pack('N*', $timeSlice);
        $hash = hash_hmac('sha1', $time, $binarySecret, true);
        $offset = ord(substr($hash, -1)) & 0x0F;
        $truncated = ((ord($hash[$offset]) & 0x7F) << 24)
            | ((ord($hash[$offset + 1]) & 0xFF) << 16)
            | ((ord($hash[$offset + 2]) & 0xFF) << 8)
            | (ord($hash[$offset + 3]) & 0xFF);

        return str_pad((string) ($truncated % 1000000), 6, '0', STR_PAD_LEFT);
    }

    private static function base32Encode(string $binary): string
    {
        $bits = '';
        $length = strlen($binary);

        for ($i = 0; $i < $length; $i++) {
            $bits .= str_pad(decbin(ord($binary[$i])), 8, '0', STR_PAD_LEFT);
        }

        $encoded = '';
        $chunks = str_split($bits, 5);

        foreach ($chunks as $chunk) {
            if (strlen($chunk) < 5) {
                $chunk = str_pad($chunk, 5, '0', STR_PAD_RIGHT);
            }

            $encoded .= self::BASE32_ALPHABET[bindec($chunk)];
        }

        return $encoded;
    }

    private static function base32Decode(string $encoded): string
    {
        $normalized = strtoupper(preg_replace('/[^A-Z2-7]/', '', $encoded) ?? '');

        if ($normalized === '') {
            return '';
        }

        $bits = '';

        foreach (str_split($normalized) as $char) {
            $index = strpos(self::BASE32_ALPHABET, $char);

            if ($index === false) {
                continue;
            }

            $bits .= str_pad(decbin($index), 5, '0', STR_PAD_LEFT);
        }

        $binary = '';

        foreach (str_split($bits, 8) as $chunk) {
            if (strlen($chunk) !== 8) {
                continue;
            }

            $binary .= chr(bindec($chunk));
        }

        return $binary;
    }
}
