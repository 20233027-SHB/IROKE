import { Link } from 'react-router';

const NAV = [
  { label: 'Home', href: '#', current: true },
  { label: 'Services', href: '#services' },
  { label: 'Contact', href: '#contact' },
];

export function Header() {
  return (
    <header className="header">
      <a className="header__brand" href="#">
        IROKE
      </a>
      <nav className="nav" aria-label="Main">
        <ul>
          {NAV.map((item) => (
            <li key={item.label}>
              <a href={item.href} aria-current={item.current ? 'page' : undefined}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <Link className="pill" to="/start">
        어울리는 머리 찾기
      </Link>
    </header>
  );
}
