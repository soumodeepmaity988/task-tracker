// Inline script that runs before paint to apply saved theme — prevents flash.
export default function ThemeScript() {
  const code = `
    (function() {
      try {
        var saved = localStorage.getItem('tf:theme');
        if (saved === 'light' || saved === 'dark') {
          document.documentElement.setAttribute('data-theme', saved);
        }
      } catch (e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
