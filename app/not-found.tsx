export default function NotFound() {
  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1]">
        <div className="text-center p-6">
          <h1 className="text-2xl font-bold">Page not found</h1>
          <p className="mt-2 text-sm text-neutral-700">The page you're looking for doesn't exist.</p>
        </div>
      </body>
    </html>
  );
}
