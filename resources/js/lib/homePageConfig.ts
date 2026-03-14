export type CircleTone = 'yellow' | 'black';

export interface HomePromoCircle {
    id: string;
    label: string;
    discount: string;
    tone: CircleTone;
}

export interface HomeCarouselSlide {
    id: string;
    subtitle: string;
    title: string;
    price: string;
    brands: string[];
    disclaimer: string;
    image: string;
}

export interface HomeVideoAd {
    id: string;
    title: string;
    subtitle: string;
    image: string;
}

export interface HomePageConfig {
    circles: HomePromoCircle[];
    slides: HomeCarouselSlide[];
    videoAds: HomeVideoAd[];
}

export const DEFAULT_HOME_PAGE_CONFIG: HomePageConfig = {
    circles: [
        { id: 'c1', label: 'FLASH SALE', discount: 'Up to 70% Off!', tone: 'yellow' },
        { id: 'c2', label: 'ROLEX OMEGA', discount: 'Up to 15% Off', tone: 'black' },
        { id: 'c3', label: 'CLASSIC CARS', discount: 'Up to 85% Off', tone: 'black' },
        { id: 'c4', label: 'HERMES GUCCI', discount: 'Up to 25% Off', tone: 'black' },
        { id: 'c5', label: 'FINE ART', discount: 'Up to 50% Off', tone: 'black' },
        { id: 'c6', label: 'VINTAGE WATCHES', discount: 'Up to 30% Off', tone: 'black' },
        { id: 'c7', label: 'RARE COINS', discount: 'Up to 40% Off', tone: 'black' },
        { id: 'c8', label: 'JEWELRY', discount: 'Up to 45% Off', tone: 'black' },
    ],
    slides: [
        {
            id: 's1',
            subtitle: 'WEEKEND SPECIAL',
            title: 'Exceptional Finds',
            price: 'Up to 60% Off',
            brands: ['Rolex', 'Ferrari', 'Picasso'],
            disclaimer: 'T&Cs apply. Ends February 18, 12 noon.\nLive Auction Starts at 2PM',
            image: '/carousel/1.jpg',
        },
        {
            id: 's2',
            subtitle: 'FLASH SALE',
            title: 'Limited Edition',
            price: 'Up to 70% Off',
            brands: ['Omega', 'Tesla', 'Van Gogh'],
            disclaimer: 'Limited time offer. While stocks last.\nExclusive members only',
            image: '/carousel/2.jpg',
        },
        {
            id: 's3',
            subtitle: 'LUXURY COLLECTION',
            title: 'Premium Selection',
            price: 'Up to 50% Off',
            brands: ['Hermes', 'Mercedes', 'Monet'],
            disclaimer: 'Curated by experts. Quality guaranteed.\nAuthenticity certified',
            image: '/carousel/3.jpg',
        },
        {
            id: 's4',
            subtitle: 'COLLECTORS CHOICE',
            title: 'Rare Treasures',
            price: 'Up to 80% Off',
            brands: ['Patek Philippe', 'Ferrari', 'Picasso'],
            disclaimer: 'Authenticated pieces. Certificate included.\nInvestment grade items',
            image: '/carousel/4.jpg',
        },
    ],
    videoAds: [
        {
            id: 'v1',
            title: 'VIDEO ADS PLACEHOLDER',
            subtitle: '1920 x 600 recommended',
            image: '',
        },
    ],
};

const toSafeString = (value: unknown, fallback = '') => {
    return typeof value === 'string' ? value : fallback;
};

const normalizeCircle = (value: unknown, index: number): HomePromoCircle => {
    const candidate = typeof value === 'object' && value !== null ? value as Partial<HomePromoCircle> : {};
    const tone = candidate.tone === 'yellow' ? 'yellow' : 'black';

    return {
        id: toSafeString(candidate.id, `circle-${index + 1}`),
        label: toSafeString(candidate.label, `Circle ${index + 1}`),
        discount: toSafeString(candidate.discount, 'Up to 0% Off'),
        tone,
    };
};

const normalizeSlide = (value: unknown, index: number): HomeCarouselSlide => {
    const candidate = typeof value === 'object' && value !== null ? value as Partial<HomeCarouselSlide> : {};
    const brands = Array.isArray(candidate.brands)
        ? candidate.brands.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [];

    return {
        id: toSafeString(candidate.id, `slide-${index + 1}`),
        subtitle: toSafeString(candidate.subtitle, 'FEATURED SALE'),
        title: toSafeString(candidate.title, 'Featured Collection'),
        price: toSafeString(candidate.price, 'Up to 0% Off'),
        brands,
        disclaimer: toSafeString(candidate.disclaimer, 'Limited offer.'),
        image: toSafeString(candidate.image, ''),
    };
};

const normalizeVideoAd = (value: unknown, index: number): HomeVideoAd => {
    const candidate = typeof value === 'object' && value !== null ? value as Partial<HomeVideoAd> : {};

    return {
        id: toSafeString(candidate.id, `video-${index + 1}`),
        title: toSafeString(candidate.title, `Video Ad ${index + 1}`),
        subtitle: toSafeString(candidate.subtitle, '1920 x 600 recommended'),
        image: toSafeString(candidate.image, ''),
    };
};

export const normalizeHomePageConfig = (value: unknown): HomePageConfig => {
    const candidate = typeof value === 'object' && value !== null ? value as Partial<HomePageConfig> : {};
    const circlesSource = Array.isArray(candidate.circles) ? candidate.circles : DEFAULT_HOME_PAGE_CONFIG.circles;
    const slidesSource = Array.isArray(candidate.slides) ? candidate.slides : DEFAULT_HOME_PAGE_CONFIG.slides;
    const videoSource = Array.isArray(candidate.videoAds) ? candidate.videoAds : DEFAULT_HOME_PAGE_CONFIG.videoAds;

    const circles = circlesSource.map(normalizeCircle).filter((item) => item.label.trim().length > 0);
    const slides = slidesSource.map(normalizeSlide).filter((item) => item.title.trim().length > 0);
    const videoAds = videoSource.map(normalizeVideoAd).filter((item) => item.title.trim().length > 0);

    return {
        circles: circles.length > 0 ? circles : DEFAULT_HOME_PAGE_CONFIG.circles,
        slides: slides.length > 0 ? slides : DEFAULT_HOME_PAGE_CONFIG.slides,
        videoAds: videoAds.length > 0 ? videoAds : DEFAULT_HOME_PAGE_CONFIG.videoAds,
    };
};

export const getDefaultHomePageConfig = (): HomePageConfig => {
    return JSON.parse(JSON.stringify(DEFAULT_HOME_PAGE_CONFIG)) as HomePageConfig;
};
