import {
  IconBrandFacebookFilled,
  IconBrandInstagram,
  IconBrandYoutubeFilled,
} from '@tabler/icons-react';

/**
 * The three channels the ads team runs. One list, rendered in the hero and in
 * the footer, so a changed URL is changed in exactly one place.
 *
 * `rel="me"` is the small SEO/identity win: it tells crawlers these profiles
 * belong to this site. `noopener` is there because the links open a new tab.
 */
const CHANNELS = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/expresstvattSTHLMAB',
    Icon: IconBrandFacebookFilled,
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@Expresstv%C3%A4ttSTHLMAB',
    Icon: IconBrandYoutubeFilled,
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/expresstvatt.se/',
    Icon: IconBrandInstagram,
  },
] as const;

export default function SocialLinks({
  className = '',
  size = 22,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <ul className={`lp-social ${className}`.trim()}>
      {CHANNELS.map(({ label, href, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="me noopener noreferrer"
            className="lp-social-link"
            aria-label={`Express Tvätt på ${label}`}
            title={label}
          >
            <Icon size={size} stroke={1.6} />
          </a>
        </li>
      ))}
    </ul>
  );
}
