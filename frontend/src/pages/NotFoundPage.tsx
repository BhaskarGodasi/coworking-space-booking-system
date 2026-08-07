import { Link } from "react-router-dom";
import { CompassIcon } from "lucide-react";
import { Button } from "../components/ui/button";

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] py-12 px-4 sm:px-6 lg:px-8 text-center bg-muted/20">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-6">
        <CompassIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground mt-2 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
}

export default NotFoundPage;
