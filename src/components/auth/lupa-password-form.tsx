"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, Mail } from "lucide-react";

import { useForgotPassword } from "@/hooks/auth/use-auth";
import { apiError, apiSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { clearResetFlow } from "@/lib/reset-flow-storage";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "@/schemas/auth/forgot-password.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function LupaPasswordForm({ className }: { className?: string }) {
  const router = useRouter();
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onTouched",
  });
  const mutation = useForgotPassword();

  const onSubmit = (values: ForgotPasswordValues) => {
    clearResetFlow();
    mutation.mutate(values, {
      onSuccess: (res) => {
        apiSuccess(res, "Kode verifikasi dikirim");
        router.push(
          `/lupa-password/verifikasi?email=${encodeURIComponent(values.email)}`,
        );
      },
      onError: (error) => apiError(error, "Gagal mengirim kode verifikasi"),
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("space-y-5", className)}
        noValidate
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground/70">Email</FormLabel>
              <FormControl>
                <div className="group relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="nama@email.com"
                    className="h-11 border-input bg-background pl-10"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          disabled={mutation.isPending}
          className="group/btn h-11 w-full gap-2 text-sm"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              Kirim kode verifikasi
              <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-0.5" />
            </>
          )}
        </Button>

        <div className="text-center text-xs text-muted-foreground">
          Ingat kata sandi Anda?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground transition-colors hover:text-primary"
          >
            Kembali ke login
          </Link>
        </div>
      </form>
    </Form>
  );
}
