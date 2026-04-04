<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Services\Bids\BidWinnerSettlementService;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('auctions:settle-winners {--limit=300}', function (BidWinnerSettlementService $service) {
    $limit = (int) $this->option('limit');
    $summary = $service->settleClosedAuctions($limit);

    $this->info(sprintf(
        'Auction settlement complete. Processed: %d, Settled: %d, Failed: %d',
        $summary['processed'],
        $summary['settled'],
        $summary['failed'],
    ));
})->purpose('Settles closed-auction winners and applies wallet deductions.');

Schedule::command('auctions:settle-winners --limit=300')
    ->everyMinute()
    ->withoutOverlapping();
