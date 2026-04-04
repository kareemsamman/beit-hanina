import { Building2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="flex flex-col gap-3 min-h-screen items-center justify-center bg-background">
      <div className="bg-primary/10 rounded-2xl p-4 animate-pulse">
        <Building2 className="h-8 w-8 text-primary" />
      </div>
      <div className="h-1 w-16 bg-primary/20 rounded-full overflow-hidden">
        <div className="h-full w-8 bg-primary rounded-full animate-[loading_1s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}
