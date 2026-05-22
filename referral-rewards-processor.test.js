import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MOMENCE_ALL_COOKIES = process.env.MOMENCE_ALL_COOKIES || 'test-cookie';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'test-service-key';

const {
    buildCustomerFilters,
    buildReferralReportPayload,
    getRunMode,
    getHostConfigs,
    getHostConfig
} = await import('./referral-rewards-processor.js');

test('includes legacy and additional host reward configuration', () => {
    const hostConfigs = getHostConfigs({
        MOMENCE_HOST_ID: '13752',
        REFERRAL_MEMBERSHIP_ID: '583035'
    });

    assert.deepEqual(hostConfigs.map(host => host.hostId), ['13752', '33905']);
    assert.equal(getHostConfig('13752', hostConfigs).rewardMembershipId, 583035);
    assert.equal(getHostConfig('13752', hostConfigs).eligibilityMembershipId, 263860);
    assert.equal(getHostConfig('33905', hostConfigs).rewardMembershipId, 583036);
    assert.equal(getHostConfig('33905', hostConfigs).eligibilityMembershipId, 583037);
    assert.equal(getHostConfig('33905', hostConfigs).customerStartDate, '2026-05-22T01:00:00+05:30');
    assert.equal(getHostConfig('33905', hostConfigs).referralReportStartDate, '2026-05-22T01:00:00+05:30');
});

test('keeps host configuration unique when MOMENCE_HOST_IDS also contains default hosts', () => {
    const hostConfigs = getHostConfigs({
        MOMENCE_HOST_ID: '13752',
        MOMENCE_HOST_IDS: '13752,33905',
        REFERRAL_MEMBERSHIP_ID: '583035'
    });

    assert.deepEqual(hostConfigs.map(host => host.hostId), ['13752', '33905']);
});

test('uses host-specific start dates in customer filters and referral report payload', () => {
    const hostConfigs = getHostConfigs({
        MOMENCE_HOST_ID: '13752',
        REFERRAL_MEMBERSHIP_ID: '583035'
    });
    const legacyHost = getHostConfig('13752', hostConfigs);
    const additionalHost = getHostConfig('33905', hostConfigs);

    assert.equal(buildCustomerFilters(legacyHost).visits.startDate, '2025-12-01T12:00:00+05:30');
    assert.equal(buildReferralReportPayload(legacyHost).startDate, '2025-12-22T18:30:00.000Z');
    assert.equal(buildCustomerFilters(additionalHost).visits.startDate, '2026-05-22T01:00:00+05:30');
    assert.equal(buildReferralReportPayload(additionalHost).startDate, '2026-05-22T01:00:00+05:30');
});

test('detects preview mode from CLI arguments', () => {
    assert.equal(getRunMode(['node', 'referral-rewards-processor.js']), 'process');
    assert.equal(getRunMode(['node', 'referral-rewards-processor.js', '--preview']), 'preview');
    assert.equal(getRunMode(['node', 'referral-rewards-processor.js', '--dry-run']), 'preview');
});
