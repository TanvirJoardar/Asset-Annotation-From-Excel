import { Home } from 'lucide-react';

interface AppHeaderProps {
  showHomeButton?: boolean;
  onHome?: () => void;
}

export default function AppHeader({ showHomeButton = false, onHome }: AppHeaderProps) {
  const handleHomeClick = () => {
    if (onHome) {
      onHome();
      return;
    }
    window.location.href = '/';
  };

  return (
    <header className="header">
      {showHomeButton && (
        <div className="header-actions">
          <button
            type="button"
            className="header-home-btn"
            onClick={handleHomeClick}
            aria-label="Go to home page"
            title="Back to home"
          >
            <Home size={18} />
          </button>
        </div>
      )}
      <h1>Asset Annotation</h1>
      <p>Map structural data intuitively with breathtaking visual processing.</p>
    </header>
  );
}
