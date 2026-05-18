import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildVietnamAddressLine,
  findProvinceByCode,
  findWardByCode,
  getProvinceOptions,
  getWardOptions,
} from '../src/utils/vietnamAddress.js';

test('loads the 2025 two-level Vietnam administrative dataset', () => {
  const provinces = getProvinceOptions();
  const haNoi = provinces.find(province => province.name === 'Thành phố Hà Nội');

  assert.equal(provinces.length, 34);
  assert.equal(haNoi.code, '1');
  assert.equal(getWardOptions(haNoi.code).length, 126);
  assert.equal(findProvinceByCode('79').name, 'Thành phố Hồ Chí Minh');
});

test('finds wards by province code and ward code', () => {
  const baDinh = findWardByCode('1', '4');

  assert.equal(baDinh.name, 'Phường Ba Đình');
  assert.equal(findWardByCode('1', '999999'), null);
});

test('builds a full address from manually entered smaller address parts', () => {
  assert.equal(
    buildVietnamAddressLine({
      street: 'Số 12 đường Lê Lợi',
      hamlet: 'Khu phố 3',
      wardName: 'Phường Ba Đình',
      provinceName: 'Thành phố Hà Nội',
    }),
    'Số 12 đường Lê Lợi, Khu phố 3, Phường Ba Đình, Thành phố Hà Nội'
  );
});
