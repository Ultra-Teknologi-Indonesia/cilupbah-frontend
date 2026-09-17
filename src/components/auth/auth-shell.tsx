import type { ReactNode } from "react";
import Image from "next/image";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthShellProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-background p-4 sm:p-6">
      <div className="relative z-10 w-full max-w-md">
        <Card className="border border-border bg-card shadow-lg">
          <CardHeader>
              <div className="flex flex-col items-center text-center">
                <Image
                  src="/logo-mark.png"
                  alt="Cilupbah Superapps"
                  width={56}
                  height={56}
                  priority
                  className="liquid-glass-glow mb-5 size-14 rounded-2xl shadow-lg"
                />
                <CardTitle className="text-2xl tracking-tight">
                  {title}
                </CardTitle>
                {description ? (
                  <CardDescription className="mt-1.5 max-w-xs">
                    {description}
                  </CardDescription>
                ) : null}
              </div>
            </CardHeader>

            <CardContent>{children}</CardContent>
          </Card>
      </div>
    </main>
  );
}
