<?php

namespace App\Http\Requests\Auction;

use App\Models\AdminSetting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;

class StoreAuctionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $maxMediaFiles = max(1, (int) AdminSetting::getValue('max_listing_media_files', 10));

        return [
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'subcategory' => ['nullable', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'starting_price' => ['required', 'numeric', 'min:1'],
            'max_increment' => ['required', 'numeric', 'min:0'],
            'start_mode' => ['sometimes', 'in:now,scheduled'],
            'end_time_mode' => ['sometimes', 'in:days,hours,minutes,custom'],
            'end_time_value' => ['sometimes', 'integer', 'min:1'],
            'starts_at' => ['nullable', 'date'],
            'status' => ['sometimes', 'in:open,closed'],
            'removed_media_ids' => ['sometimes', 'array'],
            'removed_media_ids.*' => ['integer', 'min:1'],
            'media' => ['sometimes', 'array', 'max:' . $maxMediaFiles],
            'media.*' => ['file', 'max:51200', 'mimes:jpg,jpeg,jfif,png,gif,webp,bmp,tif,tiff,svg,avif,heic,heif,mp4,mov,webm,mkv,avi,m4v,3gp'],
            'ends_at' => ['nullable', 'date', 'after:starts_at', 'after:now'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $startsAt = $this->normalizeAuctionDate($this->input('starts_at'));
        $endsAt = $this->normalizeAuctionDate($this->input('ends_at'));
        $startMode = $this->input('start_mode');
        $endTimeMode = $this->input('end_time_mode');
        $endTimeValue = $this->input('end_time_value');

        $baseStart = null;

        if ($startMode === 'now') {
            $baseStart = Carbon::now('UTC');
            $startsAt = $baseStart->toISOString();
        } elseif ($startsAt !== null) {
            try {
                $baseStart = Carbon::parse($startsAt)->utc();
                $startsAt = $baseStart->toISOString();
            } catch (\Throwable) {
                $baseStart = null;
            }
        }

        if (is_string($endTimeMode) && in_array($endTimeMode, ['days', 'hours', 'minutes'], true) && is_numeric($endTimeValue)) {
            $duration = (int) $endTimeValue;
            $baseStart = $baseStart ?? Carbon::now('UTC');

            if ($duration > 0) {
                if ($endTimeMode === 'days') {
                    $endsAt = $baseStart->copy()->addDays($duration)->toISOString();
                } elseif ($endTimeMode === 'hours') {
                    $endsAt = $baseStart->copy()->addHours($duration)->toISOString();
                } else {
                    $endsAt = $baseStart->copy()->addMinutes($duration)->toISOString();
                }
            }
        }

        $merge = [];

        if ($startsAt !== null) {
            $merge['starts_at'] = $startsAt;
        }

        if ($endsAt !== null) {
            $merge['ends_at'] = $endsAt;
        }

        if ($merge !== []) {
            $this->merge($merge);
        }
    }

    private function normalizeAuctionDate(mixed $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $trimmed = trim($value);
        $hasExplicitTimezone = (bool) preg_match('/(Z|z|[+\-]\d{2}:\d{2})$/', $trimmed);

        try {
            $date = $hasExplicitTimezone
                ? Carbon::parse($trimmed)
                : Carbon::parse($trimmed, 'Asia/Manila');

            return $date->utc()->toISOString();
        } catch (\Throwable) {
            return $trimmed;
        }
    }
}
