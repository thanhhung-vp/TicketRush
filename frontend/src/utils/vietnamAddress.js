import adminDivisions from '../data/vietnam-admin-2025.raw.json' with { type: 'json' };

export const VIETNAM_ADMIN_DATA_VERSION = '2026-02-21';

export const VIETNAM_PROVINCES = adminDivisions.map(province => ({
  code: String(province.code),
  name: province.name,
  shortName: province.name.replace(/^(Tỉnh|Thành phố)\s+/u, ''),
  type: province.division_type,
  wards: province.wards.map(ward => ({
    code: String(ward.code),
    name: ward.name,
    shortName: ward.name.replace(/^(Xã|Phường|Đặc khu)\s+/u, ''),
    type: ward.division_type,
  })),
}));

export function getProvinceOptions() {
  return VIETNAM_PROVINCES.map(({ code, name, shortName, type }) => ({ code, name, shortName, type }));
}

export function findProvinceByCode(code) {
  const normalized = String(code || '');
  return VIETNAM_PROVINCES.find(province => province.code === normalized) || null;
}

export function findProvinceByName(name) {
  const normalized = String(name || '').trim();
  if (!normalized) return null;
  return VIETNAM_PROVINCES.find(province => (
    province.name === normalized || province.shortName === normalized
  )) || null;
}

export function getWardOptions(provinceCode) {
  return findProvinceByCode(provinceCode)?.wards || [];
}

export function findWardByCode(provinceCode, wardCode) {
  const normalized = String(wardCode || '');
  return getWardOptions(provinceCode).find(ward => ward.code === normalized) || null;
}

export function findWardByName(provinceCode, wardName) {
  const normalized = String(wardName || '').trim();
  if (!normalized) return null;
  return getWardOptions(provinceCode).find(ward => (
    ward.name === normalized || ward.shortName === normalized
  )) || null;
}

export function buildVietnamAddressLine({ street = '', hamlet = '', wardName = '', provinceName = '' } = {}) {
  return [street, hamlet, wardName, provinceName]
    .map(part => String(part || '').trim())
    .filter(Boolean)
    .join(', ');
}
