<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Homepage Dynamic Preview</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 24px; background: #f5f7fb; color: #15263a; }
        .section { margin-bottom: 28px; background: #fff; border: 1px solid #dbe5f0; border-radius: 14px; padding: 16px; }
        .row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
        .card { border: 1px solid #dbe5f0; border-radius: 12px; padding: 12px; background: #f9fcff; }
        .pill { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
        .pill.yellow { background: #fff8d5; color: #8c6a05; }
        .pill.black { background: #1f2937; color: #fff; }
        img { max-width: 100%; border-radius: 10px; display: block; }
        video { width: 100%; border-radius: 10px; }
        .muted { color: #57708d; font-size: 14px; }
    </style>
</head>
<body>
    <h1>Homepage Dynamic Content (Database)</h1>

    <section class="section">
        <h2>Promo Circles</h2>
        <div class="row">
            @forelse ($promoCircles as $circle)
                <article class="card">
                    <span class="pill {{ $circle->color === 'yellow' ? 'yellow' : 'black' }}">{{ $circle->title }}</span>
                    <p class="muted">{{ $circle->subtitle_text }}</p>
                </article>
            @empty
                <p class="muted">No promo circles found.</p>
            @endforelse
        </div>
    </section>

    <section class="section">
        <h2>Carousel Slides</h2>
        <div class="row">
            @forelse ($carouselSlides as $slide)
                <article class="card">
                    <p class="muted">{{ $slide->small_header_text }}</p>
                    <h3>{{ $slide->main_title }}</h3>
                    <strong>{{ $slide->discount_text }}</strong>
                    <p class="muted">{{ implode(', ', $slide->brand_tags ?? []) }}</p>
                    <p>{{ $slide->description_text }}</p>
                    @if (!empty($slide->image_path))
                        <img src="{{ $slide->image_path }}" alt="{{ $slide->main_title }}">
                    @endif
                </article>
            @empty
                <p class="muted">No carousel slides found.</p>
            @endforelse
        </div>
    </section>

    <section class="section">
        <h2>Video Ads</h2>
        <div class="row">
            @forelse ($videoAds as $ad)
                <article class="card">
                    <h3>{{ $ad->title }}</h3>
                    <p>{{ $ad->description }}</p>
                    @if (!empty($ad->video_url))
                        <video controls>
                            <source src="{{ $ad->video_url }}">
                        </video>
                    @elseif (!empty($ad->image_url))
                        <img src="{{ $ad->image_url }}" alt="{{ $ad->title }}">
                    @endif
                </article>
            @empty
                <p class="muted">No video ads found.</p>
            @endforelse
        </div>
    </section>
</body>
</html>
