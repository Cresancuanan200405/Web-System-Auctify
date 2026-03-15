<?php

return [
    'admin_ip_allowlist' => array_values(array_filter(array_map(
        static fn (string $value): string => trim($value),
        explode(',', (string) env('ADMIN_TRUSTED_IPS', ''))
    ))),

    'admin_mfa_step_up_ttl_seconds' => (int) env('ADMIN_MFA_STEP_UP_TTL_SECONDS', 600),
];
