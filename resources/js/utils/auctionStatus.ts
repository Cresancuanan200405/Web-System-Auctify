import type { AuctionProduct } from '../types';

export type AuctionDisplayStatus = 'open' | 'closed' | 'scheduled';

export const parseAuctionTimestamp = (value?: string | null): number | null => {
    if (!value) {
        return null;
    }

    const trimmedValue = value.trim();

    // Parse timezone-aware values (e.g. ...Z, +08:00) with native Date,
    // but parse timezone-less values as local wall-clock time.
    const hasExplicitTimezone = /(Z|z|[+-]\d{2}:?\d{2})$/.test(trimmedValue);

    const localDateTimeMatch = trimmedValue.match(
        /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,6}))?$/,
    );

    if (!hasExplicitTimezone && localDateTimeMatch) {
        const [, year, month, day, hours, minutes, seconds, milliseconds] =
            localDateTimeMatch;
        const millisecondsValue = milliseconds
            ? milliseconds.slice(0, 3).padEnd(3, '0')
            : '0';

        const localDate = new Date(
            Number(year),
            Number(month) - 1,
            Number(day),
            Number(hours),
            Number(minutes),
            Number(seconds ?? '0'),
            Number(millisecondsValue),
        );
        const localTime = localDate.getTime();
        return Number.isFinite(localTime) ? localTime : null;
    }

    const time = new Date(trimmedValue).getTime();
    return Number.isFinite(time) ? time : null;
};

export const getAuctionDisplayStatus = (
    product: Pick<AuctionProduct, 'status' | 'starts_at' | 'ends_at'>,
    referenceTime = Date.now(),
): AuctionDisplayStatus => {
    if (product.status === 'closed') {
        return 'closed';
    }

    const endsAt = parseAuctionTimestamp(product.ends_at);
    if (endsAt !== null && endsAt <= referenceTime) {
        return 'closed';
    }

    const startsAt = parseAuctionTimestamp(product.starts_at);
    if (startsAt !== null && startsAt > referenceTime) {
        return 'scheduled';
    }

    return 'open';
};

export const getAuctionDashboardDisappearanceTime = (
    product: Pick<AuctionProduct, 'ends_at'>,
    gracePeriodMs: number,
): number | null => {
    const endsAt = parseAuctionTimestamp(product.ends_at);
    return endsAt === null ? null : endsAt + gracePeriodMs;
};

export const isAuctionVisibleOnDashboard = (
    product: Pick<AuctionProduct, 'status' | 'starts_at' | 'ends_at'>,
    referenceTime: number,
    gracePeriodMs: number,
): boolean => {
    const status = getAuctionDisplayStatus(product, referenceTime);
    if (status !== 'closed') {
        return true;
    }

    const disappearanceTime = getAuctionDashboardDisappearanceTime(
        product,
        gracePeriodMs,
    );
    return disappearanceTime !== null && disappearanceTime > referenceTime;
};
