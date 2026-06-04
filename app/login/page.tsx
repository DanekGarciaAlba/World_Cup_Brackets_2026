import { KeyRound, LogIn, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signIn, signUp } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const params = await searchParams;

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Sign in to the pool."
        description="Use Supabase Auth for secure email and password access. Profile and avatar setup comes right after sign-in."
      />
      <section className="grid gap-4 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
        <Card className="app-panel border-border bg-transparent">
          <CardContent className="p-4 sm:p-6">
            {params.message ? (
              <div className="mb-4 rounded-lg border border-border bg-secondary/50 p-3 text-sm text-muted-foreground">
                {params.message}
              </div>
            ) : null}
            <Tabs defaultValue="signin">
              <TabsList className="mb-5 grid w-full grid-cols-2">
                <TabsTrigger value="signin">
                  <LogIn className="size-4" />
                  Sign in
                </TabsTrigger>
                <TabsTrigger value="signup">
                  <UserPlus className="size-4" />
                  Sign up
                </TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <AuthForm action={signIn} button="Sign in" />
              </TabsContent>
              <TabsContent value="signup">
                <AuthForm action={signUp} button="Create account" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <aside className="app-panel rounded-lg p-5">
          <KeyRound className="mb-4 size-8 text-primary" />
          <p className="text-lg font-semibold">What happens next</p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Once authenticated, you can create a display name, choose office team details, build a kit avatar, and start
            staging fixture, group, and bracket predictions.
          </p>
        </aside>
      </section>
    </div>
  );
}

function AuthForm({ action, button }: { action: (formData: FormData) => Promise<void>; button: string }) {
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={`${button}-email`}>Email</Label>
        <Input id={`${button}-email`} name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${button}-password`}>Password</Label>
        <Input id={`${button}-password`} name="password" type="password" autoComplete="current-password" required />
      </div>
      <Button type="submit" className="w-full">
        {button}
      </Button>
    </form>
  );
}
