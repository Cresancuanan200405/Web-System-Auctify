<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Support\AdminAudit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class HomepageMediaUploadController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => ['required', 'string', 'in:video,image'],
            'file' => ['required', 'file', 'max:51200'],
        ]);

        $type = $validated['type'];
        $file = $request->file('file');

        if ($type === 'video') {
            $request->validate([
                'file' => ['required', 'file', 'mimetypes:video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/x-m4v'],
            ]);
        } else {
            $request->validate([
                'file' => [
                    'required',
                    'file',
                    'mimes:jpg,jpeg,jfif,png,gif,webp,bmp,tif,tiff,avif,heic,heif',
                    'mimetypes:image/jpeg,image/png,image/gif,image/webp,image/bmp,image/tiff,image/avif,image/heic,image/heif',
                ],
            ]);
        }

        $directory = $type === 'video' ? 'homepage/videos' : 'homepage/images';
        $storedPath = $file->store($directory, 'public');

        AdminAudit::log($request, 'admin-upload-homepage-media', 'Admin uploaded homepage media.', null, [
            'type' => $type,
            'path' => $storedPath,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ]);

        return response()->json([
            'message' => 'Media uploaded successfully.',
            'type' => $type,
            'path' => $storedPath,
            'url' => '/api/homepage-media/'.$storedPath,
        ], 201);
    }

    public function show(string $path)
    {
        if (! str_starts_with($path, 'homepage/')) {
            abort(404);
        }

        if (! Storage::disk('public')->exists($path)) {
            abort(404);
        }

        return response()->file(Storage::disk('public')->path($path));
    }
}
