<?php

namespace App\Http\Requests\Bid;

use Illuminate\Foundation\Http\FormRequest;

class StoreBidRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'amount' => ['required', 'integer', 'min:1'],
            'acknowledge_auto_deduct' => ['nullable', 'boolean'],
        ];
    }
}
