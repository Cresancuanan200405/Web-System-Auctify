<?php

namespace App\Support;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class MediaStorage
{
    public static function store(UploadedFile $file, string $directory): string
    {
        if (self::shouldUseSupabase()) {
            return self::storeToSupabase($file, $directory);
        }

        return $file->store(trim($directory, '/'), 'public');
    }

    public static function url(string $path): string
    {
        if (self::isAbsoluteUrl($path)) {
            return $path;
        }

        if (self::shouldUseSupabase()) {
            $baseUrl = rtrim((string) config('services.supabase.url', ''), '/');
            $bucket = trim((string) config('services.supabase.storage_bucket', ''), '/');

            if ($baseUrl !== '' && $bucket !== '') {
                $encodedPath = str_replace('%2F', '/', rawurlencode(ltrim($path, '/')));

                return $baseUrl . '/storage/v1/object/public/' . $bucket . '/' . $encodedPath;
            }
        }

        return Storage::url($path);
    }

    public static function exists(string $path): bool
    {
        if (self::shouldUseSupabase()) {
            $response = self::supabaseClient()
                ->head(self::supabaseObjectApiBase() . '/' . ltrim($path, '/'));

            if ($response->successful()) {
                return true;
            }
        }

        return Storage::disk('public')->exists($path);
    }

    public static function delete(string $path): void
    {
        if (self::shouldUseSupabase()) {
            self::supabaseClient()->delete(self::supabaseObjectApiBase() . '/' . ltrim($path, '/'));
        }

        Storage::disk('public')->delete($path);
    }

    public static function localAbsolutePath(string $path): ?string
    {
        if (! Storage::disk('public')->exists($path)) {
            return null;
        }

        return Storage::disk('public')->path($path);
    }

    private static function storeToSupabase(UploadedFile $file, string $directory): string
    {
        $directory = trim($directory, '/');
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'bin');
        $filename = Str::ulid()->toBase32() . '.' . $extension;
        $path = ($directory !== '' ? $directory . '/' : '') . $filename;

        $stream = fopen($file->getRealPath(), 'rb');

        if ($stream === false) {
            throw new RuntimeException('Unable to read uploaded file stream.');
        }

        $response = self::supabaseClient()
            ->withHeaders(['x-upsert' => 'false'])
            ->withBody($stream, $file->getMimeType() ?: 'application/octet-stream')
            ->post(self::supabaseObjectApiBase() . '/' . $path);

        if (is_resource($stream)) {
            fclose($stream);
        }

        if (! $response->successful()) {
            throw new RuntimeException('Supabase media upload failed: ' . $response->body());
        }

        return $path;
    }

    private static function shouldUseSupabase(): bool
    {
        return (bool) config('services.supabase.storage_enabled', false)
            && (string) config('services.supabase.url', '') !== ''
            && (string) config('services.supabase.service_role_key', '') !== ''
            && (string) config('services.supabase.storage_bucket', '') !== '';
    }

    private static function supabaseClient(): PendingRequest
    {
        $key = (string) config('services.supabase.service_role_key', '');

        return Http::withToken($key)
            ->withHeaders([
                'apikey' => $key,
            ])
            ->acceptJson()
            ->timeout(60);
    }

    private static function supabaseObjectApiBase(): string
    {
        return rtrim((string) config('services.supabase.url', ''), '/')
            . '/storage/v1/object/'
            . trim((string) config('services.supabase.storage_bucket', ''), '/');
    }

    private static function isAbsoluteUrl(string $path): bool
    {
        return str_starts_with($path, 'http://') || str_starts_with($path, 'https://');
    }
}
