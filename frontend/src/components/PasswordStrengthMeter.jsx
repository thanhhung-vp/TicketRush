import { useTranslation } from 'react-i18next';
import { evaluatePasswordStrength } from '../utils/passwordStrength.js';

const LEVEL_STYLES = {
  weak: {
    text: 'text-red-600',
    fill: 'bg-red-500',
  },
  medium: {
    text: 'text-amber-600',
    fill: 'bg-amber-500',
  },
  strong: {
    text: 'text-emerald-600',
    fill: 'bg-emerald-500',
  },
};

export default function PasswordStrengthMeter({ password }) {
  const { t } = useTranslation();
  if (!password) return null;

  const strength = evaluatePasswordStrength(password);
  const styles = LEVEL_STYLES[strength.level] || LEVEL_STYLES.weak;
  const label = t(`passwordStrength.${strength.level}`);

  return (
    <div className="space-y-1 px-1" aria-live="polite">
      <div className="flex gap-1">
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full ${index < strength.score ? styles.fill : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${styles.text}`}>
        {t('passwordStrength.label', { label })}
      </p>
    </div>
  );
}
