<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\HomepageContentMapper;

class HomepageConfigController extends Controller
{
    public function show()
    {
        $config = HomepageContentMapper::configPayload();

        return response()->json([
            'config' => $this->isConfigEmpty($config)
                ? $this->defaultConfig()
                : $config,
        ]);
    }

    private function isConfigEmpty(array $config): bool
    {
        return empty($config['circles'])
            && empty($config['slides'])
            && empty($config['miniSlides'])
            && empty($config['videoAds']);
    }

    private function defaultConfig(): array
    {
        return [
            'circles' => [
                ['id' => 'c1', 'label' => 'FLASH SALE', 'discount' => 'Up to 70% Off!', 'tone' => 'yellow'],
                ['id' => 'c2', 'label' => 'ROLEX OMEGA', 'discount' => 'Up to 15% Off', 'tone' => 'black'],
                ['id' => 'c3', 'label' => 'CLASSIC CARS', 'discount' => 'Up to 85% Off', 'tone' => 'black'],
                ['id' => 'c4', 'label' => 'HERMES GUCCI', 'discount' => 'Up to 25% Off', 'tone' => 'black'],
                ['id' => 'c5', 'label' => 'FINE ART', 'discount' => 'Up to 50% Off', 'tone' => 'black'],
                ['id' => 'c6', 'label' => 'VINTAGE WATCHES', 'discount' => 'Up to 30% Off', 'tone' => 'black'],
                ['id' => 'c7', 'label' => 'RARE COINS', 'discount' => 'Up to 40% Off', 'tone' => 'black'],
                ['id' => 'c8', 'label' => 'JEWELRY', 'discount' => 'Up to 45% Off', 'tone' => 'black'],
            ],
            'slides' => [
                [
                    'id' => 's1',
                    'subtitle' => 'WEEKEND SPECIAL',
                    'title' => 'Exceptional Finds',
                    'price' => 'Up to 60% Off',
                    'brands' => ['Rolex', 'Ferrari', 'Picasso'],
                    'disclaimer' => "T&Cs apply. Ends February 18, 12 noon.\nLive Auction Starts at 2PM",
                    'image' => '/carousel/1.jpg',
                ],
                [
                    'id' => 's2',
                    'subtitle' => 'FLASH SALE',
                    'title' => 'Limited Edition',
                    'price' => 'Up to 70% Off',
                    'brands' => ['Omega', 'Tesla', 'Van Gogh'],
                    'disclaimer' => "Limited time offer. While stocks last.\nExclusive members only",
                    'image' => '/carousel/2.jpg',
                ],
                [
                    'id' => 's3',
                    'subtitle' => 'LUXURY COLLECTION',
                    'title' => 'Premium Selection',
                    'price' => 'Up to 50% Off',
                    'brands' => ['Hermes', 'Mercedes', 'Monet'],
                    'disclaimer' => "Curated by experts. Quality guaranteed.\nAuthenticity certified",
                    'image' => '/carousel/3.jpg',
                ],
                [
                    'id' => 's4',
                    'subtitle' => 'COLLECTORS CHOICE',
                    'title' => 'Rare Treasures',
                    'price' => 'Up to 80% Off',
                    'brands' => ['Patek Philippe', 'Ferrari', 'Picasso'],
                    'disclaimer' => "Authenticated pieces. Certificate included.\nInvestment grade items",
                    'image' => '/carousel/4.jpg',
                ],
            ],
            'videoAds' => [
                [
                    'id' => 'v1',
                    'title' => 'VIDEO ADS PLACEHOLDER',
                    'subtitle' => '1920 x 600 recommended',
                    'image' => '',
                ],
            ],
            'miniSlides' => [
                [
                    'id' => 'ms1',
                    'subtitle' => 'NEW ARRIVALS',
                    'title' => 'Fresh Picks This Week',
                    'price' => 'Starting from ₱500',
                    'brands' => ['Art', 'Collectibles'],
                    'disclaimer' => '',
                    'image' => '/carousel/1.jpg',
                ],
                [
                    'id' => 'ms2',
                    'subtitle' => 'ENDING SOON',
                    'title' => 'Last Chance Auctions',
                    'price' => 'Bid before they\'re gone',
                    'brands' => ['Electronics', 'Luxury'],
                    'disclaimer' => '',
                    'image' => '/carousel/2.jpg',
                ],
                [
                    'id' => 'ms3',
                    'subtitle' => 'TRENDING NOW',
                    'title' => 'Most Watched Items',
                    'price' => 'Join the bidding',
                    'brands' => ['Fashion', 'Vehicles'],
                    'disclaimer' => '',
                    'image' => '/carousel/3.jpg',
                ],
            ],
        ];
    }
}
