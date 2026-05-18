import {
  buildVietnamAddressLine,
  findProvinceByCode,
  findWardByCode,
  getProvinceOptions,
  getWardOptions,
} from '../utils/vietnamAddress.js';

const defaultInputClass =
  'w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

function FieldLabel({ children, labelClassName }) {
  return <label className={labelClassName}>{children}</label>;
}

export function getAddressPayload(address) {
  const province = findProvinceByCode(address.provinceCode);
  const ward = findWardByCode(address.provinceCode, address.wardCode);

  return {
    address_province_code: province?.code || null,
    address_province_name: province?.name || null,
    address_ward_code: ward?.code || null,
    address_ward_name: ward?.name || null,
    address_hamlet: address.hamlet?.trim() || null,
    address_line: address.street?.trim() || null,
  };
}

export function buildSelectedAddressLine(address) {
  const province = findProvinceByCode(address.provinceCode);
  const ward = findWardByCode(address.provinceCode, address.wardCode);

  return buildVietnamAddressLine({
    street: address.street,
    hamlet: address.hamlet,
    wardName: ward?.name,
    provinceName: province?.name,
  });
}

export default function VietnamAddressFields({
  value,
  onChange,
  labels,
  inputClassName = defaultInputClass,
  labelClassName = 'mb-1 block text-sm font-medium text-gray-600',
  gridClassName = 'grid gap-3',
  required = false,
}) {
  const provinceOptions = getProvinceOptions();
  const wardOptions = getWardOptions(value.provinceCode);

  const update = (patch) => onChange({ ...value, ...patch });
  const updateProvince = (event) => update({ provinceCode: event.target.value, wardCode: '' });

  return (
    <div className={gridClassName}>
      <div>
        <FieldLabel labelClassName={labelClassName}>{labels.province}</FieldLabel>
        <select
          value={value.provinceCode}
          onChange={updateProvince}
          required={required}
          className={inputClassName}
        >
          <option value="">{labels.provincePlaceholder}</option>
          {provinceOptions.map(province => (
            <option key={province.code} value={province.code}>{province.name}</option>
          ))}
        </select>
      </div>

      <div>
        <FieldLabel labelClassName={labelClassName}>{labels.ward}</FieldLabel>
        <select
          value={value.wardCode}
          onChange={event => update({ wardCode: event.target.value })}
          required={required}
          disabled={!value.provinceCode}
          className={inputClassName}
        >
          <option value="">{labels.wardPlaceholder}</option>
          {wardOptions.map(ward => (
            <option key={ward.code} value={ward.code}>{ward.name}</option>
          ))}
        </select>
      </div>

      <div>
        <FieldLabel labelClassName={labelClassName}>{labels.hamlet}</FieldLabel>
        <input
          type="text"
          value={value.hamlet}
          onChange={event => update({ hamlet: event.target.value })}
          placeholder={labels.hamletPlaceholder}
          maxLength={180}
          className={inputClassName}
        />
      </div>

      <div>
        <FieldLabel labelClassName={labelClassName}>{labels.street}</FieldLabel>
        <input
          type="text"
          value={value.street}
          onChange={event => update({ street: event.target.value })}
          placeholder={labels.streetPlaceholder}
          maxLength={255}
          className={inputClassName}
        />
      </div>
    </div>
  );
}
