<?php

use App\Models\Auction;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('auction.{auctionId}', function ($user, $auctionId) {
    return Auction::query()->whereKey($auctionId)->exists();
});
