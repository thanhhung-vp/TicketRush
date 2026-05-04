import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function FooterLink({ to, label }) {
  const isExternal = to.startsWith('http');
  if (isExternal) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer"
        className="block text-sm text-gray-400 hover:text-white transition leading-relaxed">
        {label}
      </a>
    );
  }
  return (
    <Link to={to}
      className="block text-sm text-gray-400 hover:text-white transition leading-relaxed">
      {label}
    </Link>
  );
}

export default function Footer() {
  const { t } = useTranslation();

  const COL1 = [
    { key: 'links.aboutUs',        to: '/about' },
    { key: 'links.regulations',    to: '/terms' },
    { key: 'links.privacyInfo',    to: '/terms#bao-mat' },
    { key: 'links.privacyPayment', to: '/terms#thanh-toan' },
    { key: 'links.paymentMethods', to: '/faq' },
    { key: 'links.partners',       to: '/about' },
    { key: 'links.termsOfUse',     to: '/terms' },
  ];

  const COL2 = [
    { key: 'links.forCustomers', to: '/faq' },
    { key: 'links.promotions',   to: '/' },
  ];

  const COL3 = [
    { key: 'links.contactUs',    to: '/faq' },
    { key: 'links.faqLinks',     to: '/faq' },
    { key: 'links.guide',        to: '/faq' },
    { key: 'links.feedback',     to: '/support' },
  ];

  return (
    <footer style={{ backgroundColor: '#0f1117' }}>
      {/* ── Main grid ── */}
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Col 0 — Logo + tagline */}
          <div>
            <Link to="/" className="inline-flex items-center gap-0.5 mb-4">
              <span className="text-2xl font-extrabold text-primary">Ticket</span>
              <span className="text-2xl font-extrabold text-white">Rush</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              {t('footer.tagline1')}<br />
              {t('footer.tagline2')}
            </p>
          </div>

          {/* Col 1 */}
          <div>
            <h4 className="text-white font-bold text-sm mb-5">{t('footer.col1Title')}</h4>
            <div className="space-y-3">
              {COL1.map(item => (
                <FooterLink key={item.key} to={item.to} label={t(`footer.${item.key}`)} />
              ))}
            </div>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="text-white font-bold text-sm mb-5">{t('footer.col2Title')}</h4>
            <div className="space-y-3">
              {COL2.map(item => (
                <FooterLink key={item.key} to={item.to} label={t(`footer.${item.key}`)} />
              ))}
            </div>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="text-white font-bold text-sm mb-5">{t('footer.col3Title')}</h4>
            <div className="space-y-3">
              {COL3.map(item => (
                <FooterLink key={item.key} to={item.to} label={t(`footer.${item.key}`)} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Company info ── */}
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-white font-bold text-sm mb-3 tracking-wide">{t('footer.companyName')}</p>
          <div className="text-xs text-gray-500 space-y-1 leading-relaxed">
            <p>{t('footer.legalRep')}</p>
            <p>{t('footer.addressLine')}</p>
            <p>{t('footer.bizReg')}</p>
            <p>{t('footer.hotline')}</p>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-center">
          <p className="text-xs text-gray-500">{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
}
