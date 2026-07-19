import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <h2 className="text-2xl font-bold mb-2">404 - Page Not Found</h2>
      <p className="text-muted-foreground mb-4">The page you are looking for does not exist.</p>
      <Link href="/" className="text-primary hover:underline">
        Return to Workspace
      </Link>
    </div>
  );
}
