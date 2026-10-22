import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-6xl font-extrabold text-white/10 mb-4">404</h1>
      <h2 className="text-2xl font-bold text-white mb-3">Tool Not Found</h2>
      <p className="text-white/40 mb-8 max-w-md">
        The PDF tool you&apos;re looking for doesn&apos;t exist. Check out our
        available tools below.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-shadow"
      >
        Browse All Tools
      </Link>
    </div>
  );
}
