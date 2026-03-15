<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\HomepageContentMapper;

class HomepageContentController extends Controller
{
    public function index()
    {
        return response()->json([
            'config' => HomepageContentMapper::configPayload(),
        ]);
    }
}
