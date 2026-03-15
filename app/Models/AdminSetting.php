<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'type',
        'label',
        'description',
        'group',
    ];

    /**
     * Get a setting value by key, with an optional default.
     */
    public static function getValue(string $key, mixed $default = null): mixed
    {
        $setting = self::where('key', $key)->first();

        if (! $setting) {
            return $default;
        }

        return match ($setting->type) {
            'boolean' => in_array(strtolower((string) $setting->value), ['true', '1', 'yes'], true),
            'integer' => (int) $setting->value,
            default   => $setting->value,
        };
    }

    /**
     * Set a setting value by key.
     */
    public static function setValue(string $key, mixed $value): void
    {
        self::where('key', $key)->update(['value' => (string) $value]);
    }
}
