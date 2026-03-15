export interface HomeCategoryOption {
    value: string;
    label: string;
}

export interface HomeSubcategoryOption {
    value: string;
    label: string;
}

export const HOME_CATEGORY_OPTIONS: HomeCategoryOption[] = [
    { value: 'electronics', label: 'Electronics' },
    { value: 'collectibles', label: 'Collectibles' },
    { value: 'art', label: 'Art' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'antiques', label: 'Antiques' },
    { value: 'vehicles', label: 'Vehicles' },
    { value: 'fashion', label: 'Fashion' },
    { value: 'property', label: 'Property' },
    { value: 'niche', label: 'Niche' },
    { value: 'school', label: 'School' },
];

export const HOME_SUBCATEGORY_OPTIONS: Record<string, HomeSubcategoryOption[]> = {
    electronics: [
        { value: 'new-auctions', label: 'New Auctions' },
        { value: 'ending-soon', label: 'Ending Soon' },
        { value: 'hot-items', label: 'Hot Items' },
        { value: 'laptops-computers', label: 'Laptops & Computers' },
        { value: 'phones-accessories', label: 'Phones & Accessories' },
        { value: 'audio-video', label: 'Audio & Video' },
        { value: 'gaming', label: 'Gaming' },
    ],
    collectibles: [
        { value: 'rare-coins', label: 'Rare Coins' },
        { value: 'trading-cards', label: 'Trading Cards' },
        { value: 'sports-memorabilia', label: 'Sports Memorabilia' },
        { value: 'vintage-items', label: 'Vintage Items' },
        { value: 'stamps-documents', label: 'Stamps & Documents' },
        { value: 'action-figures', label: 'Action Figures' },
    ],
    art: [
        { value: 'paintings', label: 'Paintings' },
        { value: 'sculptures', label: 'Sculptures' },
        { value: 'photography', label: 'Photography' },
        { value: 'prints-drawings', label: 'Prints & Drawings' },
        { value: 'contemporary-art', label: 'Contemporary Art' },
        { value: 'digital-art', label: 'Digital Art' },
    ],
    luxury: [
        { value: 'designer-bags', label: 'Designer Bags' },
        { value: 'luxury-watches', label: 'Luxury Watches' },
        { value: 'fine-jewelry', label: 'Fine Jewelry' },
        { value: 'designer-fashion', label: 'Designer Fashion' },
        { value: 'accessories', label: 'Accessories' },
        { value: 'haute-couture', label: 'Haute Couture' },
    ],
    antiques: [
        { value: 'antique-furniture', label: 'Antique Furniture' },
        { value: 'porcelain-pottery', label: 'Porcelain & Pottery' },
        { value: 'silver-metals', label: 'Silver & Metals' },
        { value: 'textiles-rugs', label: 'Textiles & Rugs' },
        { value: 'decorative-items', label: 'Decorative Items' },
        { value: 'vintage-tools', label: 'Vintage Tools' },
    ],
    vehicles: [
        { value: 'classic-cars', label: 'Classic Cars' },
        { value: 'motorcycles', label: 'Motorcycles' },
        { value: 'vintage-bikes', label: 'Vintage Bikes' },
        { value: 'sports-cars', label: 'Sports Cars' },
        { value: 'luxury-vehicles', label: 'Luxury Vehicles' },
        { value: 'parts-accessories', label: 'Parts & Accessories' },
    ],
    fashion: [
        { value: 'vintage-dresses', label: 'Vintage Dresses' },
        { value: 'designer-shoes', label: 'Designer Shoes' },
        { value: 'mens-suits', label: "Men's Suits" },
        { value: 'accessories', label: 'Accessories' },
        { value: 'streetwear', label: 'Streetwear' },
        { value: 'haute-couture', label: 'Haute Couture' },
    ],
    property: [
        { value: 'residential', label: 'Residential' },
        { value: 'commercial', label: 'Commercial' },
        { value: 'land', label: 'Land' },
        { value: 'historic-buildings', label: 'Historic Buildings' },
        { value: 'condominiums', label: 'Condominiums' },
        { value: 'foreclosures', label: 'Foreclosures' },
    ],
    niche: [
        { value: 'rare-finds', label: 'Rare Finds' },
        { value: 'oddities', label: 'Oddities' },
        { value: 'handmade-crafts', label: 'Handmade Crafts' },
        { value: 'movie-props', label: 'Movie Props' },
        { value: 'historical-items', label: 'Historical Items' },
        { value: 'one-of-a-kind', label: 'One-of-a-Kind' },
    ],
    school: [
        { value: 'textbooks', label: 'Textbooks' },
        { value: 'laptops-tablets', label: 'Laptops & Tablets' },
        { value: 'scientific-equipment', label: 'Scientific Equipment' },
        { value: 'stationery', label: 'Stationery' },
        { value: 'uniforms', label: 'Uniforms' },
        { value: 'school-bags', label: 'School Bags' },
    ],
};

export const getSubcategoryOptions = (categoryValue?: string | null): HomeSubcategoryOption[] => {
    if (!categoryValue) {
        return [];
    }

    return HOME_SUBCATEGORY_OPTIONS[categoryValue] ?? [];
};

export const getCategoryValue = (categoryInput?: string | null): string => {
    if (!categoryInput) {
        return '';
    }

    const normalized = categoryInput.trim().toLowerCase();
    const matched = HOME_CATEGORY_OPTIONS.find((option) => {
        return option.value.toLowerCase() === normalized || option.label.toLowerCase() === normalized;
    });

    return matched?.value ?? normalized;
};

export const getCategoryLabel = (categoryValue?: string | null): string => {
    if (!categoryValue) {
        return 'Uncategorized';
    }

    return HOME_CATEGORY_OPTIONS.find((option) => option.value === categoryValue)?.label ?? categoryValue;
};

export const getSubcategoryLabel = (categoryValue?: string | null, subcategoryValue?: string | null): string => {
    if (!subcategoryValue) {
        return '';
    }

    const options = getSubcategoryOptions(categoryValue);
    return options.find((option) => option.value === subcategoryValue)?.label ?? subcategoryValue;
};

export const getSubcategoryValue = (categoryValue?: string | null, subcategoryInput?: string | null): string => {
    if (!subcategoryInput) {
        return '';
    }

    const normalized = subcategoryInput.trim().toLowerCase();
    const options = getSubcategoryOptions(categoryValue);
    const matched = options.find((option) => {
        return option.value.toLowerCase() === normalized || option.label.toLowerCase() === normalized;
    });

    return matched?.value ?? normalized;
};
