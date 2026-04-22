<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Homepage Content CRUD</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f6f8fc; color: #12263f; }
        h1, h2, h3 { margin: 0 0 10px; }
        .section { background: #fff; border: 1px solid #dce7f2; border-radius: 14px; padding: 16px; margin-bottom: 20px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
        .card { border: 1px solid #dce7f2; border-radius: 12px; padding: 12px; background: #f8fbff; }
        input, textarea, select { width: 100%; margin-bottom: 8px; min-height: 36px; border: 1px solid #cad8e8; border-radius: 8px; padding: 8px; }
        textarea { min-height: 70px; }
        .actions { display: flex; gap: 8px; }
        button { border: 1px solid #285a8c; background: #2d6aa4; color: #fff; border-radius: 8px; min-height: 34px; padding: 0 12px; cursor: pointer; }
        .danger { border-color: #bf1d32; background: #d9334a; }
        .ok { padding: 10px; border-radius: 10px; background: #e8f6ed; border: 1px solid #b9e0c8; margin-bottom: 14px; }
    </style>
</head>
<body>
    <h1>Admin Homepage Dynamic CRUD</h1>

    @if (session('status'))
        <div class="ok">{{ session('status') }}</div>
    @endif

    <section class="section">
        <h2>Add Promo Circle</h2>
        <form method="post" action="{{ route('admin.homepage-content.promo-circles.store') }}">
            @csrf
            <div class="grid">
                <input name="title" placeholder="Title" required>
                <input name="subtitle_text" placeholder="Subtitle/Discount" required>
                <select name="color"><option value="yellow">yellow</option><option value="black">black</option></select>
                <input name="sort_order" type="number" min="0" value="0" placeholder="Sort order">
            </div>
            <label><input type="checkbox" name="is_active" value="1" checked> Active</label>
            <div><button type="submit">Add</button></div>
        </form>
        <div class="grid">
            @foreach($promoCircles as $circle)
                <article class="card">
                    <form method="post" action="{{ route('admin.homepage-content.promo-circles.update', $circle) }}">
                        @csrf
                        @method('put')
                        <input name="title" value="{{ $circle->title }}" required>
                        <input name="subtitle_text" value="{{ $circle->subtitle_text }}" required>
                        <input name="color" value="{{ $circle->color }}" required>
                        <input name="sort_order" type="number" min="0" value="{{ $circle->sort_order }}">
                        <label><input type="checkbox" name="is_active" value="1" @checked($circle->is_active)> Active</label>
                        <button type="submit">Update</button>
                    </form>
                    <div class="actions">
                    <form method="post" action="{{ route('admin.homepage-content.promo-circles.destroy', $circle) }}">
                        @csrf
                        @method('delete')
                        <button class="danger" type="submit">Delete</button>
                    </form>
                    </div>
                </article>
            @endforeach
        </div>
    </section>

    <section class="section">
        <h2>Add Carousel Slide</h2>
        <form method="post" action="{{ route('admin.homepage-content.carousel-slides.store') }}">
            @csrf
            <div class="grid">
                <input name="small_header_text" placeholder="Small Header Text" required>
                <input name="main_title" placeholder="Main Title" required>
                <input name="discount_text" placeholder="Discount Text" required>
                <input name="brand_tags" placeholder="Brand tags (comma separated)">
                <input name="image_path" placeholder="Image path or URL">
                <textarea name="description_text" placeholder="Description text"></textarea>
                <input name="sort_order" type="number" min="0" value="0">
            </div>
            <label><input type="checkbox" name="is_active" value="1" checked> Active</label>
            <div><button type="submit">Add</button></div>
        </form>
        <div class="grid">
            @foreach($carouselSlides as $slide)
                <article class="card">
                    <form method="post" action="{{ route('admin.homepage-content.carousel-slides.update', $slide) }}">
                        @csrf
                        @method('put')
                        <input name="small_header_text" value="{{ $slide->small_header_text }}" required>
                        <input name="main_title" value="{{ $slide->main_title }}" required>
                        <input name="discount_text" value="{{ $slide->discount_text }}" required>
                        <input name="brand_tags" value="{{ implode(', ', $slide->brand_tags ?? []) }}">
                        <input name="image_path" value="{{ $slide->image_path }}">
                        <textarea name="description_text">{{ $slide->description_text }}</textarea>
                        <input name="sort_order" type="number" min="0" value="{{ $slide->sort_order }}">
                        <label><input type="checkbox" name="is_active" value="1" @checked($slide->is_active)> Active</label>
                        <button type="submit">Update</button>
                    </form>
                    <div class="actions">
                    <form method="post" action="{{ route('admin.homepage-content.carousel-slides.destroy', $slide) }}">
                        @csrf
                        @method('delete')
                        <button class="danger" type="submit">Delete</button>
                    </form>
                    </div>
                </article>
            @endforeach
        </div>
    </section>

    <section class="section">
        <h2>Add Video/Image Ad</h2>
        <form method="post" action="{{ route('admin.homepage-content.video-ads.store') }}">
            @csrf
            <div class="grid">
                <input name="video_url" placeholder="Video URL">
                <input name="image_url" placeholder="Image URL">
                <input name="sort_order" type="number" min="0" value="0">
            </div>
            <label><input type="checkbox" name="is_active" value="1" checked> Active</label>
            <div><button type="submit">Add</button></div>
        </form>
        <div class="grid">
            @foreach($videoAds as $ad)
                <article class="card">
                    <form method="post" action="{{ route('admin.homepage-content.video-ads.update', $ad) }}">
                        @csrf
                        @method('put')
                        <input name="video_url" value="{{ $ad->video_url }}">
                        <input name="image_url" value="{{ $ad->image_url }}">
                        <input name="sort_order" type="number" min="0" value="{{ $ad->sort_order }}">
                        <label><input type="checkbox" name="is_active" value="1" @checked($ad->is_active)> Active</label>
                        <button type="submit">Update</button>
                    </form>
                    <div class="actions">
                    <form method="post" action="{{ route('admin.homepage-content.video-ads.destroy', $ad) }}">
                        @csrf
                        @method('delete')
                        <button class="danger" type="submit">Delete</button>
                    </form>
                    </div>
                </article>
            @endforeach
        </div>
    </section>
</body>
</html>
