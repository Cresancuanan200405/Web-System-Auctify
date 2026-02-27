<?php

namespace App\Http\Requests\Auction;

use Illuminate\Foundation\Http\FormRequest;

class StoreAuctionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'starting_price' => ['required', 'numeric', 'min:1'],
            'max_increment' => ['required', 'numeric', 'min:0'],
            'starts_at' => ['nullable', 'date'],
            'status' => ['sometimes', 'in:open,closed'],
            'removed_media_ids' => ['sometimes', 'array'],
            'removed_media_ids.*' => ['integer', 'min:1'],
            'media' => ['sometimes', 'array', 'max:10'],
            'media.*' => ['file', 'max:51200', 'mimes:jpg,jpeg,jfif,png,gif,webp,bmp,tif,tiff,svg,avif,heic,heif,mp4,mov,webm,mkv,avi,m4v,3gp'],
            'ends_at' => ['nullable', 'date', 'after:starts_at', 'after:now'],
        ];
    }
}
